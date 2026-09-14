const fs = require('fs');
const path = require('path');
const { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  Header, 
  Footer, 
  AlignmentType, 
  HeadingLevel, 
  BorderStyle, 
  WidthType, 
  ShadingType, 
  PageNumber, 
  PageBreak,
  VerticalAlign
} = require('docx');

// Palette de couleurs Corporate BDL
const BDL_PURPLE = "772281";
const BDL_GOLD = "F9B307";
const DARK_SLATE = "0F172A";
const BODY_TEXT = "334155";
const LIGHT_BG = "F8FAFC";
const BORDER_COLOR = "CBD5E1";
const ACCENT_BLUE = "2563EB";
const ACCENT_GREEN = "059669";
const ACCENT_RED = "DC2626";

function createHeaderPara(text) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [
      new TextRun({
        text: "BANQUE DE DEVELOPPEMENT LOCAL • DIRECTION DE L'INFORMATIQUE & RTGS",
        size: 16, // 8pt
        color: "64748B",
        font: "Segoe UI",
        bold: true
      })
    ]
  });
}

function createFooterPara() {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text: "BDL RTGS E-Banking — Document Confidentiel Interne BDL          Page ",
        size: 18, // 9pt
        color: "64748B",
        font: "Segoe UI"
      }),
      new TextRun({
        children: [PageNumber.CURRENT],
        size: 18,
        color: BDL_PURPLE,
        bold: true,
        font: "Segoe UI"
      }),
      new TextRun({
        text: " sur ",
        size: 18,
        color: "64748B",
        font: "Segoe UI"
      }),
      new TextRun({
        children: [PageNumber.TOTAL_PAGES],
        size: 18,
        color: "64748B",
        font: "Segoe UI"
      })
    ]
  });
}

function createTitle(text, subtitle) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 150 },
      children: [
        new TextRun({
          text: "BANQUE DE DEVELOPPEMENT LOCAL",
          size: 28,
          bold: true,
          color: BDL_PURPLE,
          font: "Segoe UI"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 300 },
      children: [
        new TextRun({
          text: "SYSTEME CENTRAL RTGS & E-BANKING",
          size: 22,
          bold: true,
          color: BDL_GOLD,
          font: "Segoe UI"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 150 },
      children: [
        new TextRun({
          text,
          size: 40,
          bold: true,
          color: DARK_SLATE,
          font: "Segoe UI"
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 400 },
      children: [
        new TextRun({
          text: subtitle,
          size: 24,
          color: "475569",
          italics: true,
          font: "Segoe UI"
        })
      ]
    })
  ];
}

function createH1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 140 },
    children: [
      new TextRun({
        text,
        size: 28, // 14pt
        bold: true,
        color: BDL_PURPLE,
        font: "Segoe UI"
      })
    ]
  });
}

function createH2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({
        text,
        size: 24, // 12pt
        bold: true,
        color: DARK_SLATE,
        font: "Segoe UI"
      })
    ]
  });
}

function createH3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [
      new TextRun({
        text,
        size: 22, // 11pt
        bold: true,
        color: "4338CA",
        font: "Segoe UI"
      })
    ]
  });
}

function createPara(text, options = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 100 },
    alignment: options.alignment || AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text,
        size: 20, // 10pt
        color: options.color || BODY_TEXT,
        bold: options.bold || false,
        italics: options.italics || false,
        font: "Segoe UI"
      })
    ]
  });
}

function createBullet(text, boldPrefix = '') {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 40, after: 60 },
    children: [
      boldPrefix ? new TextRun({ text: boldPrefix, bold: true, size: 20, color: DARK_SLATE, font: "Segoe UI" }) : null,
      new TextRun({ text, size: 20, color: BODY_TEXT, font: "Segoe UI" })
    ].filter(Boolean)
  });
}

function createCallout(title, text, type = 'INFO') {
  const borderColor = type === 'ALERT' ? ACCENT_RED : (type === 'SUCCESS' ? ACCENT_GREEN : BDL_PURPLE);
  const bgColor = type === 'ALERT' ? 'FEF2F2' : (type === 'SUCCESS' ? 'ECFDF5' : 'F5F3FF');

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      left: { style: BorderStyle.SINGLE, size: 24, color: borderColor },
      top: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: bgColor, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({ text: `📌 ${title}`, bold: true, size: 20, color: borderColor, font: "Segoe UI" })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text, size: 19, color: DARK_SLATE, font: "Segoe UI" })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

