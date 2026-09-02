const express = require('express');
const router = express.Router();
const { fn, col, Op } = require('sequelize');
const { Virement, Remise, TraitementLog } = require('../models');
const { verifyToken } = require('../middlewares/authMiddleware');

// Statistiques générales pour le Dashboard
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const totalVirements = await Virement.count();
    const validesCount = await Virement.count({ where: { statut: 'VALIDE_TRAITE' } });
    const attenteSoldeCount = await Virement.count({ where: { statut: 'ATTENTE_VALIDATION_SOLDE' } });
    const rejetesCount = await Virement.count({ where: { statut: 'REJETE_SOLDE' } });
    const ignoresCount = await Virement.count({ where: { statut: 'IGNORE_FILTRE' } });

    // Montants totaux
    const totalMontantValide = (await Virement.sum('montant', { where: { statut: 'VALIDE_TRAITE' } })) || 0;
    const totalMontantAttente = (await Virement.sum('montant', { where: { statut: 'ATTENTE_VALIDATION_SOLDE' } })) || 0;
    const totalMontantRejete = (await Virement.sum('montant', { where: { statut: 'REJETE_SOLDE' } })) || 0;
    const totalMontantIgnore = (await Virement.sum('montant', { where: { statut: 'IGNORE_FILTRE' } })) || 0;
    const totalMontantGlobal = (await Virement.sum('montant')) || 0;

    // Répartition par Banque Bénéficiaire (Top 6)
    const banqueDistribution = await Virement.findAll({
      attributes: [
        'codeBanqueBeneficiaire',
        [fn('COUNT', col('id')), 'count'],
        [fn('SUM', col('montant')), 'totalMontant']
      ],
      group: ['codeBanqueBeneficiaire'],
      order: [[fn('SUM', col('montant')), 'DESC']],
      limit: 6
    });

    // Virements en attente de validation solde
    const alertesSolde = await Virement.findAll({
      where: { statut: 'ATTENTE_VALIDATION_SOLDE' },
      limit: 10,
      order: [['createdAt', 'DESC']],
      include: [{ model: Remise, as: 'remise', attributes: ['nomFichier'] }]
    });

    // Derniers virements traités
    const recentsVirements = await Virement.findAll({
      limit: 7,
      order: [['createdAt', 'DESC']],
      include: [{ model: Remise, as: 'remise', attributes: ['nomFichier'] }]
    });

    // Logs récents
    const recentLogs = await TraitementLog.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      kpis: {
        totalVirements,
        validesCount,
        attenteSoldeCount,
        rejetesCount,
        ignoresCount,
        totalMontantValide: Number(totalMontantValide),
        totalMontantAttente: Number(totalMontantAttente),
        totalMontantRejete: Number(totalMontantRejete),
        totalMontantIgnore: Number(totalMontantIgnore),
        totalMontantGlobal: Number(totalMontantGlobal),
        tauxValidation: totalVirements > 0 ? ((validesCount / totalVirements) * 100).toFixed(1) : 0
      },
      alertesSolde,
      banqueDistribution,
      recentsVirements,
      recentLogs
    });
  } catch (err) {
    console.error('Erreur stats dashboard:', err);
    res.status(500).json({ message: err.message });
  }
});

// Logs complets
router.get('/logs', verifyToken, async (req, res) => {
  try {
    const { niveau, type, limit = 50 } = req.query;
    const where = {};
    if (niveau && niveau !== 'ALL') where.niveau = niveau;
    if (type && type !== 'ALL') where.type = type;

    const logs = await TraitementLog.findAll({
      where,
      limit: Number(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
