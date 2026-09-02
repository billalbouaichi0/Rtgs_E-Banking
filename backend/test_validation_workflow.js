const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const { sequelize, Virement, Remise, BanqueRef } = require('./src/models');
const processingService = require('./src/services/processingService');
const { FOLDERS } = require('./src/config/folders');

// Création d'une ligne EDI valide avec montant > 1M et banque différente
const buildEdi = (uniqueSuffix, numOrdre, ribBenef, montant) => {
  const pad = (str, len) => (str || '').padEnd(len, ' ').substring(0, len);
  const padNum = (num, len) => String(num).padStart(len, '0').substring(0, len);

  // Donneur = compte 004644017711561 (solde 500 000 DZD dans le simulateur)
  const header = `VIRM0050100100500464401771156137DZ00` +
    pad('ENTREPRISE BDL TEST', 50) +
    pad('12 RUE DES FRERES BOULAHROUF HYDRA ALGER', 70) +
    `20260902` +
    pad('001', 3) +
    `000001` +
    padNum(Math.round(montant * 100), 16) +
    pad('', 31);

  const corps = padNum(numOrdre, 10) +
    `1` +
    pad(ribBenef, 20) +
    `DZ00` +
    pad('FOURNISSEUR EQUIPEMENT BNA', 50) +
    pad('ZONE INDUSTRIELLE ROUIBA ALGER', 70) +
    padNum(Math.round(montant * 100), 15) +
    pad(`REGLEMENT FACTURE EQUIPEMENT ${uniqueSuffix}`, 70) +
    pad('', 80);

  const fin = `FVIR` + pad('', 96);

  return `${header}\r\n${corps}\r\n${fin}`;
};

async function runTest() {
  console.log('--- TEST WORKFLOW VALIDATION / REFUS MANUEL SOLDE INSUFFISANT ---');
  await sequelize.sync();

  const now = Date.now();

  // Test 1: Solde insuffisant -> Mise en attente (ATTENTE_VALIDATION_SOLDE)
  console.log('\n[Etape 1] Ingestion virement avec solde insuffisant (solde 500 000 DZD vs 8 000 000 DZD requis)');
  const ediContent1 = buildEdi(now, '800001', '00200110000000051924', 8000000);
  const tempPath1 = path.join(FOLDERS.input, `TEST_ATTENTE_SOLDE_${now}.edi`);
  fs.writeFileSync(tempPath1, ediContent1, 'utf-8');

  const result1 = await processingService.processEdiFile(tempPath1, `TEST_ATTENTE_SOLDE_${now}.edi`);
  console.log('Résultat Ingestion 1:', result1);

  const virement1 = await Virement.findOne({ where: { remiseId: result1.remiseId } });
  console.log(`Statut Virement 1: ${virement1.statut} (Attendu: ATTENTE_VALIDATION_SOLDE)`);
  console.log(`Fichier SI_RET généré ? ${virement1.fichierSiRetGenere || 'AUCUN (Correct)'}`);

  if (virement1.statut !== 'ATTENTE_VALIDATION_SOLDE') {
    throw new Error('Echec: Le virement aurait dû être en ATTENTE_VALIDATION_SOLDE');
  }

  // Test 2: Forçage / Validation manuelle de ce virement
  console.log('\n[Etape 2] Validation manuelle (Forçage OD + MT103)');
  const valResult = await processingService.validerVirementManuellement(virement1.id, { username: 'directeur_ag' });
  console.log('Résultat validation:', valResult.message);
  
  await virement1.reload();
  console.log(`Nouveau statut virement 1: ${virement1.statut} (Attendu: VALIDE_TRAITE)`);
  console.log(`Fichier MT103: ${virement1.fichierMt103Genere}`);
  console.log(`Fichier OD: ${virement1.fichierOdGenere}`);
  console.log(`Décision par: ${virement1.decisionPar}`);

  if (!virement1.fichierMt103Genere || !virement1.fichierOdGenere) {
    throw new Error('Echec: Fichiers OD/MT103 non générés après validation');
  }

  // Test 3: Deuxième virement -> Refus manuel (Génération SI_RET)
  console.log('\n[Etape 3] Ingestion deuxième virement pour test de Refus Manuel');
  const ediContent2 = buildEdi(now + 1, '800002', '00300110000000051924', 12000000);
  const tempPath2 = path.join(FOLDERS.input, `TEST_REFUS_SOLDE_${now}.edi`);
  fs.writeFileSync(tempPath2, ediContent2, 'utf-8');

  const result2 = await processingService.processEdiFile(tempPath2, `TEST_REFUS_SOLDE_${now}.edi`);
  const virement2 = await Virement.findOne({ where: { remiseId: result2.remiseId } });
  console.log(`Statut Virement 2 avant refus: ${virement2.statut}`);

  console.log('Action de Refus Manuel...');
  const refResult = await processingService.refuserVirementManuellement(virement2.id, { username: 'directeur_ag' }, 'Rejet confirmé par le gestionnaire');
  console.log('Résultat refus:', refResult.message);

  await virement2.reload();
  console.log(`Nouveau statut virement 2: ${virement2.statut} (Attendu: REJETE_SOLDE)`);
  console.log(`Fichier SI_RET: ${virement2.fichierSiRetGenere}`);

  if (!virement2.fichierSiRetGenere) {
    throw new Error('Echec: Fichier SI Retour non généré après refus');
  }

  console.log('\n--- TOUS LES TESTS DU WORKFLOW DE DECISION SONT VALIDES AVEC SUCCES ! ---');
}

runTest().then(() => process.exit(0)).catch((err) => {
  console.error('ERREUR TEST:', err);
  process.exit(1);
});
