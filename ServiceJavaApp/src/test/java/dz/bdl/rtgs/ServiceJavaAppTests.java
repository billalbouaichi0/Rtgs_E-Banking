package dz.bdl.rtgs;

import dz.bdl.rtgs.config.AppConfig;
import dz.bdl.rtgs.generator.EdiWriter;
import dz.bdl.rtgs.model.AccountingStatus;
import dz.bdl.rtgs.model.EdiFile;
import dz.bdl.rtgs.model.EdiHeader;
import dz.bdl.rtgs.model.EdiTransaction;
import dz.bdl.rtgs.model.TransactionRecord;
import dz.bdl.rtgs.parser.EdiFixedLengthParser;
import dz.bdl.rtgs.service.EdiRoutingService;
import dz.bdl.rtgs.service.FileReconstitutionService;
import dz.bdl.rtgs.service.StorageRegistryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class ServiceJavaAppTests {

    @TempDir
    Path tempDir;

    private AppConfig appConfig;
    private EdiFixedLengthParser parser;
    private EdiWriter writer;
    private StorageRegistryService registryService;
    private EdiRoutingService routingService;
    private FileReconstitutionService reconstitutionService;

    @BeforeEach
    public void setup() {
        appConfig = new AppConfig();
        File inbox = tempDir.resolve("inbox").toFile();
        File outCore = tempDir.resolve("out_core").toFile();
        File compta = tempDir.resolve("compta").toFile();
        File outRecon = tempDir.resolve("out_recon").toFile();
        File archive = tempDir.resolve("archive").toFile();
        File rejected = tempDir.resolve("rejected").toFile();
        File registry = tempDir.resolve("registry.json").toFile();

        inbox.mkdirs();
        outCore.mkdirs();
        compta.mkdirs();
        outRecon.mkdirs();
        archive.mkdirs();
        rejected.mkdirs();

        appConfig.setInboxFolder(inbox.getAbsolutePath());
        appConfig.setOutCoreBankingFolder(outCore.getAbsolutePath());
        appConfig.setInboxComptaFolder(compta.getAbsolutePath());
        appConfig.setOutReconstitutedFolder(outRecon.getAbsolutePath());
        appConfig.setArchiveFolder(archive.getAbsolutePath());
        appConfig.setRejectedFolder(rejected.getAbsolutePath());
        appConfig.setRegistryFilePath(registry.getAbsolutePath());
        appConfig.setMinAmount(new BigDecimal("1000000.00"));
        appConfig.setCodeBanqueBdl("005");
        appConfig.setCompteInterneRib("00500133400218153023");
        appConfig.setCompteInterneNom("BDL COMPTE TRANSIT REGLEMENT RTGS");
        appConfig.setCompteInterneAdresse("DIRECTION GENERALE BDL ALGER");
        appConfig.setSimulationAutoCompta(false);

        parser = new EdiFixedLengthParser();
        writer = new EdiWriter();
        registryService = new StorageRegistryService(appConfig);

        reconstitutionService = new FileReconstitutionService(appConfig, writer, registryService);
        routingService = new EdiRoutingService(appConfig, parser, writer, registryService);
    }

    @Test
    public void testFullPipeline_Detection_Substitution_And_Reconstitution() throws IOException {
        // 1. Création d'un fichier EDI exemple avec 2 virements :
        // - Virement #1 : Donneur 005 -> Bénéf 008 (BEA), Montant = 2 437 358.00 DZD (Eligible RTGS)
        // - Virement #2 : Donneur 005 -> Bénéf 005 (Intrabancaire BDL), Montant = 500 000.00 DZD (Non RTGS)
        EdiHeader header = new EdiHeader();
        header.setTag("VIRM");
        header.setCodeBanqueDonneur("005");
        header.setNatureOperation("010");
        header.setNatureFonds("0");
        header.setIndicateurRibIban("1");
        header.setRibDonneurOrdre("00500133400218153023");
        header.setPrefixeIban("DZ00");
        header.setNomDonneurOrdre("ENTREPRISE NATIONALE INDUSTRIELLE");
        header.setAdresseDonneurOrdre("12 BOULEVARD DES MARTYRS ALGER");
        header.setDateRemiseOrdre("20260914");
        header.setReferenceRemise("001");
        header.setNombreOperations(2);
        header.setMontantTotal(new BigDecimal("2937358.00"));

        List<EdiTransaction> txs = new java.util.ArrayList<>();

        EdiTransaction tx1 = new EdiTransaction();
        tx1.setNumeroOrdre("0000010207");
        tx1.setIndicateurRibIban("1");
        tx1.setRibBeneficiaire("00806001906006101410"); // Banque 008 BEA != 005 BDL
        tx1.setPrefixeIban("DZ00");
        tx1.setNomBeneficiaire("SARL TECH LOGISTICS ALGERIE");
        tx1.setAdresseBeneficiaire("ZONE INDUSTRIELLE OUED SMAR ALGER");
        tx1.setMontant(new BigDecimal("2437358.00"));
        tx1.setLibelle("VIR FACTURE RTGS MATERIEL INFORMATIQUE");
        txs.add(tx1);

        EdiTransaction tx2 = new EdiTransaction();
        tx2.setNumeroOrdre("0000010208");
        tx2.setIndicateurRibIban("1");
        tx2.setRibBeneficiaire("00501001201234567890"); // Banque 005 BDL == 005 BDL (Intrabancaire)
        tx2.setPrefixeIban("DZ00");
        tx2.setNomBeneficiaire("CLIENT INTRABANCAIRE BDL");
        tx2.setAdresseBeneficiaire("CITE 500 LOGEMENTS OUARGLA");
        tx2.setMontant(new BigDecimal("500000.00"));
        tx2.setLibelle("REGLEMENT LOCAL INTRABANCAIRE");
        txs.add(tx2);

        EdiFile initialEdi = new EdiFile("remise_test.edi", header, txs, "FVIR");
        File testFile = new File(appConfig.getInboxFolder(), "remise_test.edi");
        writer.writeToFile(initialEdi, testFile);

        // 2. Traitement d'ingestion par EdiRoutingService
        boolean success = routingService.processIncomingEdi(testFile);
        assertTrue(success, "L'ingestion doit réussir");

        // Vérification que le fichier de sortie Core Banking avec RIB substitué a été créé
        File outSubst = new File(appConfig.getOutCoreBankingFolder(), "SUBST_remise_test.edi");
        assertTrue(outSubst.exists(), "Le fichier substitué doit être généré dans outCoreBanking");

        // Parse du fichier substitué pour vérifier le RIB du compte interne BDL
        EdiFile parsedSubst = parser.parse(outSubst);
        assertEquals("00500133400218153023", parsedSubst.getHeader().getRibDonneurOrdre(),
                "Le RIB donneur d'ordre de l'entête doit être le RIB du compte interne BDL");
        assertEquals("BDL COMPTE TRANSIT REGLEMENT RTGS", parsedSubst.getHeader().getNomDonneurOrdre().trim());

        // Vérification du registre
        List<TransactionRecord> records = registryService.getByOriginalFileName("remise_test.edi");
        assertEquals(2, records.size());

        TransactionRecord rtgsTx = records.stream().filter(TransactionRecord::isRtgsEligible).findFirst().orElse(null);
        assertNotNull(rtgsTx);
        assertEquals("0000010207", rtgsTx.getNumeroOrdre());
        assertEquals("00500133400218153023", rtgsTx.getOriginalRibDonneur());
        assertEquals("00806001906006101410", rtgsTx.getOriginalRibBeneficiaire());
        assertEquals(AccountingStatus.SUBSTITUE_ENVOYE_COMPTA, rtgsTx.getStatus());

        // 3. Confirmation de comptabilisation
        rtgsTx.setStatus(AccountingStatus.COMPTABILISE);
        rtgsTx.setAccountedAt(LocalDateTime.now());
        registryService.saveRecord(rtgsTx);

        // 4. Déclenchement de la reconstitution
        reconstitutionService.reconstituteEligibleFiles();

        // 5. Vérification du fichier reconstitué
        File outRecon = new File(appConfig.getOutReconstitutedFolder(), "RECONSTITUTED_remise_test.edi");
        assertTrue(outRecon.exists(), "Le fichier reconstitué doit être créé");

        EdiFile parsedRecon = parser.parse(outRecon);
        assertEquals("00500133400218153023", parsedRecon.getHeader().getRibDonneurOrdre(), "Le RIB donneur d'ordre d'origine est restitué");
        assertEquals(1, parsedRecon.getTransactions().size());
        EdiTransaction reconTx = parsedRecon.getTransactions().get(0);
        assertEquals("00806001906006101410", reconTx.getRibBeneficiaire(), "Le RIB bénéficiaire d'origine est restitué");
        assertEquals(new BigDecimal("2437358.00"), reconTx.getMontant());

        // Statut final du registre
        assertEquals(AccountingStatus.RECONSTITUE_PRET_RTGS, registryService.getById(rtgsTx.getId()).getStatus());
    }
}
