package dz.bdl.rtgs.service;

import dz.bdl.rtgs.config.AppConfig;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.Arrays;
import java.util.Comparator;

/**
 * Service de surveillance du répertoire entrant pour la détection
 * automatique des nouveaux fichiers EDI.
 */
@Service
public class FileWatcherService {

    private static final Logger log = LoggerFactory.getLogger(FileWatcherService.class);

    private final AppConfig appConfig;
    private final EdiRoutingService routingService;

    public FileWatcherService(AppConfig appConfig, EdiRoutingService routingService) {
        this.appConfig = appConfig;
        this.routingService = routingService;
    }

    @PostConstruct
    public void initFolders() {
        createDirIfNotExist(appConfig.getInboxFolder(), "INBOX EDI");
        createDirIfNotExist(appConfig.getOutCoreBankingFolder(), "OUT CORE BANKING");
        createDirIfNotExist(appConfig.getInboxComptaFolder(), "INBOX COMPTA");
        createDirIfNotExist(appConfig.getOutReconstitutedFolder(), "OUT RECONSTITUTED");
        createDirIfNotExist(appConfig.getArchiveFolder(), "ARCHIVE EDI");
        createDirIfNotExist(appConfig.getRejectedFolder(), "REJECTED EDI");

        log.info("[FileWatcherService] Répertoires BDL RTGS initialisés avec succès.");
        log.info("  -> Inbox Surveillance : {}", new File(appConfig.getInboxFolder()).getAbsolutePath());
        log.info("  -> Sortie Core Banking: {}", new File(appConfig.getOutCoreBankingFolder()).getAbsolutePath());
        log.info("  -> Sortie Reconstitué : {}", new File(appConfig.getOutReconstitutedFolder()).getAbsolutePath());
    }

    private void createDirIfNotExist(String path, String label) {
        File dir = new File(path);
        if (!dir.exists()) {
            boolean created = dir.mkdirs();
            if (created) {
                log.info("[FileWatcherService] Création du dossier {} : {}", label, dir.getAbsolutePath());
            }
        }
    }

    /**
     * Tâche de scrutation périodique du dossier entrant
     */
    @Scheduled(fixedDelayString = "${rtgs.polling.inbox-interval-ms:5000}")
    public void scanInbox() {
        File inbox = new File(appConfig.getInboxFolder());
        if (!inbox.exists() || !inbox.isDirectory()) {
            return;
        }

        File[] files = inbox.listFiles((dir, name) -> {
            String lower = name.toLowerCase();
            return lower.endsWith(".edi") || lower.endsWith(".txt") || lower.endsWith(".dat");
        });

        if (files == null || files.length == 0) {
            return;
        }

        // Tri par date de modification (FIFO)
        Arrays.sort(files, Comparator.comparingLong(File::lastModified));

        for (File file : files) {
            // Ignorer les fichiers en cours d'écriture temporaire
            if (file.getName().startsWith(".") || file.getName().endsWith(".tmp")) {
                continue;
            }
            try {
                routingService.processIncomingEdi(file);
            } catch (Exception e) {
                log.error("[FileWatcherService] Exception non gérée lors du traitement de {} : {}", file.getName(), e.getMessage(), e);
            }
        }
    }
}
