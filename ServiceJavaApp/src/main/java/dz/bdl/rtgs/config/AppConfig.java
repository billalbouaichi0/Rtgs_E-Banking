package dz.bdl.rtgs.config;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.Properties;

/**
 * Gestionnaire de configuration Java Standard (chargement depuis config.properties)
 */
public class AppConfig {

    private String inboxFolder = "./data/inbox_edi";
    private String outCoreBankingFolder = "./data/out_core_banking";
    private String inboxComptaFolder = "./data/inbox_compta";
    private String outReconstitutedFolder = "./data/out_reconstituted";
    private String archiveFolder = "./data/archive_edi";
    private String rejectedFolder = "./data/rejected_edi";

    private BigDecimal minAmount = new BigDecimal("1000000.00");
    private String codeBanqueBdl = "005";
    private String compteInterneRib = "00500133400218153023";
    private String compteInterneNom = "BDL COMPTE TRANSIT REGLEMENT RTGS";
    private String compteInterneAdresse = "DIRECTION GENERALE BDL ALGER";

    private int inboxIntervalSeconds = 5;
    private int comptaIntervalSeconds = 10;
    private boolean simulationAutoCompta = true;
    private int simulationAutoComptaDelaySeconds = 15;
    private String registryFilePath = "./data/registry_transactions.json";
    private int httpServerPort = 8085;

    public static AppConfig load() {
        AppConfig config = new AppConfig();
        Properties props = new Properties();

        // 1. Essayer de charger depuis le classpath ou fichier local
        try (InputStream is = AppConfig.class.getClassLoader().getResourceAsStream("config.properties")) {
            if (is != null) {
                props.load(is);
            }
        } catch (Exception ignored) {}

        // 2. Surcharger avec config.properties situé à côté du JAR si présent
        File extFile = new File("config.properties");
        if (extFile.exists()) {
            try (InputStream is = new FileInputStream(extFile)) {
                props.load(is);
            } catch (Exception ignored) {}
        }

        config.inboxFolder = props.getProperty("rtgs.folder.inbox", config.inboxFolder);
        config.outCoreBankingFolder = props.getProperty("rtgs.folder.out-core-banking", config.outCoreBankingFolder);
        config.inboxComptaFolder = props.getProperty("rtgs.folder.inbox-compta", config.inboxComptaFolder);
        config.outReconstitutedFolder = props.getProperty("rtgs.folder.out-reconstituted", config.outReconstitutedFolder);
        config.archiveFolder = props.getProperty("rtgs.folder.archive", config.archiveFolder);
        config.rejectedFolder = props.getProperty("rtgs.folder.rejected", config.rejectedFolder);

        String minAmtStr = props.getProperty("rtgs.rules.min-amount");
        if (minAmtStr != null && !minAmtStr.trim().isEmpty()) {
            try { config.minAmount = new BigDecimal(minAmtStr.trim()); } catch (Exception ignored) {}
        }

        config.codeBanqueBdl = props.getProperty("rtgs.rules.code-banque-bdl", config.codeBanqueBdl);
        config.compteInterneRib = props.getProperty("rtgs.compte.interne.rib", config.compteInterneRib);
        config.compteInterneNom = props.getProperty("rtgs.compte.interne.nom", config.compteInterneNom);
        config.compteInterneAdresse = props.getProperty("rtgs.compte.interne.adresse", config.compteInterneAdresse);

        try {
            config.inboxIntervalSeconds = Integer.parseInt(props.getProperty("rtgs.polling.inbox-interval-seconds", String.valueOf(config.inboxIntervalSeconds)));
        } catch (Exception ignored) {}

        try {
            config.comptaIntervalSeconds = Integer.parseInt(props.getProperty("rtgs.polling.compta-interval-seconds", String.valueOf(config.comptaIntervalSeconds)));
        } catch (Exception ignored) {}

        config.simulationAutoCompta = Boolean.parseBoolean(props.getProperty("rtgs.simulation.auto-compta", String.valueOf(config.simulationAutoCompta)));

        try {
            config.simulationAutoComptaDelaySeconds = Integer.parseInt(props.getProperty("rtgs.simulation.auto-compta-delay-seconds", String.valueOf(config.simulationAutoComptaDelaySeconds)));
        } catch (Exception ignored) {}

        config.registryFilePath = props.getProperty("rtgs.registry.file-path", config.registryFilePath);

        try {
            config.httpServerPort = Integer.parseInt(props.getProperty("rtgs.http.server.port", String.valueOf(config.httpServerPort)));
        } catch (Exception ignored) {}

        return config;
    }

