package dz.bdl.rtgs.service;

import dz.bdl.rtgs.config.AppConfig;
import dz.bdl.rtgs.generator.EdiWriter;
import dz.bdl.rtgs.model.*;
import dz.bdl.rtgs.parser.EdiFixedLengthParser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Service de routage et de substitution de RIB :
 * Détecte les virements interbancaires >= 1 000 000 DZD et substitue
 * le RIB donneur d'ordre par le RIB du compte interne BDL pour la comptabilisation.
 */
@Service
public class EdiRoutingService {

    private static final Logger log = LoggerFactory.getLogger(EdiRoutingService.class);

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

    /**
     * Traite un fichier EDI brut détecté dans le dossier entrant (inbox)
     */
    public boolean processIncomingEdi(File incomingFile) {
        log.info("================================================================================");
        log.info("[EdiRoutingService] Détection d'un nouveau fichier EDI : {}", incomingFile.getName());

        try {
            // 1. Parsing du fichier EDI brut
            EdiFile ediFile = parser.parse(incomingFile);
            EdiHeader header = ediFile.getHeader();
            List<EdiTransaction> transactions = ediFile.getTransactions();

            log.info("[EdiRoutingService] Remise parsée : Ref={}, Donneur={}, NbOps={}, Total={} DZD",
                    header.getReferenceRemise(),
                    header.getNomDonneurOrdre(),
                    transactions.size(),
                    header.getMontantTotal());

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

                    log.info("[EdiRoutingService] -> Virement #{} éligible RTGS ({} DZD) | Banque Donneur: {} != Bénéf: {}. Substitution par RIB Interne: {}",
                            tx.getNumeroOrdre(), tx.getMontant(), header.getCodeBanqueDonneur(), tx.getCodeBanqueBeneficiaire(), appConfig.getCompteInterneRib());
                } else {
                    record.setRtgsEligible(false);
                    record.setStatus(AccountingStatus.IGNORE_NON_RTGS);
                    log.info("[EdiRoutingService] -> Virement #{} NON éligible RTGS (Montant={} DZD, Interbancaire={})",
                            tx.getNumeroOrdre(), tx.getMontant(), isInterbank);
                }

                recordsToSave.add(record);
                substitutedTransactions.add(tx);
            }

            // 2. Si des transactions sont éligibles RTGS : Création du fichier avec RIB substitué
            if (rtgsEligibleCount > 0) {
                // Cloner et substituer l'entête avec le RIB du compte interne BDL
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

                log.info("[EdiRoutingService] Fichier EDI substitué généré avec succès : {}", targetOutFile.getAbsolutePath());
            }

            // 3. Sauvegarde dans le registre persistant
            registryService.saveAll(recordsToSave);

            // 4. Déplacement du fichier entrant vers l'archive
            File archiveDir = new File(appConfig.getArchiveFolder());
            if (!archiveDir.exists()) archiveDir.mkdirs();
            File archivedFile = new File(archiveDir, incomingFile.getName());
            Files.move(incomingFile.toPath(), archivedFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            log.info("[EdiRoutingService] Fichier source archivé : {}", archivedFile.getName());

            return true;
        } catch (Exception e) {
            log.error("[EdiRoutingService] Erreur lors du traitement du fichier EDI {} : {}", incomingFile.getName(), e.getMessage(), e);
            // Déplacement vers rejected
            try {
                File rejectedDir = new File(appConfig.getRejectedFolder());
                if (!rejectedDir.exists()) rejectedDir.mkdirs();
                File rejectedFile = new File(rejectedDir, incomingFile.getName());
                Files.move(incomingFile.toPath(), rejectedFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException ex) {
                log.error("[EdiRoutingService] Impossible de déplacer vers rejected : {}", ex.getMessage());
            }
            return false;
        }
    }
}
