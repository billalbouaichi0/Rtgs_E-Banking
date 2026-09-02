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
  // Statut & Décision
  statut: {
    type: DataTypes.ENUM(
      'VALIDE_TRAITE',
      'REJETE_SOLDE',
      'IGNORE_FILTRE',
      'EN_ATTENTE',
      'ATTENTE_VALIDATION_SOLDE',
      'ERREUR'
    ),
    defaultValue: 'EN_ATTENTE'
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
  // Fichiers générés
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
  }
}, {
  timestamps: true
});

module.exports = Virement;
