package dz.bdl.rtgs.service;

import dz.bdl.rtgs.config.AppConfig;
import dz.bdl.rtgs.model.AccountingStatus;
import dz.bdl.rtgs.model.TransactionRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Service de vérification de la comptabilisation :
 * - Scrute le dossier de retour Core Banking / SAB (inbox_compta)
 * - Traite les acquittements ou fichiers SI_VIR_CPT / .ack
 * - En mode simulation, confirme automatiquement les écritures après délai
 */
@Service
public class AccountingCheckService {

    private static final Logger log = LoggerFactory.getLogger(AccountingCheckService.class);

    private final AppConfig appConfig;
    private final StorageRegistryService registryService;
    private final FileReconstitutionService reconstitutionService;

    public AccountingCheckService(AppConfig appConfig,
                                  StorageRegistryService registryService,
                                  FileReconstitutionService reconstitutionService) {
        this.appConfig = appConfig;
        this.registryService = registryService;
        this.reconstitutionService = reconstitutionService;
    }

    /**
     * Tâche planifiée : Scrutation du dossier de retour de comptabilisation
     */
    @Scheduled(fixedDelayString = "${rtgs.polling.compta-interval-ms:10000}")
    public void checkAccountingStatus() {
        // 1. Vérification des fichiers de retour dans inbox_compta
        File comptaDir = new File(appConfig.getInboxComptaFolder());
        if (comptaDir.exists() && comptaDir.isDirectory()) {
            File[] files = comptaDir.listFiles((dir, name) ->
                    name.endsWith(".txt") || name.endsWith(".ack") || name.endsWith(".dat") || name.endsWith(".cpt"));

            if (files != null && files.length > 0) {
                for (File file : files) {
                    processComptaAckFile(file);
                }
            }
        }

        // 2. Mode simulation automatique (si activé)
        if (appConfig.isSimulationAutoCompta()) {
            processSimulatedAccounting();
        }
    }

    /**
     * Traitement d'un fichier réel d'acquittement ou de retour comptable Core Banking
     */
    public void processComptaAckFile(File ackFile) {
        log.info("[AccountingCheckService] Fichier d'acquittement comptable détecté : {}", ackFile.getName());
        try {
            boolean hasUpdates = false;
            try (BufferedReader reader = new BufferedReader(new FileReader(ackFile))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty()) continue;

                    // Exemple : Correspondance par N° d'ordre (10 car) ou nom de fichier
                    for (TransactionRecord record : registryService.getPendingCompta()) {
                        if (line.contains(record.getNumeroOrdre()) || line.contains(record.getOriginalFileName()) || line.contains(record.getSubstitutedFileName())) {
                            if (line.contains("CPT") || line.contains("OK") || line.contains("VALIDE")) {
                                record.setStatus(AccountingStatus.COMPTABILISE);
                                record.setAccountedAt(LocalDateTime.now());
                                record.setComptaReference("ACK_" + ackFile.getName());
                                registryService.saveRecord(record);
                                hasUpdates = true;
                                log.info("[AccountingCheckService] -> Virement #{} marqué COMPTABILISÉ via {}", record.getNumeroOrdre(), ackFile.getName());
                            } else if (line.contains("RJT") || line.contains("REJET")) {
                                record.setStatus(AccountingStatus.REJETE_COMPTA);
                                record.setAccountedAt(LocalDateTime.now());
                                registryService.saveRecord(record);
                                log.warn("[AccountingCheckService] -> Virement #{} REJETÉ par la comptabilité", record.getNumeroOrdre());
                            }
                        }
                    }
                }
            }

            // Déplacer l'acquittement vers l'archive
            File archiveDir = new File(appConfig.getArchiveFolder());
            if (!archiveDir.exists()) archiveDir.mkdirs();
            File dest = new File(archiveDir, ackFile.getName());
            Files.move(ackFile.toPath(), dest.toPath(), StandardCopyOption.REPLACE_EXISTING);

            if (hasUpdates) {
                // Déclencher la reconstitution des fichiers prêts
                reconstitutionService.reconstituteEligibleFiles();
            }
        } catch (Exception e) {
            log.error("[AccountingCheckService] Erreur lors de la lecture du fichier compta {} : {}", ackFile.getName(), e.getMessage());
        }
    }

    /**
     * Simulation automatique de comptabilisation après écoulement du délai configuré
     */
    private void processSimulatedAccounting() {
        List<TransactionRecord> pending = registryService.getPendingCompta();
        LocalDateTime now = LocalDateTime.now();
        boolean hasConfirmed = false;

        for (TransactionRecord r : pending) {
            if (r.getSubstitutedAt() != null) {
                long elapsed = Duration.between(r.getSubstitutedAt(), now).toMillis();
                if (elapsed >= appConfig.getSimulationAutoComptaDelayMs()) {
                    r.setStatus(AccountingStatus.COMPTABILISE);
                    r.setAccountedAt(now);
                    r.setComptaReference("SAB_AUTO_SIMULATION_OK");
                    registryService.saveRecord(r);
                    hasConfirmed = true;
                    log.info("[AccountingCheckService - Simulateur] Virement #{} ({} DZD) confirmé COMPTABILISÉ dans SAB (Compte interne débité/crédité avec succès).",
                            r.getNumeroOrdre(), r.getMontant());
                }
            }
        }

        if (hasConfirmed) {
            // Déclencher la reconstitution des fichiers
            reconstitutionService.reconstituteEligibleFiles();
        }
    }
}
