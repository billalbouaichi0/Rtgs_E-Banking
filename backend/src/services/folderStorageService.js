const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');
const SftpClient = require('ssh2-sftp-client');
const { FOLDERS } = require('../config/folders');
const { FolderConfig, TraitementLog } = require('../models');

class FolderStorageService {
  /**
   * Récupère la configuration d'un dossier par sa clé
   * @param {string} folderKey ('source', 'generated_od', 'si_retour', 'generated_mt103')
   */
  async getConfig(folderKey) {
    let config = await FolderConfig.findByPk(folderKey);
    if (!config) {
      // Fallback par défaut
      config = {
        folderKey,
        type: 'LOCAL',
        localPath: FOLDERS[folderKey] || path.join(FOLDERS.root, folderKey),
        isActive: true
      };
    }
    return config;
  }

  /**
   * Récupère toutes les configurations de dossiers
   */
  async getAllConfigs() {
    return await FolderConfig.findAll({
      order: [['folderKey', 'ASC']]
    });
  }

  /**
   * Met à jour la configuration d'un dossier
   */
  async updateConfig(folderKey, data) {
    let config = await FolderConfig.findByPk(folderKey);
    if (!config) {
      config = await FolderConfig.create({ folderKey, ...data });
    } else {
      await config.update(data);
    }
    return config;
  }

  /**
   * Écrit un fichier généré (OD, MT103, SI Retour)
   * Sauvegarde TOUJOURS une copie locale dans directories/ pour consultation UI
   * et transmet via FTP ou SFTP si configuré.
   * 
   * @param {string} folderKey 'generated_od' | 'generated_mt103' | 'si_retour'
   * @param {string} fileName Nom du fichier
   * @param {string|Buffer} content Contenu du fichier
   */
  async writeOutputFile(folderKey, fileName, content) {
    const config = await this.getConfig(folderKey);
    const defaultLocalDir = FOLDERS[folderKey] || path.join(FOLDERS.root, folderKey);

    // 1. Toujours écrire la copie locale par défaut (pour l'affichage web)
    if (!fs.existsSync(defaultLocalDir)) {
      fs.mkdirSync(defaultLocalDir, { recursive: true });
    }
    const localFilePath = path.join(defaultLocalDir, fileName);
    fs.writeFileSync(localFilePath, content, 'utf-8');
    console.log(`[Storage] Fichier écrit en local (${folderKey}) : ${localFilePath}`);

    // Si le dossier est configuré sur un chemin local personnalisé différent
    if (config.type === 'LOCAL' && config.localPath && config.localPath !== defaultLocalDir) {
      try {
        if (!fs.existsSync(config.localPath)) {
          fs.mkdirSync(config.localPath, { recursive: true });
        }
        const customLocalPath = path.join(config.localPath, fileName);
        fs.writeFileSync(customLocalPath, content, 'utf-8');
        console.log(`[Storage] Fichier écrit vers chemin local personnalisé : ${customLocalPath}`);
      } catch (err) {
        console.error(`[Storage] Erreur écriture dossier local personnalisé (${folderKey}) :`, err);
      }
    }

    // 2. Transfert distant FTP
    if (config.type === 'FTP' && config.isActive && config.host) {
      try {
        await this.uploadViaFtp(config, fileName, content);
        await TraitementLog.create({
          type: 'TRANSFERT_FTP',
          niveau: 'INFO',
          message: `Fichier ${fileName} transféré avec succès par FTP vers ${config.host}:${config.port || 21}${config.remotePath || '/'}`,
          nomFichier: fileName,
          details: { folderKey, host: config.host, protocol: 'FTP' }
        });
      } catch (err) {
        console.error(`[Storage FTP] Échec transfert ${fileName} vers ${config.host}:`, err);
        await TraitementLog.create({
          type: 'TRANSFERT_FTP',
          niveau: 'ERROR',
          message: `Échec du transfert FTP pour ${fileName} vers ${config.host} : ${err.message}`,
          nomFichier: fileName,
          details: { folderKey, host: config.host, error: err.message }
        });
      }
    }

    // 3. Transfert distant SFTP
    if (config.type === 'SFTP' && config.isActive && config.host) {
      try {
        await this.uploadViaSftp(config, fileName, content);
        await TraitementLog.create({
          type: 'TRANSFERT_SFTP',
          niveau: 'INFO',
          message: `Fichier ${fileName} transféré avec succès par SFTP vers ${config.host}:${config.port || 22}${config.remotePath || '/'}`,
          nomFichier: fileName,
          details: { folderKey, host: config.host, protocol: 'SFTP' }
        });
      } catch (err) {
        console.error(`[Storage SFTP] Échec transfert ${fileName} vers ${config.host}:`, err);
        await TraitementLog.create({
          type: 'TRANSFERT_SFTP',
          niveau: 'ERROR',
          message: `Échec du transfert SFTP pour ${fileName} vers ${config.host} : ${err.message}`,
          nomFichier: fileName,
          details: { folderKey, host: config.host, error: err.message }
        });
      }
    }

    return {
      localFilePath,
      fileName,
      configType: config.type
    };
  }

