package dz.bdl.rtgs.service;

import dz.bdl.rtgs.config.AppConfig;

import java.io.File;
import java.util.Arrays;
import java.util.Comparator;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;

/**
 * Service de surveillance de dossier avec ScheduledExecutorService (Pure Java)
 */
public class FileWatcherService {

    private static final Logger log = Logger.getLogger(FileWatcherService.class.getName());

    private final AppConfig appConfig;
    private final EdiRoutingService routingService;
    private final AccountingCheckService accountingCheckService;
    private ScheduledExecutorService scheduler;

    public FileWatcherService(AppConfig appConfig,
                              EdiRoutingService routingService,
                              AccountingCheckService accountingCheckService) {
        this.appConfig = appConfig;
        this.routingService = routingService;
        this.accountingCheckService = accountingCheckService;
        initFolders();
    }

    public void initFolders() {
        createDirIfNotExist(appConfig.getInboxFolder(), "INBOX EDI");
        createDirIfNotExist(appConfig.getOutCoreBankingFolder(), "OUT CORE BANKING");
        createDirIfNotExist(appConfig.getInboxComptaFolder(), "INBOX COMPTA");
        createDirIfNotExist(appConfig.getOutReconstitutedFolder(), "OUT RECONSTITUTED");
        createDirIfNotExist(appConfig.getArchiveFolder(), "ARCHIVE EDI");
        createDirIfNotExist(appConfig.getRejectedFolder(), "REJECTED EDI");

        log.info("[FileWatcherService] Répertoires BDL RTGS initialisés :");
        log.info("  -> Inbox Surveillance : " + new File(appConfig.getInboxFolder()).getAbsolutePath());
        log.info("  -> Sortie Core Banking: " + new File(appConfig.getOutCoreBankingFolder()).getAbsolutePath());
        log.info("  -> Sortie Reconstitué : " + new File(appConfig.getOutReconstitutedFolder()).getAbsolutePath());
    }

    private void createDirIfNotExist(String path, String label) {
        File dir = new File(path);
        if (!dir.exists()) {
            boolean created = dir.mkdirs();
            if (created) {
                log.info("[FileWatcherService] Création du dossier " + label + " : " + dir.getAbsolutePath());
            }
        }
    }

    public synchronized void start() {
        if (scheduler != null && !scheduler.isShutdown()) {
            return;
        }

        scheduler = Executors.newScheduledThreadPool(2);

        // 1. Tâche de scrutation de l'inbox EDI
        scheduler.scheduleWithFixedDelay(this::scanInbox, 1, appConfig.getInboxIntervalSeconds(), TimeUnit.SECONDS);

        // 2. Tâche de vérification de la comptabilité
        scheduler.scheduleWithFixedDelay(() -> {
            try {
                accountingCheckService.checkAccountingStatus();
            } catch (Exception e) {
                log.severe("[FileWatcherService] Erreur tâche comptabilité : " + e.getMessage());
            }
        }, 2, appConfig.getComptaIntervalSeconds(), TimeUnit.SECONDS);

        log.info("[FileWatcherService] Ordonnanceur de surveillance démarré (Inbox: "
                + appConfig.getInboxIntervalSeconds() + "s, Compta: " + appConfig.getComptaIntervalSeconds() + "s)");
    }

    public synchronized void stop() {
        if (scheduler != null) {
            scheduler.shutdown();
            try {
                if (!scheduler.awaitTermination(3, TimeUnit.SECONDS)) {
                    scheduler.shutdownNow();
                }
            } catch (InterruptedException e) {
                scheduler.shutdownNow();
            }
            log.info("[FileWatcherService] Ordonnanceur de surveillance arrêté.");
        }
    }

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

        Arrays.sort(files, Comparator.comparingLong(File::lastModified));

        for (File file : files) {
            if (file.getName().startsWith(".") || file.getName().endsWith(".tmp")) {
                continue;
            }
            try {
                routingService.processIncomingEdi(file);
            } catch (Exception e) {
                log.severe("[FileWatcherService] Exception non gérée lors du traitement de " + file.getName() + " : " + e.getMessage());
            }
        }
    }
}
