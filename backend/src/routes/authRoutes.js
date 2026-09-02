const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');

// Connexion
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Veuillez saisir votre identifiant et mot de passe.' });
    }

    const user = await User.findOne({
      where: { username }
    });

    if (!user) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Ce compte utilisateur a été désactivé.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'bdl_rtgs_secret_jwt_key_2026_super_secure',
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Erreur login:', err);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// Profil connecté
router.get('/me', verifyToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role
    }
  });
});

// Liste des utilisateurs (Admin)
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'fullName', 'role', 'isActive', 'createdAt']
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Création utilisateur (Admin)
router.post('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, fullName, role } = req.body;
    const newUser = await User.create({
      username,
      email,
      password,
      fullName,
      role: role || 'consultation'
    });

    res.status(201).json({
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