    public String getInboxFolder() { return inboxFolder; }
    public void setInboxFolder(String inboxFolder) { this.inboxFolder = inboxFolder; }

    public String getOutCoreBankingFolder() { return outCoreBankingFolder; }
    public void setOutCoreBankingFolder(String outCoreBankingFolder) { this.outCoreBankingFolder = outCoreBankingFolder; }

    public String getInboxComptaFolder() { return inboxComptaFolder; }
    public void setInboxComptaFolder(String inboxComptaFolder) { this.inboxComptaFolder = inboxComptaFolder; }

    public String getOutReconstitutedFolder() { return outReconstitutedFolder; }
    public void setOutReconstitutedFolder(String outReconstitutedFolder) { this.outReconstitutedFolder = outReconstitutedFolder; }

    public String getArchiveFolder() { return archiveFolder; }
    public void setArchiveFolder(String archiveFolder) { this.archiveFolder = archiveFolder; }

    public String getRejectedFolder() { return rejectedFolder; }
    public void setRejectedFolder(String rejectedFolder) { this.rejectedFolder = rejectedFolder; }

    public BigDecimal getMinAmount() { return minAmount; }
    public void setMinAmount(BigDecimal minAmount) { this.minAmount = minAmount; }

    public String getCodeBanqueBdl() { return codeBanqueBdl; }
    public void setCodeBanqueBdl(String codeBanqueBdl) { this.codeBanqueBdl = codeBanqueBdl; }

    public String getCompteInterneRib() { return compteInterneRib; }
    public void setCompteInterneRib(String compteInterneRib) { this.compteInterneRib = compteInterneRib; }

    public String getCompteInterneNom() { return compteInterneNom; }
    public void setCompteInterneNom(String compteInterneNom) { this.compteInterneNom = compteInterneNom; }

    public String getCompteInterneAdresse() { return compteInterneAdresse; }
    public void setCompteInterneAdresse(String compteInterneAdresse) { this.compteInterneAdresse = compteInterneAdresse; }

    public int getInboxIntervalSeconds() { return inboxIntervalSeconds; }
    public void setInboxIntervalSeconds(int inboxIntervalSeconds) { this.inboxIntervalSeconds = inboxIntervalSeconds; }

    public int getComptaIntervalSeconds() { return comptaIntervalSeconds; }
    public void setComptaIntervalSeconds(int comptaIntervalSeconds) { this.comptaIntervalSeconds = comptaIntervalSeconds; }

    public boolean isSimulationAutoCompta() { return simulationAutoCompta; }
    public void setSimulationAutoCompta(boolean simulationAutoCompta) { this.simulationAutoCompta = simulationAutoCompta; }

    public int getSimulationAutoComptaDelaySeconds() { return simulationAutoComptaDelaySeconds; }
    public void setSimulationAutoComptaDelaySeconds(int simulationAutoComptaDelaySeconds) { this.simulationAutoComptaDelaySeconds = simulationAutoComptaDelaySeconds; }

    public String getRegistryFilePath() { return registryFilePath; }
    public void setRegistryFilePath(String registryFilePath) { this.registryFilePath = registryFilePath; }

    public int getHttpServerPort() { return httpServerPort; }
    public void setHttpServerPort(int httpServerPort) { this.httpServerPort = httpServerPort; }
}
