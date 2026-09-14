# BDL-RTGS-ServiceJavaApp 🏦☕

Application autonome en **Java 17 / Spring Boot** pour la Banque de Développement Local (BDL), dédiée à :
1. **La surveillance automatique de répertoires entrants EDI** (`inbox_edi`).
2. **Le filtrage et la détection des virements éligibles RTGS** :
   - `Code Banque Donneur != Code Banque Bénéficiaire` (Interbancaire)
   - `Montant >= 1 000 000 DZD` (Seuil RTGS BDL)
3. **La substitution du RIB Donneur d'Ordre** par le **RIB d'un Compte Interne BDL** (`rtgs.compte.interne.rib`) pour l'étape de comptabilisation intermédiaire Core Banking (SAB).
4. **La traçabilité et persistance** des correspondances dans un registre JSON (`registry_transactions.json`).
5. **La vérification de la comptabilisation** (scrutation des acquittements `inbox_compta` ou simulateur SAB).
6. **La reconstitution automatique du fichier initial** avec le RIB Donneur d'ordre et le RIB Bénéficiaire de départ dans `out_reconstituted`, prêt pour l'émission RTGS / SWIFT MT103.

---

## 🏗️ Architecture du Flux

```
   [ Client / E-Banking ]
             │ (Dépôt fichier EDI VIRM...)
             ▼
     [ 📂 data/inbox_edi ]
             │
             ▼ ─── (FileWatcherService)
   [ 🔍 EdiFixedLengthParser ]
             │
             ├── Éligible RTGS ? (Interbancaire + >= 1M DZD)
             │
     ┌───────┴────────────────────────────────────────┐
     │ OUI                                            │ NON
     ▼                                                ▼
[ 🔄 Substitution RIB Donneur ]             [ ⚪ Statut IGNORE_NON_RTGS ]
  Par Compte Interne BDL
  (ex: 00500133400218153023)
     │
     ├── Sauvegarde Registre (StorageRegistryService)
     │
     ▼
[ 📂 data/out_core_banking ] ──► [ 🏦 Core Banking / SAB ]
                                            │
                                            ▼ (Comptabilisation)
[ 📂 data/inbox_compta ] <──────────────────┘
             │
             ▼ ─── (AccountingCheckService)
  Vérification Statut = COMPTABILISÉ
             │
             ▼
[ 🧩 FileReconstitutionService ]
  Rétablissement du RIB Donneur & Bénéficiaire d'origine
             │
             ▼
[ 📂 data/out_reconstituted ] ──► [ 🌐 Réseau RTGS / SWIFT MT103 ]
```

---

## ⚙️ Configuration (`application.properties`)

| Propriété | Description | Valeur par défaut |
| :--- | :--- | :--- |
| `server.port` | Port HTTP de supervision REST | `8085` |
| `rtgs.folder.inbox` | Dossier surveillé pour les fichiers EDI entrants | `./data/inbox_edi` |
| `rtgs.folder.out-core-banking` | Dossier des fichiers modifiés avec RIB compte interne | `./data/out_core_banking` |
| `rtgs.folder.inbox-compta` | Dossier de réception des retours comptables SAB | `./data/inbox_compta` |
| `rtgs.folder.out-reconstituted` | Dossier des fichiers finaux reconstitués | `./data/out_reconstituted` |
| `rtgs.rules.min-amount` | Seuil minimum RTGS en DZD | `1000000.00` |
| `rtgs.compte.interne.rib` | RIB du compte interne / transit BDL | `00500133400218153023` |
| `rtgs.simulation.auto-compta` | Simulation automatique de comptabilisation | `true` |

---

## 🚀 Démarrage & Compilation

### 1. Prérequis
* Java JDK 17+
* Apache Maven 3.8+

### 2. Compilation et Tests
```bash
cd ServiceJavaApp
mvn clean test
```

### 3. Lancement de l'Application
```bash
mvn spring-boot:run
```

---

## 🌐 Endpoints REST de Supervision (`http://localhost:8085`)

* `GET /api/health` : État de santé, seuil et configuration active.
* `GET /api/transactions` : Liste complète des transactions tracées dans le registre.
* `GET /api/transactions/pending-compta` : Liste des transactions en attente de comptabilisation.
* `POST /api/scan-now` : Déclenche manuellement la scrutation du dossier `inbox_edi`.
* `POST /api/check-compta-now` : Déclenche manuellement la vérification de comptabilité et la reconstitution.
* `POST /api/force-reconstitution` : Force la reconstitution des transactions comptabilisées.
