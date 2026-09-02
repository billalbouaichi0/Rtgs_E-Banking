const pptxgen = require('pptxgenjs');
const path = require('path');

async function createPresentation() {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';
  pres.author = 'DSI - Banque de Développement Local';
  pres.company = 'BDL (Banque de Développement Local)';
  pres.title = 'Solution RTGS e-Banking - Traitement EDI & Passerelle SWIFT / SAB';

  // Palette de couleurs BDL
  const C_DARK = '0A0F1D';      // Fond sombre élégant
  const C_NAVY = '0F172A';      // Cartes sombres
  const C_EMERALD = '059669';   // Vert BDL principal
  const C_EMERALD_LIGHT = '10B981';
  const C_GOLD = 'F59E0B';      // Accent Doré
  const C_WHITE = 'FFFFFF';
  const C_MUTED = '94A3B8';
  const C_CARD_BG = '1E293B';
  const C_BORDER = '334155';

  // ==========================================
  // SLIDE 1 : COUVERTURE OFFICIELLE BDL
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: C_DARK };

    // Bande décorative supérieure
    slide.addShape(pres.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 0.15, fill: { color: C_EMERALD }
    });

    // Badge haut
    slide.addText('BANQUE DE DEVELOPPEMENT LOCAL • DSI', {
      x: 0.8, y: 0.7, w: 6.0, h: 0.4,
      fontSize: 12, bold: true, color: C_EMERALD_LIGHT, fontFace: 'Calibri'
    });

    // Titre principal
    slide.addText('PLATEFORME RTGS e-BANKING', {
      x: 0.8, y: 1.2, w: 11.5, h: 0.9,
      fontSize: 34, bold: true, color: C_WHITE, fontFace: 'Calibri'
    });

    // Sous-titre
    slide.addText('Solution Intégrée de Traitement EDI, Validation Solde SAB & Passerelle SWIFT MT103', {
      x: 0.8, y: 2.1, w: 11.5, h: 0.6,
      fontSize: 16, color: C_MUTED, fontFace: 'Calibri'
    });

    // Boîte de fonctionnalités clés
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 3.1, w: 11.7, h: 2.7,
      fill: { color: C_NAVY }, line: { color: C_BORDER, width: 1.5 }, rectRadius: 0.2
    });

    const pillars = [
      { num: '01', title: 'Traitement EDI Automatisé', desc: 'Surveillance de répertoire (Watcher), parsing positionnel et filtrage gros montants >= 1M DZD' },
      { num: '02', title: 'Contrôle Solde & Doublons', desc: 'Interrogation Oracle 11g (SAB) avec workflow forçage/refus et détection anti-doublon' },
      { num: '03', title: 'Génération Réglementaire', desc: 'Création instantanée des messages SWIFT MT103, Fichiers OD et avis SI Retour' },
      { num: '04', title: 'Sécurité & SMTP BDL', desc: 'Rôles RBAC, logs d\'audit exhaustifs et réinitialisation de mot de passe via serveur BDL' }
    ];

    pillars.forEach((p, idx) => {
      const colX = 1.1 + (idx * 2.85);
      slide.addText(p.num, {
        x: colX, y: 3.4, w: 2.6, h: 0.4,
        fontSize: 18, bold: true, color: C_EMERALD_LIGHT, fontFace: 'Calibri'
      });
      slide.addText(p.title, {
        x: colX, y: 3.9, w: 2.6, h: 0.4,
        fontSize: 12, bold: true, color: C_WHITE, fontFace: 'Calibri'
      });
      slide.addText(p.desc, {
        x: colX, y: 4.4, w: 2.6, h: 1.2,
        fontSize: 10, color: C_MUTED, fontFace: 'Calibri'
      });
    });

    // Bas de page
    slide.addText('Version Production 1.0 • Direction des Systèmes d\'Information', {
      x: 0.8, y: 6.8, w: 11.5, h: 0.3,
      fontSize: 10, color: C_MUTED, fontFace: 'Calibri'
    });
  }

  // ==========================================
  // SLIDE 2 : CONTEXTE ET ENJEUX MÉTIERS RTGS
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: C_DARK };

    slide.addText('CONTEXTE & ENJEUX OPÉRATIONNELS', {
      x: 0.8, y: 0.5, w: 10, h: 0.3, fontSize: 11, bold: true, color: C_EMERALD_LIGHT
    });
    slide.addText('Pourquoi cette plateforme pour la BDL ?', {
      x: 0.8, y: 0.85, w: 11, h: 0.6, fontSize: 24, bold: true, color: C_WHITE
    });

    // 3 Cartes d'enjeux
    const enjeux = [
      {
        title: 'Exigences Banque d\'Algérie (ARTS)',
        points: [
          'Réglementation stricte sur les virements de gros montants (Seuil >= 1 000 000 DZD).',
          'Règlement interbancaire brut en temps réel via le réseau SWIFT.',
          'Formatage strict des messages MT103 (Codes BIC et comptes de compensation :57A:).'
        ]
      },
      {
        title: 'Sécurisation des Flux Clients',
        points: [
          'Vérification obligatoire de la provision du compte donneur d\'ordre avant émission.',
          'Blocage immédiat des doublons sur les libellés et les bénéficiaires.',
          'Génération immédiate d\'un SI Retour en cas de non-aboutissement de l\'opération.'
        ]
      },
      {
        title: 'Automatisation & Zéro Saisie',
        points: [
          'Élimination complète des risques de ressaisie manuelle par les opérateurs.',
          'Intégration transparente avec les fichiers EDI de l\'e-Banking BDL.',
          'Génération synchrone des fichiers d\'imputation comptable OD pour SAB.'
        ]
      }
    ];

    enjeux.forEach((e, idx) => {
      const x = 0.8 + (idx * 3.9);
      slide.addShape(pres.ShapeType.roundRect, {
        x: x, y: 1.7, w: 3.7, h: 4.8,
        fill: { color: C_NAVY }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.15
      });

      slide.addText(e.title, {
        x: x + 0.3, y: 2.0, w: 3.1, h: 0.7,
        fontSize: 14, bold: true, color: C_EMERALD_LIGHT
      });

      slide.addShape(pres.ShapeType.line, {
        x: x + 0.3, y: 2.7, w: 3.1, h: 0, line: { color: C_BORDER, width: 1 }
      });

      e.points.forEach((pt, pIdx) => {
        slide.addText(`• ${pt}`, {
          x: x + 0.3, y: 2.9 + (pIdx * 1.1), w: 3.1, h: 1.0,
          fontSize: 10.5, color: C_WHITE, fontFace: 'Calibri'
        });
      });
    });
  }

  // ==========================================
  // SLIDE 3 : ARCHITECTURE TECHNIQUE & FLUX DE BOUT EN BOUT
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: C_DARK };

    slide.addText('ARCHITECTURE & FLUX DE TRAITEMENT', {
      x: 0.8, y: 0.5, w: 10, h: 0.3, fontSize: 11, bold: true, color: C_EMERALD_LIGHT
    });
    slide.addText('Cycle de vie d\'un virement de bout en bout', {
      x: 0.8, y: 0.85, w: 11, h: 0.6, fontSize: 24, bold: true, color: C_WHITE
    });

    const steps = [
      { step: '1. Ingestion', title: 'File Watcher', desc: 'Détection continue dans directories/source, déplacement vers input/' },
      { step: '2. Analyse', title: 'Parser EDI', desc: 'Découpage strict de l\'entête VIRM, corps VIRO/VIRB et fin FVIR' },
      { step: '3. Filtrage', title: 'Filtres RTGS', desc: 'Montant >= 1M DZD & Interbancaire. Les autres sont classés dans ignorer/' },
      { step: '4. Anti-Doublon', title: 'Contrôle Doublons', desc: 'Vérification intra-fichier & base de données sur libellés et noms' },
      { step: '5. Provision', title: 'SAB Oracle 11g', desc: 'Vérification solde en direct (ou simulation configurable)' },
      { step: '6. Production', title: 'Génération Fichiers', desc: 'Création OD, SWIFT MT103 (si validé) ou SI_RET (si refusé)' }
    ];

    steps.forEach((s, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = 0.8 + (col * 3.9);
      const y = 1.7 + (row * 2.5);

      slide.addShape(pres.ShapeType.roundRect, {
        x: x, y: y, w: 3.7, h: 2.2,
        fill: { color: C_NAVY }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.15
      });

      slide.addText(s.step.toUpperCase(), {
        x: x + 0.25, y: y + 0.2, w: 3.2, h: 0.3,
        fontSize: 10, bold: true, color: C_GOLD
      });

      slide.addText(s.title, {
        x: x + 0.25, y: y + 0.55, w: 3.2, h: 0.4,
        fontSize: 13, bold: true, color: C_WHITE
      });

      slide.addText(s.desc, {
        x: x + 0.25, y: y + 1.0, w: 3.2, h: 1.0,
        fontSize: 10, color: C_MUTED
      });
    });
  }

  // ==========================================
  // SLIDE 4 : MOTEUR DE CONTRÔLE SOLDE & DÉCISION MANUELLE
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: C_DARK };

    slide.addText('RÈGLES MÉTIER & WORKFLOW DE VALIDATION', {
      x: 0.8, y: 0.5, w: 10, h: 0.3, fontSize: 11, bold: true, color: C_EMERALD_LIGHT
    });
    slide.addText('Gestion du Solde Insuffisant & Forçage Manuel', {
      x: 0.8, y: 0.85, w: 11, h: 0.6, fontSize: 24, bold: true, color: C_WHITE
    });

    // Colonne Gauche : Solde Suffisant
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 1.7, w: 5.7, h: 4.8,
      fill: { color: C_NAVY }, line: { color: C_EMERALD, width: 1.5 }, rectRadius: 0.15
    });
    slide.addText('Cas 1 : Solde Suffisant (Automatique)', {
      x: 1.1, y: 2.0, w: 5.1, h: 0.4, fontSize: 14, bold: true, color: C_EMERALD_LIGHT
    });
    slide.addText('• Solde SAB >= Montant du virement :\n  → Validation instantanée du virement\n  → Génération automatique du message SWIFT MT103\n  → Génération du fichier d\'imputation comptable OD\n  → Statut virement : VALIDE_TRAITE\n  → Log d\'audit de succès avec détails du solde', {
      x: 1.1, y: 2.6, w: 5.1, h: 3.6, fontSize: 11, color: C_WHITE, lineSpacing: 20
    });

    // Colonne Droite : Solde Insuffisant
    slide.addShape(pres.ShapeType.roundRect, {
      x: 6.8, y: 1.7, w: 5.7, h: 4.8,
      fill: { color: C_NAVY }, line: { color: C_GOLD, width: 1.5 }, rectRadius: 0.15
    });
    slide.addText('Cas 2 : Solde Insuffisant (Décision Manuelle)', {
      x: 7.1, y: 2.0, w: 5.1, h: 0.4, fontSize: 14, bold: true, color: C_GOLD
    });
    slide.addText('• Le virement n\'est JAMAIS rejeté d\'office :\n  → Mise en statut ATTENTE_VALIDATION_SOLDE\n  → Alerte visuelle prioritaire sur le Dashboard\n\n• Option A : VALIDER (Forçage Manuel)\n  → Autorise l\'opération et génère MT103 + OD\n\n• Option B : REFUSER (Rejet Manuel)\n  → Génère le fichier SI_RETOUR ("non comptabilisé")', {
      x: 7.1, y: 2.6, w: 5.1, h: 3.6, fontSize: 11, color: C_WHITE, lineSpacing: 18
    });
  }

  // ==========================================
  // SLIDE 5 : CONTRÔLE ANTI-DOUBLONS & FORMATS RÉGLEMENTAIRES
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: C_DARK };

    slide.addText('CONFORMITÉ & SÉCURITÉ DES TRANSACTIONS', {
      x: 0.8, y: 0.5, w: 10, h: 0.3, fontSize: 11, bold: true, color: C_EMERALD_LIGHT
    });
    slide.addText('Contrôle Anti-Doublons & Fichiers Produits', {
      x: 0.8, y: 0.85, w: 11, h: 0.6, fontSize: 24, bold: true, color: C_WHITE
    });

    // Tableau Référentiel des Fichiers
    const rows = [
      ['Type de Fichier', 'Nommage', 'Destination', 'Règle de Production'],
      ['SWIFT MT103', 'MT103_{id}_{ordre}.txt', 'directories/generated_mt103/', 'Virement validé avec balise :57A: dynamique (BanqueRef)'],
      ['Ordre Débit (OD)', 'OD_{id}_{ordre}.txt', 'directories/generated_od/', 'Généré pour intégration comptable dans le SAB'],
      ['SI Retour', 'SI_RET_{libelle}_{id}.txt', 'directories/si_retour/', 'Généré sur refus manuel ou rejet automatique doublon'],
      ['Ignorer RTGS', '{nomFichierOriginal}.edi', 'directories/input/ignorer/', 'Fichiers intrabancaires ou montant < 1 000 000 DZD']
    ];

    slide.addTable(rows, {
      x: 0.8, y: 1.7, w: 11.7, h: 2.6,
      colW: [2.0, 3.2, 3.2, 3.3],
      fill: { color: C_NAVY },
      color: C_WHITE,
      fontSize: 10,
      fontFace: 'Calibri',
      border: { pt: 1, color: C_BORDER },
      autoPage: false
    });

    // Bloc Doublons
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 4.6, w: 11.7, h: 1.9,
      fill: { color: C_CARD_BG }, line: { color: '8B5CF6', width: 1.5 }, rectRadius: 0.15
    });

    slide.addText('🛡️ Mécanisme de Protection Anti-Doublons (Nom & Libellé)', {
      x: 1.1, y: 4.8, w: 11.0, h: 0.3, fontSize: 12, bold: true, color: 'C084FC'
    });

    slide.addText('• Détection Intra-Remise : Détection instantanée si un libellé ou un bénéficiaire apparaît plus d\'une fois dans le même fichier.\n• Détection Inter-Remises : Recherche dans l\'historique des transactions déjà traitées pour bloquer les re-soumissions accidentelles.\n• Action : Rejet automatique (statut REJETE_DOUBLON) et émission immédiate du SI Retour sans appel SAB.', {
      x: 1.1, y: 5.2, w: 11.0, h: 1.1, fontSize: 10, color: C_WHITE, lineSpacing: 16
    });
  }

  // ==========================================
  // SLIDE 6 : SÉCURITÉ, AUTH & SERVEUR SMTP BDL
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: C_DARK };

    slide.addText('GOUVERNANCE & ADMINISTRATION', {
      x: 0.8, y: 0.5, w: 10, h: 0.3, fontSize: 11, bold: true, color: C_EMERALD_LIGHT
    });
    slide.addText('Gestion des Utilisateurs & Serveur SMTP BDL', {
      x: 0.8, y: 0.85, w: 11, h: 0.6, fontSize: 24, bold: true, color: C_WHITE
    });

    // Cartes
    const secItems = [
      {
        title: 'Authentification & Rôles RBAC',
        desc: '• Jetons cryptographiques JWT sécurisés.\n• Rôle Administrateur : gestion des utilisateurs, validation/forçage, configuration watcher.\n• Rôle Opérateur : traitement et validation des virements.\n• Rôle Consultation : lecture seule des rapports.'
      },
      {
        title: 'Serveur SMTP BDL (10.121.2.50)',
        desc: '• Connexion sécurisée STARTTLS sur le port 587.\n• Compte de service BDL\\rtgsebank-bdl.\n• Envoi automatique d\'un mail d\'initialisation lors de la création d\'un collaborateur.\n• Token unique 32 octets avec validité 24h.'
      },
      {
        title: 'Portail Reset Password',
        desc: '• URL configurée (https://test-jibaya.bdl.dz).\n• Page dédiée de définition du mot de passe.\n• Vérification en temps réel de l\'intégrité du lien.\n• Hachage bcrypt des mots de passe en base MySQL.'
      }
    ];

    secItems.forEach((s, idx) => {
      const x = 0.8 + (idx * 3.9);
      slide.addShape(pres.ShapeType.roundRect, {
        x: x, y: 1.7, w: 3.7, h: 4.8,
        fill: { color: C_NAVY }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.15
      });

      slide.addText(s.title, {
        x: x + 0.3, y: 2.0, w: 3.1, h: 0.6,
        fontSize: 13, bold: true, color: C_EMERALD_LIGHT
      });

      slide.addShape(pres.ShapeType.line, {
        x: x + 0.3, y: 2.6, w: 3.1, h: 0, line: { color: C_BORDER, width: 1 }
      });

      slide.addText(s.desc, {
        x: x + 0.3, y: 2.8, w: 3.1, h: 3.4,
        fontSize: 10.5, color: C_WHITE, lineSpacing: 18
      });
    });
  }

  // ==========================================
  // SLIDE 7 : TABLEAU DE BORD ET SUPERVISION
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: C_DARK };

    slide.addText('SUPERVISION & PILOTAGE', {
      x: 0.8, y: 0.5, w: 10, h: 0.3, fontSize: 11, bold: true, color: C_EMERALD_LIGHT
    });
    slide.addText('Tableau de Bord & Auditabilité Totale', {
      x: 0.8, y: 0.85, w: 11, h: 0.6, fontSize: 24, bold: true, color: C_WHITE
    });

    const kpis = [
      { label: 'Volume Global', val: 'Flux RTGS', sub: 'Monitoring continu' },
      { label: 'Validés & Émis', val: 'MT103 + OD', sub: 'Imputation SAB' },
      { label: 'Attente Décision', val: 'Alerte Solde', sub: 'Action requise' },
      { label: 'Rejetés / Doublons', val: 'SI Retour', sub: 'Trace avis client' }
    ];

    kpis.forEach((k, idx) => {
      const x = 0.8 + (idx * 2.92);
      slide.addShape(pres.ShapeType.roundRect, {
        x: x, y: 1.7, w: 2.7, h: 1.4,
        fill: { color: C_NAVY }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.1
      });
      slide.addText(k.label, {
        x: x + 0.15, y: 1.85, w: 2.4, h: 0.3, fontSize: 10, color: C_MUTED
      });
      slide.addText(k.val, {
        x: x + 0.15, y: 2.15, w: 2.4, h: 0.4, fontSize: 14, bold: true, color: C_EMERALD_LIGHT
      });
      slide.addText(k.sub, {
        x: x + 0.15, y: 2.6, w: 2.4, h: 0.3, fontSize: 9, color: C_WHITE
      });
    });

    // Fonctions supervision
    slide.addShape(pres.ShapeType.roundRect, {
      x: 0.8, y: 3.4, w: 11.7, h: 3.1,
      fill: { color: C_NAVY }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.15
    });

    slide.addText('Outils de Supervision Intégrés dans l\'Interface Web :', {
      x: 1.1, y: 3.6, w: 11.0, h: 0.4, fontSize: 13, bold: true, color: C_WHITE
    });

    const supPoints = [
      '• Visualisation des Alertes de Solde : Liste immédiate des virements requérant une décision opérateur.',
      '• Registre Multi-Critères : Recherche et filtrage par numéro d\'ordre, libellé, statut, banque réceptrice ou date.',
      '• Visionneuse Fichiers Intégrée : Consultation directe du contenu brut des fichiers EDI, MT103, OD et SI Retour.',
      '• Simulateur EDI Intégré : Outil de test permettant de générer et d\'injecter des cas de test (valide, rejet, doublon).',
      '• Journal d\'Audit TraitementLog : Traçabilité chronologique détaillée (Ingestion, Filtres, Requêtes SAB, Émissions).'
    ];

    supPoints.forEach((pt, pIdx) => {
      slide.addText(pt, {
        x: 1.1, y: 4.1 + (pIdx * 0.42), w: 11.0, h: 0.38,
        fontSize: 10.5, color: C_MUTED
      });
    });
  }

  // ==========================================
  // SLIDE 8 : BÉNÉFICES & CONCLUSION
  // ==========================================
  {
    const slide = pres.addSlide();
    slide.background = { color: C_DARK };

    slide.addText('VALEUR AJOUTÉE & BÉNÉFICES CLÉS', {
      x: 0.8, y: 0.5, w: 10, h: 0.3, fontSize: 11, bold: true, color: C_EMERALD_LIGHT
    });
    slide.addText('Synthèse des Gains pour la BDL', {
      x: 0.8, y: 0.85, w: 11, h: 0.6, fontSize: 24, bold: true, color: C_WHITE
    });

    const benefs = [
      { title: '⚡ Rapidité & Temps Réel', desc: 'Traitement automatique des fichiers dès leur dépôt avec génération synchrone des messages SWIFT.' },
      { title: '🎯 Zéro Risque Opérationnel', desc: 'Suppression des erreurs manuelles et blocage systématique des doublons sur libellés et bénéficiaires.' },
      { title: '🔒 Maîtrise de la Provision', desc: 'Vérification en amont dans Oracle SAB évitant tout découvert non autorisé lors de l\'émission RTGS.' },
      { title: '📜 Conformité Réglementaire', desc: 'Respect rigoureux des standards de la Banque d\'Algérie pour le système de gros montants ARTS.' }
    ];

    benefs.forEach((b, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 0.8 + (col * 5.9);
      const y = 1.7 + (row * 2.4);

      slide.addShape(pres.ShapeType.roundRect, {
        x: x, y: y, w: 5.7, h: 2.1,
        fill: { color: C_NAVY }, line: { color: C_BORDER, width: 1 }, rectRadius: 0.15
      });

      slide.addText(b.title, {
        x: x + 0.3, y: y + 0.25, w: 5.1, h: 0.4,
        fontSize: 14, bold: true, color: C_EMERALD_LIGHT
      });

      slide.addText(b.desc, {
        x: x + 0.3, y: y + 0.75, w: 5.1, h: 1.1,
        fontSize: 11, color: C_WHITE, lineSpacing: 18
      });
    });

    slide.addText('Banque de Développement Local • Direction des Systèmes d\'Information', {
      x: 0.8, y: 6.8, w: 11.5, h: 0.3, fontSize: 10, color: C_MUTED, align: 'center'
    });
  }

  const outputPath = path.resolve(__dirname, '../../Presentation_Solution_RTGS_eBanking_BDL.pptx');
  await pres.writeFile({ fileName: outputPath });
  console.log(`Présentation PowerPoint générée avec succès : ${outputPath}`);
}

createPresentation()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Erreur génération présentation PPTX:', err);
    process.exit(1);
  });
