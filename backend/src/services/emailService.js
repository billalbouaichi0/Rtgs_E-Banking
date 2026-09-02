const nodemailer = require('nodemailer');

// Configuration du transporteur SMTP BDL
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || '10.121.2.50',
  port: Number(process.env.SMTP_PORT || 587),
  secure: false, // STARTTLS sur le port 587
  requireTLS: true,

  auth: {
    user: process.env.SMTP_USER || 'BDL\\rtgsebank-bdl',
    pass: process.env.SMTP_PASS || 'windows-2026+',
  },

  tls: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2',
    servername: '10.121.2.50',
  },

  logger: true,
  debug: true,
});

/**
 * Envoie un email de réinitialisation / définition de mot de passe à un utilisateur
 * @param {string} toEmail Email du destinataire
 * @param {string} login Nom d'utilisateur (login)
 * @param {string} token Token unique de réinitialisation
 * @param {string} fullName Nom complet de l'utilisateur
 */
const sendResetPasswordEmail = async (toEmail, login, token, fullName = '') => {
  const resetUrl = `${process.env.FRONTEND_URL || 'https://test-jibaya.bdl.dz'}/reset-password?token=${token}`;
  const fromAddress = process.env.SMTP_FROM || 'rtgsebank-bdl@bdl.dz';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #334155; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #065f46 0%, #047857 50%, #022c22 100%); padding: 30px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
        .header p { margin: 6px 0 0 0; font-size: 12px; color: #a7f3d0; text-transform: uppercase; letter-spacing: 1.5px; }
        .content { padding: 35px 30px; font-size: 14px; line-height: 1.6; color: #1e293b; }
        .highlight-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin: 20px 0; }
        .btn-container { text-align: center; margin: 30px 0; }
        .btn { display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); }
        .link-text { word-break: break-all; font-size: 11px; color: #059669; }
        .footer { background-color: #f8fafc; padding: 20px 30px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>BANQUE DE DEVELOPPEMENT LOCAL</h1>
          <p>Plateforme RTGS & E-Banking • Sécurité & Accès</p>
        </div>
        <div class="content">
          <p>Bonjour <strong>${fullName || login}</strong>,</p>
          <p>Un compte utilisateur a été créé ou une réinitialisation de mot de passe a été demandée pour votre accès à la plateforme <strong>RTGS E-Banking BDL</strong>.</p>
          
          <div class="highlight-box">
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #047857; font-weight: bold; text-transform: uppercase;">Vos identifiants de connexion :</p>
            <p style="margin: 0; font-size: 14px;"><strong>Identifiant (Login) :</strong> <code style="background: #ffffff; padding: 2px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f172a;">${login}</code></p>
          </div>

          <p>Pour activer votre compte et définir votre mot de passe d'accès sécurisé, veuillez cliquer sur le bouton ci-dessous :</p>

          <div class="btn-container">
            <a href="${resetUrl}" class="btn" target="_blank">Définir mon mot de passe</a>
          </div>

          <p style="font-size: 12px; color: #64748b;">
            Ce lien est à usage unique et reste valide pendant <strong>24 heures</strong>.<br/>
            Si le bouton ne fonctionne pas, copiez et collez l'URL suivante dans votre navigateur web :<br/>
            <a href="${resetUrl}" class="link-text">${resetUrl}</a>
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0 0 4px 0;"><strong>Banque de Développement Local (BDL)</strong> — Direction des Systèmes d'Information</p>
          <p style="margin: 0;">Ce message est généré automatiquement par le serveur de traitement RTGS. Merci de ne pas y répondre.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"BDL RTGS E-Banking" <${fromAddress}>`,
    to: toEmail,
    subject: `[BDL RTGS] Initialisation de votre mot de passe de connexion (${login})`,
    text: `Bonjour ${fullName || login},\n\nUn compte vous a été attribué sur la plateforme RTGS BDL avec l'identifiant : ${login}.\n\nVeuillez définir votre mot de passe en cliquant sur ce lien : ${resetUrl}\n\nCe lien expire dans 24 heures.\n\nCordialement,\nBanque de Développement Local`,
    html: htmlContent,
  };

  try {
    console.log(`[EmailService] Envoi email de réinitialisation vers ${toEmail} (login: ${login})...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService] Email envoyé avec succès : ${info.messageId}`);
    return { success: true, messageId: info.messageId, resetUrl };
  } catch (err) {
    console.error(`[EmailService] Erreur lors de l'envoi de l'email à ${toEmail} :`, err.message);
    // Retourner quand même le resetUrl pour permettre à l'admin de le copier si le serveur SMTP local est inaccessible
    return { success: false, error: err.message, resetUrl };
  }
};

module.exports = {
  transporter,
  sendResetPasswordEmail,
};
