const { sequelize, User, BanqueRef } = require('../models');
const { ensureDirectoriesExist } = require('../config/folders');
require('dotenv').config();

const BANQUES_ALGERIE = [
  { codeBanque: '001', nomBanque: 'BANQUE D ALGERIE', bicSwift: 'BALGDZALXXX', compteReglement: '9711000001' },
  { codeBanque: '002', nomBanque: 'BNA - BANQUE NATIONALE D ALGERIE', bicSwift: 'BNALDZALXXX', compteReglement: '9711000002' },
  { codeBanque: '003', nomBanque: 'BEA - BANQUE EXTERIEURE D ALGERIE', bicSwift: 'BEAADZALXXX', compteReglement: '9711000003' },
  { codeBanque: '004', nomBanque: 'CPA - CREDIT POPULAIRE D ALGERIE', bicSwift: 'CPALZALXXX', compteReglement: '9711000004' },
  { codeBanque: '005', nomBanque: 'BDL - BANQUE DE DEVELOPPEMENT LOCAL', bicSwift: 'BDLODZALXXX', compteReglement: '9711000005' },
  { codeBanque: '006', nomBanque: 'BADR - BANQUE DE L AGRICULTURE ET DU DEV. RURAL', bicSwift: 'BADRDZALXXX', compteReglement: '9711000006' },
  { codeBanque: '007', nomBanque: 'CNEP-BANQUE', bicSwift: 'CNEPDZALXXX', compteReglement: '9711000007' },
  { codeBanque: '008', nomBanque: 'SOCIETE GENERALE ALGERIE (SGA)', bicSwift: 'SGENALAGXXX', compteReglement: '9711000008' },
  { codeBanque: '009', nomBanque: 'BNP PARIBAS EL DJAZAIR', bicSwift: 'BNPADZALXXX', compteReglement: '9711000009' },
  { codeBanque: '010', nomBanque: 'AL BARAKA BANK ALGERIA', bicSwift: 'BARKDZALXXX', compteReglement: '9711000010' },
  { codeBanque: '011', nomBanque: 'CITIBANK N.A. ALGERIA', bicSwift: 'CITIDZALXXX', compteReglement: '9711000011' },
  { codeBanque: '012', nomBanque: 'ARAB BANKING CORPORATION (ABC)', bicSwift: 'ABCOALAGXXX', compteReglement: '9711000012' },
  { codeBanque: '013', nomBanque: 'NATIXIS ALGERIE', bicSwift: 'NATXDZALXXX', compteReglement: '9711000013' },
  { codeBanque: '014', nomBanque: 'GULF BANK ALGERIA (AGB)', bicSwift: 'AGBADZALXXX', compteReglement: '9711000014' },
  { codeBanque: '015', nomBanque: 'HOUSING BANK FOR TRADING & FINANCE', bicSwift: 'HBTHDZALXXX', compteReglement: '9711000015' },
  { codeBanque: '016', nomBanque: 'AL SALAM BANK ALGERIA', bicSwift: 'SALMDZALXXX', compteReglement: '9711000016' },
  { codeBanque: '017', nomBanque: 'FRANSABANK EL DJAZAIR', bicSwift: 'FSBKDZALXXX', compteReglement: '9711000017' }
];

const seedDatabase = async () => {
  try {
    ensureDirectoriesExist();
    await sequelize.sync({ alter: true });
    
    // Assurer la mise à jour de l'ENUM statut dans MySQL
    if (sequelize.getDialect() === 'mysql') {
      try {
        await sequelize.query(`
          ALTER TABLE \`virements\` 
          MODIFY COLUMN \`statut\` ENUM(
            'VALIDE_TRAITE',
            'REJETE_SOLDE',
            'REJETE_DOUBLON',
            'IGNORE_FILTRE',
            'EN_ATTENTE',
            'ATTENTE_VALIDATION_SOLDE',
            'ERREUR'
          ) DEFAULT 'EN_ATTENTE';
        `);
      } catch (e) {
        // Table non créée ou déjà à jour
      }
    }
    console.log('[Database] Tables synchronisées.');

    // 1. Initialisation des utilisateurs
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      await User.create({
        username: 'admin',
        email: 'admin@bdl.dz',
        password: 'admin123',
        fullName: 'Administrateur RTGS BDL',
        role: 'administrateur'
      });
      console.log('[Seed] Utilisateur Administrateur créé : admin / admin123');
    }

    const consultantExists = await User.findOne({ where: { username: 'consultant' } });
    if (!consultantExists) {
      await User.create({
        username: 'consultant',
        email: 'consultant@bdl.dz',
        password: 'consult123',
        fullName: 'Agent Consultation RTGS',
        role: 'consultation'
      });
      console.log('[Seed] Utilisateur Consultation créé : consultant / consult123');
    }

    // 2. Initialisation des banques
    for (const b of BANQUES_ALGERIE) {
      await BanqueRef.upsert(b);
    }
    console.log(`[Seed] ${BANQUES_ALGERIE.length} banques algériennes initialisées.`);

    console.log('[Seed] Initialisation complète terminée avec succès !');
  } catch (err) {
    console.error('[Seed] Erreur lors de l initialisation :', err);
  }
};

if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = seedDatabase;
