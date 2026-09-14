package dz.bdl.rtgs.service;

import dz.bdl.rtgs.config.AppConfig;
import dz.bdl.rtgs.model.AccountingStatus;
import dz.bdl.rtgs.model.TransactionRecord;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.logging.Logger;

/**
 * Service de vérification de la comptabilisation (Pure Java)
 */
public class AccountingCheckService {

    private static final Logger log = Logger.getLogger(AccountingCheckService.class.getName());

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

    public void processComptaAckFile(File ackFile) {
        log.info("[AccountingCheckService] Fichier d'acquittement comptable détecté : " + ackFile.getName());
        try {
            boolean hasUpdates = false;
            try (BufferedReader reader = new BufferedReader(new FileReader(ackFile))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty()) continue;

                    for (TransactionRecord record : registryService.getPendingCompta()) {
                        if (line.contains(record.getNumeroOrdre()) || line.contains(record.getOriginalFileName()) || line.contains(record.getSubstitutedFileName())) {
                            if (line.contains("CPT") || line.contains("OK") || line.contains("VALIDE")) {
                                record.setStatus(AccountingStatus.COMPTABILISE);
                                record.setAccountedAt(LocalDateTime.now());
                                record.setComptaReference("ACK_" + ackFile.getName());
                                registryService.saveRecord(record);
                                hasUpdates = true;
                                log.info("[AccountingCheckService] -> Virement #" + record.getNumeroOrdre() + " marqué COMPTABILISÉ via " + ackFile.getName());
                            } else if (line.contains("RJT") || line.contains("REJET")) {
                                record.setStatus(AccountingStatus.REJETE_COMPTA);
                                record.setAccountedAt(LocalDateTime.now());
                                registryService.saveRecord(record);
                                log.warning("[AccountingCheckService] -> Virement #" + record.getNumeroOrdre() + " REJETÉ par la comptabilité");
                            }
                        }
                    }
                }
            }

            File archiveDir = new File(appConfig.getArchiveFolder());
            if (!archiveDir.exists()) archiveDir.mkdirs();
            File dest = new File(archiveDir, ackFile.getName());
            Files.move(ackFile.toPath(), dest.toPath(), StandardCopyOption.REPLACE_EXISTING);

            if (hasUpdates) {
                reconstitutionService.reconstituteEligibleFiles();
            }
        } catch (Exception e) {
            log.severe("[AccountingCheckService] Erreur lors de la lecture du fichier compta " + ackFile.getName() + " : " + e.getMessage());
        }
    }

    private void processSimulatedAccounting() {
        List<TransactionRecord> pending = registryService.getPendingCompta();
        LocalDateTime now = LocalDateTime.now();
        boolean hasConfirmed = false;

        for (TransactionRecord r : pending) {
            if (r.getSubstitutedAt() != null) {
                long elapsedSeconds = Duration.between(r.getSubstitutedAt(), now).getSeconds();
                if (elapsedSeconds >= appConfig.getSimulationAutoComptaDelaySeconds()) {
                    r.setStatus(AccountingStatus.COMPTABILISE);
                    r.setAccountedAt(now);
                    r.setComptaReference("SAB_AUTO_SIMULATION_OK");
                    registryService.saveRecord(r);
                    hasConfirmed = true;
                    log.info("[AccountingCheckService - Simulateur] Virement #" + r.getNumeroOrdre()
                            + " (" + r.getMontant() + " DZD) confirmé COMPTABILISÉ dans SAB.");
                }
            }
        }

        if (hasConfirmed) {
            reconstitutionService.reconstituteEligibleFiles();
        }
    }
}
