const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, TraitementLog } = require('../models');
const { verifyToken, requireAdmin } = require('../middlewares/authMiddleware');
const { sendResetPasswordEmail } = require('../services/emailService');

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
      return res.status(403).json({ message: 'Ce compte utilisateur a été désactivé. Contactez votre administrateur.' });
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
        role: user.role,
        mustChangePassword: user.mustChangePassword
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

// Vérifier la validité d'un token de réinitialisation (Public)
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ valid: false, message: 'Le lien de réinitialisation est invalide ou a expiré.' });
    }

    res.json({
      valid: true,
      username: user.username,
      email: user.email,
      fullName: user.fullName
    });
  } catch (err) {
    console.error('Erreur vérification token:', err);
    res.status(500).json({ valid: false, message: err.message });
  }
});

// Réinitialiser / Définir le mot de passe avec le token (Public)
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token et nouveau mot de passe requis.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit comporter au moins 6 caractères.' });
    }

    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Le lien de réinitialisation est invalide ou a expiré.' });
    }

    // Mise à jour du mot de passe et réinitialisation du token
    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.mustChangePassword = false;
    await user.save();

    await TraitementLog.create({
      type: 'SECURITE',
      niveau: 'INFO',
      message: `Mot de passe réinitialisé avec succès pour l'utilisateur ${user.username} (${user.email}).`
    });

    res.json({
      success: true,
      message: 'Votre mot de passe a été défini avec succès. Vous pouvez maintenant vous connecter.'
    });
  } catch (err) {
    console.error('Erreur reset-password:', err);
    res.status(500).json({ message: err.message });
  }
});

// Liste des utilisateurs (Admin)
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'username', 'email', 'fullName', 'role', 'isActive', 'mustChangePassword', 'resetPasswordExpires', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Création d'un utilisateur par l'Admin avec envoi automatique de mail de réinitialisation
router.post('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username, email, fullName, role } = req.body;

    if (!username || !email || !fullName) {
      return res.status(400).json({ message: 'Identifiant (login), email et nom complet sont requis.' });
    }

    // Vérification unicité
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.username === username 
          ? `L'identifiant '${username}' est déjà utilisé.` 
          : `L'adresse email '${email}' est déjà associée à un compte.`
      });
    }

    // Génération d'un token aléatoire sécurisé de 32 octets (64 car hex)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures

    // Mot de passe temporaire aléatoire (qui sera écrasé dès que l'utilisateur clique sur le lien)
    const tempPassword = crypto.randomBytes(12).toString('hex');

    const newUser = await User.create({
      username: username.trim(),
      email: email.trim(),
      fullName: fullName.trim(),
      role: role || 'consultation',
      password: tempPassword,
      mustChangePassword: true,
      resetPasswordToken: resetToken,
      resetPasswordExpires: resetExpires,
      isActive: true
    });

    // Envoi de l'email de réinitialisation via SMTP BDL
    const emailResult = await sendResetPasswordEmail(
      newUser.email,
      newUser.username,
      resetToken,
      newUser.fullName
    );

    await TraitementLog.create({
      type: 'CREATION_UTILISATEUR',
      niveau: 'SUCCESS',
      message: `Utilisateur ${newUser.username} (${newUser.email}) créé par ${req.user.username}. Email d'activation envoyé : ${emailResult.success ? 'Succès' : 'Échec SMTP'}`
    });

    res.status(201).json({
      message: `Utilisateur ${newUser.username} créé avec succès. ${emailResult.success ? "Un email d'initialisation a été envoyé." : "Note : L'envoi direct SMTP a rencontré une restriction réseau."}`,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
        isActive: newUser.isActive,
        resetUrl: emailResult.resetUrl
      },
      emailSent: emailResult.success
    });
  } catch (err) {
    console.error('Erreur création utilisateur:', err);
    res.status(400).json({ message: err.message });
  }
});

// Renvoyer l'email de réinitialisation de mot de passe (Admin)
router.post('/users/:id/resend-reset', verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    user.mustChangePassword = true;
    await user.save();

    const emailResult = await sendResetPasswordEmail(
      user.email,
      user.username,
      resetToken,
      user.fullName
    );

    res.json({
      message: `Email d'initialisation renvoyé à ${user.email}.`,
      resetUrl: emailResult.resetUrl,
      emailSent: emailResult.success
    });
  } catch (err) {
    console.error('Erreur renvoi email:', err);
    res.status(500).json({ message: err.message });
  }
});

// Modification d'un utilisateur (Admin)
router.put('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const { fullName, role, isActive } = req.body;
    if (fullName !== undefined) user.fullName = fullName;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      message: 'Utilisateur mis à jour avec succès.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Suppression d'un utilisateur (Admin)
router.delete('/users/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });
    }

    const deletedUsername = user.username;
    await user.destroy();

    await TraitementLog.create({
      type: 'SUPPRESSION_UTILISATEUR',
      niveau: 'WARNING',
      message: `Utilisateur ${deletedUsername} supprimé par ${req.user.username}.`
    });

    res.json({ message: `Utilisateur ${deletedUsername} supprimé avec succès.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
