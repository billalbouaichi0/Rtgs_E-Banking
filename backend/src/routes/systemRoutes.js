const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const fileWatcherService = require('../services/fileWatcherService');
const oracleService = require('../config/oracle');
const { BanqueRef } = require('../models');
const { FOLDERS } = require('../config/folders');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');

// Statut du Watcher
router.get('/watcher-status', verifyToken, (req, res) => {
  res.json(fileWatcherService.getStatus());
});

// Activer / Désactiver le Watcher
router.post('/watcher-toggle', verifyToken, requireAdmin, (req, res) => {
  const { action } = req.body;
  if (action === 'start') {
    fileWatcherService.start();
  } else if (action === 'stop') {
    fileWatcherService.stop();
  }
  res.json(fileWatcherService.getStatus());
});

// Liste des comptes SAB et mode de vérification actif
router.get('/oracle-accounts', verifyToken, (req, res) => {
  res.json({
    modeInfo: oracleService.getModeInfo(),
    isSimulatorMode: oracleService.isSimulatorMode,
    accounts: oracleService.getMockAccounts()
  });
});

// Mettre à jour / Ajouter un compte SAB
router.post('/oracle-accounts', verifyToken, requireAdmin, (req, res) => {
  const { comptecom, soldeDinar } = req.body;
  if (!comptecom || soldeDinar === undefined) {
    return res.status(400).json({ message: 'comptecom et soldeDinar sont requis.' });
  }
  oracleService.addOrUpdateMockAccount(comptecom, Number(soldeDinar));
  res.json({
    message: 'Compte SAB mis à jour avec succès',
    accounts: oracleService.getMockAccounts()
  });
});

