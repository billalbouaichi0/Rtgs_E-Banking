package dz.bdl.rtgs.service;

import dz.bdl.rtgs.config.AppConfig;
import dz.bdl.rtgs.generator.EdiWriter;
import dz.bdl.rtgs.model.*;
import dz.bdl.rtgs.parser.EdiFixedLengthParser;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.logging.Logger;

/**
 * Service de routage et de substitution de RIB (Pure Java)
 */
public class EdiRoutingService {

    private static final Logger log = Logger.getLogger(EdiRoutingService.class.getName());

    private final AppConfig appConfig;
    private final EdiFixedLengthParser parser;
    private final EdiWriter writer;
    private final StorageRegistryService registryService;

    public EdiRoutingService(AppConfig appConfig,
                             EdiFixedLengthParser parser,
                             EdiWriter writer,
                             StorageRegistryService registryService) {
        this.appConfig = appConfig;
        this.parser = parser;
        this.writer = writer;
        this.registryService = registryService;
    }

    public boolean processIncomingEdi(File incomingFile) {
        log.info("================================================================================");
        log.info("[EdiRoutingService] Détection d'un nouveau fichier EDI : " + incomingFile.getName());

        try {
            EdiFile ediFile = parser.parse(incomingFile);
            EdiHeader header = ediFile.getHeader();
            List<EdiTransaction> transactions = ediFile.getTransactions();

            log.info("[EdiRoutingService] Remise parsée : Ref=" + header.getReferenceRemise()
                    + ", Donneur=" + header.getNomDonneurOrdre()
                    + ", NbOps=" + transactions.size()
                    + ", Total=" + header.getMontantTotal() + " DZD");

            List<TransactionRecord> recordsToSave = new ArrayList<>();
            List<EdiTransaction> substitutedTransactions = new ArrayList<>();

            int rtgsEligibleCount = 0;
            String originalDonneurRib = header.getRibDonneurOrdre();
            String originalDonneurNom = header.getNomDonneurOrdre();
            String originalDonneurAdr = header.getAdresseDonneurOrdre();

            for (EdiTransaction tx : transactions) {
                String id = UUID.randomUUID().toString();
                TransactionRecord record = new TransactionRecord();
                record.setId(id);
                record.setOriginalFileName(incomingFile.getName());
                record.setNumeroOrdre(tx.getNumeroOrdre());

                // Donneur d'ordre
                record.setOriginalRibDonneur(originalDonneurRib);
                record.setOriginalNomDonneur(originalDonneurNom);
                record.setOriginalAdresseDonneur(originalDonneurAdr);
                record.setCodeBanqueDonneur(header.getCodeBanqueDonneur());

                // Bénéficiaire
                record.setOriginalRibBeneficiaire(tx.getRibBeneficiaire());
                record.setOriginalNomBeneficiaire(tx.getNomBeneficiaire());
                record.setOriginalAdresseBeneficiaire(tx.getAdresseBeneficiaire());
                record.setCodeBanqueBeneficiaire(tx.getCodeBanqueBeneficiaire());

                // Détails
                record.setMontant(tx.getMontant());
                record.setLibelle(tx.getLibelle());
                record.setDateValeur(header.getDateRemiseOrdre());
                record.setCreatedAt(LocalDateTime.now());

                // Vérification éligibilité RTGS :
                // 1. Code Banque Donneur != Code Banque Bénéficiaire
                // 2. Montant >= 1 000 000 DZD
                boolean isInterbank = !header.getCodeBanqueDonneur().equals(tx.getCodeBanqueBeneficiaire());
                boolean isAmountEligible = tx.getMontant().compareTo(appConfig.getMinAmount()) >= 0;

                if (isInterbank && isAmountEligible) {
                    rtgsEligibleCount++;
                    record.setRtgsEligible(true);
                    record.setStatus(AccountingStatus.SUBSTITUE_ENVOYE_COMPTA);
                    record.setSubstitutedRibInterne(appConfig.getCompteInterneRib());
                    record.setSubstitutedNomInterne(appConfig.getCompteInterneNom());
                    record.setSubstitutedAt(LocalDateTime.now());

                    log.info("[EdiRoutingService] -> Virement #" + tx.getNumeroOrdre() + " éligible RTGS (" + tx.getMontant()
                            + " DZD) | Banque Donneur: " + header.getCodeBanqueDonneur() + " != Bénéf: " + tx.getCodeBanqueBeneficiaire()
                            + ". Substitution par RIB Interne: " + appConfig.getCompteInterneRib());
                } else {
                    record.setRtgsEligible(false);
                    record.setStatus(AccountingStatus.IGNORE_NON_RTGS);
                    log.info("[EdiRoutingService] -> Virement #" + tx.getNumeroOrdre() + " NON éligible RTGS (Montant=" + tx.getMontant()
                            + " DZD, Interbancaire=" + isInterbank + ")");
                }

                recordsToSave.add(record);
                substitutedTransactions.add(tx);
            }

            // 2. Si des transactions sont éligibles RTGS : Création du fichier avec RIB substitué
            if (rtgsEligibleCount > 0) {
                EdiHeader substitutedHeader = new EdiHeader();
                substitutedHeader.setTag(header.getTag());
                substitutedHeader.setCodeBanqueDonneur(header.getCodeBanqueDonneur());
                substitutedHeader.setNatureOperation(header.getNatureOperation());
                substitutedHeader.setNatureFonds(header.getNatureFonds());
                substitutedHeader.setIndicateurRibIban(header.getIndicateurRibIban());

                // === SUBSTITUTION DU RIB PAR LE COMPTE INTERNE BDL ===
                substitutedHeader.setRibDonneurOrdre(appConfig.getCompteInterneRib());
                substitutedHeader.setNomDonneurOrdre(appConfig.getCompteInterneNom());
                substitutedHeader.setAdresseDonneurOrdre(appConfig.getCompteInterneAdresse());

                substitutedHeader.setPrefixeIban(header.getPrefixeIban());
                substitutedHeader.setDateRemiseOrdre(header.getDateRemiseOrdre());
                substitutedHeader.setReferenceRemise(header.getReferenceRemise());
                substitutedHeader.setNombreOperations(header.getNombreOperations());
                substitutedHeader.setMontantTotal(header.getMontantTotal());

                String substitutedFileName = "SUBST_" + incomingFile.getName();
                File targetOutFile = new File(appConfig.getOutCoreBankingFolder(), substitutedFileName);

                EdiFile substitutedEdiFile = new EdiFile(substitutedFileName, substitutedHeader, substitutedTransactions, ediFile.getTrailerLine());
                writer.writeToFile(substitutedEdiFile, targetOutFile);

                for (TransactionRecord r : recordsToSave) {
                    if (r.isRtgsEligible()) {
                        r.setSubstitutedFileName(substitutedFileName);
                    }
                }

                log.info("[EdiRoutingService] Fichier EDI substitué généré avec succès : " + targetOutFile.getAbsolutePath());
            }

            // 3. Sauvegarde dans le registre persistant
            registryService.saveAll(recordsToSave);

            // 4. Déplacement du fichier entrant vers l'archive
            File archiveDir = new File(appConfig.getArchiveFolder());
            if (!archiveDir.exists()) archiveDir.mkdirs();
            File archivedFile = new File(archiveDir, incomingFile.getName());
            Files.move(incomingFile.toPath(), archivedFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            log.info("[EdiRoutingService] Fichier source archivé : " + archivedFile.getName());

            return true;
        } catch (Exception e) {
            log.severe("[EdiRoutingService] Erreur lors du traitement du fichier EDI " + incomingFile.getName() + " : " + e.getMessage());
            try {
                File rejectedDir = new File(appConfig.getRejectedFolder());
                if (!rejectedDir.exists()) rejectedDir.mkdirs();
                File rejectedFile = new File(rejectedDir, incomingFile.getName());
                Files.move(incomingFile.toPath(), rejectedFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException ex) {
                log.severe("[EdiRoutingService] Impossible de déplacer vers rejected : " + ex.getMessage());
            }
            return false;
        }
    }
}