function createCodeBlock(codeText) {
  const lines = codeText.split('\n');
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" },
      left: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" },
      right: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1" }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: "0F172A", type: ShadingType.CLEAR },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: lines.map(line => new Paragraph({
              spacing: { before: 20, after: 20 },
              children: [
                new TextRun({
                  text: line,
                  size: 18, // 9pt
                  color: "E2E8F0",
                  font: "Consolas"
                })
              ]
            }))
          })
        ]
      })
    ]
  });
}

function createTable(headers, rowsData, widths = []) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      width: widths[i] ? { size: widths[i], type: WidthType.PERCENTAGE } : undefined,
      shading: { fill: BDL_PURPLE, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 100, right: 100 },
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: h, bold: true, size: 19, color: "FFFFFF", font: "Segoe UI" })
          ]
        })
      ]
    }))
  });

  const bodyRows = rowsData.map((row, rIdx) => new TableRow({
    children: row.map((cell, cIdx) => new TableCell({
      width: widths[cIdx] ? { size: widths[cIdx], type: WidthType.PERCENTAGE } : undefined,
      shading: { fill: rIdx % 2 === 0 ? "FFFFFF" : LIGHT_BG, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 100, right: 100 },
      borders: {
        bottom: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
        top: { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE }
      },
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: String(cell), size: 18, color: DARK_SLATE, font: "Segoe UI" })
          ]
        })
      ]
    }))
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 12, color: BDL_PURPLE },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: BDL_PURPLE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE }
    },
    rows: [headerRow, ...bodyRows]
  });
}

