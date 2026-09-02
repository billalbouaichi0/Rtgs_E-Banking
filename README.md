# BDL RTGS e-Banking - Traitement EDI & Télécompensation SWIFT MT103

Plateforme complète de surveillance, de traitement et de télécompensation interbancaire pour la **BDL (Banque de Développement Local)**.

---

## 🚀 Fonctionnalités Clés

1. **Surveillance Automatisée de Dossier (`chokidar`)** :
   - Détection en temps réel de tout fichier EDI déposé dans `directories/source/`.
   - Transfert immédiat vers `directories/input/` pour le traitement.

2. **Moteur de Filtrage RTGS** :
   - Traitement des opérations si **Montant $\ge$ 1 000 000 DZD** ET **Code Banque Émetteur $\neq$ Code Banque Récepteur**.
   - Déplacement automatique des opérations hors seuil / intrabancaires vers `directories/input/ignorer/`.

3. **Contrôle de Provision Core Banking (Oracle 11g SAB)** :
   - Exécution de la requête SQL sur `sabstd.zcompte0` et `sabstd.zsolde0` sur compte 15 positions.
   - Supporte le mode **`SIMULATION`** (développement local) et le mode **`ORACLE_PROD`** (production Oracle 11g).

4. **Génération Automatique des Flux de Sortie** :
   - **Solde suffisant** :
     - **Fichier OD** dans `directories/generated_od/` (Code banque 3 + Agence 5 + Montant 20 + Filler 70 = 98 car.).
     - **Message SWIFT MT103** dans `directories/generated_mt103/` avec découpage 3 lignes d'adresses (max 35 car.), balises `:20:`, `:32A:`, `:50K:`, `:53A:`, `:57A:` (BIC & Compte Règlement), `:59:`, `:70:`, `:71A:SHA`, `:72:/CODTYPTR/001`.
   - **Solde insuffisant** :
     - **Fichier SI Retour** `SI_RET_{libelle}.txt` dans `directories/si_retour/`.

5. **Interface Web Moderne (React + TailwindCSS)** :
   - Dashboard en direct avec KPIs et distribution par banque réceptrice.
   - Registre complet des virements avec recherche et filtres multi-critères.
   - Visionneuse de fichiers générés avec coloration syntaxique, copie et téléchargement.
   - Simulateur de flux EDI avec scénarios 1-clic.
   - Gestion du référentiel des 17 banques algériennes et des comptes SAB.
   - Rôles : `administrateur` et `consultation`.

---

## 🛠️ Installation & Démarrage

### 1. Prérequis
- Node.js (v18+)
- MySQL (ou SQLite)

### 2. Backend
```bash
cd backend
npm install
npm start
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Accès Web : `http://localhost:3000`
- **Administrateur** : `admin` / `admin123`
- **Consultation** : `consultant` / `consult123`

---

## 📁 Architecture des Répertoires
```
RTGS-ebanking/
├── backend/            # API Express + Sequelize + Oracle SAB connector
├── frontend/           # Interface React + TailwindCSS + Lucide Icons
├── directories/
│   ├── source/         # Dossier surveillé en temps réel
│   ├── input/          # Fichiers en cours de traitement
│   ├── input/ignorer/  # Fichiers ignorés (< 1M DZD ou même banque)
│   ├── generated_od/   # Fichiers OD comptables générés
│   ├── generated_mt103/# Messages SWIFT MT103 générés
│   └── si_retour/      # Fichiers SI_RET générés en cas de rejet
└── README.md
```