// Référentiel des banques
router.get('/banques', verifyToken, async (req, res) => {
  try {
    const banques = await BanqueRef.findAll({
      order: [['codeBanque', 'ASC']]
    });
    res.json(banques);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mise à jour d'une banque (Admin)
router.post('/banques', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { codeBanque, nomBanque, bicSwift, compteReglement } = req.body;
    const [banque, created] = await BanqueRef.upsert({
      codeBanque,
      nomBanque,
      bicSwift,
      compteReglement
    });
    res.json({ message: 'Référentiel banque enregistré avec succès', banque });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Helper pour formater une ligne Entête EE EDI
const buildHeaderLine = ({
  codeBanque = '005',
  natureOp = '010',
  natureFonds = '0',
  typeCompte = '1',
  rib = '00500133400218153023',
  ibanPrefix = 'DZ00',
  nom = 'ENTREPRISE NATIONALE INDUSTRIELLE',
  adresse = '12 BOULEVARD DES MARTYRS ALGER',
  date = '20260902',
  ref = '001',
  nbOp = 1,
  montantCentimes = 243735800
}) => {
  const part1 = 'VIRM'; // 4
  const part2 = String(codeBanque).padStart(3, '0').substring(0, 3); // 3
  const part3 = String(natureOp).padStart(3, '0').substring(0, 3); // 3
  const part4 = String(natureFonds).substring(0, 1); // 1
  const part5 = String(typeCompte).substring(0, 1); // 1
  const part6 = String(rib).padEnd(20, ' ').substring(0, 20); // 20
  const part7 = String(ibanPrefix).padEnd(4, ' ').substring(0, 4); // 4
  const part8 = String(nom).padEnd(50, ' ').substring(0, 50); // 50
  const part9 = String(adresse).padEnd(70, ' ').substring(0, 70); // 70
  const part10 = String(date).padEnd(8, '0').substring(0, 8); // 8
  const part11 = String(ref).padStart(3, '0').substring(0, 3); // 3
  const part12 = String(nbOp).padStart(6, '0').substring(0, 6); // 6
  const part13 = String(montantCentimes).padStart(16, '0').substring(0, 16); // 16
  const part14 = ''.padEnd(31, ' '); // 31
  return `${part1}${part2}${part3}${part4}${part5}${part6}${part7}${part8}${part9}${part10}${part11}${part12}${part13}${part14}`;
};

// Helper pour formater une ligne Corps EC EDI
const buildCorpsLine = ({
  numOrdre = '0000010207',
  typeCompte = '1',
  ribBenif = '00806001906006101410',
  ibanPrefix = 'DZ00',
  nomBenif = 'SARL TECH LOGISTICS ALGERIE',
  adresseBenif = 'ZONE INDUSTRIELLE OUED SMAR ALGER',
  montantCentimes = 243735800,
  libelle = 'VIR FACTURE RTGS MATERIEL INFORMATIQUE ET RESEAUX'
}) => {
  const part1 = String(numOrdre).padEnd(10, ' ').substring(0, 10); // 10
  const part2 = String(typeCompte).substring(0, 1); // 1
  const part3 = String(ribBenif).padEnd(20, ' ').substring(0, 20); // 20
  const part4 = String(ibanPrefix).padEnd(4, ' ').substring(0, 4); // 4
  const part5 = String(nomBenif).padEnd(50, ' ').substring(0, 50); // 50
  const part6 = String(adresseBenif).padEnd(70, ' ').substring(0, 70); // 70
  const part7 = String(montantCentimes).padStart(15, '0').substring(0, 15); // 15
  const part8 = String(libelle).padEnd(70, ' ').substring(0, 70); // 70
  const part9 = ''.padEnd(80, ' '); // 80
  return `${part1}${part2}${part3}${part4}${part5}${part6}${part7}${part8}${part9}`;
};

// Helper pour formater une ligne Fin EF EDI
const buildFinLine = () => {
  return `FVIR${''.padEnd(96, ' ')}`;
};

// Générateur / Injecteur d'échantillons EDI dans source/
router.post('/simulate-edi', verifyToken, requireAdmin, (req, res) => {
  try {
    const { type = 'valide' } = req.body;
    const timestamp = Date.now();
    const fileName = `REMISE_SIMU_${type.toUpperCase()}_${timestamp}.edi`;
    const targetPath = path.join(FOLDERS.source, fileName);

    let ee = '';
    let ec = '';
    const ef = buildFinLine();

    if (type === 'valide') {
      // 2 437 358.00 DZD (243735800 centimes) -> BDL (005) vers SGA/BEA (008)
      // Compte SAB 001334002181530 solde 50M DZD
      ee = buildHeaderLine({
        codeBanque: '005',
        rib: '00500133400218153023',
        nom: 'ENTREPRISE NATIONALE INDUSTRIELLE',
        adresse: '12 BOULEVARD DES MARTYRS ALGER',
        montantCentimes: 243735800,
        ref: '001'
      });
      ec = buildCorpsLine({
        numOrdre: '0000010207',
        ribBenif: '00806001906006101410',
        nomBenif: 'SARL TECH LOGISTICS ALGERIE',
        adresseBenif: 'ZONE INDUSTRIELLE OUED SMAR ALGER',
        montantCentimes: 243735800,
        libelle: 'VIR FACTURE RTGS MATERIEL INFORMATIQUE ET RESEAUX'
      });
    } else if (type === 'solde_insuffisant') {
      // 15 000 000.00 DZD -> BDL vers BEA (003)
      // Compte SAB 001334002181531 solde 500k DZD
      ee = buildHeaderLine({
        codeBanque: '005',
        rib: '00500133400218153123',
        nom: 'SOCIETE ALGERIENNE DE COMMERCE',
        adresse: '45 AVENUE COLONEL AMIROUCHE ALGER',
        montantCentimes: 1500000000,
        ref: '002'
      });
      ec = buildCorpsLine({
        numOrdre: '0000020207',
        ribBenif: '00301001201234567890',
        nomBenif: 'GROUPE AGROALIMENTAIRE DU SUD',
        adresseBenif: 'CITE 500 LOGEMENTS OUARGLA',
        montantCentimes: 1500000000,
        libelle: 'REGLEMENT IMPORT CEREALES ET FARINE BLANCHE'
      });
    } else if (type === 'ignore_montant') {
      // 25 000.00 DZD (2500000 centimes) -> inférieur à 1 000 000 DZD
      ee = buildHeaderLine({
        codeBanque: '005',
        rib: '00500133400218153023',
        montantCentimes: 2500000,
        ref: '003'
      });
      ec = buildCorpsLine({
        numOrdre: '0000030207',
        ribBenif: '00806001906006101410',
        nomBenif: 'FOURNISSEUR FOURNITURES BUREAUTIQUE',
        adresseBenif: 'RUE DIDOUCHE MOURAD ALGER',
        montantCentimes: 2500000,
        libelle: 'FACTURE PAPETERIE ET FOURNITURES DE BUREAU'
      });
    } else {
      // Même banque : 005 vers 005
      ee = buildHeaderLine({
        codeBanque: '005',
        rib: '00500133400218153023',
        montantCentimes: 500000000,
        ref: '004'
      });
      ec = buildCorpsLine({
        numOrdre: '0000040207',
        ribBenif: '00500200012345678900',
        nomBenif: 'FILIALE BDL LOGISTIQUE',
        adresseBenif: 'ZONE D ACTIVITE BAB EZZOUAR ALGER',
        montantCentimes: 500000000,
        libelle: 'VIREMENT INTERNE GROUPE COMPTE A COMPTE BDL'
      });
    }

    const content = `${ee}\n${ec}\n${ef}`;
    fs.writeFileSync(targetPath, content, 'utf-8');

    res.json({
      message: `Fichier EDI (${type}) déposé dans directories/source/. Surveillance active.`,
      fileName,
      targetPath
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