async function buildDocx() {
  console.log('Génération du document Word BDL RTGS...');

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Segoe UI", size: 20, color: BODY_TEXT }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } // 1 pouce (2.54 cm)
          }
        },
        headers: {
          default: new Header({ children: [createHeaderPara()] })
        },
        footers: {
          default: new Footer({ children: [createFooterPara()] })
        },
        children: [
          // Page de Garde
          ...createTitle(
            "GUIDE TECHNIQUE D'ARCHITECTURE ET DIAGRAMMES",
            "Plateforme BDL RTGS E-Banking — Moteur EDI, Ordonnancement OD & Télécompensation SWIFT MT103"
          ),

          createCallout(
            "FICHE DE DOCUMENTATION TECHNIQUE BDL",
            "Organisme : Banque de Développement Local (BDL)\nDirection : Direction des Systèmes d'Information & Télécompensation\nVersion : 2.4.0 (Production Ready)\nDate d'édition : Septembre 2026\nStatut : Validé et Conforme aux exigences RTGS Banque d'Algérie & SAB Core Banking",
            "INFO"
          ),

          new Paragraph({ spacing: { before: 200, after: 200 }, children: [new PageBreak()] }),

          // 1. Vue d'Ensemble
          createH1("1. Présentation Générale & Enjeux Métier"),
          createPara("La solution BDL RTGS E-Banking est une plateforme bancaire hautement sécurisée et automatisée assurant l'intermédiation entre les canaux digitaux e-Banking et le système de règlement brut en temps réel (RTGS) de la Banque d'Algérie."),
          
          createH2("1.1 Objectifs Clés"),
          createBullet(" Automatisation complète du traitement des remises d'ordres de virements de masse.", "• Zéro Saisie Manuelle :"),
          createBullet(" Contrôle préalable en direct de la provision du compte donneur d'ordre sur Oracle 11g SAB avant tout engagement interbancaire.", "• Sécurisation Comptable :"),
          createBullet(" Génération conforme aux standards internationaux SWIFT MT103 et normé BDL OD (98 positions).", "• Conformité Réglementaire :"),
          createBullet(" Routage ciblé des flux et fichiers générés vers les structures compétentes DCC, DTM et DMB.", "• Alerting Métier :"),

          createH2("1.2 Critères d'Éligibilité RTGS"),
          createBullet(" Montant supérieur ou égal à 1 000 000,00 DZD (Paramètre système).", "1. Seuil Financier :"),
          createBullet(" Opération interbancaire (Code banque donneur 005 BDL ≠ Code banque bénéficiaire).", "2. Type de Flux :"),
          createPara("Les opérations intrabancaires (005 vers 005) ou inférieures à 1M DZD sont orientées vers le circuit classique avec le statut IGNORE_FILTRE."),

          new Paragraph({ spacing: { after: 150 } }),

          // 2. Structures BDL
          createH1("2. Rôles et Affectations des Directions BDL"),
          createTable(
            ["Direction BDL", "Rôle Métier", "Fichiers & Flux Reçus", "Email Notifié"],
            [
              ["Structure DCC", "Direction de la Comptabilité et du Contrôle de gestion", "Fichier de lot d'Opérations Diverses (ZCPTODA9_*.dat) en pièce jointe + Récapitulatif débit", "dcc-comptabilite@bdl.dz"],
              ["Structure DTM", "Direction de la Trésorerie et des Marchés", "Message SWIFT MT103 normé (MT103_*.txt) en pièce jointe + Fiche d'exécution télécompensation", "dtm-tresorerie@bdl.dz"],
              ["Structure DMB", "Direction de la Monétique et de la Banque à distance", "Fichiers SI Retour Rejet (SI_VIR_RJT_*.txt) ou Confirmation Comptable (SI_VIR_CPT_*.txt)", "dmb-monetique@bdl.dz"]
            ],
            [20, 30, 30, 20]
          ),

          new Paragraph({ spacing: { before: 200, after: 200 }, children: [new PageBreak()] }),

          // 3. Architecture Technique
          createH1("3. Architecture Technique & Composants"),
          createPara("L'architecture repose sur un découpage modulaire garantissant haute disponibilité, traçabilité et scalabilité :"),
          
          createBullet(" Node.js 18+ avec Express.js, orchestrateur de tâches asynchrones et pool de connexions.", "• Backend Runtime :"),
          createBullet(" Sequelize ORM avec support natif MySQL 8 (Production) et fallback SQLite.", "• Persistance :"),
          createBullet(" Connecteur direct Oracle 11g Instant Client avec bascule transparente vers un simulateur intégré en mémoire.", "• Core Banking SAB :"),
          createBullet(" Surveillance Chokidar en temps réel et connecteurs distants FTP/SFTP (ssh2-sftp-client / basic-ftp).", "• Multi-Protocoles :"),
          createBullet(" Moteur Nodemailer avec protocole sécurisé STARTTLS sur le port 587 (serveur 10.121.2.50).", "• Moteur SMTP :"),
          createBullet(" React 18 SPA avec Vite, Tailwind CSS, Lucide Icons et authentification JWT sécurisée.", "• Frontend Web :"),

          createH2("3.1 Schéma d'Architecture C4 Container"),
          createCodeBlock(`+-------------------------------------------------------------------------------+
|                             POSTES CLIENTS / NAVIGATEURS                      |
|                 [ Administrateurs RTGS ]          [ Agents Consultation ]     |
+---------------------------------------+---------------------------------------+
                                        | HTTPS / REST API (JWT)
                                        v
+-------------------------------------------------------------------------------+
|                       API GATEWAY & MIDDLEWARES (Express.js)                 |
+---------------------------------------+---------------------------------------+
                                        |
        +-------------------------------+-------------------------------+
        |                               |                               |
        v                               v                               v
+------------------+            +------------------+            +------------------+
| FileWatcher /    |            | OdScheduler /    |            | Processing /     |
| SFTP Poller      |            | Polling SAB      |            | Parser EDI       |
+--------+---------+            +--------+---------+            +--------+---------+
         |                               |                               |
         |         +---------------------+---------------------+         |
         |         |                                           |         |
         v         v                                           v         v
+----------------------+     +----------------------+     +----------------------+
| FolderStorageService |     |   OracleService SAB  |     |     EmailService     |
| (Local / FTP / SFTP) |     |  (Oracle Net8: 1521) |     |  (SMTP STARTTLS:587) |
+----------+-----------+     +----------+-----------+     +----------+-----------+
           |                            |                            |
           v                            v                            v
 [ directories/ FS ]           [ sabstd.zcptod0 ]           [ DCC / DTM / DMB ]`),

          new Paragraph({ spacing: { before: 200, after: 200 }, children: [new PageBreak()] }),

          // 4. Cycle de Vie & Workflow
          createH1("4. Cycle de Traitement & Workflow Métier Détaillé"),
          createPara("Le cycle complet d'un virement suit 3 phases automatisées :"),

          createH2("4.1 Phase 1 : Ingestion EDI, Filtrage & Rétention Source"),
          createBullet(" Dépôt du fichier de remise client dans le répertoire source.", "1. Surveillance :"),
          createBullet(" Calcul d'empreinte (Hash MD5/SHA-256) pour éviter toute ré-ingestion accidentelle. Le fichier d'origine n'est JAMAIS supprimé du répertoire source.", "2. Rétention Intégrale :"),
          createBullet(" Extraction des lignes Entête (EE), Corps (EC) et Fin (EF). Détection des doublons.", "3. Parsing :"),
          createBullet(" Les virements éligibles reçoivent l'état RECU. Les autres sont marqués IGNORE_FILTRE.", "4. Qualification :"),

          createH2("4.2 Phase 2 : Ordonnancement des Lots OD & Contrôle Solde SAB"),
          createBullet(" Exécution automatique aux heures programmables (12:00, 15:00, 16:30) ou sur demande manuelle.", "1. Déclenchement :"),
          createBullet(" Interrogation synchrone du solde sur sabstd.zcompte0 et sabstd.zsolde0 pour chaque virement au statut RECU.", "2. Vérification Provision :"),
          createBullet(" Rejet automatique immédiat (statut REJETE), écriture de SI_VIR_RJT_*.txt dans si_retour/ et notification email à la structure DMB.", "3. Cas Solde Insuffisant :"),
          createBullet(" Statut OD_GEN, génération du fichier ZCPTODA9_YYYYMMDD_HHMMSS.dat dans generated_od/ et envoi d'email à la structure DCC avec pièce jointe.", "4. Cas Solde Suffisant :"),

          createH2("4.3 Phase 3 : Polling SAB & Télécompensation MT103"),
          createBullet(" Polling toutes les 5 minutes de la table sabstd.zcptod0 avec la clé d'unicité CPTODLI2.", "1. Surveillance :"),
          createBullet(" Pris en charge par le SAB. Le polling se poursuit.", "2. Code CPTODETA = '001' (INTEGRE) :"),
          createBullet(" Passage au statut ENVOYE, récupération du N° DCO, génération du SWIFT MT103 vers generated_mt103/ (notifié à la DTM) et génération de l'accusé SI_VIR_CPT vers si_retour/ (notifié à la DMB).", "3. Code CPTODETA = '003' (COMPTABILISE) :"),
          createBullet(" Statut REJETE, génération de SI_VIR_RJT_*.txt et notification email à la DMB.", "4. Code CPTODETA = '002' (REJETE SAB) :"),

          new Paragraph({ spacing: { before: 200, after: 200 }, children: [new PageBreak()] }),

          // 5. Diagrammes de Flux & Séquence
          createH1("5. Diagrammes de Flux & Séquence"),
          createPara("Les diagrammes textuels ci-dessous illustrent les interactions synchrones et asynchrones :"),

          createH2("5.1 Diagramme de Séquence de la Phase de Lot OD"),
          createCodeBlock(`[Scheduler]              [MySQL]               [Oracle SAB 11g]          [DCC/DMB]
     |                      |                          |                     |
     |-- 1. Heure Fixe ---->|                          |                     |
     |-- 2. Find RECU ----->|                          |                     |
     |<- Liste virements ---|                          |                     |
     |                                                 |                     |
     |-- 3. SELECT soldecen (compte 15 pos) ---------->|                     |
     |<- 4. Solde disponible (ex: 50 000 000 DZD) -----|                     |
     |                                                 |                     |
     |=== CAS A : Solde < Montant (Insuffisant) =============================|
     |-- 5a. Générer SI_VIR_RJT_*.txt -------------------------------------->|
     |-- 6a. UPDATE statut = 'REJETE' ---------------->|                     |
     |-- 7a. Envoi Email Notification Rejet -------------------------------->| Structure DMB
     |                                                 |                     |
     |=== CAS B : Solde >= Montant (Suffisant) ==============================|
     |-- 5b. Générer ZCPTODA9_YYYYMMDD_HHMMSS.dat ---->|                     |
     |-- 6b. UPDATE statut = 'OD_GEN' ---------------->|                     |
     |-- 7b. Envoi Email Notification Lot OD + .dat ------------------------>| Structure DCC
     v                      v                          v                     v`),

          createH2("5.2 Diagramme de Séquence de la Phase de Polling SAB"),
          createCodeBlock(`[Poller]                 [MySQL]               [Oracle zcptod0]          [DTM/DMB]
     |                      |                          |                     |
     |-- 1. Check 5 min --->|                          |                     |
     |-- 2. Find OD_GEN --->|                          |                     |
     |<- Liste virements ---|                          |                     |
     |                                                 |                     |
     |-- 3. SELECT CPTODETA, CPTODDCO (CPTODLI2) ----->|                     |
     |<- 4. CPTODETA='003' & CPTODDCO='987654321' -----|                     |
     |                                                 |                     |
     |-- 5. Générer SWIFT MT103 (MT103_*.txt) -------->|                     |
     |-- 6. Générer Accusé Compta (SI_VIR_CPT_*.txt) ->|                     |
     |-- 7. UPDATE statut = 'ENVOYE' ----------------->|                     |
     |-- 8. Envoi Email SWIFT MT103 + .txt --------------------------------->| Structure DTM
     |-- 9. Envoi Email Accusé Compta + .txt ------------------------------->| Structure DMB
     v                      v                          v                     v`),

          new Paragraph({ spacing: { before: 200, after: 200 }, children: [new PageBreak()] }),

          // 6. Formats des Fichiers
          createH1("6. Spécifications & Formats des Fichiers"),
          createPara("L'ensemble des fichiers générés respecte scrupuleusement les normes BDL et SWIFT :"),

          createH2("6.1 Format EDI Entrant (Positions Fixes)"),
          createTable(
            ["Enregistrement", "Position", "Longueur", "Désignation", "Exemple / Format"],
            [
              ["Entête EE", "001 - 004", "4", "Identifiant fixe", "VIRM"],
              ["Entête EE", "005 - 007", "3", "Code Banque Donneur", "005 (BDL)"],
              ["Entête EE", "013 - 032", "20", "RIB Donneur d'Ordre", "00500133400218153023"],
              ["Entête EE", "037 - 086", "50", "Nom Donneur d'Ordre", "ENTREPRISE NATIONALE INDUSTRIELLE"],
              ["Entête EE", "157 - 164", "8", "Date Remise (AAAAMMJJ)", "20260914"],
              ["Entête EE", "174 - 189", "16", "Montant total (Centimes)", "0000000243735800"],
              ["Corps EC", "001 - 010", "10", "N° Ordre séquentiel", "0000010207"],
              ["Corps EC", "012 - 031", "20", "RIB Bénéficiaire", "00806001906006101410"],
              ["Corps EC", "036 - 085", "50", "Nom Bénéficiaire", "SARL TECH LOGISTICS ALGERIE"],
              ["Corps EC", "156 - 170", "15", "Montant virement (Centimes)", "000000243735800"],
              ["Corps EC", "171 - 240", "70", "Libellé de l'opération", "VIR FACTURE RTGS MATERIEL INFO"],
              ["Fin EF", "001 - 004", "4", "Identifiant fin", "FVIR"]
            ],
            [15, 15, 12, 28, 30]
          ),

          new Paragraph({ spacing: { after: 150 } }),

          createH2("6.2 Format Message SWIFT MT103"),
          createCodeBlock(`{1:F01BDLODZALXXX0000000000}{2:I103BALGDZALXXXXN}{3:{103:DLP}}{4:
:20:0000010207
:23B:CRED
:23E:SDVA
:32A:260914DZD2437358,00
:50K:/00500133400218153023
ENTREPRISE NATIONALE INDUSTRIELLE
12 BOULEVARD DES MARTYRS
ALGER
:53A:/9711000005
BDLODZALXXX
:57A:/9711000008
SGENALAGXXX
:59:/00806001906006101410
SARL TECH LOGISTICS ALGERIE
ZONE INDUSTRIELLE OUED SMAR
ALGER
:70:VIR FACTURE RTGS MATERIEL INFO
:71A:SHA
:72:/CODTYPTR/001
-}`),

          new Paragraph({ spacing: { before: 200, after: 200 }, children: [new PageBreak()] }),

          // 7. Modèle de Données & Tables
          createH1("7. Schéma de Base de Données & États"),
          createPara("Le système s'articule autour des tables relationnelles suivantes :"),

          createTable(
            ["Table", "Description", "Champs Clés"],
            [
              ["remises", "Historique et métadonnées des fichiers EDI reçus", "id, nomFichier, fileHash, montantTotal, nombreOperations, statutGlobal"],
              ["virements", "Enregistrements individuels de chaque ordre de virement", "id, remiseId, numeroOrdre, montant, ribDonneur, ribBeneficiaire, statut, cleUniciteSab, cptoddco, fichierOdBatch, fichierMt103Genere"],
              ["banque_refs", "Référentiel des 17 banques algériennes agréées", "codeBanque, nomBanque, bicSwift, compteReglement"],
              ["folder_configs", "Configurations dynamiques des répertoires Local/FTP/SFTP", "folderKey, type, localPath, host, port, username, password, remotePath, isActive"],
              ["system_settings", "Paramètres globaux du planificateur et emails", "key, value, description"],
              ["traitement_logs", "Journal d'audit horodaté et traçabilité complète", "id, type, niveau, message, nomFichier, virementId, details, createdAt"],
              ["users", "Comptes d'accès avec gestion des privilèges", "id, username, email, password, fullName, role, isActive"]
            ],
            [18, 42, 40]
          ),

          createH2("7.1 Cycle de Vie des Statuts d'un Virement"),
          createTable(
            ["Code Statut", "Libellé Affiché", "Signification Métier & Déclencheur"],
            [
              ["RECU", "En attente Lot OD", "Virement éligible extrait de la remise EDI. En attente de l'heure de lot."],
              ["OD_GEN", "Lot OD Généré", "Solde suffisant vérifié sur SAB. Inclus dans ZCPTODA9_*.dat. Transmis à la DCC."],
              ["INTEGRE", "Intégré SAB (001)", "Pris en compte par le SAB (CPTODETA=001, DCO=0). En attente de comptabilisation."],
              ["ENVOYE", "Comptabilisé & Envoyé", "Comptabilisé (CPTODETA=003, DCO!=0). Message MT103 émis à la DTM et SI_VIR_CPT émis à la DMB."],
              ["REJETE", "Rejeté", "Rejet automatique pour solde insuffisant lors du lot ou rejet comptable SAB (002). Notifié à la DMB."],
              ["IGNORE_FILTRE", "Filtré / Non RTGS", "Montant inférieur à 1 000 000 DZD ou virement interne BDL vers BDL."],
              ["REJETE_DOUBLON", "Rejeté (Doublon)", "Rejet pour détection de doublon (même libellé / tiers dans la remise ou en base)."]
            ],
            [18, 25, 57]
          ),

          new Paragraph({ spacing: { before: 200, after: 200 }, children: [new PageBreak()] }),

          // 8. Manuel d'Exploitation & Déploiement
          createH1("8. Déploiement & Manuel d'Exploitation"),
          createPara("Instructions d'installation et de mise en production :"),

          createH2("8.1 Configuration de l'Environnement (.env)"),
          createCodeBlock(`PORT=5000
NODE_ENV=production
JWT_SECRET=bdl_rtgs_secret_jwt_key_2026_super_secure

# Base de données MySQL
DB_DIALECT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=rtgs_ebanking
DB_USER=root
DB_PASSWORD=

# Core Banking Oracle 11g
SOLDE_VERIFICATION_MODE=ORACLE_PROD
ORACLE_USER=sabstd
ORACLE_PASSWORD=sabpass
ORACLE_CONNECT_STRING=10.121.2.65:1521/SABPROD

# Serveur SMTP BDL
SMTP_HOST=10.121.2.50
SMTP_PORT=587
SMTP_USER=BDL\\rtgsebank-bdl
SMTP_PASS=windows-2026+
SMTP_FROM=rtgsebank-bdl@bdl.dz

# Emails des Structures BDL
EMAIL_STRUCTURE_DCC=dcc-comptabilite@bdl.dz
EMAIL_STRUCTURE_DTM=dtm-tresorerie@bdl.dz
EMAIL_STRUCTURE_DMB=dmb-monetique@bdl.dz`),

          createH2("8.2 Lancement des Services"),
          createCodeBlock(`# 1. Lancement du Serveur Backend API
cd backend
npm install
npm start

# 2. Lancement du Frontend Web React
cd frontend
npm install
npm run build
npm run preview`),

          new Paragraph({ spacing: { after: 200 } }),
          createCallout(
            "VALIDATION & HOMOLOGATION BDL",
            "Ce document a été généré pour servir de référentiel technique et d'exploitation officiel lors des audits et du déploiement en environnement de production BDL.",
            "SUCCESS"
          )
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.resolve(__dirname, '..', 'GUIDE_TECHNIQUE_ARCHITECTURE_ET_DIAGRAMMES.docx');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Document Word généré avec succès : ${outputPath} (${buffer.length} octets)`);
}

buildDocx().catch(err => {
  console.error('Erreur lors de la génération DOCX :', err);
  process.exit(1);
});
