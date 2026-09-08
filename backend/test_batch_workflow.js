const { sequelize, Virement, Remise, SystemSetting } = require('./src/models');
const seedDatabase = require('./src/seeders/initData');
const processingService = require('./src/services/processingService');
const odSchedulerService = require('./src/services/odSchedulerService');
const { oracleService } = require('./src/config/oracle');
const fs = require('fs');
const path = require('path');
const { FOLDERS } = require('./src/config/folders');

async function testFullBatchWorkflow() {
  console.log('=== TEST DU NOUVEAU WORKFLOW LOT OD BATCH ET POLLING SAB ===\n');

  await seedDatabase();
  console.log('1. Base de données initialisée et seedée.');

  // Création d'un contenu EDI fictif avec 2 virements éligibles (> 1M DZD, interbancaire)
  // Format EDI BDL:
  // Ligne Entête 0302: '0302' + CDE_ETB(5) + CODE_GUICHET(5) + NUM_CPTE(11) + DEV(3) + DATE_ORDRE(8: YYYYMMDD) + NUM_REMISE(6) + ...
  const dateStr = '20260908';
  const header = `0302001000104100000000001DZD${dateStr}000099${' '.repeat(100)}`;
  // Ligne Virement 0602: '0602' + CDE_BANQUE_BENEF(3) + ... + MONTANT(16: centimes) + RIB_BENEF(20) + NOM_BENEF(30) + LIBELLE(30)
  // Virement 1: 1 500 000.00 DZD vers Banque 003 (SGA)
  const virement1 = `0602003001000104100000000001000001500000000003000000000000000001BENEFICIAIRE ALGERIE UN       VIREMENT FACTURE FOURNISSEUR 1 ${' '.repeat(50)}`;
  // Virement 2: 2 000 000.00 DZD vers Banque 014 (BEA)
  const virement2 = `0602014001000104100000000001000002000000000014000000000000000002BENEFICIAIRE ALGERIE DEUX     VIREMENT SALAIRES COMPLEMENTS  ${' '.repeat(50)}`;

  const ediContent = `${header}\n${virement1}\n${virement2}\n`;
  const ediFileName = `VIRMNE_TEST_BATCH_${Date.now()}.txt`;
  const ediFilePath = path.join(FOLDERS.input, ediFileName);

  fs.writeFileSync(ediFilePath, ediContent);
  console.log(`2. Fichier EDI créé : ${ediFileName}`);

  // Étape 1 : Ingestion EDI
  console.log('\n--- ÉTAPE 1 : INGESTION EDI ---');
  const resultIngestion = await processingService.processEdiFile(ediFilePath, ediFileName);
  console.log(`Résultat Ingestion : Remise ID = ${resultIngestion.remise.id}, ${resultIngestion.virements.length} virements traités.`);

  const virementsRecus = await Virement.findAll({ where: { remiseId: resultIngestion.remise.id } });
  for (const v of virementsRecus) {
    console.log(` - Virement ID ${v.id} | Statut : ${v.statut} | Montant : ${v.montant} DZD | Clé SAB : ${v.cleUniciteSab}`);
    if (v.statut !== 'RECU') {
      throw new Error(`Statut attendu 'RECU', obtenu: ${v.statut}`);
    }
  }

  // Étape 2 : Déclenchement de la Génération du Lot OD
  console.log('\n--- ÉTAPE 2 : GÉNÉRATION DU LOT OD BATCH (ZCPTODA9_*.dat) ---');
  const batchResult = await odSchedulerService.executerGenerationLotOd();
  console.log(`Résultat Lot OD : ${batchResult.message}`);
  console.log(`Fichier Lot OD : ${batchResult.nomFichierOd}`);

  if (batchResult.nomFichierOd) {
    const odFilePath = path.join(FOLDERS.generated_od, batchResult.nomFichierOd);
    console.log(`Vérification présence physique fichier OD : ${fs.existsSync(odFilePath)}`);
    console.log('Contenu OD généré :\n' + fs.readFileSync(odFilePath, 'utf-8'));
  }

  const virementsApresOd = await Virement.findAll({ where: { remiseId: resultIngestion.remise.id } });
  for (const v of virementsApresOd) {
    console.log(` - Virement ID ${v.id} | Statut : ${v.statut} | Fichier OD : ${v.fichierOdBatch}`);
    if (v.statut !== 'OD_GEN') {
      throw new Error(`Statut attendu 'OD_GEN', obtenu: ${v.statut}`);
    }
  }

  // Étape 3 : Simulation de comptabilisation dans SAB (Oracle)
  console.log('\n--- ÉTAPE 3 : SIMULATION COMPTABILISATION SAB & POLLING ---');
  // Passons les enregistrements en CPTODETA = '003' et CPTODDCO = 20260908
  for (const rec of oracleService.simulatedZcptod0) {
    rec.CPTODETA = '003';
    rec.CPTODDCO = 20260908;
  }
  console.log('Table sabstd.zcptod0 mise à jour en mode comptabilisé (003, DCO!=0).');

  // Lancement du polling de comptabilisation
  const sabCheckResult = await odSchedulerService.verifierComptabilisationSab();
  console.log(`Résultat Polling SAB : ${sabCheckResult.message}`);
  console.log(`Comptabilisés : ${sabCheckResult.comptabilises}, Intégrés : ${sabCheckResult.integres}`);

  const virementsFinaux = await Virement.findAll({ where: { remiseId: resultIngestion.remise.id } });
  for (const v of virementsFinaux) {
    console.log(` - Virement ID ${v.id} | Statut : ${v.statut}`);
    console.log(`   * MT103 : ${v.fichierMt103Genere}`);
    console.log(`   * SI_CPT : ${v.fichierSiCptGenere}`);
    if (v.statut !== 'ENVOYE') {
      throw new Error(`Statut attendu 'ENVOYE', obtenu: ${v.statut}`);
    }
  }

  console.log('\n=== TOUS LES TESTS DU WORKFLOW LOT OD ONT RÉUSSI AVEC SUCCÈS ! ===');
  process.exit(0);
}

testFullBatchWorkflow().catch(err => {
  console.error('ERREUR TEST WORKFLOW:', err);
  process.exit(1);
});
