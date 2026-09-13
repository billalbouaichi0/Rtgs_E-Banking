const nodemailer = require('nodemailer');
const { SystemSetting } = require('../models');

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

  logger: false,
  debug: false,
});

/**
 * Récupère l'adresse email d'une structure (DCC, DTM, DMB)
 * Priorité : 1. Base de données (SystemSetting) -> 2. Variable d'environnement -> 3. Fallback par défaut
 */
const getStructureEmail = async (structureCode) => {
  const defaultEmails = {
    DCC: process.env.EMAIL_STRUCTURE_DCC || 'dcc-comptabilite@bdl.dz',
    DTM: process.env.EMAIL_STRUCTURE_DTM || 'dtm-tresorerie@bdl.dz',
    DMB: process.env.EMAIL_STRUCTURE_DMB || 'dmb-monetique@bdl.dz'
  };

  const settingKey = `email_structure_${structureCode.toLowerCase()}`;
  try {
    const setting = await SystemSetting.findByPk(settingKey);
    if (setting && setting.value) {
      return setting.value.trim();
    }
  } catch (err) {
    console.warn(`[EmailService] Impossible de charger ${settingKey} depuis la DB :`, err.message);
  }

  return defaultEmails[structureCode] || `${structureCode.toLowerCase()}@bdl.dz`;
};

/**
 * Template de base HTML BDL Corporate
 */
