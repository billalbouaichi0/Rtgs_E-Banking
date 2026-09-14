import React, { useState } from 'react';
import { 
  Code2, 
  Terminal, 
  Database, 
  Server, 
  Layers, 
  Cpu, 
  FolderTree, 
  Copy, 
  Check, 
  FileCode, 
  ShieldCheck, 
  Workflow, 
  ArrowRight, 
  Settings, 
  ExternalLink,
  BookOpen,
  GitBranch,
  Mail,
  Zap,
  HardDrive
} from 'lucide-react';

export const GuideTechnique = () => {
  const [copiedCode, setCopiedCode] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const projectTree = `RTGS-ebanking/
├── backend/                             # Moteur API REST, Services & Ordonnanceur
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js              # Connexion Sequelize (MySQL 8 / SQLite fallback)
│   │   │   ├── folders.js               # Définition des chemins absolus des dossiers
│   │   │   └── oracle.js                # Connecteur Oracle 11g SAB + Simulateur Mock
│   │   ├── models/
│   │   │   ├── index.js                 # Définition des associations Sequelize
│   │   │   ├── Remise.js                # Modèle Remise (fichiers EDI d'origine)
│   │   │   ├── Virement.js              # Modèle Virement (opérations individuelles)
│   │   │   ├── BanqueRef.js             # Référentiel des 17 banques algériennes
│   │   │   ├── FolderConfig.js          # Paramètres des répertoires (Local/FTP/SFTP)
│   │   │   ├── SystemSetting.js         # Paramètres dynamiques (heures lot, polling)
│   │   │   ├── User.js                  # Utilisateurs & rôles (admin, consultation)
│   │   │   └── TraitementLog.js         # Journal d'audit et logs système
│   │   ├── services/
│   │   │   ├── processingService.js     # Parsing EDI, détection doublons, filtrage RTGS
│   │   │   ├── odSchedulerService.js    # Planificateur lots OD, vérif solde & polling SAB
│   │   │   ├── folderStorageService.js  # Abstraction multi-protocoles (Local / FTP / SFTP)
│   │   │   ├── emailService.js          # Moteur Nodemailer (Notifications DCC/DTM/DMB)
│   │   │   └── fileWatcherService.js    # Surveillance Chokidar du dossier source
│   │   ├── generators/
│   │   │   ├── odBatchGenerator.js      # Génération lot OD 98 positions (ZCPTODA9_*.dat)
│   │   │   ├── mt103Generator.js        # Génération message SWIFT MT103 normé
│   │   │   ├── siRetourGenerator.js     # Génération SI Retour Rejet (SI_VIR_RJT_*.txt)
│   │   │   └── siCptGenerator.js        # Génération SI Retour Compta (SI_VIR_CPT_*.txt)
│   │   ├── parsers/
│   │   │   └── ediParser.js             # Découpage positions fixes EDI (EE, EC, EF)
│   │   ├── routes/
│   │   │   ├── authRoutes.js            # Authentification JWT & réinitialisation MDP
│   │   │   ├── virementRoutes.js        # Consultation et extraction des virements
│   │   │   ├── remiseRoutes.js          # Liste et statistiques des remises
│   │   │   ├── systemRoutes.js          # Paramètres du planificateur, dossiers, emails
│   │   │   └── logRoutes.js             # Logs d'audit et historique
│   │   ├── middlewares/
│   │   │   └── authMiddleware.js        # Validation JWT & contrôle des rôles (RBAC)
│   │   ├── seeders/
│   │   │   └── initData.js              # Initialisation automatique DB & banques
│   │   └── server.js                    # Point d'entrée serveur Express (Port 5000)
│   ├── .env                             # Variables d'environnement Backend
│   └── package.json
│
├── frontend/                            # Interface Utilisateur React 18 + Vite
│   ├── src/
│   │   ├── components/                  # Navbar, Sidebar, StatusBadge, Cards
│   │   ├── context/                     # AuthContext, ThemeContext (Dark/Light)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx            # KPIs & statistiques globales
│   │   │   ├── OdScheduler.jsx          # Planificateur OD, Suivi SAB, Emails structures
│   │   │   ├── VirementsList.jsx        # Registre des virements & visionneuse fichiers
│   │   │   ├── FolderConfigs.jsx        # Configuration répertoires Local / FTP / SFTP
│   │   │   ├── GuideFonctionnel.jsx     # Guide Métier & Règles bancaires
│   │   │   ├── GuideTechnique.jsx       # Guide Architecture & Développeur
│   │   │   ├── ReferentielBanques.jsx   # Banques algériennes (BICs & comptes)
│   │   │   ├── SabAccounts.jsx          # Gestion des comptes Oracle SAB simulés
│   │   │   ├── SimulateurEDI.jsx        # Injection de fichiers EDI de test
│   │   │   ├── ManualUpload.jsx         # Upload manuel de fichiers EDI
│   │   │   └── AuditLogs.jsx            # Journalisation des événements
│   │   └── services/api.js              # Client Axios configuré avec Interceptor JWT
│   └── package.json
│
└── directories/                         # Répertoires de stockage des flux financiers
    ├── source/                          # Dossier de dépôt EDI (Rétention intégrale)
    ├── generated_od/                    # Fichiers de lot OD générés (ZCPTODA9_*.dat)
    ├── generated_mt103/                 # Messages SWIFT MT103 émis
    └── si_retour/                       # Fichiers SI Retour (SI_VIR_RJT & SI_VIR_CPT)`;

  const envSample = `# Port d'écoute du serveur backend
PORT=5000
NODE_ENV=development
JWT_SECRET=bdl_rtgs_secret_jwt_key_2026_super_secure

# Base de Données MySQL (ou SQLite si USE_SQLITE_FALLBACK=true)
DB_DIALECT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=rtgs_ebanking
DB_USER=root
DB_PASSWORD=
USE_SQLITE_FALLBACK=false

# Mode Core Banking SAB (SIMULATION ou ORACLE_PROD)
SOLDE_VERIFICATION_MODE=SIMULATION

# Paramètres de connexion Oracle 11g SAB (si SOLDE_VERIFICATION_MODE=ORACLE_PROD)
ORACLE_USER=sabstd
ORACLE_PASSWORD=sabpass
ORACLE_CONNECT_STRING=10.121.2.65:1521/SABDEV

# Seuil RTGS en Dinars Algériens
RTGS_MIN_AMOUNT=1000000

# Configuration SMTP BDL
SMTP_HOST=10.121.2.50
SMTP_PORT=587
SMTP_USER=BDL\\rtgsebank-bdl
SMTP_PASS=windows-2026+
SMTP_FROM=rtgsebank-bdl@bdl.dz
FRONTEND_URL=https://test-jibaya.bdl.dz

# Adresses Emails des Structures BDL Notifiées
EMAIL_STRUCTURE_DCC=dcc-comptabilite@bdl.dz
EMAIL_STRUCTURE_DTM=dtm-tresorerie@bdl.dz
EMAIL_STRUCTURE_DMB=dmb-monetique@bdl.dz`;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#1a1c2e] to-[#0f172a] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Terminal className="w-80 h-80 text-white" />
        </div>
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 text-xs font-bold uppercase tracking-wider">
            <Code2 className="w-3.5 h-3.5" /> Documentation Développeur & Architecture
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Guide Technique — BDL RTGS E-Banking
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
            Spécifications architecturales, modèle de données Sequelize, connecteur Oracle SAB 11g, arborescence complète et procédures d'extension pour les développeurs.
          </p>
        </div>
      </div>

      {/* 1. Stack Technique & Architecture C4 */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              1. Stack Technologique & Architecture Logicielle
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Composants et technologies utilisés sur la plateforme
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-500">
              <Server className="w-4 h-4" /> Backend Node.js
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Express.js + Sequelize</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              API RESTful, middlewares JWT, pool de connexions MySQL et fallback SQLite.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#772281] dark:text-[#f9b307]">
              <Database className="w-4 h-4" /> Core Banking SAB
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Oracle 11g (oracledb)</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Vérification des soldes (<code className="font-mono">zcompte0</code>/<code className="font-mono">zsolde0</code>) et polling (<code className="font-mono">zcptod0</code>).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
              <HardDrive className="w-4 h-4" /> Multi-Protocoles
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Local / FTP / SFTP</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Connecteurs dynamiques pour répertoires locaux et distants sécurisés.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-500">
              <Code2 className="w-4 h-4" /> Frontend React
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">React 18 + Vite + Tailwind</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Single Page Application réactive avec Dark Mode natif et Lucide Icons.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Arborescence Complète du Projet */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-[#772281] dark:text-[#f9b307]">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                2. Structure des Répertoires & Fichiers
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cartographie complète du code source
              </p>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(projectTree, 'tree')}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            {copiedCode === 'tree' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode === 'tree' ? 'Copié !' : 'Copier Arborescence'}</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 text-[11px] font-mono overflow-x-auto border border-slate-800 leading-relaxed max-h-96">
          {projectTree}
        </pre>
      </section>

      {/* 3. Les 4 Services Backend Majeurs */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Workflow className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              3. Les 4 Services Backend Piliers
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comprendre la responsabilité de chaque classe de service
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* processingService */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-sky-500">processingService.js</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-500 font-bold">Ingestion</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Assure l'ingestion des fichiers EDI, le calcul d'empreinte d'unicité, la détection des doublons intra-remise ou en base, et l'attribution des statuts initiaux (<code className="font-mono">RECU</code> ou <code className="font-mono">IGNORE_FILTRE</code>).
            </p>
            <div className="text-[11px] font-mono text-slate-500 space-y-1">
              <p>• processEdiFile(filePath, fileName)</p>
              <p>• recalculateRemiseStatut(remiseId)</p>
            </div>
          </div>

          {/* odSchedulerService */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-500">odSchedulerService.js</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 font-bold">Ordonnanceur</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Gère les timers de déclenchement des lots OD aux heures fixes (12h, 15h, 16h30) avec contrôle de provision direct et orchestre le polling régulier de comptabilisation SAB sur <code className="font-mono">sabstd.zcptod0</code>.
            </p>
            <div className="text-[11px] font-mono text-slate-500 space-y-1">
              <p>• executerGenerationLotOd(options)</p>
              <p>• verifierComptabilisationSab()</p>
            </div>
          </div>

          {/* folderStorageService */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-500">folderStorageService.js</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">Stockage</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Couche d'abstraction unifiée pour l'écriture et la lecture des fichiers de sortie et de source, supportant le système de fichiers Local, les serveurs FTP standard et les passerelles SFTP sécurisées.
            </p>
            <div className="text-[11px] font-mono text-slate-500 space-y-1">
              <p>• writeOutputFile(folderKey, fileName, content)</p>
              <p>• testConnection(configData)</p>
            </div>
          </div>

          {/* emailService */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-500">emailService.js</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">Emails</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Service de messagerie Corporate BDL basé sur Nodemailer avec STARTTLS sur le port 587. Gère l'envoi asynchrone non-bloquant des notifications et pièces jointes aux structures DCC, DTM et DMB.
            </p>
            <div className="text-[11px] font-mono text-slate-500 space-y-1">
              <p>• sendOdNotification(data) ➔ DCC</p>
              <p>• sendMt103Notification(data) ➔ DTM</p>
              <p>• sendSiRetourNotification(data) ➔ DMB</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Configuration & Environnement (.env) */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                4. Variables d'Environnement Développeur (.env)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Fichier de configuration du backend
              </p>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(envSample, 'env')}
            className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          >
            {copiedCode === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode === 'env' ? 'Copié !' : 'Copier .env'}</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 text-[11px] font-mono overflow-x-auto border border-slate-800 leading-relaxed">
          {envSample}
        </pre>
      </section>

      {/* 5. Guide d'Extension Développeur */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
            <GitBranch className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              5. Guide d'Extension pour les Futurs Développeurs
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Comment enrichir et maintenir l'application
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              A. Ajouter ou modifier une heure de génération de lot OD
            </h3>
            <p className="leading-relaxed">
              Les heures sont dynamiques. Vous pouvez soit les modifier dans l'interface (<code className="font-mono">/scheduler</code>), soit directement en base dans la table <code className="font-mono">system_settings</code> sous la clé <code className="font-mono">od_batch_hours</code> (tableau JSON ex: <code className="font-mono">["10:00", "12:00", "15:00", "16:30"]</code>).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              B. Basculer entre le Simulateur et Oracle 11g Réel
            </h3>
            <p className="leading-relaxed">
              Dans <code className="font-mono">backend/.env</code>, changez <code className="font-mono">SOLDE_VERIFICATION_MODE=ORACLE_PROD</code> et renseignez les identifiants de la base Oracle SAB (<code className="font-mono">ORACLE_CONNECT_STRING</code>, <code className="font-mono">ORACLE_USER</code>, <code className="font-mono">ORACLE_PASSWORD</code>). Le connecteur gère automatiquement les reconnexions et le pool.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              C. Ajouter un nouveau format de fichier ou une nouvelle structure
            </h3>
            <p className="leading-relaxed">
              1. Créez votre générateur dans <code className="font-mono">backend/src/generators/</code>.<br/>
              2. Définissez la méthode de notification dans <code className="font-mono">backend/src/services/emailService.js</code>.<br/>
              3. Branchez l'appel dans <code className="font-mono">backend/src/services/odSchedulerService.js</code> ou <code className="font-mono">backend/src/services/processingService.js</code>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default GuideTechnique;
