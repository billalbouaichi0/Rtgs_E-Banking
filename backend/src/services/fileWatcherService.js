const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const { FOLDERS } = require('../config/folders');
const processingService = require('./processingService');
const { TraitementLog } = require('../models');

class FileWatcherService {
  constructor() {
    this.watcher = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('[Watcher] Le service de surveillance est déjà actif.');
      return;
    }

    console.log(`[Watcher] Surveillance active sur le répertoire : ${FOLDERS.source}`);

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
      console.log(`[Watcher] Nouveau fichier détecté dans source/ : ${fileName}`);

      // Attendre un court instant pour s'assurer de la fin d'écriture
      await new Promise((resolve) => setTimeout(resolve, 500));

      const inputFilePath = path.join(FOLDERS.input, fileName);

      try {
        // 1. Copier vers input/
        fs.copyFileSync(sourceFilePath, inputFilePath);
        console.log(`[Watcher] Fichier copié vers input/ : ${inputFilePath}`);

        // Supprimer du dossier source après copie réussie
        fs.unlinkSync(sourceFilePath);

        await TraitementLog.create({
          type: 'INGESTION',
          niveau: 'INFO',
          message: `Fichier ${fileName} détecté dans le répertoire source et transféré vers input/.`,
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

    this.isRunning = true;
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.isRunning = false;
      console.log('[Watcher] Surveillance arrêtée.');
    }
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
