package dz.bdl.rtgs.service;

import dz.bdl.rtgs.config.AppConfig;
import dz.bdl.rtgs.generator.EdiWriter;
import dz.bdl.rtgs.model.AccountingStatus;
import dz.bdl.rtgs.model.EdiFile;
import dz.bdl.rtgs.model.EdiHeader;
import dz.bdl.rtgs.model.EdiTransaction;
import dz.bdl.rtgs.model.TransactionRecord;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * Service de reconstitution des fichiers EDI post-comptabilisation (Pure Java)
 */
public class FileReconstitutionService {

    private static final Logger log = Logger.getLogger(FileReconstitutionService.class.getName());

    private final AppConfig appConfig;
    private final EdiWriter writer;
    private final StorageRegistryService registryService;

    public FileReconstitutionService(AppConfig appConfig,
                                     EdiWriter writer,
                                     StorageRegistryService registryService) {
        this.appConfig = appConfig;
        this.writer = writer;
        this.registryService = registryService;
    }

    public synchronized void reconstituteEligibleFiles() {
        List<TransactionRecord> readyRecords = registryService.getAccountedPendingReconstitution();
        if (readyRecords.isEmpty()) {
            return;
        }

        Map<String, List<TransactionRecord>> groupedByOriginalFile = readyRecords.stream()
                .collect(Collectors.groupingBy(TransactionRecord::getOriginalFileName));

        for (Map.Entry<String, List<TransactionRecord>> entry : groupedByOriginalFile.entrySet()) {
            String originalFileName = entry.getKey();
            List<TransactionRecord> records = entry.getValue();

            try {
                reconstituteSingleFile(originalFileName, records);
            } catch (Exception e) {
                log.severe("[FileReconstitutionService] Erreur lors de la reconstitution de " + originalFileName + " : " + e.getMessage());
            }
        }
    }

    private void reconstituteSingleFile(String originalFileName, List<TransactionRecord> records) throws IOException {
        log.info("================================================================================");
        log.info("[FileReconstitutionService] Reconstitution du fichier : " + originalFileName);

        if (records.isEmpty()) return;
        TransactionRecord first = records.get(0);

        // 1. Reconstitution de l'entête avec le RIB DONNEUR D'ORDRE D'ORIGINE
        EdiHeader header = new EdiHeader();
        header.setTag("VIRM");
        header.setCodeBanqueDonneur(first.getCodeBanqueDonneur());
        header.setNatureOperation("010");
        header.setNatureFonds("0");
        header.setIndicateurRibIban("1");

        // --- RESTAURATION DU RIB CLIENT D'ORIGINE ---
        header.setRibDonneurOrdre(first.getOriginalRibDonneur());
        header.setNomDonneurOrdre(first.getOriginalNomDonneur());
        header.setAdresseDonneurOrdre(first.getOriginalAdresseDonneur());

        header.setPrefixeIban("DZ00");
        header.setDateRemiseOrdre(first.getDateValeur() != null ? first.getDateValeur() : "20260914");
        header.setReferenceRemise("001");
        header.setNombreOperations(records.size());

        BigDecimal total = records.stream()
                .map(TransactionRecord::getMontant)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        header.setMontantTotal(total);

        // 2. Reconstitution des lignes du corps avec le RIB BÉNÉFICIAIRE D'ORIGINE
        List<EdiTransaction> transactions = new ArrayList<>();
        for (TransactionRecord r : records) {
            EdiTransaction tx = new EdiTransaction();
            tx.setNumeroOrdre(r.getNumeroOrdre());
            tx.setIndicateurRibIban("1");

            // --- RESTAURATION DU RIB BÉNÉFICIAIRE D'ORIGINE ---
            tx.setRibBeneficiaire(r.getOriginalRibBeneficiaire());
            tx.setNomBeneficiaire(r.getOriginalNomBeneficiaire());
            tx.setAdresseBeneficiaire(r.getOriginalAdresseBeneficiaire());
            tx.setCodeBanqueBeneficiaire(r.getCodeBanqueBeneficiaire());

            tx.setPrefixeIban("DZ00");
            tx.setMontant(r.getMontant());
            tx.setLibelle(r.getLibelle());
            tx.setCodeBanqueDonneur(first.getCodeBanqueDonneur());
            tx.setRibDonneurOriginal(first.getOriginalRibDonneur());

            transactions.add(tx);
        }

        // 3. Écriture du fichier final reconstitué
        String reconstitutedFileName = "RECONSTITUTED_" + originalFileName;
        File outDir = new File(appConfig.getOutReconstitutedFolder());
        if (!outDir.exists()) outDir.mkdirs();

        File outputFile = new File(outDir, reconstitutedFileName);
        EdiFile ediFile = new EdiFile(reconstitutedFileName, header, transactions, "FVIR");
        writer.writeToFile(ediFile, outputFile);

        // 4. Mise à jour des statuts dans le registre
        LocalDateTime now = LocalDateTime.now();
        for (TransactionRecord r : records) {
            r.setStatus(AccountingStatus.RECONSTITUE_PRET_RTGS);
            r.setReconstitutedFileName(reconstitutedFileName);
            r.setReconstitutedAt(now);
            registryService.saveRecord(r);
        }

        log.info("[FileReconstitutionService] Fichier reconstitué avec SUCCÈS : " + outputFile.getAbsolutePath());
        log.info("[FileReconstitutionService] -> RIB Donneur rétabli : " + first.getOriginalRibDonneur());
        log.info("[FileReconstitutionService] -> " + records.size() + " virement(s) prêt(s) pour exécution RTGS / Swift MT103.");
    }
}
