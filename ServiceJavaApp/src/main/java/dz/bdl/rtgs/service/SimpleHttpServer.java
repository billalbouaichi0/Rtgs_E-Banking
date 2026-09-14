package dz.bdl.rtgs.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import dz.bdl.rtgs.config.AppConfig;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Serveur HTTP ultra-léger sans framework (utilisant com.sun.net.httpserver inclus dans le JDK)
 */
public class SimpleHttpServer {

    private static final Logger log = Logger.getLogger(SimpleHttpServer.class.getName());

    private final AppConfig appConfig;
    private final StorageRegistryService registryService;
    private final FileWatcherService watcherService;
    private final AccountingCheckService accountingCheckService;
    private final ObjectMapper objectMapper;
    private HttpServer server;

    public SimpleHttpServer(AppConfig appConfig,
                            StorageRegistryService registryService,
                            FileWatcherService watcherService,
                            AccountingCheckService accountingCheckService) {
        this.appConfig = appConfig;
        this.registryService = registryService;
        this.watcherService = watcherService;
        this.accountingCheckService = accountingCheckService;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
    }

    public void start() {
        if (appConfig.getHttpServerPort() <= 0) {
            log.info("[SimpleHttpServer] Serveur HTTP désactivé (port <= 0).");
            return;
        }

        try {
            server = HttpServer.create(new InetSocketAddress(appConfig.getHttpServerPort()), 0);

            // 1. GET /api/health
            server.createContext("/api/health", exchange -> {
                Map<String, Object> resp = new HashMap<>();
                resp.put("service", "BDL-RTGS-ServiceJavaApp (Pure Java SE)");
                resp.put("status", "UP");
                resp.put("minAmountRtgs", appConfig.getMinAmount());
                resp.put("ribCompteInterne", appConfig.getCompteInterneRib());
                resp.put("totalTransactionsRecorded", registryService.getAll().size());
                sendJsonResponse(exchange, 200, resp);
            });

            // 2. GET /api/transactions
            server.createContext("/api/transactions", exchange -> {
                sendJsonResponse(exchange, 200, registryService.getAll());
            });

            // 3. POST /api/scan-now
            server.createContext("/api/scan-now", exchange -> {
                watcherService.scanInbox();
                Map<String, String> resp = new HashMap<>();
                resp.put("message", "Scrutation du dossier inbox exécutée.");
                sendJsonResponse(exchange, 200, resp);
            });

            // 4. POST /api/check-compta-now
            server.createContext("/api/check-compta-now", exchange -> {
                accountingCheckService.checkAccountingStatus();
                Map<String, String> resp = new HashMap<>();
                resp.put("message", "Vérification comptabilité exécutée.");
                sendJsonResponse(exchange, 200, resp);
            });

            server.setExecutor(null); // Executor par défaut
            server.start();
            log.info("[SimpleHttpServer] API HTTP légère démarrée sur http://localhost:" + appConfig.getHttpServerPort() + "/api/health");
        } catch (IOException e) {
            log.warning("[SimpleHttpServer] Impossible de démarrer le serveur HTTP sur le port "
                    + appConfig.getHttpServerPort() + " : " + e.getMessage());
        }
    }

    public void stop() {
        if (server != null) {
            server.stop(1);
            log.info("[SimpleHttpServer] Serveur HTTP arrêté.");
        }
    }

    private void sendJsonResponse(HttpExchange exchange, int statusCode, Object data) throws IOException {
        byte[] bytes = objectMapper.writeValueAsString(data).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
