package dz.bdl.rtgs.controller;

import dz.bdl.rtgs.config.AppConfig;
import dz.bdl.rtgs.model.AccountingStatus;
import dz.bdl.rtgs.model.TransactionRecord;
import dz.bdl.rtgs.service.AccountingCheckService;
import dz.bdl.rtgs.service.FileReconstitutionService;
import dz.bdl.rtgs.service.FileWatcherService;
import dz.bdl.rtgs.service.StorageRegistryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Contrôleur REST de supervision, statut et déclencheurs manuels
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class StatusController {

    private final AppConfig appConfig;
    private final StorageRegistryService registryService;
    private final FileWatcherService watcherService;
    private final AccountingCheckService accountingCheckService;
    private final FileReconstitutionService reconstitutionService;

    public StatusController(AppConfig appConfig,
                            StorageRegistryService registryService,
                            FileWatcherService watcherService,
                            AccountingCheckService accountingCheckService,
                            FileReconstitutionService reconstitutionService) {
        this.appConfig = appConfig;
        this.registryService = registryService;
        this.watcherService = watcherService;
        this.accountingCheckService = accountingCheckService;
        this.reconstitutionService = reconstitutionService;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> resp = new HashMap<>();
        resp.put("service", "BDL-RTGS-ServiceJavaApp");
        resp.put("status", "UP");
        resp.put("timestamp", LocalDateTime.now());
        resp.put("minAmountRtgs", appConfig.getMinAmount());
        resp.put("ribCompteInterne", appConfig.getCompteInterneRib());
        resp.put("totalTransactionsRecorded", registryService.getAll().size());
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<TransactionRecord>> getTransactions() {
        return ResponseEntity.ok(registryService.getAll());
    }

    @GetMapping("/transactions/pending-compta")
    public ResponseEntity<List<TransactionRecord>> getPendingCompta() {
        return ResponseEntity.ok(registryService.getPendingCompta());
    }

    @PostMapping("/scan-now")
    public ResponseEntity<Map<String, String>> triggerScanNow() {
        watcherService.scanInbox();
        Map<String, String> resp = new HashMap<>();
        resp.put("message", "Scrutation du dossier inbox exécutée avec succès.");
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/check-compta-now")
    public ResponseEntity<Map<String, String>> triggerComptaCheck() {
        accountingCheckService.checkAccountingStatus();
        Map<String, String> resp = new HashMap<>();
        resp.put("message", "Vérification comptabilité et reconstitution exécutées.");
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/force-reconstitution")
    public ResponseEntity<Map<String, String>> forceReconstitution() {
        reconstitutionService.reconstituteEligibleFiles();
        Map<String, String> resp = new HashMap<>();
        resp.put("message", "Procédure de reconstitution des fichiers exécutée.");
        return ResponseEntity.ok(resp);
    }
}