  /**
   * Upload vers un serveur FTP via basic-ftp
   */
  async uploadViaFtp(config, fileName, content) {
    const client = new ftp.Client(30000); // 30s timeout
    client.ftp.verbose = false;

    try {
      await client.access({
        host: config.host,
        port: Number(config.port) || 21,
        user: config.username || 'anonymous',
        password: config.password || '',
        secure: Boolean(config.secureTls)
      });

      const remoteDir = config.remotePath || '/';
      await client.ensureDir(remoteDir);

      // Convertir content en Readable Stream
      const stream = require('stream').Readable.from(content);
      const remoteFilePath = path.posix.join(remoteDir, fileName);
      await client.uploadFrom(stream, remoteFilePath);
      console.log(`[Storage FTP] Upload réussi : ${remoteFilePath}`);
    } finally {
      client.close();
    }
  }

  /**
   * Upload vers un serveur SFTP via ssh2-sftp-client
   */
  async uploadViaSftp(config, fileName, content) {
    const sftp = new SftpClient();

    try {
      await sftp.connect({
        host: config.host,
        port: Number(config.port) || 22,
        username: config.username || 'root',
        password: config.password || '',
        readyTimeout: 20000
      });

      const remoteDir = config.remotePath || '/';
      // S'assurer que le dossier distant existe
      const dirExists = await sftp.exists(remoteDir);
      if (!dirExists) {
        await sftp.mkdir(remoteDir, true);
      }

      const remoteFilePath = path.posix.join(remoteDir, fileName);
      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
      await sftp.put(buffer, remoteFilePath);
      console.log(`[Storage SFTP] Upload réussi : ${remoteFilePath}`);
    } finally {
      await sftp.end();
    }
  }

  /**
   * Teste la connexion à un dossier (LOCAL, FTP, SFTP)
   */
  async testConnection(configData) {
    const type = configData.type || 'LOCAL';
    const result = {
      type,
      success: false,
      message: '',
      timestamp: new Date()
    };

    try {
      if (type === 'LOCAL') {
        const localPath = configData.localPath || FOLDERS[configData.folderKey] || FOLDERS.source;
        if (!fs.existsSync(localPath)) {
          fs.mkdirSync(localPath, { recursive: true });
        }
        // Test écriture et suppression fichier temporaire
        const testFile = path.join(localPath, `.test_write_${Date.now()}.tmp`);
        fs.writeFileSync(testFile, 'BDL_TEST_ACCESS_OK', 'utf-8');
        fs.unlinkSync(testFile);

        result.success = true;
        result.message = `Accès local vérifié avec succès en lecture/écriture : ${localPath}`;
      } else if (type === 'FTP') {
        const client = new ftp.Client(10000);
        client.ftp.verbose = false;
        try {
          await client.access({
            host: configData.host,
            port: Number(configData.port) || 21,
            user: configData.username || 'anonymous',
            password: configData.password || '',
            secure: Boolean(configData.secureTls)
          });
          const remoteDir = configData.remotePath || '/';
          await client.ensureDir(remoteDir);
          const list = await client.list();

          result.success = true;
          result.message = `Connexion FTP réussie sur ${configData.host}:${configData.port || 21}${remoteDir} (${list.length} élément(s) détecté(s)).`;
        } finally {
          client.close();
        }
      } else if (type === 'SFTP') {
        const sftp = new SftpClient();
        try {
          await sftp.connect({
            host: configData.host,
            port: Number(configData.port) || 22,
            username: configData.username,
            password: configData.password,
            readyTimeout: 10000
          });
          const remoteDir = configData.remotePath || '/';
          const list = await sftp.list(remoteDir);

          result.success = true;
          result.message = `Connexion SFTP SSH réussie sur ${configData.host}:${configData.port || 22}${remoteDir} (${list.length} élément(s) détecté(s)).`;
        } finally {
          await sftp.end();
        }
      }

      // Si folderKey est présent, mettre à jour le statut dans la DB
      if (configData.folderKey) {
        await FolderConfig.update({
          lastTestStatus: result.success ? 'SUCCESS' : 'ERROR',
          lastTestMessage: result.message,
          lastTestDate: new Date()
        }, { where: { folderKey: configData.folderKey } });
      }

      return result;
    } catch (err) {
      result.success = false;
      result.message = `Erreur de connexion [${type}] : ${err.message}`;

      if (configData.folderKey) {
        await FolderConfig.update({
          lastTestStatus: 'ERROR',
          lastTestMessage: result.message,
          lastTestDate: new Date()
        }, { where: { folderKey: configData.folderKey } });
      }

      return result;
    }
  }

