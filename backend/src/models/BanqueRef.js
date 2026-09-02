const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BanqueRef = sequelize.define('BanqueRef', {
  codeBanque: {
    type: DataTypes.STRING(3),
    primaryKey: true,
    allowNull: false
  },
  nomBanque: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  bicSwift: {
    type: DataTypes.STRING(11),
    allowNull: false
  },
  compteReglement: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Compte de compensation / règlement interbancaire Banque d Algérie'
  }
}, {
  timestamps: true
});

module.exports = BanqueRef;
