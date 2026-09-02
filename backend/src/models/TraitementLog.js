const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TraitementLog = sequelize.define('TraitementLog', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  type: {
    type: DataTypes.STRING(50), // INGESTION, FILTRE_RTGS, VERIF_ORACLE, GENERATION_MT103, GENERATION_OD, GENERATION_SI_RET, SYSTEM
    allowNull: false
  },
  niveau: {
    type: DataTypes.ENUM('INFO', 'SUCCESS', 'WARNING', 'ERROR'),
    defaultValue: 'INFO'
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true
  },
  nomFichier: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  virementId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = TraitementLog;
