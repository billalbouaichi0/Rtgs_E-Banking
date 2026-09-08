const { sequelize, User, BanqueRef, FolderConfig, SystemSetting } = require('../models');
const { ensureDirectoriesExist, FOLDERS } = require('../config/folders');
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

const DEFAULT_FOLDERS_CONFIG = [
  {
    folderKey: 'source',
    label: 'Dossier Source (EDI Entrants)',
    description: 'Répertoire d acquisition et surveillance des fichiers remises EDI déposés',
    type: 'LOCAL',
    localPath: FOLDERS.source,
    host: '10.121.2.60',
    port: 21,
    username: 'ftp_edi',
    password: '',
    remotePath: '/edi/incoming',
    secureTls: false,
    isActive: true
  },
  {
    folderKey: 'generated_od',
    label: 'Dossier Fichiers OD (Débits)',
    description: 'Répertoire de stockage et transmission des Ordres de Débit générés',
    type: 'LOCAL',
    localPath: FOLDERS.generated_od,
    host: '10.121.2.60',
    port: 21,
    username: 'ftp_od',
    password: '',
    remotePath: '/accounting/od',
    secureTls: false,
    isActive: true
  },
  {
    folderKey: 'si_retour',
    label: 'Dossier SI Retour (Rejets & Confirmations)',
    description: 'Répertoire de dépôt des fichiers SI Retour (SI_VIR_RJT et SI_VIR_CPT)',
    type: 'LOCAL',
    localPath: FOLDERS.si_retour,
    host: '10.121.2.60',
    port: 21,
    username: 'ftp_retour',
    password: '',
    remotePath: '/si/retour',
    secureTls: false,
    isActive: true
  },
  {
    folderKey: 'generated_mt103',
    label: 'Dossier SWIFT MT103',
    description: 'Répertoire de génération et acheminement des messages RTGS SWIFT MT103',
    type: 'LOCAL',
    localPath: FOLDERS.generated_mt103,
    host: '10.121.2.60',
    port: 22,
    username: 'sftp_swift',
    password: '',
    remotePath: '/swift/outbound',
    secureTls: false,
    isActive: true
  }
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
            'RECU',
            'OD_GEN',
            'INTEGRE',
            'ENVOYE',
            'REJETE',
            'IGNORE_FILTRE',
            'VALIDE_TRAITE',
            'REJETE_SOLDE',
            'REJETE_DOUBLON',
            'EN_ATTENTE',
            'ATTENTE_VALIDATION_SOLDE',
            'ERREUR'
          ) DEFAULT 'RECU';
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

    // 3. Initialisation des configurations de dossiers multi-protocoles
    for (const folder of DEFAULT_FOLDERS_CONFIG) {
      const existing = await FolderConfig.findByPk(folder.folderKey);
      if (!existing) {
        await FolderConfig.create(folder);
      }
    }
    console.log('[Seed] Configurations des dossiers (Source, OD, SI Retour, MT103) initialisées.');

    // 4. Initialisation des paramètres du planificateur
    await SystemSetting.findOrCreate({
      where: { key: 'od_batch_hours' },
      defaults: {
        value: JSON.stringify(['12:00', '15:00', '16:30']),
        description: 'Heures programmées de génération du lot OD'
      }
    });

    await SystemSetting.findOrCreate({
      where: { key: 'sab_poll_interval_minutes' },
      defaults: {
        value: '5',
        description: 'Fréquence en minutes du polling de comptabilisation SAB zcptod0'
      }
    });

    await SystemSetting.findOrCreate({
      where: { key: 'scheduler_auto_enabled' },
      defaults: {
        value: 'true',
        description: 'Activer/Désactiver le planificateur automatique OD & SAB'
      }
    });

    console.log('[Seed] Paramètres planificateur OD initialisés (12:00, 15:00, 16:30 - Check SAB 5 min).');
    console.log('[Seed] Initialisation complète terminée avec succès !');
  } catch (err) {
    console.error('[Seed] Erreur lors de l initialisation :', err);
  }
};

if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = seedDatabase;
