package dz.bdl.rtgs;

import dz.bdl.rtgs.config.AppConfig;
import dz.bdl.rtgs.generator.EdiWriter;
import dz.bdl.rtgs.parser.EdiFixedLengthParser;
import dz.bdl.rtgs.service.*;

import java.util.logging.Logger;

/**
 * Point d'entrée principal de l'application Java Standard Simple (BDL RTGS)
 */
public class Main {

    private static final Logger log = Logger.getLogger(Main.class.getName());

    public static void main(String[] args) {
        System.out.println("================================================================================");
        System.out.println("  BANQUE DE DEVELOPPEMENT LOCAL (BDL) - SERVICE RTGS EDI (PURE JAVA SE)         ");
        System.out.println("  - Surveillance EDI & Filtrage RTGS (>= 1M DZD, Interbancaire)                 ");
        System.out.println("  - Substitution RIB Donneur par RIB Compte Interne BDL                         ");
        System.out.println("  - Vérification Comptabilisation & Reconstitution Fichiers Originaux           ");
        System.out.println("================================================================================");

        // 1. Chargement de la configuration
        AppConfig config = AppConfig.load();
        log.info("[Main] Configuration chargée avec succès.");
        log.info("  -> Seuil RTGS : " + config.getMinAmount() + " DZD");
        log.info("  -> RIB Compte Interne BDL : " + config.getCompteInterneRib());

        // 2. Instanciation des composants métier
        EdiFixedLengthParser parser = new EdiFixedLengthParser();
        EdiWriter writer = new EdiWriter();
        StorageRegistryService registryService = new StorageRegistryService(config);
        FileReconstitutionService reconstitutionService = new FileReconstitutionService(config, writer, registryService);
        EdiRoutingService routingService = new EdiRoutingService(config, parser, writer, registryService);
        AccountingCheckService accountingCheckService = new AccountingCheckService(config, registryService, reconstitutionService);
        FileWatcherService watcherService = new FileWatcherService(config, routingService, accountingCheckService);
        SimpleHttpServer httpServer = new SimpleHttpServer(config, registryService, watcherService, accountingCheckService);

        // 3. Démarrage des services
        watcherService.start();
        httpServer.start();

        // 4. Hook d'arrêt propre (Graceful Shutdown)
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            log.info("[Main] Arrêt en cours des services BDL RTGS...");
            watcherService.stop();
            httpServer.stop();
            log.info("[Main] Application BDL RTGS arrêtée.");
        }));

        log.info("[Main] Application Java BDL RTGS active et en écoute.");
    }
}
