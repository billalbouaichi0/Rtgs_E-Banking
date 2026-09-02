const SiRetourGenerator = require('./src/generators/siRetourGenerator');

console.log('=== TEST GÉNÉRATEUR SI_RETOUR NORME BDL ===\n');

const mockVirement = {
  nomFichier: 'VIRMNE_31800215_2605260011.txt',
  referenceRemise: '1260526',
  libelle: '01041',
  motifRejetOuIgnorer: 'Remise en double detectee',
  montant: 2500000.00
};

const fileName = SiRetourGenerator.getFileName(mockVirement);
const content = SiRetourGenerator.generate(mockVirement);

console.log('1. Nom du fichier généré :');
console.log('  ', fileName);

console.log('\n2. Contenu du fichier généré :');
console.log('  ', content);

// Assertions
const expectedRegex = /^SI_VIR_RJT_VIRMNE_\d{8}_\d{6}\.txt$/;
if (!expectedRegex.test(fileName)) {
  console.error('\n❌ ERREUR: Le nom de fichier ne respecte pas SI_VIR_RJT_VIRMNE_YYYYMMDD_HHMMSS.txt');
  process.exit(1);
}

const expectedContent = 'Le virement dont le nom du fichier VIRMNE_31800215_2605260011.txt_1260526 est rejete pour motif: Remise en double detectee                                             _01041.';
if (content !== expectedContent) {
  console.error('\n❌ ERREUR: Le contenu ne correspond pas exactement !');
  console.error('Attendu :');
  console.error(expectedContent);
  console.error('Reçu :');
  console.error(content);
  process.exit(1);
}

console.log('\n✅ TEST RÉUSSI : Format de nom et de contenu 100% conforme à la spécification BDL !');
process.exit(0);
