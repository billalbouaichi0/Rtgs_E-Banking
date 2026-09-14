# 📘 Guide Technique & Fonctionnel
## Solution BDL RTGS E-Banking — Traitement EDI, Ordonnancement OD & Télécompensation SWIFT MT103

---

## 📑 Sommaire
1. [Présentation Générale & Enjeux Métier](#1-présentation-générale--enjeux-métier)
2. [Structures BDL Destinataires & Rôles](#2-structures-bdl-destinataires--rôles)
3. [Architecture Technique & Stack Logicielle](#3-architecture-technique--stack-logicielle)
4. [Cycle de Vie & Workflow Métier Détaillé](#4-cycle-de-vie--workflow-métier-détaillé)
   - [Étape 1 : Réception & Rétention des Fichiers EDI](#étape-1--réception--rétention-des-fichiers-edi)
   - [Étape 2 : Planification & Génération du Lot OD](#étape-2--planification--génération-du-lot-od)
   - [Étape 3 : Surveillance & Polling de la Comptabilisation SAB](#étape-3--surveillance--polling-de-la-comptabilisation-sab)
5. [Système de Notifications Automatisées par Email](#5-système-de-notifications-automatisées-par-email)
6. [Spécifications & Formats des Fichiers Financiers](#6-spécifications--formats-des-fichiers-financiers)
   - [Fichier EDI Entrant (`.edi` / `.txt`)](#a-fichier-edi-entrant-remise-client)
   - [Fichier Lot d'Opérations Diverses (`ZCPTODA9_*.dat`)](#b-fichier-lot-dopérations-diverses-od)
   - [Message SWIFT MT103 (`MT103_*.txt`)](#c-message-normé-swift-mt103)
   - [Fichiers SI Retour Rejet & Comptabilisation](#d-fichiers-si-retour-rejet--comptabilisation)
7. [Modèle de Données & Schéma de Base de Données](#7-modèle-de-données--schéma-de-base-de-données)
8. [Configuration & Déploiement](#8-configuration--déploiement)
9. [Manuel d'Utilisation des Écrans (IHM Web)](#9-manuel-dutilisation-des-écrans-ihm-web)

---

## 1. Présentation Générale & Enjeux Métier

La solution **BDL RTGS E-Banking** est une plateforme bancaire d'intermédiation et d'automatisation conçue pour la **Banque de Développement Local (BDL)**. Elle assure l'acquisition, le contrôle de provision, la comptabilisation et la télécompensation des ordres de virements de masse à montant élevé transitant par les canaux e-Banking vers le système national de règlement brut en temps réel (**RTGS**).

### 🎯 Objectifs Principaux
- **Automatisation Intégrale** : Réduction du délai d'acheminement des flux interbancaires sans intervention manuelle requise.
- **Sécurisation des Débits** : Contrôle systématique de provision auprès du Core Banking **SAB** avant tout engagement interbancaire.
- **Conformité Réglementaire & SWIFT** : Production rigoureuse de messages normés SWIFT MT103 et de fichiers de débit OD normés BDL.
- **Routage Ciblé des Flux** : Transmission instantanée des fichiers et alertes aux directions métiers compétentes (**DCC**, **DTM**, **DMB**).

### ⚖️ Règles d'Éligibilité RTGS
Un ordre de virement extrait d'une remise EDI est traité par le moteur RTGS s'il répond aux critères suivants :
1. **Montant de l'opération** : $\ge \mathbf{1\,000\,000{,}00\text{ DZD}}$ (Paramétrable via `RTGS_MIN_AMOUNT`).
2. **Type de flux** : **Interbancaire** (Le code banque du donneur d'ordre `005` pour la BDL doit être différent du code banque du bénéficiaire).
3. *Note* : Les opérations intrabancaires (BDL vers BDL) ou d'un montant inférieur à 1 000 000 DZD sont automatiquement filtrées et orientées vers le circuit classique avec le statut `IGNORE_FILTRE`.

---

## 2. Structures BDL Destinataires & Rôles

Le système communique de manière autonome avec trois structures centrales de la BDL :

```
                        ┌─────────────────────────────────────────┐
                        │       MOTEUR BDL RTGS E-BANKING        │
                        └────────────────────┬────────────────────┘
                                             │
             ┌───────────────────────────────┼───────────────────────────────┐
             │ (Lot OD généré)               │ (MT103 émis)                  │ (SI Retour Rejet / Cpt)
             ▼                               ▼                               ▼
   ┌───────────────────┐           ┌───────────────────┐           ┌───────────────────┐
   │   STRUCTURE DCC   │           │   STRUCTURE DTM   │           │   STRUCTURE DMB   │
   │   Comptabilité &  │           │   Trésorerie &    │           │    Monétique &    │
   │     Contrôle      │           │     Marchés       │           │     e-Banking     │
   └───────────────────┘           └───────────────────┘           └───────────────────┘
   • Fichier ZCPTODA9_*.dat        • Fichier MT103_*.txt           • Fichier SI_VIR_RJT_*.txt
   • Récapitulatif Débits          • Fiche d'exécution SWIFT       • Fichier SI_VIR_CPT_*.txt
   • Notification Email            • Notification Email            • Notification Email
```

1. **Structure DCC (Direction de la Comptabilité et du Contrôle de gestion)** :
   - **Rôle** : Réceptionne les fichiers d'Opérations Diverses (OD) pour imputer et valider les débits des comptes clients donneurs d'ordre.
   - **Flux reçu** : Fichier global de lot `ZCPTODA9_YYYYMMDD_HHMMSS.dat` généré à chaque heure planifiée.
   - **Email par défaut** : `dcc-comptabilite@bdl.dz` (Paramétrable).

2. **Structure DTM (Direction de la Trésorerie et des Marchés)** :
   - **Rôle** : Réceptionne les messages SWIFT MT103 validés et comptabilisés pour règlement et télécompensation interbancaire via le réseau RTGS / Banque d'Algérie.
   - **Flux reçu** : Fichier unitaire `MT103_{id}_{numOrdre}.txt`.
   - **Email par défaut** : `dtm-tresorerie@bdl.dz` (Paramétrable).

3. **Structure DMB (Direction de la Monétique et de la Banque à distance)** :
   - **Rôle** : Réceptionne les fichiers de retour (rejet ou confirmation) pour actualiser l'état des opérations sur la plateforme e-Banking et informer les clients.
   - **Flux reçu** : Fichier `SI_VIR_RJT_*.txt` (rejets solde, doublon, SAB) ou `SI_VIR_CPT_*.txt` (confirmation comptable).
   - **Email par défaut** : `dmb-monetique@bdl.dz` (Paramétrable).

---

## 3. Architecture Technique & Stack Logicielle

### 🏗️ Schéma Fonctionnel de l'Application

```
[ Clients e-Banking / Serveurs Amont ]
                │
                ▼ (Dépôt fichier EDI)
    📁 DOSSIER SOURCE (Local / FTP / SFTP)
                │
                ▼ (Surveillance Chokidar / Sync distante)
   ⚙️ PARSER EDI & FILTRAGE RTGS
   ├── Filtrage interbancaire & seuil 1M DZD
   └── Détection des doublons (Hachage / Index)
                │
                ▼ (Statut initial : RECU)
   ⏰ PLANIFICATEUR DE LOTS OD (odSchedulerService)
   ├── Déclenchement à heures fixes (12:00, 15:00, 16:30)
   ├── Contrôle solde SAB en direct (Oracle / Simulateur)
   │     ├─ Solde insuffisant ──► Génération SI_VIR_RJT ──► Email Structure DMB
   │     └─ Solde suffisant   ──► Génération ZCPTODA9_*.dat ──► Email Structure DCC
   │
   ▼ (Statut : OD_GEN)
   🔄 POLLING COMPTABILISATION SAB (zcptod0 chaque 5 min)
         ├─ CPTODETA = '001' ──► Statut INTEGRE (En attente)
         ├─ CPTODETA = '002' ──► Statut REJETE ──► SI_VIR_RJT ──► Email DMB
         └─ CPTODETA = '003' ──► Statut ENVOYE (DCO # attribué)
                                  ├── Génération SWIFT MT103 ──► Email Structure DTM
                                  └── Génération SI_VIR_CPT  ──► Email Structure DMB
```

### 💻 Technologies & Composants

| Composant | Technologie | Description |
| :--- | :--- | :--- |
| **Backend Runtime** | **Node.js 18+ (Express.js)** | Moteur API REST, services de traitement asynchrones et ordonnanceurs. |
| **Persistance / ORM** | **Sequelize ORM** | Support natif de **MySQL 8** (Production) et **SQLite** (Développement/Fallback). |
| **Connecteur SAB** | **Oracle 11g / Instant Client** | Requêtage direct sur `sabstd.zcompte0`, `sabstd.zsolde0`, `sabstd.zcptod0` + Mode Simulation intégré. |
| **Surveillance Fichiers** | **Chokidar & Cron** | File Watcher temps réel + Synchronisateur pour répertoires distants FTP/SFTP. |
| **Multi-Protocoles** | **ssh2-sftp-client / basic-ftp** | Gestion dynamique des dossiers de flux en local, FTP ou SFTP sécurisé. |
| **Moteur Email** | **Nodemailer (STARTTLS)** | Client SMTP sécurisé BDL avec templates HTML Corporate et pièces jointes. |
| **Frontend UI** | **React 18 + Vite** | Single Page Application réactive et moderne. |
| **Design & Styles** | **Tailwind CSS** | Design Corporate BDL (Palette violet `#772281`, or `#f9b307`, dark mode natif). |
| **Icônes & Visuels** | **Lucide React** | Bibliothèque d'icônes vectorielles légères. |
| **Sécurité & Auth** | **JWT & Bcrypt** | Authentification sécurisée par token, contrôle des accès par rôle (`administrateur`, `consultation`). |

---

## 4. Cycle de Vie & Workflow Métier Détaillé

### Étape 1 : Réception & Rétention des Fichiers EDI
1. Le client d'entreprise transmet une remise de virements au format EDI (`VIRMNE_*.txt` ou `.edi`).
2. Le fichier est déposé dans le répertoire **`source`** (surveillance locale ou récupération par connecteur FTP/SFTP).
3. **Principe de Rétention Totale** : Le fichier n'est **jamais supprimé** du répertoire `source`. Le système stocke l'empreinte et le nom du fichier en base de données pour garantir qu'un même fichier n'est traité qu'une seule fois.
4. **Parsing & Filtrage Initial** :
   - Extraction de l'enregistrement d'entête (`EE`), des lignes de corps (`EC`) et de la fin de remise (`EF`).
   - Détection des doublons de virements (même libellé, même bénéficiaire).
   - Les virements éligibles reçoivent le statut initial **`RECU`** (En attente du créneau de lot OD).
   - Les virements hors critères reçoivent le statut **`IGNORE_FILTRE`**.

---

### Étape 2 : Planification & Génération du Lot OD
1. Aux heures configurées (ex : **`12:00`**, **`15:00`**, **`16:30`**) ou lors d'un déclenchement manuel, le planificateur `odSchedulerService` s'active.
2. Pour chaque virement au statut `RECU` :
   - Interrogation du solde disponible du compte donneur d'ordre sur le Core Banking SAB (compte à 15 positions) :
     ```sql
     SELECT s.soldecen, c.comptecom 
     FROM sabstd.zcompte0 c
     LEFT JOIN sabstd.zsolde0 s ON TRIM(c.comptecom) = TRIM(s.soldecom)
     WHERE c.comptedev = 'DZD' 
       AND LENGTH(TRIM(c.comptecom)) = 15 
       AND TRIM(c.comptecom) = :compteDonneur15
     GROUP BY c.comptecom, s.soldecen;
     ```
3. **Branchement Métier** :
   - **❌ Si Solde Insuffisant** :
     - **Rejet automatique immédiat** (aucun forçage ou blocage humain).
     - Le virement passe au statut **`REJETE`** avec le motif détaillé du solde.
     - Génération automatique du fichier SI Retour `SI_VIR_RJT_VIRMNE_YYYYMMDD_HHMMSS.txt` dans le dossier `si_retour`.
     - **Notification automatique par email transmise à la Structure DMB**.
   - **✅ Si Solde Suffisant** :
     - Le virement est retenu pour le lot OD global.
4. **Création du Fichier Lot OD** :
   - Si au moins un virement est validé, le système génère le fichier `ZCPTODA9_YYYYMMDD_HHMMSS.dat` dans le dossier `generated_od`.
   - Les virements inclus passent au statut **`OD_GEN`**.
   - **Notification automatique par email transmise à la Structure DCC** avec le fichier `.dat` en pièce jointe et le récapitulatif financier.

---

### Étape 3 : Surveillance & Polling de la Comptabilisation SAB
1. Toutes les **5 minutes** (fréquence paramétrable), le service scrute la table des opérations diverses SAB `sabstd.zcptod0` pour tous les virements aux statuts `OD_GEN` ou `INTEGRE` :
   ```sql
   SELECT CPTODDCO, CPTODETA, CPTODCOM, CPTODMO1, CPTODMO4 
   FROM sabstd.zcptod0 
   WHERE CPTODOPE = '*A9' 
     AND CPTODEVE = 'RTG' 
     AND CPTODLI2 LIKE :cleUnicite;
   ```
2. **Traitement selon le code état `CPTODETA` retourné par SAB** :

| Code SAB | Signification | Statut Virement | Actions Déclenchées |
| :--- | :--- | :--- | :--- |
| **`001`** | **Intégré** (DCO = 0) | **`INTEGRE`** | L'opération est prise en charge par le SAB. Le polling continue. |
| **`003`** | **Comptabilisé** (DCO $\ne$ 0) | **`ENVOYE`** | 1. Récupération du N° d'écriture comptable `CPTODDCO`.<br/>2. Génération du message **SWIFT MT103** (`generated_mt103/`).<br/>3. Génération de l'accusé **`SI_VIR_CPT_*.txt`** (`si_retour/`).<br/>4. **Email MT103 envoyé à la structure DTM**.<br/>5. **Email SI_VIR_CPT envoyé à la structure DMB**. |
| **`002`** | **Rejeté par SAB** | **`REJETE`** | 1. Enregistrement du rejet comptable.<br/>2. Génération du fichier **`SI_VIR_RJT_*.txt`** (`si_retour/`).<br/>3. **Email de rejet envoyé à la structure DMB**. |

---

## 5. Système de Notifications Automatisées par Email

### ✉️ Matrice des Événements & Destinataires

```
┌────────────────────────┬───────────────┬───────────────────────────────┬─────────────────────────────┐
│ Événement Déclencheur  │ Structure BDL │ Sujet du Mail                 │ Pièce Jointe                │
├────────────────────────┼───────────────┼───────────────────────────────┼─────────────────────────────┤
│ Génération Lot OD      │ DCC           │ [BDL RTGS - DCC] Génération   │ ZCPTODA9_YYYYMMDD_HHMMSS.dat│
│ (Aux heures fixes)     │ (Compta)      │ Ordre de Débit (OD)           │                             │
├────────────────────────┼───────────────┼───────────────────────────────┼─────────────────────────────┤
│ Comptabilisation SAB   │ DTM           │ [BDL RTGS - DTM] Émission     │ MT103_{id}_{numOrdre}.txt   │
│ (CPTODETA = 003)       │ (Trésorerie)  │ Message SWIFT MT103           │                             │
├────────────────────────┼───────────────┼───────────────────────────────┼─────────────────────────────┤
│ Confirmation Compta    │ DMB           │ [BDL RTGS - DMB] Confirmation │ SI_VIR_CPT_*.txt            │
│ (CPTODETA = 003)       │ (Monétique)   │ Comptabilisation              │                             │
├────────────────────────┼───────────────┼───────────────────────────────┼─────────────────────────────┤
│ Rejet Automatique      │ DMB           │ [BDL RTGS - DMB] Rejet        │ SI_VIR_RJT_*.txt            │
│ (Solde / Doublon / SAB)│ (Monétique)   │ Virement                      │                             │
└────────────────────────┴───────────────┴───────────────────────────────┴─────────────────────────────┘
```

### 🎨 Charte Graphique des Emails
Les courriels sont rédigés au format HTML Corporate BDL comprenant :
- En-tête officiel BDL (Couleurs `#772281` et `#f9b307`).
- Badges de structure avec code couleur spécifique :
  - **DCC** : Violet foncé (`#772281`)
  - **DTM** : Vert émeraude (`#059669`)
  - **DMB Rejet** : Rouge rubis (`#dc2626`)
  - **DMB Confirmation** : Bleu roi (`#2563eb`)
- Tableaux de synthèse financière détaillés.
- Mention d'audit et non-réponse automatique.

---

## 6. Spécifications & Formats des Fichiers Financiers

### A. Fichier EDI Entrant (Remise Client)
Fichier texte à largeur fixe structuré en trois types d'enregistrements :

#### 1. Entête de Remise (`EE`) — 196 positions
- `001-004` : Identifiant fixe `VIRM`
- `005-007` : Code Banque Donneur d'Ordre (ex: `005`)
- `008-010` : Nature de l'opération (`010` = Virement domestique)
- `011-011` : Nature des fonds (`0` = DZD, `1` = DZD convertible)
- `012-012` : Indicateur RIB/IBAN (`1` = RIB, `2` = IBAN)
- `013-032` : RIB Donneur d'Ordre (20 car. : Banque 3 + Agence 5 + Compte 10 + Clé 2)
- `033-036` : Préfixe IBAN (ex: `DZ00`)
- `037-086` : Nom / Raison sociale Donneur d'Ordre (50 car.)
- `087-156` : Adresse Donneur d'Ordre (70 car.)
- `157-164` : Date de remise `AAAAMMJJ`
- `165-167` : Référence de la remise (3 car.)
- `168-173` : Nombre d'opérations (6 car.)
- `174-189` : Montant total en centimes (16 car.)
- `190-220` : Filler (31 espaces)

#### 2. Corps de Remise (`EC`) — 320 positions
- `001-010` : Numéro d'ordre (6 num + 2 mois + 2 an)
- `011-011` : Indicateur RIB/IBAN
- `012-031` : RIB Bénéficiaire (20 car.)
- `032-035` : Préfixe IBAN
- `036-085` : Nom Bénéficiaire (50 car.)
- `086-155` : Adresse Bénéficiaire (70 car.)
- `156-170` : Montant en centimes (15 car.)
- `171-240` : Libellé du virement (70 car.)
- `241-320` : Filler (80 espaces)

#### 3. Fin de Remise (`EF`) — 100 positions
- `001-004` : Identifiant fixe `FVIR`
- `005-100` : Filler (96 espaces)

---

### B. Fichier Lot d'Opérations Diverses (OD)
- **Emplacement** : `directories/generated_od/`
- **Nom du fichier** : `ZCPTODA9_YYYYMMDD_HHMMSS.dat`
- **Structure par ligne (98 positions fixes)** :
  - `001-003` : Code Établissement (`005`)
  - `004-008` : Code Agence Donneur (5 positions)
  - `009-023` : N° Compte SAB Donneur (15 positions)
  - `024-039` : Montant en centimes (16 positions complétées par des zéros)
  - `040-060` : Devise / Clé d'unicité SAB (`CPTODLI2`)
  - `061-098` : Filler / Références (complété d'espaces)

---

### C. Message Normé SWIFT MT103
- **Emplacement** : `directories/generated_mt103/`
- **Nom du fichier** : `MT103_{virementId}_{numeroOrdre}.txt`
- **Structure type** :
```text
{1:F01BDLODZALXXX0000000000}{2:I103BALGDZALXXXXN}{3:{103:DLP}}{4:
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
:70:VIR FACTURE RTGS MATERIEL INFORMATIQUE
:71A:SHA
:72:/CODTYPTR/001
-}
```

---

### D. Fichiers SI Retour Rejet & Comptabilisation
- **Emplacement** : `directories/si_retour/`
- **SI Retour Rejet** : `SI_VIR_RJT_VIRMNE_YYYYMMDD_HHMMSS.txt`
  ```text
  SI_RETOUR_REJET|0000020207|00500133400218153123|15000000.00|DZD|2026-09-14 12:00:00|Solde insuffisant dans SAB (500 000 DZD < 15 000 000 DZD)
  ```
- **SI Retour Comptabilisé** : `SI_VIR_CPT_VIRMNE_YYYYMMDD_HHMMSS.txt`
  ```text
  SI_RETOUR_COMPTA|0000010207|00500133400218153023|2437358.00|DZD|2026-09-14 12:05:00|DCO#987654321|COMPTABILISE_SAB
  ```

---

## 7. Modèle de Données & Schéma de Base de Données

```
 ┌──────────────────────┐         1:N         ┌───────────────────────────┐
 │       remises        │ ──────────────────< │         virements         │
 ├──────────────────────┤                     ├───────────────────────────┤
 │ id (PK)              │                     │ id (PK)                   │
 │ nomFichier           │                     │ remiseId (FK)             │
 │ fileHash             │                     │ numeroOrdre               │
 │ referenceRemise      │                     │ montant                   │
 │ montantTotal         │                     │ ribDonneur / nomDonneur   │
 │ nombreOperations     │                     │ ribBeneficiaire           │
 │ dateRemise           │                     │ codeBanqueBeneficiaire    │
 │ statutGlobal         │                     │ statut (ENUM)             │
 └──────────────────────┘                     │ cleUniciteSab (CPTODLI2)  │
                                              │ cptoddco (N° écriture SAB)│
                                              │ fichierOdBatch            │
                                              │ fichierMt103Genere        │
                                              │ fichierSiRetGenere        │
                                              │ fichierSiCptGenere        │
                                              └───────────────────────────┘
```

### 📋 Enum des Statuts de Virement

| Statut | Libellé Affiché | Description Métier |
| :--- | :--- | :--- |
| **`RECU`** | En Attente Lot OD | Virement éligible extrait du fichier EDI, en attente du créneau horaire OD. |
| **`OD_GEN`** | Lot OD Généré | Inclus dans le fichier `ZCPTODA9_*.dat`, transmis à la DCC, en attente SAB. |
| **`INTEGRE`** | Intégré dans SAB | Enregistré dans SAB avec code `CPTODETA = '001'`, attente comptabilisation. |
| **`ENVOYE`** | Comptabilisé & Envoyé | Comptabilisé par SAB (`003`), N° DCO affecté, MT103 transmis à la DTM. |
| **`REJETE`** | Rejeté | Rejeté automatiquement pour solde insuffisant ou rejet SAB (`002`). |
| **`IGNORE_FILTRE`**| Filtré / Non RTGS | Montant $< 1\,000\,000$ DZD ou virement interne même banque (005 vers 005). |
| **`REJETE_DOUBLON`**| Rejeté (Doublon) | Rejeté pour détection de doublon au sein de la remise ou en base. |

---

## 8. Configuration & Déploiement

### ⚙️ Variables d'Environnement (`backend/.env`)

```ini
# Port du serveur Express
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

# Mode de Vérification Core Banking SAB (SIMULATION ou ORACLE_PROD)
SOLDE_VERIFICATION_MODE=SIMULATION

# Paramètres Oracle 11g (si ORACLE_PROD)
ORACLE_USER=sabstd
ORACLE_PASSWORD=sabpass
ORACLE_CONNECT_STRING=127.0.0.1:1521/SABDEV

# Seuil RTGS en Dinars Algériens
RTGS_MIN_AMOUNT=1000000

# Configuration SMTP BDL
SMTP_HOST=10.121.2.50
SMTP_PORT=587
SMTP_USER=BDL\rtgsebank-bdl
SMTP_PASS=windows-2026+
SMTP_FROM=rtgsebank-bdl@bdl.dz
FRONTEND_URL=https://test-jibaya.bdl.dz

# Adresses Emails des Structures BDL
EMAIL_STRUCTURE_DCC=dcc-comptabilite@bdl.dz
EMAIL_STRUCTURE_DTM=dtm-tresorerie@bdl.dz
EMAIL_STRUCTURE_DMB=dmb-monetique@bdl.dz
```

### 🚀 Commandes de Démarrage

#### 1. Démarrer le Backend
```bash
cd backend
npm install
npm run dev
# Le serveur démarre sur http://localhost:5000
```

#### 2. Démarrer le Frontend
```bash
cd frontend
npm install
npm run dev
# L'application web démarre sur http://localhost:3000
```

---

## 9. Manuel d'Utilisation des Écrans (IHM Web)

### 1. Tableau de Bord (Dashboard)
- Synthèse des flux reçus, montants totaux traités, répartition par banque bénéficiaire.
- KPIs d'état (Reçus, Lots OD, Comptabilisés, Rejetés, Ignorés).
- Accès rapide aux derniers logs de traitement.

### 2. Planificateur des Lots OD & Suivi SAB (`/od-scheduler`)
- **Configuration des Horaires** : Définition des heures de tirage des lots OD (ex : `12:00, 15:00, 16:30`).
- **Surveillance SAB** : Fréquence de polling en minutes (ex : `5`).
- **Déclencheurs Manuels** : Bouton pour exécuter immédiatement le lot OD ou forcer la vérification SAB.
- **Paramétrage des Emails des Structures** : Édition en direct des adresses de la DCC, DTM et DMB.
- **Table Live Oracle SAB** : Visualisation en direct des écritures `sabstd.zcptod0`.

### 3. Gestion des Virements & Remises (`/virements`)
- Recherche instantanée par N° d'ordre, nom donneur, nom bénéficiaire, RIB ou statut.
- Filtrage par état (`RECU`, `OD_GEN`, `ENVOYE`, `REJETE`, `IGNORE_FILTRE`).
- Consultation détaillée du virement avec aperçu des fichiers générés (OD, MT103, SI Retour).

### 4. Configuration des Répertoires Multi-Protocoles (`/folder-configs`)
- Paramétrage indépendant pour chaque dossier (`source`, `generated_od`, `si_retour`, `generated_mt103`).
- Choix du type : **`LOCAL`**, **`FTP`** ou **`SFTP`**.
- Bouton de **Test de Connexion** en temps réel pour valider les identifiants et accès réseau.

### 5. Référentiel des Banques & Comptes SAB (`/settings`)
- Liste des 17 banques de la place algérienne (Codes, Noms, Codes BIC SWIFT, Comptes de règlement).
- Gestion des soldes des comptes pour le mode simulateur Core Banking.

---
*Document technique et fonctionnel validé pour le projet BDL RTGS E-Banking.*
