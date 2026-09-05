const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FolderConfig = sequelize.define('FolderConfig', {
  folderKey: {
    type: DataTypes.STRING,
    primaryKey: true, // 'source', 'generated_od', 'si_retour', 'generated_mt103'
    allowNull: false
  },
  label: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('LOCAL', 'FTP', 'SFTP'),
    defaultValue: 'LOCAL',
    allowNull: false
  },
  localPath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  host: {
    type: DataTypes.STRING,
    allowNull: true
  },
  port: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 21
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  remotePath: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '/'
  },
  secureTls: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  lastTestStatus: {
    type: DataTypes.ENUM('UNKNOWN', 'SUCCESS', 'ERROR'),
    defaultValue: 'UNKNOWN'
  },
  lastTestMessage: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lastTestDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'folder_configs',
  timestamps: true
});

module.exports = FolderConfig;
