const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { sequelize } = require('./models');
const { ensureDirectoriesExist } = require('./config/folders');
const seedDatabase = require('./seeders/initData');
const fileWatcherService = require('./services/fileWatcherService');
const oracleService = require('./config/oracle');

// Routes
const authRoutes = require('./routes/authRoutes');
const virementRoutes = require('./routes/virementRoutes');
const statsRoutes = require('./routes/statsRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/virements', virementRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/system', systemRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    system: 'BDL RTGS e-Banking EDI Processor',
    timestamp: new Date().toISOString()
  });
});

// Démarrage serveur et services
const startServer = async () => {
  try {
    ensureDirectoriesExist();

    // Connexion et synchronisation base de données
    await sequelize.authenticate();
    console.log('[Database] Connexion établie.');
    await seedDatabase();

    // Connexion Oracle 11g
    await oracleService.connect();

    // Démarrage du Watcher de surveillance de répertoire
    fileWatcherService.start();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`  BDL RTGS e-Banking Backend démarré sur le port ${PORT}`);
      console.log(`  API URL : http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('[Server] Échec du démarrage du serveur:', err);
    process.exit(1);
  }
};

startServer();
