package dz.bdl.rtgs.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;

@Configuration
public class AppConfig {

    @Value("${rtgs.folder.inbox:./data/inbox_edi}")
    private String inboxFolder;

    @Value("${rtgs.folder.out-core-banking:./data/out_core_banking}")
    private String outCoreBankingFolder;

    @Value("${rtgs.folder.inbox-compta:./data/inbox_compta}")
    private String inboxComptaFolder;

    @Value("${rtgs.folder.out-reconstituted:./data/out_reconstituted}")
    private String outReconstitutedFolder;

    @Value("${rtgs.folder.archive:./data/archive_edi}")
    private String archiveFolder;

    @Value("${rtgs.folder.rejected:./data/rejected_edi}")
    private String rejectedFolder;

    @Value("${rtgs.rules.min-amount:1000000.00}")
    private BigDecimal minAmount;

    @Value("${rtgs.rules.code-banque-bdl:005}")
    private String codeBanqueBdl;

    @Value("${rtgs.compte.interne.rib:00500133400218153023}")
    private String compteInterneRib;

    @Value("${rtgs.compte.interne.nom:BDL COMPTE TRANSIT REGLEMENT RTGS}")
    private String compteInterneNom;

    @Value("${rtgs.compte.interne.adresse:DIRECTION GENERALE BDL ALGER}")
    private String compteInterneAdresse;

    @Value("${rtgs.registry.file-path:./data/registry_transactions.json}")
    private String registryFilePath;

    @Value("${rtgs.simulation.auto-compta:true}")
    private boolean simulationAutoCompta;

    @Value("${rtgs.simulation.auto-compta-delay-ms:15000}")
    private long simulationAutoComptaDelayMs;

    public String getInboxFolder() { return inboxFolder; }
    public String getOutCoreBankingFolder() { return outCoreBankingFolder; }
    public String getInboxComptaFolder() { return inboxComptaFolder; }
    public String getOutReconstitutedFolder() { return outReconstitutedFolder; }
    public String getArchiveFolder() { return archiveFolder; }
    public String getRejectedFolder() { return rejectedFolder; }
    public BigDecimal getMinAmount() { return minAmount; }
    public String getCodeBanqueBdl() { return codeBanqueBdl; }
    public String getCompteInterneRib() { return compteInterneRib; }
    public String getCompteInterneNom() { return compteInterneNom; }
    public String getCompteInterneAdresse() { return compteInterneAdresse; }
    public String getRegistryFilePath() { return registryFilePath; }
    public boolean isSimulationAutoCompta() { return simulationAutoCompta; }
    public long getSimulationAutoComptaDelayMs() { return simulationAutoComptaDelayMs; }
}
