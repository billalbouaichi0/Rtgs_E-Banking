const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '../../../');
const directoriesPath = path.join(rootDir, 'directories');

const FOLDERS = {
  root: directoriesPath,
  source: path.join(directoriesPath, 'source'),
  input: path.join(directoriesPath, 'input'),
  ignorer: path.join(directoriesPath, 'input', 'ignorer'),
  generated_od: path.join(directoriesPath, 'generated_od'),
  generated_mt103: path.join(directoriesPath, 'generated_mt103'),
  si_retour: path.join(directoriesPath, 'si_retour')
};

// Création automatique de tous les répertoires nécessaires
const ensureDirectoriesExist = () => {
  Object.values(FOLDERS).forEach((dirPath) => {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`[Folders] Dossier initialisé : ${dirPath}`);
    }
  });
};

module.exports = {
  FOLDERS,
  ensureDirectoriesExist
};
