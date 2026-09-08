const express = require('express');
const router = express.Router();
const { fn, col, Op } = require('sequelize');
const { Virement, Remise, TraitementLog } = require('../models');
const { verifyToken } = require('../middlewares/authMiddleware');

// Statistiques générales pour le Dashboard
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const totalVirements = await Virement.count();
    const recuCount = await Virement.count({ where: { statut: 'RECU' } });
    const odGenCount = await Virement.count({ where: { statut: 'OD_GEN' } });
    const integreCount = await Virement.count({ where: { statut: 'INTEGRE' } });
    const envoyeCount = await Virement.count({ where: { statut: { [Op.in]: ['ENVOYE', 'VALIDE_TRAITE'] } } });
    const validesCount = envoyeCount;
    const attenteSoldeCount = await Virement.count({ where: { statut: 'ATTENTE_VALIDATION_SOLDE' } });
    const rejetesCount = await Virement.count({ where: { statut: { [Op.in]: ['REJETE', 'REJETE_SOLDE', 'REJETE_DOUBLON'] } } });
    const doublonsCount = await Virement.count({ where: { statut: 'REJETE_DOUBLON' } });
    const ignoresCount = await Virement.count({ where: { statut: 'IGNORE_FILTRE' } });

    // Montants totaux
    const totalMontantEnvoye = (await Virement.sum('montant', { where: { statut: { [Op.in]: ['ENVOYE', 'VALIDE_TRAITE'] } } })) || 0;
    const totalMontantRecu = (await Virement.sum('montant', { where: { statut: 'RECU' } })) || 0;
    const totalMontantOdGen = (await Virement.sum('montant', { where: { statut: 'OD_GEN' } })) || 0;
    const totalMontantValide = totalMontantEnvoye;
    const totalMontantAttente = (await Virement.sum('montant', { where: { statut: 'ATTENTE_VALIDATION_SOLDE' } })) || 0;
    const totalMontantRejete = (await Virement.sum('montant', { where: { statut: { [Op.in]: ['REJETE', 'REJETE_SOLDE', 'REJETE_DOUBLON'] } } })) || 0;
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

    // Virements en attente de validation solde ou reçus en attente OD
    const alertesSolde = await Virement.findAll({
      where: { statut: { [Op.in]: ['ATTENTE_VALIDATION_SOLDE', 'RECU'] } },
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
        recuCount,
        odGenCount,
        integreCount,
        envoyeCount,
        validesCount,
        attenteSoldeCount,
        rejetesCount,
        doublonsCount,
        ignoresCount,
        totalMontantValide: Number(totalMontantValide),
        totalMontantEnvoye: Number(totalMontantEnvoye),
        totalMontantRecu: Number(totalMontantRecu),
        totalMontantOdGen: Number(totalMontantOdGen),
        totalMontantAttente: Number(totalMontantAttente),
        totalMontantRejete: Number(totalMontantRejete),
        totalMontantIgnore: Number(totalMontantIgnore),
        totalMontantGlobal: Number(totalMontantGlobal),
        tauxValidation: totalVirements > 0 ? ((envoyeCount / totalVirements) * 100).toFixed(1) : 0
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
