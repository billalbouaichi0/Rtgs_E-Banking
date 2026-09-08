const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Virement = sequelize.define('Virement', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  remiseId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  numeroOrdre: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  // Donneur d'ordre
  ribDonneur: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  codeBanqueDonneur: {
    type: DataTypes.STRING(3),
    allowNull: false
  },
  codeAgenceDonneur: {
    type: DataTypes.STRING(5),
    allowNull: false
  },
  compteDonneur15: {
    type: DataTypes.STRING(15),
    allowNull: false
  },
  nomDonneur: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  adresseDonneur: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  // Bénéficiaire
  ribBeneficiaire: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  codeBanqueBeneficiaire: {
    type: DataTypes.STRING(3),
    allowNull: false
  },
  codeAgenceBeneficiaire: {
    type: DataTypes.STRING(5),
    allowNull: false
  },
  nomBeneficiaire: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  adresseBeneficiaire: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  // Détails virement
  montant: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: false
  },
  libelle: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  dateValeur: {
    type: DataTypes.STRING(8), // AAAAMMJJ
    allowNull: true
  },
  // Clé d'unicité SAB Oracle: (comptedonneur||dateremise||numeroremise)
  cleUniciteSab: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  // Statut & Cycle de vie du virement
  // RECU -> OD_GEN -> INTEGRE -> ENVOYE | REJETE | IGNORE_FILTRE
  statut: {
    type: DataTypes.ENUM(
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
    ),
    defaultValue: 'RECU'
  },
  motifRejetOuIgnorer: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  decisionPar: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  decisionDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  decisionType: {
    type: DataTypes.STRING(30),
    allowNull: true
  },
  // Solde vérifié via Oracle 11g
  soldeCompteTrouve: {
    type: DataTypes.DECIMAL(18, 2),
    allowNull: true
  },
  oracleVerifie: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Horodatages des étapes SAB
  dateGenerationOd: {
    type: DataTypes.DATE,
    allowNull: true
  },
  dateIntegrationSab: {
    type: DataTypes.DATE,
    allowNull: true
  },
  dateComptabilisationSab: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Fichiers générés
  fichierOdBatch: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  fichierOdGenere: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  fichierMt103Genere: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  fichierSiRetGenere: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  fichierSiCptGenere: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Virement;