const renderEmailLayout = ({ title, subtitle, badgeText, badgeColor, contentHtml }) => {
  const fromAddress = process.env.SMTP_FROM || 'rtgsebank-bdl@bdl.dz';

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #090d16; color: #1e293b; margin: 0; padding: 20px; }
        .wrapper { max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.25); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #772281 0%, #4a1551 100%); padding: 28px 30px; text-align: left; color: #ffffff; border-bottom: 3px solid #f9b307; }
        .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; color: #ffffff; }
        .header p { margin: 6px 0 0 0; font-size: 11px; color: #f9b307; text-transform: uppercase; letter-spacing: 1.5px; font-weight: bold; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 10px; background: ${badgeColor || '#772281'}; color: #ffffff; }
        .content { padding: 30px; font-size: 13px; line-height: 1.6; color: #334155; }
        .info-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 18px 0; }
        .table-custom { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
        .table-custom th { background-color: #f1f5f9; padding: 8px 12px; text-align: left; font-weight: bold; color: #475569; border-bottom: 1px solid #cbd5e1; }
        .table-custom td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
        .amount-highlight { font-size: 16px; font-weight: 800; color: #772281; }
        .footer { background-color: #0f172a; padding: 20px 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #1e293b; }
        .footer strong { color: #f8fafc; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>BANQUE DE DEVELOPPEMENT LOCAL</h1>
          <p>Supervision Centrale RTGS • Notification Automatisée</p>
          <div class="badge">${badgeText || 'Notification Flux'}</div>
        </div>
        <div class="content">
          <h2 style="font-size: 16px; color: #0f172a; margin-top: 0;">${title}</h2>
          ${subtitle ? `<p style="font-size: 13px; color: #64748b; margin-bottom: 18px;">${subtitle}</p>` : ''}
          ${contentHtml}
        </div>
        <div class="footer">
          <p style="margin: 0 0 4px 0;"><strong>Banque de Développement Local (BDL)</strong> — Système d'Information RTGS & E-Banking</p>
          <p style="margin: 0;">Ce courriel est généré automatiquement par le moteur RTGS. Merci de ne pas y répondre directement.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * 1. NOTIFICATION OD -> Structure DCC
 * Notifie la structure DCC à chaque fois qu'un fichier OD (lot ou individuel) est généré.
 */
const sendOdNotification = async ({ odFileName, odContent, virements = [], totalMontant = 0, nombreVirements = 1, dateGeneration = new Date() }) => {
  const recipient = await getStructureEmail('DCC');
  const fromAddress = process.env.SMTP_FROM || 'rtgsebank-bdl@bdl.dz';

  const rowsHtml = virements.slice(0, 15).map(v => `
    <tr>
      <td><strong>${v.numeroOrdre}</strong></td>
      <td>${v.compteDonneur15 || v.ribDonneur?.substring(3, 18) || 'N/A'}</td>
      <td>${v.nomBeneficiaire || 'N/A'}</td>
      <td style="text-align: right; font-weight: bold; color: #772281;">${Number(v.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DZD</td>
    </tr>
  `).join('');

  const moreNotice = virements.length > 15 ? `<p style="font-size: 11px; color: #64748b; margin-top: 6px;"><em>... et ${virements.length - 15} autre(s) virement(s) dans le fichier joint.</em></p>` : '';

  const contentHtml = `
    <p>Bonjour à la <strong>Structure DCC (Comptabilité & Contrôle)</strong>,</p>
    <p>Nous vous informons qu'un fichier d'<strong>Opérations Diverses (OD)</strong> pour les virements RTGS éligibles vient d'être généré avec succès par le planificateur automatique :</p>
    
    <div class="info-card">
      <table style="width: 100%; font-size: 13px;">
        <tr>
          <td style="padding: 4px 0; color: #64748b; width: 45%;"><strong>Fichier OD généré :</strong></td>
          <td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #0f172a;">${odFileName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>Nombre d'opérations :</strong></td>
          <td style="padding: 4px 0; font-weight: bold;">${nombreVirements} virement(s)</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>Montant total débit :</strong></td>
          <td style="padding: 4px 0;"><span class="amount-highlight">${Number(totalMontant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DZD</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>Date & Heure :</strong></td>
          <td style="padding: 4px 0;">${new Date(dateGeneration).toLocaleString('fr-FR')}</td>
        </tr>
      </table>
    </div>

    ${virements.length > 0 ? `
      <h3 style="font-size: 13px; color: #0f172a; margin-top: 18px; margin-bottom: 8px;">Détail des virements inclus :</h3>
      <table class="table-custom">
        <thead>
          <tr>
            <th>N° Ordre</th>
            <th>Compte Débit (SAB)</th>
            <th>Bénéficiaire</th>
            <th style="text-align: right;">Montant</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      ${moreNotice}
    ` : ''}

    <p style="margin-top: 20px; font-size: 12px; color: #475569;">
      Le fichier physique complet <code style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${odFileName}</code> est joint à ce message pour traitement et archivage comptable.
    </p>
  `;

  const html = renderEmailLayout({
    title: 'Génération d\'un Fichier Ordre de Débit (OD)',
    subtitle: `Lot OD généré pour ${nombreVirements} virement(s) interbancaire(s)`,
    badgeText: 'Structure DCC • Opérations Diverses',
    badgeColor: '#772281',
    contentHtml
  });

  const attachments = [];
  if (odContent) {
    attachments.push({
      filename: odFileName,
      content: odContent
    });
  }

  const mailOptions = {
    from: `"BDL RTGS E-Banking" <${fromAddress}>`,
    to: recipient,
    subject: `[BDL RTGS - DCC] Génération Ordre de Débit (OD) - ${odFileName} (${Number(totalMontant).toLocaleString('fr-FR')} DZD)`,
    html,
    attachments
  };

  try {
    console.log(`[EmailService DCC] Envoi notification OD vers ${recipient} (${odFileName})...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService DCC] Email envoyé avec succès : ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService DCC] Erreur envoi email OD à ${recipient} :`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 2. NOTIFICATION MT103 -> Structure DTM
 * Notifie la structure DTM (Trésorerie et Marchés) à chaque fois qu'un message SWIFT MT103 est émis.
 */
const sendMt103Notification = async ({ virement, banqueBenif, mt103FileName, mt103Content, cptoddco }) => {
  const recipient = await getStructureEmail('DTM');
  const fromAddress = process.env.SMTP_FROM || 'rtgsebank-bdl@bdl.dz';

  const contentHtml = `
    <p>Bonjour à la <strong>Structure DTM (Trésorerie & Marchés)</strong>,</p>
    <p>Un message <strong>SWIFT MT103</strong> pour virement RTGS interbancaire à montant élevé vient d'être généré suite à la confirmation de comptabilisation SAB :</p>
    
    <div class="info-card">
      <table style="width: 100%; font-size: 13px;">
        <tr>
          <td style="padding: 4px 0; color: #64748b; width: 45%;"><strong>Fichier SWIFT MT103 :</strong></td>
          <td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #0f172a;">${mt103FileName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>N° Ordre Virement :</strong></td>
          <td style="padding: 4px 0; font-weight: bold;">${virement.numeroOrdre}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>Montant de l'opération :</strong></td>
          <td style="padding: 4px 0;"><span class="amount-highlight">${Number(virement.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DZD</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>Banque Bénéficiaire :</strong></td>
          <td style="padding: 4px 0; font-weight: bold; color: #047857;">${banqueBenif?.nomBanque || virement.codeBanqueBeneficiaire} (BIC: ${banqueBenif?.bicSwift || 'BALGDZALXXX'})</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>Donneur d'Ordre (BDL) :</strong></td>
          <td style="padding: 4px 0;">${virement.nomDonneur || 'Client BDL'} (RIB: ${virement.ribDonneur})</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>Bénéficiaire Final :</strong></td>
          <td style="padding: 4px 0;">${virement.nomBeneficiaire} (RIB: ${virement.ribBeneficiaire})</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>N° Écriture SAB (CPTODDCO) :</strong></td>
          <td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #0284c7;">#${cptoddco || 'Comptabilisé'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>Date de Valeur :</strong></td>
          <td style="padding: 4px 0;">${virement.dateValeur || new Date().toISOString().slice(0, 10)}</td>
        </tr>
      </table>
    </div>

    <p style="margin-top: 20px; font-size: 12px; color: #475569;">
      Le message MT103 normé SWIFT <code style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${mt103FileName}</code> est joint à cet envoi pour exécution / transmission réseau.
    </p>
  `;

  const html = renderEmailLayout({
    title: 'Émission d\'un Message SWIFT MT103',
    subtitle: `Virement RTGS Interbancaire #${virement.numeroOrdre}`,
    badgeText: 'Structure DTM • Trésorerie & Marchés',
    badgeColor: '#059669',
    contentHtml
  });

  const attachments = [];
  if (mt103Content) {
    attachments.push({
      filename: mt103FileName,
      content: mt103Content
    });
  }

  const mailOptions = {
    from: `"BDL RTGS E-Banking" <${fromAddress}>`,
    to: recipient,
    subject: `[BDL RTGS - DTM] Émission Message SWIFT MT103 - Virement N° ${virement.numeroOrdre} vers ${banqueBenif?.nomBanque || virement.codeBanqueBeneficiaire} (${Number(virement.montant).toLocaleString('fr-FR')} DZD)`,
    html,
    attachments
  };

  try {
    console.log(`[EmailService DTM] Envoi notification MT103 vers ${recipient} (${mt103FileName})...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService DTM] Email envoyé avec succès : ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService DTM] Erreur envoi email MT103 à ${recipient} :`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * 3. NOTIFICATION SI RETOUR -> Structure DMB
 * Notifie la structure DMB (Monétique et Banque à distance) à chaque génération d'un fichier SI Retour (Rejet ou Comptabilisé).
 */
const sendSiRetourNotification = async ({ type = 'REJET', virement, siFileName, siContent, motif = null, cptoddco = null }) => {
  const recipient = await getStructureEmail('DMB');
  const fromAddress = process.env.SMTP_FROM || 'rtgsebank-bdl@bdl.dz';

  const isRejet = type === 'REJET';
  const badgeColor = isRejet ? '#dc2626' : '#2563eb';
  const badgeText = isRejet ? 'Structure DMB • SI Retour Rejet' : 'Structure DMB • SI Retour Comptabilisé';
  const title = isRejet ? 'Avis de Rejet Virement (SI Retour Rejet)' : 'Avis d\'Exécution et Comptabilisation (SI Retour)';

  const contentHtml = `
    <p>Bonjour à la <strong>Structure DMB (Monétique & E-Banking)</strong>,</p>
    <p>Un fichier d'accusé de traitement <strong>SI Retour</strong> vient d'être généré pour le virement suivant :</p>
    
    <div class="info-card" style="border-left: 4px solid ${isRejet ? '#dc2626' : '#2563eb'};">
      <table style="width: 100%; font-size: 13px;">
        <tr>
          <td style="padding: 4px 0; color: #64748b; width: 45%;"><strong>Type de SI Retour :</strong></td>
          <td style="padding: 4px 0; font-weight: bold; color: ${isRejet ? '#dc2626' : '#2563eb'};">
            ${isRejet ? 'REJET (SI_VIR_RJT)' : 'COMPTABILISÉ (SI_VIR_CPT)'}
          </td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>Fichier SI Retour :</strong></td>
          <td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #0f172a;">${siFileName}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>N° Ordre / Réf Remise :</strong></td>
          <td style="padding: 4px 0; font-weight: bold;">${virement.numeroOrdre || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>Montant :</strong></td>
          <td style="padding: 4px 0;"><span class="amount-highlight" style="color: ${isRejet ? '#dc2626' : '#772281'};">${Number(virement.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DZD</span></td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>Compte Donneur (BDL) :</strong></td>
          <td style="padding: 4px 0;">${virement.nomDonneur || 'Client BDL'} (${virement.ribDonneur})</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748b;"><strong>Bénéficiaire :</strong></td>
          <td style="padding: 4px 0;">${virement.nomBeneficiaire} (Banque: ${virement.codeBanqueBeneficiaire})</td>
        </tr>
        ${motif ? `
        <tr>
          <td style="padding: 4px 0; color: #dc2626;"><strong>Motif du rejet :</strong></td>
          <td style="padding: 4px 0; font-weight: bold; color: #dc2626;">${motif}</td>
        </tr>
        ` : ''}
        ${cptoddco ? `
        <tr>
          <td style="padding: 4px 0; color: #0284c7;"><strong>N° Écriture SAB :</strong></td>
          <td style="padding: 4px 0; font-family: monospace; font-weight: bold; color: #0284c7;">#${cptoddco}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <p style="margin-top: 20px; font-size: 12px; color: #475569;">
      Le fichier normé <code style="font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${siFileName}</code> est joint à ce message pour transmission au client donneur d'ordre ou à l'application e-Banking.
    </p>
  `;

  const html = renderEmailLayout({
    title,
    subtitle: `Traitement SI Retour pour Virement #${virement.numeroOrdre || ''}`,
    badgeText,
    badgeColor,
    contentHtml
  });

  const attachments = [];
  if (siContent) {
    attachments.push({
      filename: siFileName,
      content: siContent
    });
  }

  const subjectPrefix = isRejet ? '[BDL RTGS - DMB] Rejet Virement' : '[BDL RTGS - DMB] Confirmation Comptabilisation';
  const mailOptions = {
    from: `"BDL RTGS E-Banking" <${fromAddress}>`,
    to: recipient,
    subject: `${subjectPrefix} - SI Retour ${siFileName} (${Number(virement.montant).toLocaleString('fr-FR')} DZD)`,
    html,
    attachments
  };

  try {
    console.log(`[EmailService DMB] Envoi notification SI Retour vers ${recipient} (${siFileName})...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService DMB] Email envoyé avec succès : ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[EmailService DMB] Erreur envoi email SI Retour à ${recipient} :`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Envoie un email de réinitialisation de mot de passe
 */
const sendResetPasswordEmail = async (toEmail, login, token, fullName = '') => {
  const resetUrl = `${process.env.FRONTEND_URL || 'https://test-jibaya.bdl.dz'}/reset-password?token=${token}`;
  const fromAddress = process.env.SMTP_FROM || 'rtgsebank-bdl@bdl.dz';

  const contentHtml = `
    <p>Bonjour <strong>${fullName || login}</strong>,</p>
    <p>Un compte utilisateur a été créé ou une réinitialisation de mot de passe a été demandée pour votre accès à la plateforme <strong>RTGS E-Banking BDL</strong>.</p>
    
    <div class="info-card">
      <p style="margin: 0 0 6px 0; font-size: 12px; color: #772281; font-weight: bold; text-transform: uppercase;">Vos identifiants de connexion :</p>
      <p style="margin: 0; font-size: 14px;"><strong>Identifiant (Login) :</strong> <code style="background: #ffffff; padding: 2px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-weight: bold; color: #0f172a;">${login}</code></p>
    </div>

    <p>Pour activer votre compte et définir votre mot de passe d'accès sécurisé, veuillez cliquer sur le bouton ci-dessous :</p>

    <div style="text-align: center; margin: 25px 0;">
      <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #772281 0%, #4a1551 100%); color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 13px; box-shadow: 0 4px 12px rgba(119, 34, 129, 0.3);">Définir mon mot de passe</a>
    </div>

    <p style="font-size: 12px; color: #64748b;">
      Ce lien est à usage unique et reste valide pendant <strong>24 heures</strong>.<br/>
      URL directe : <a href="${resetUrl}" style="color: #772281;">${resetUrl}</a>
    </p>
  `;

  const html = renderEmailLayout({
    title: 'Initialisation de votre mot de passe',
    subtitle: 'Plateforme BDL RTGS Supervision',
    badgeText: 'Sécurité & Authentification',
    badgeColor: '#772281',
    contentHtml
  });

  const mailOptions = {
    from: `"BDL RTGS E-Banking" <${fromAddress}>`,
    to: toEmail,
    subject: `[BDL RTGS] Initialisation de votre mot de passe de connexion (${login})`,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId, resetUrl };
  } catch (err) {
    console.error(`[EmailService] Erreur envoi email réinitialisation à ${toEmail} :`, err.message);
    return { success: false, error: err.message, resetUrl };
  }
};

module.exports = {
  transporter,
  getStructureEmail,
  sendOdNotification,
  sendMt103Notification,
  sendSiRetourNotification,
  sendResetPasswordEmail
};
