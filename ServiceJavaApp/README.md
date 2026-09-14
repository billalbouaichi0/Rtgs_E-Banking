# BDL-RTGS-ServiceJavaApp 🏦☕

Application autonome en **Java Standard (Pure Java 17 SE)** sans Spring Boot, dédiée à :
1. **La surveillance automatique de répertoires entrants EDI** (`data/inbox_edi`).
2. **Le filtrage et la détection des virements éligibles RTGS** :
   - `Code Banque Donneur != Code Banque Bénéficiaire` (Interbancaire)
   - `Montant >= 1 000 000 DZD` (Seuil RTGS BDL)
3. **La substitution du RIB Donneur d'Ordre** par le **RIB d'un Compte Interne BDL** (`rtgs.compte.interne.rib`) pour l'étape de comptabilisation intermédiaire Core Banking (SAB).
4. **La traçabilité et persistance** des correspondances dans un registre JSON (`data/registry_transactions.json`).
5. **La vérification de la comptabilisation** (scrutation des acquittements `data/inbox_compta` ou simulateur SAB).
6. **La reconstitution automatique du fichier initial** avec le RIB Donneur d'ordre et le RIB Bénéficiaire de départ dans `data/out_reconstituted`, prêt pour l'émission RTGS / SWIFT MT103.

---

## 🏗️ Architecture du Flux

```
   [ Client / E-Banking ]
             │ (Dépôt fichier EDI VIRM...)
             ▼
     [ 📂 data/inbox_edi ]
             │
             ▼ ─── (FileWatcherService / ScheduledExecutorService)
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

## ⚙️ Configuration (`config.properties`)

| Propriété | Description | Valeur par défaut |
| :--- | :--- | :--- |
| `rtgs.http.server.port` | Port HTTP léger intégré au JDK | `8085` |
| `rtgs.folder.inbox` | Dossier surveillé pour les fichiers EDI entrants | `./data/inbox_edi` |
| `rtgs.folder.out-core-banking` | Dossier des fichiers modifiés avec RIB compte interne | `./data/out_core_banking` |
| `rtgs.folder.inbox-compta` | Dossier de réception des retours comptables SAB | `./data/inbox_compta` |
| `rtgs.folder.out-reconstituted` | Dossier des fichiers finaux reconstitués | `./data/out_reconstituted` |
| `rtgs.rules.min-amount` | Seuil minimum RTGS en DZD | `1000000.00` |
| `rtgs.compte.interne.rib` | RIB du compte interne / transit BDL | `00500133400218153023` |
| `rtgs.simulation.auto-compta` | Simulation automatique de comptabilisation | `true` |

---

## 🚀 Démarrage & Compilation

### 1. Compilation et Tests Unitaires
```bash
cd ServiceJavaApp
mvn clean test
```

### 2. Création du JAR Exécutable
```bash
mvn clean package
```

### 3. Lancement de l'Application
```bash
java -jar target/ServiceJavaApp-1.0.0.jar
```
ou directement :
```bash
mvn exec:java -Dexec.mainClass="dz.bdl.rtgs.Main"
```

---

## 🌐 Endpoints HTTP Légers Embarqués (`http://localhost:8085`)

* `GET /api/health` : Statut du service et configuration active.
* `GET /api/transactions` : Liste complète des transactions tracées dans le registre.
* `POST /api/scan-now` : Déclenche manuellement la scrutation du dossier `inbox_edi`.
* `POST /api/check-compta-now` : Déclenche manuellement la vérification de comptabilité et la reconstitution.
