const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

const useSqlite = process.env.USE_SQLITE_FALLBACK === 'true';

let sequelize;

if (!useSqlite && process.env.DB_DIALECT === 'mysql') {
  const dbName = process.env.DB_NAME || 'rtgs_ebanking';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbHost = process.env.DB_HOST || '127.0.0.1';
  const dbPort = Number(process.env.DB_PORT) || 3306;

  // Création automatique de la base de données MySQL si elle n'existe pas encore
  (async () => {
    try {
      const connection = await mysql.createConnection({
        host: dbHost,
        port: dbPort,
        user: dbUser,
        password: dbPassword
      });
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await connection.end();
      console.log(`[MySQL] Base de données '${dbName}' vérifiée/créée.`);
    } catch (err) {
      console.warn(`[MySQL] Note lors de l auto-création de la base :`, err.message);
    }
  })();

  sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
  console.log(`[Database] Mode MySQL actif (${dbHost}:${dbPort}/${dbName})`);
} else {
  const dbFile = path.resolve(__dirname, '../../database.sqlite');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbFile,
    logging: false
  });
  console.log(`[Database] Mode SQLite actif (${dbFile})`);
}

module.exports = sequelize;
