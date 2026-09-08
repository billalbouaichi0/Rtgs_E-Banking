const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Op } = require('sequelize');
const { Virement, Remise, BanqueRef, TraitementLog } = require('../models');
const { verifyToken } = require('../middlewares/authMiddleware');
const processingService = require('../services/processingService');
const { FOLDERS } = require('../config/folders');

// Configuration upload multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, FOLDERS.input);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Liste des virements en attente de décision solde (Alertes Solde)
router.get('/en-attente-solde', verifyToken, async (req, res) => {
  try {
    const virements = await Virement.findAll({
      where: { statut: 'ATTENTE_VALIDATION_SOLDE' },
      include: [
        { model: Remise, as: 'remise', attributes: ['nomFichier', 'dateRemiseOrdre', 'referenceRemise'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(virements);
  } catch (err) {
    console.error('Erreur liste virements en attente solde:', err);
    res.status(500).json({ message: err.message });
  }
});

// Valider manuellement un virement à solde insuffisant (Forçage -> OD + MT103)
router.post('/:id/valider', verifyToken, async (req, res) => {
  try {
    const result = await processingService.validerVirementManuellement(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    console.error('Erreur validation manuelle virement:', err);
    res.status(400).json({ message: err.message });
  }
});

// Refuser manuellement un virement à solde insuffisant (Rejet -> SI Retour)
router.post('/:id/refuser', verifyToken, async (req, res) => {
  try {
    const { motif } = req.body;
    const result = await processingService.refuserVirementManuellement(req.params.id, req.user, motif);
    res.json(result);
  } catch (err) {
    console.error('Erreur refus manuel virement:', err);
    res.status(400).json({ message: err.message });
  }
});

// Liste filtrable des virements
router.get('/', verifyToken, async (req, res) => {
  try {
    const {
      statut,
      search,
      codeBanque,
      minMontant,
      dateDebut,
      dateFin,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};

    if (statut && statut !== 'ALL') {
      where.statut = statut;
    }

    if (codeBanque) {
      where.codeBanqueBeneficiaire = codeBanque;
    }

    if (minMontant) {
      where.montant = { [Op.gte]: Number(minMontant) };
    }

    if (search) {
      where[Op.or] = [
        { libelle: { [Op.like]: `%${search}%` } },
        { numeroOrdre: { [Op.like]: `%${search}%` } },
        { nomDonneur: { [Op.like]: `%${search}%` } },
        { nomBeneficiaire: { [Op.like]: `%${search}%` } },
        { ribDonneur: { [Op.like]: `%${search}%` } },
        { ribBeneficiaire: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Virement.findAndCountAll({
      where,
      include: [
        { model: Remise, as: 'remise', attributes: ['nomFichier', 'dateRemiseOrdre', 'referenceRemise'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: Number(limit),
      offset
    });

    res.json({
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit)),
      data: rows
    });
  } catch (err) {
    console.error('Erreur liste virements:', err);
    res.status(500).json({ message: err.message });
  }
});

// Détail d'un virement avec ses logs
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const virement = await Virement.findByPk(req.params.id, {
      include: [
        { model: Remise, as: 'remise' },
        { model: TraitementLog, as: 'logs', order: [['createdAt', 'ASC']] }
      ]
    });

    if (!virement) {
      return res.status(404).json({ message: 'Virement introuvable' });
    }

    // Charger les infos des banques
    const banqueBenif = await BanqueRef.findByPk(virement.codeBanqueBeneficiaire);
    const banqueDonneur = await BanqueRef.findByPk(virement.codeBanqueDonneur);

    res.json({
      virement,
      banqueBeneficiaireInfo: banqueBenif,
      banqueDonneurInfo: banqueDonneur
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Téléchargement / Visualisation du contenu d'un fichier généré
router.get('/:id/file/:fileType', verifyToken, async (req, res) => {
  try {
    const { id, fileType } = req.params;
    const virement = await Virement.findByPk(id);

    if (!virement) {
      return res.status(404).json({ message: 'Virement introuvable' });
    }

    let fileName = null;
    let folder = null;

    if (fileType === 'mt103') {
      fileName = virement.fichierMt103Genere;
      folder = FOLDERS.generated_mt103;
    } else if (fileType === 'od' || fileType === 'od_batch') {
      fileName = virement.fichierOdBatch || virement.fichierOdGenere;
      folder = FOLDERS.generated_od;
    } else if (fileType === 'si_ret') {
      fileName = virement.fichierSiRetGenere;
      folder = FOLDERS.si_retour;
    } else if (fileType === 'si_cpt') {
      fileName = virement.fichierSiCptGenere;
      folder = FOLDERS.si_retour;
    }

    if (!fileName || !folder) {
      return res.status(404).json({ message: `Fichier ${fileType} non disponible pour ce virement.` });
    }

    const fullPath = path.join(folder, fileName);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'Fichier physique introuvable sur le disque.' });
    }

    const content = fs.readFileSync(fullPath, 'utf-8');

    if (req.query.download === 'true') {
      return res.download(fullPath, fileName);
    }

    res.json({
      fileName,
      fileType,
      fullPath,
      content
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Liste des remises
router.get('/remises/all', verifyToken, async (req, res) => {
  try {
    const remises = await Remise.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: Virement, as: 'virements', attributes: ['id', 'statut', 'montant'] }]
    });
    res.json(remises);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Upload manuel d'un fichier EDI
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier fourni.' });
    }

    const inputFilePath = req.file.path;
    const originalName = req.file.originalname;

    const result = await processingService.processEdiFile(inputFilePath, originalName);

    res.json({
      message: 'Fichier EDI traité avec succès',
      result
    });
  } catch (err) {
    console.error('Erreur upload EDI:', err);
    res.status(500).json({ message: `Échec du traitement : ${err.message}` });
  }
});

module.exports = router;
