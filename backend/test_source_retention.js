const fs = require('fs');
const path = require('path');
const { FOLDERS } = require('./src/config/folders');
const processingService = require('./src/services/processingService');
const { Remise, Virement } = require('./src/models');
const seedDatabase = require('./src/seeders/initData');

const buildHeaderLine = ({
  codeBanque = '005',
  natureOp = '010',
  natureFonds = '0',
  typeCompte = '1',
  rib = '00500133400218153023',
  ibanPrefix = 'DZ00',
  nom = 'ENTREPRISE NATIONALE INDUSTRIELLE',
  adresse = '12 BOULEVARD DES MARTYRS ALGER',
  date = '20260908',
  ref = '001',
  nbOp = 1,
  montantCentimes = 250000000
}) => {
  const part1 = 'VIRM'; // 4
  const part2 = String(codeBanque).padStart(3, '0').substring(0, 3); // 3
  const part3 = String(natureOp).padStart(3, '0').substring(0, 3); // 3
  const part4 = String(natureFonds).substring(0, 1); // 1
  const part5 = String(typeCompte).substring(0, 1); // 1
  const part6 = String(rib).padEnd(20, ' ').substring(0, 20); // 20
  const part7 = String(ibanPrefix).padEnd(4, ' ').substring(0, 4); // 4
  const part8 = String(nom).padEnd(50, ' ').substring(0, 50); // 50
  const part9 = String(adresse).padEnd(70, ' ').substring(0, 70); // 70
  const part10 = String(date).padEnd(8, '0').substring(0, 8); // 8
  const part11 = String(ref).padStart(3, '0').substring(0, 3); // 3
  const part12 = String(nbOp).padStart(6, '0').substring(0, 6); // 6
  const part13 = String(montantCentimes).padStart(16, '0').substring(0, 16); // 16
  const part14 = ''.padEnd(31, ' '); // 31
  return `${part1}${part2}${part3}${part4}${part5}${part6}${part7}${part8}${part9}${part10}${part11}${part12}${part13}${part14}`;
};

const buildCorpsLine = ({
  numOrdre = '0000010207',
  typeCompte = '1',
  ribBenif = '00806001906006101410',
  ibanPrefix = 'DZ00',
  nomBenif = 'SARL TECH LOGISTICS ALGERIE',
  adresseBenif = 'ZONE INDUSTRIELLE OUED SMAR ALGER',
  montantCentimes = 250000000,
  libelle = 'VIR FACTURE RTGS TEST SOURCE RETENTION'
}) => {
  const part1 = String(numOrdre).padEnd(10, ' ').substring(0, 10); // 10
  const part2 = String(typeCompte).substring(0, 1); // 1
  const part3 = String(ribBenif).padEnd(20, ' ').substring(0, 20); // 20
  const part4 = String(ibanPrefix).padEnd(4, ' ').substring(0, 4); // 4
  const part5 = String(nomBenif).padEnd(50, ' ').substring(0, 50); // 50
  const part6 = String(adresseBenif).padEnd(70, ' ').substring(0, 70); // 70
  const part7 = String(montantCentimes).padStart(15, '0').substring(0, 15); // 15
  const part8 = String(libelle).padEnd(70, ' ').substring(0, 70); // 70
  const part9 = ''.padEnd(80, ' '); // 80
  return `${part1}${part2}${part3}${part4}${part5}${part6}${part7}${part8}${part9}`;
};

async function testSourceRetention() {
  console.log('=== TEST CONSERVATION DES FICHIERS SOURCE SANS SUPPRESSION ET ANTI-REJOUÉ ===\n');

  await seedDatabase();

  const testFileName = `VIRMNE_SRC_TEST_${Date.now()}.txt`;
  const sourcePath = path.join(FOLDERS.source, testFileName);
  const inputPath = path.join(FOLDERS.input, testFileName);

  const header = buildHeaderLine({ date: '20260908', nbOp: 1, montantCentimes: 250000000 });
  const corps = buildCorpsLine({ numOrdre: '0000099901', montantCentimes: 250000000 });
  const content = `${header}\n${corps}\nFVIR${''.padEnd(96, ' ')}\n`;

  // 1. Écriture du fichier dans source
  fs.writeFileSync(sourcePath, content, 'utf-8');
  fs.copyFileSync(sourcePath, inputPath);
  console.log(`1. Fichier créé dans source : ${sourcePath}`);

  // 2. Premier traitement
  console.log('\n2. Premier passage de traitement...');
  const res1 = await processingService.processEdiFile(inputPath, testFileName);
  console.log('Résultat 1er passage :', res1);

  // Vérification que le fichier existe TOUJOURS dans source
  const stillInSource = fs.existsSync(sourcePath);
  console.log(`\n3. Vérification présence physique dans source/ : ${stillInSource ? 'OUI (CONSERVÉ ✅)' : 'NON (ERREUR ❌)'}`);
  if (!stillInSource) {
    throw new Error('Le fichier source a été supprimé !');
  }

  // 3. Deuxième tentative de traitement avec le même nom de fichier (simulant un re-scan du watcher)
  console.log('\n4. Deuxième passage de traitement (détection doublon fichier)...');
  const res2 = await processingService.processEdiFile(inputPath, testFileName);
  console.log('Résultat 2ème passage :', res2);

  if (!res2.alreadyProcessed) {
    throw new Error('Le fichier aurait dû être ignoré car déjà traité.');
  }

  // Vérification nombre de remises créées (doit être exactement 1)
  const remisesCount = await Remise.count({ where: { nomFichier: testFileName } });
  console.log(`\n5. Nombre de remises enregistrées pour ${testFileName} : ${remisesCount}`);
  if (remisesCount !== 1) {
    throw new Error(`Attendu 1 remise, trouvé ${remisesCount}`);
  }

  console.log('\n✅ TEST RÉUSSI : Les fichiers restent dans source/ et les fichiers déjà reçus ne sont jamais retraités !');
  process.exit(0);
}

testSourceRetention().catch(err => {
  console.error('Erreur test:', err);
  process.exit(1);
});
