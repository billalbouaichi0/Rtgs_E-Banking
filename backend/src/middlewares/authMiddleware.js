const jwt = require('jsonwebtoken');
const { User } = require('../models');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Accès non autorisé : Jeton d authentification manquant.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bdl_rtgs_secret_jwt_key_2026_super_secure');

    const user = await User.findByPk(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Utilisateur inactif ou introuvable.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Jeton de session invalide ou expiré.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'administrateur') {
    return res.status(403).json({ message: 'Action réservée aux administrateurs.' });
  }
  next();
};

module.exports = {
  verifyToken,
  requireAdmin
};