  /**
   * Scanne et rapatrie les fichiers source distants (FTP ou SFTP) vers input/
   */
  async pollRemoteSource(processingServiceCallback) {
    const config = await this.getConfig('source');
    if (!config.isActive || config.type === 'LOCAL') {
      return { polled: 0, message: 'Dossier source configuré en LOCAL ou inactif' };
    }

    let downloadedCount = 0;
    const downloadedFiles = [];

    if (config.type === 'FTP') {
      const client = new ftp.Client(30000);
      try {
        await client.access({
          host: config.host,
          port: Number(config.port) || 21,
          user: config.username || 'anonymous',
          password: config.password || '',
          secure: Boolean(config.secureTls)
        });

        const remoteDir = config.remotePath || '/';
        await client.cd(remoteDir);
        const fileList = await client.list();

        // Filtrer fichiers .edi ou .txt
        const targetFiles = fileList.filter(f => f.isFile && (f.name.endsWith('.edi') || f.name.endsWith('.txt')));

        const { Remise } = require('../models');

        for (const remoteFile of targetFiles) {
          const existing = await Remise.findOne({ where: { nomFichier: remoteFile.name } });
          if (existing) {
            // Déjà traité, conservé dans la source
            continue;
          }

          const localInputPath = path.join(FOLDERS.input, remoteFile.name);
          await client.downloadTo(localInputPath, remoteFile.name);
          downloadedCount++;
          downloadedFiles.push(remoteFile.name);

          console.log(`[Storage FTP Poll] Téléchargé (conservé dans la source) : ${remoteFile.name}`);

          if (processingServiceCallback) {
            await processingServiceCallback(localInputPath, remoteFile.name);
          }
        }
      } catch (err) {
        console.error('[Storage FTP Poll] Erreur lors du polling FTP :', err);
      } finally {
        client.close();
      }
    } else if (config.type === 'SFTP') {
      const sftp = new SftpClient();
      try {
        await sftp.connect({
          host: config.host,
          port: Number(config.port) || 22,
          username: config.username,
          password: config.password,
          readyTimeout: 15000
        });

        const remoteDir = config.remotePath || '/';
        const fileList = await sftp.list(remoteDir);
        const targetFiles = fileList.filter(f => f.type === '-' && (f.name.endsWith('.edi') || f.name.endsWith('.txt')));
        const { Remise } = require('../models');

        for (const remoteFile of targetFiles) {
          const existing = await Remise.findOne({ where: { nomFichier: remoteFile.name } });
          if (existing) {
            // Déjà traité, conservé dans la source
            continue;
          }

          const remoteFilePath = path.posix.join(remoteDir, remoteFile.name);
          const localInputPath = path.join(FOLDERS.input, remoteFile.name);

          await sftp.fastGet(remoteFilePath, localInputPath);
          downloadedCount++;
          downloadedFiles.push(remoteFile.name);

          console.log(`[Storage SFTP Poll] Téléchargé (conservé dans la source SFTP) : ${remoteFile.name}`);

          if (processingServiceCallback) {
            await processingServiceCallback(localInputPath, remoteFile.name);
          }
        }
      } catch (err) {
        console.error('[Storage SFTP Poll] Erreur lors du polling SFTP :', err);
      } finally {
        await sftp.end();
      }
    }

    return {
      polled: downloadedCount,
      files: downloadedFiles,
      message: `${downloadedCount} fichier(s) rapatrié(s) depuis ${config.type} (${config.host})`
    };
  }
}

module.exports = new FolderStorageService();
