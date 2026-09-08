const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { FOLDERS } = require('../config/folders');
const processingService = require('./processingService');
const folderStorageService = require('./folderStorageService');
const { TraitementLog } = require('../models');

class FileWatcherService {
  constructor() {
    this.watcher = null;
    this.isRunning = false;
    this.pollInterval = null;
  }

  start() {
    if (this.isRunning) {
      console.log('[Watcher] Le service de surveillance est déjà actif.');
      return;
    }

    console.log(`[Watcher] Surveillance active sur le répertoire local : ${FOLDERS.source}`);

    // Surveillance locale chokidar
    this.watcher = chokidar.watch(FOLDERS.source, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: false,
      awaitWriteFinish: {
        stabilityThreshold: 1500,
        pollInterval: 200
      }
    });

    this.watcher.on('add', async (sourceFilePath) => {
      const fileName = path.basename(sourceFilePath);

      // Attendre un court instant pour s'assurer de la fin d'écriture
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        const { Remise } = require('../models');
        const existingRemise = await Remise.findOne({ where: { nomFichier: fileName } });
        if (existingRemise) {
          // Fichier déjà reçu et enregistré, on le laisse intact dans source sans le retraiter
          return;
        }

        console.log(`[Watcher] Nouveau fichier EDI détecté dans source/ : ${fileName}`);

        const inputFilePath = path.join(FOLDERS.input, fileName);

        // 1. Copier vers input/ sans supprimer du dossier source
        fs.copyFileSync(sourceFilePath, inputFilePath);
        console.log(`[Watcher] Fichier copié vers input/ (conservé intact dans source/) : ${inputFilePath}`);

        await TraitementLog.create({
          type: 'INGESTION',
          niveau: 'INFO',
          message: `Fichier ${fileName} détecté dans source/, copié vers input/ et conservé dans source/.`,
          nomFichier: fileName
        });

        // 2. Traiter le fichier
        await processingService.processEdiFile(inputFilePath, fileName);
      } catch (err) {
        console.error(`[Watcher] Erreur lors du transfert/traitement de ${fileName}:`, err);
        await TraitementLog.create({
          type: 'SYSTEM',
          niveau: 'ERROR',
          message: `Erreur surveillance pour ${fileName} : ${err.message}`,
          nomFichier: fileName
        });
      }
    });

    this.watcher.on('error', (error) => {
      console.error('[Watcher] Erreur du watcher chokidar:', error);
    });

    // Poller périodique distant (FTP/SFTP) toutes les 30 secondes
    this.pollInterval = setInterval(async () => {
      try {
        await folderStorageService.pollRemoteSource(async (filePath, fileName) => {
          await processingService.processEdiFile(filePath, fileName);
        });
      } catch (pollErr) {
        console.error('[Watcher] Erreur polling distant :', pollErr.message);
      }
    }, 30000);

    this.isRunning = true;
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isRunning = false;
    console.log('[Watcher] Surveillance arrêtée.');
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      watchedFolder: FOLDERS.source,
      inputFolder: FOLDERS.input,
      ignorerFolder: FOLDERS.ignorer,
      odFolder: FOLDERS.generated_od,
      mt103Folder: FOLDERS.generated_mt103,
      siRetourFolder: FOLDERS.si_retour
    };
  }
}

module.exports = new FileWatcherService();

