const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Remise = sequelize.define('Remise', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  nomFichier: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  dateRemiseOrdre: {
    type: DataTypes.STRING(8), // AAAAMMJJ
    allowNull: true
  },
  referenceRemise: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  codeBanqueDonneur: {
    type: DataTypes.STRING(3),
    allowNull: true
  },
  natureOperation: {
    type: DataTypes.STRING(3),
    defaultValue: '010'
  },
  natureFonds: {
    type: DataTypes.STRING(1),
    defaultValue: '0'
  },
  ribDonneurOrdre: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  nomDonneurOrdre: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  adresseDonneurOrdre: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  nombreOperations: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  montantTotal: {
    type: DataTypes.DECIMAL(18, 2),
    defaultValue: 0
  },
  statut: {
    type: DataTypes.ENUM('RECU', 'EN_COURS', 'TRAITE_COMPLET', 'TRAITE_PARTIEL', 'IGNORE', 'ERREUR'),
    defaultValue: 'RECU'
  },
  cheminFichier: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Remise;
