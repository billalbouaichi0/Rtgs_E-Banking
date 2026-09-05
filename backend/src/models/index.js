const sequelize = require('../config/database');
const User = require('./User');
const BanqueRef = require('./BanqueRef');
const Remise = require('./Remise');
const Virement = require('./Virement');
const TraitementLog = require('./TraitementLog');
const FolderConfig = require('./FolderConfig');

// Relations
Remise.hasMany(Virement, { foreignKey: 'remiseId', as: 'virements', onDelete: 'CASCADE' });
Virement.belongsTo(Remise, { foreignKey: 'remiseId', as: 'remise' });

Virement.hasMany(TraitementLog, { foreignKey: 'virementId', as: 'logs' });
TraitementLog.belongsTo(Virement, { foreignKey: 'virementId', as: 'virement' });

module.exports = {
  sequelize,
  User,
  BanqueRef,
  Remise,
  Virement,
  TraitementLog,
  FolderConfig
};
