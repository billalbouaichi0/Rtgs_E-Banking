# 🏗️ GUIDE TECHNIQUE D'ARCHITECTURE & DIAGRAMMES
## Plateforme BDL RTGS E-Banking — Moteur EDI, Ordonnancement OD & Télécompensation SWIFT MT103

---

## 📑 Sommaire
1. [Vue d'Ensemble & Architecture Globale du Système](#1-vue-densemble--architecture-globale-du-système)
2. [Diagramme d'Architecture Applicative (C4 Container Level)](#2-diagramme-darchitecture-applicative-c4-container-level)
3. [Diagramme de Flux Global End-to-End (Data Flow Diagram)](#3-diagramme-de-flux-global-end-to-end-data-flow-diagram)
4. [Diagrammes de Séquence Détaillés](#4-diagrammes-de-séquence-détaillés)
   - [Phase 1 : Ingestion EDI, Filtrage & Rétention Source](#phase-1--ingestion-edi-filtrage--rétention-source)
   - [Phase 2 : Ordonnancement des Lots OD & Contrôle Solde SAB](#phase-2--ordonnancement-des-lots-od--contrôle-solde-sab)
   - [Phase 3 : Polling SAB, Émission SWIFT MT103 & Accusés SI](#phase-3--polling-sab-émission-swift-mt103--accusés-si)
5. [Diagramme de la Machine à États des Virements (State Machine)](#5-diagramme-de-la-machine-à-états-des-virements-state-machine)
6. [Diagramme Entité-Relation & Schéma de Base de Données (ERD)](#6-diagramme-entité-relation--schéma-de-base-de-données-erd)
7. [Diagramme des Composants & Modules Backend](#7-diagramme-des-composants--modules-backend)
8. [Diagramme de Déploiement Réseau & Sécurité](#8-diagramme-de-déploiement-réseau--sécurité)
9. [Matrice des Flux, Protocoles & Spécifications d'Interfaces](#9-matrice-des-flux-protocoles--spécifications-dinterfaces)

---

## 1. Vue d'Ensemble & Architecture Globale du Système

La plateforme **BDL RTGS E-Banking** est une solution distribuée, temps réel et hautement résiliente, conçue pour automatiser le traitement des remises de virements bancaires de masse émanant de la plateforme e-Banking de la **Banque de Développement Local (BDL)**.

Elle remplit trois missions critiques :
1. **Acquisition & Filtrage Sécurisé** des fichiers de remises clients (EDI) via surveillance continue de répertoires (Local / FTP / SFTP).
2. **Ordonnancement Périodique des Débits (OD)** avec contrôle de provision direct sur le Core Banking **SAB (Oracle 11g)** et rejet automatique en cas d'insuffisance de solde.
3. **Télécompensation RTGS & Télétransmissions Métiers** vers les directions centrales BDL (**DCC**, **DTM**, **DMB**) par génération de messages normés SWIFT MT103, de fichiers comptables OD et d'alertes emails automatisées avec pièces jointes.

---

## 2. Diagramme d'Architecture Applicative (C4 Container Level)

Ce diagramme illustre les conteneurs applicatifs internes, les bases de données et les interactions avec les systèmes tiers (Core Banking SAB, Serveur SMTP BDL, Serveurs SFTP/FTP distants et Postes Utilisateurs).

```mermaid
graph TB
    subgraph Utilisateurs ["👥 Utilisateurs & Directions Métiers BDL"]
        UserAdmin["👨‍💼 Administrateur RTGS"]
        UserConsult["👨‍💻 Agent Consultation"]
        DCC["🏢 Structure DCC<br/>(Comptabilité & Contrôle)"]
        DTM["🏢 Structure DTM<br/>(Trésorerie & Marchés)"]
        DMB["🏢 Structure DMB<br/>(Monétique & e-Banking)"]
    end

    subgraph ClientLayer ["🌐 Frontend Web (Single Page Application)"]
        ReactApp["⚛️ Interface React 18 + TailwindCSS<br/>(Vite, Axios, Lucide Icons, JWT Auth)"]
    end

    subgraph CoreBackend ["⚙️ Backend API & Moteur de Traitement (Node.js / Express)"]
        APIGateway["🚪 API Gateway & Middlewares<br/>(Auth JWT, RBAC, Validation)"]
        
        subgraph ServicesCore ["Services Applicatifs & Logique Métier"]
            Watcher["👁️ FileWatcherService<br/>(Chokidar / Sync SFTP)"]
            Processing["⚡ ProcessingService<br/>(Parser EDI & Filtre RTGS)"]
            Scheduler["⏰ OdSchedulerService<br/>(Lots OD & Polling SAB)"]
            StorageMgr["📁 FolderStorageService<br/>(Local / FTP / SFTP)"]
            MailMgr["✉️ EmailService<br/>(Nodemailer STARTTLS)"]
            OracleConn["🔌 OracleService<br/>(Oracle 11g / Mock SAB)"]
        end

        subgraph GenEngine ["Moteur de Génération Normé"]
            GenOD["📄 OdBatchGenerator<br/>(ZCPTODA9_*.dat - 98 car.)"]
            GenMT["📄 Mt103Generator<br/>(Norme SWIFT MT103)"]
            GenSiRjt["📄 SiRetourGenerator<br/>(SI_VIR_RJT_*.txt)"]
            GenSiCpt["📄 SiCptGenerator<br/>(SI_VIR_CPT_*.txt)"]
            EdiParse["📄 EdiParser<br/>(EE, EC, EF Structure)"]
        end
    end

    subgraph DataStorage ["💾 Couche de Persistance & Fichiers"]
        MySQL[("🗄️ Base de Données<br/>MySQL 8 / SQLite<br/>(Sequelize ORM)")]
        FileSys[("📂 Système de Fichiers<br/>(directories/ : source, generated_od,<br/>generated_mt103, si_retour)")]
    end

    subgraph ExternalSystems ["🏛️ Systèmes Externes & Réseau Bancaire"]
        SABCore[("🏛️ Core Banking SAB<br/>Oracle 11g Database<br/>(zcompte0, zsolde0, zcptod0)")]
        SMTPServer["📫 Serveur SMTP BDL<br/>(10.121.2.50:587 STARTTLS)"]
        RemoteFTP["📡 Serveurs FTP / SFTP Distants<br/>(Dépôts Banques / e-Banking)"]
    end

    %% Interactions Utilisateurs & Frontend
    UserAdmin -->|HTTPS| ReactApp
    UserConsult -->|HTTPS| ReactApp
    ReactApp -->|REST API JSON / Bearer JWT| APIGateway

    %% Interactions Internes Backend
    APIGateway --> ServicesCore
    Watcher -->|Nouveau fichier EDI| Processing
    Processing --> EdiParse
    Processing --> StorageMgr
    Processing --> MySQL
    
    Scheduler --> OracleConn
    Scheduler --> GenOD
    Scheduler --> GenMT
    Scheduler --> GenSiRjt
    Scheduler --> GenSiCpt
    Scheduler --> StorageMgr
    Scheduler --> MySQL
    Scheduler --> MailMgr

    %% Interactions Externes
    OracleConn -->|TCP Port 1521 SQL Net8| SABCore
    MailMgr -->|SMTP 587 STARTTLS| SMTPServer
    StorageMgr -->|I/O FS Local| FileSys
    StorageMgr -->|FTP / SFTP Port 21/22| RemoteFTP

    %% Sorties vers les structures
    SMTPServer -.->|Email + ZCPTODA9.dat| DCC
    SMTPServer -.->|Email + MT103.txt| DTM
    SMTPServer -.->|Email + SI_VIR.txt| DMB
```

---

## 3. Diagramme de Flux Global End-to-End (Data Flow Diagram)

Ce diagramme décrit l'acheminement complet d'un virement, depuis le dépôt initial de la remise client jusqu'à l'émission du SWIFT MT103 et des accusés de traitement.

```mermaid
flowchart TD
    Start([📁 Dépôt Fichier EDI dans 'source/']) --> StepWatch[👁️ Détection FileWatcher / Synchronisation SFTP]
    
    StepWatch --> StepCheckHash{Fichier déjà ingéré ?<br/>Vérification Hash MD5 / Nom}
    StepCheckHash -- Oui --> SkipFile[⏭️ Ignorer Fichier / Rétention dans Source]
    StepCheckHash -- Non --> StepParse[⚙️ Parser EDI : Lecture EE, EC, EF]

    StepParse --> StepSaveRemise[💾 Enregistrement de la Remise en Base]
    
    StepParse --> LoopVirement[Pour chaque virement EC de la remise]
    
    LoopVirement --> StepDoublon{Détection Doublon<br/>Même libellé / même tiers ?}
    StepDoublon -- Oui --> GenRjtDoublon[❌ Rejet Doublon<br/>Génération SI_VIR_RJT_*.txt]
    GenRjtDoublon --> MailDMB_Doublon[✉️ Email Rejet Doublon ──► Structure DMB]
    
    StepDoublon -- Non --> StepFilterRTGS{Critères RTGS ?<br/>1. Montant >= 1 000 000 DZD<br/>2. Banque Donneur != Bénéficiaire}
    
    StepFilterRTGS -- Non --> MarkIgnore[⚪ Statut: IGNORE_FILTRE<br/>Non éligible RTGS / Intrabancaire]
    StepFilterRTGS -- Oui --> MarkRecu[🔵 Statut initial: RECU<br/>En attente créneau de lot OD]

    MarkRecu --> StepScheduleTime{⏰ Heure Fixe de Lot ?<br/>12:00, 15:00, 16:30 ou Manuel}
    
    StepScheduleTime -- Non --> WaitSchedule[⏳ Maintien en attente RECU]
    StepScheduleTime -- Oui --> StepCheckSolde[🔍 Requête Solde Oracle SAB 11g<br/>sabstd.zcompte0 + zsolde0 sur compte 15 pos]
    
    StepCheckSolde --> SoldeSuffisant{Solde Compte Donneur<br/>>= Montant Virement ?}
    
    %% Cas Rejet Solde
    SoldeSuffisant -- Non --> GenRjtSolde[❌ Rejet Automatique Solde Insuffisant<br/>Statut: REJETE<br/>Génération SI_VIR_RJT_VIRMNE_*.txt]
    GenRjtSolde --> WriteSiRjt[📁 Écriture dans directories/si_retour/]
    WriteSiRjt --> MailDMB_Solde[✉️ Notification Email Rejet ──► Structure DMB]
    
    %% Cas Solde Suffisant -> Lot OD
    SoldeSuffisant -- Oui --> GenBatchOD[📦 Intégration dans Lot OD<br/>Statut: OD_GEN<br/>Génération ZCPTODA9_YYYYMMDD_HHMMSS.dat]
    GenBatchOD --> WriteOD[📁 Écriture dans directories/generated_od/]
    WriteOD --> MailDCC[✉️ Notification Email Lot OD + Fichier .dat ──► Structure DCC]
    
    %% Étape 3 : Polling SAB zcptod0
    GenBatchOD --> StepPollSAB[🔄 Polling Périodique SAB zcptod0<br/>Vérification toutes les 5 minutes]
    StepPollSAB --> CheckSabEta{État CPTODETA dans SAB ?}
    
    CheckSabEta -- CPTODETA = '001'<br/>DCO = 0 --> StatutIntegre[🟡 Statut: INTEGRE<br/>Pris en charge par SAB, attente validation]
    StatutIntegre --> StepPollSAB

    CheckSabEta -- CPTODETA = '002' --> StatutRejetSAB[❌ Rejet Comptable SAB<br/>Statut: REJETE<br/>Génération SI_VIR_RJT_*.txt]
    StatutRejetSAB --> MailDMB_SAB[✉️ Notification Email Rejet SAB ──► Structure DMB]

    CheckSabEta -- CPTODETA = '003'<br/>DCO <> 0 --> StatutCompta[🟢 Opération COMPTABILISÉE par SAB<br/>Statut: ENVOYE<br/>Récupération N° écriture CPTODDCO]
    
    StatutCompta --> GenMT103[🌐 Génération Message SWIFT MT103<br/>Nom: MT103_id_numOrdre.txt]
    GenMT103 --> WriteMT103[📁 Écriture dans directories/generated_mt103/]
    WriteMT103 --> MailDTM[✉️ Notification Email MT103 + Fichier .txt ──► Structure DTM]

    StatutCompta --> GenSiCpt[📄 Génération Accusé SI Retour Comptabilisé<br/>Nom: SI_VIR_CPT_VIRMNE_*.txt]
    GenSiCpt --> WriteSiCpt[📁 Écriture dans directories/si_retour/]
    WriteSiCpt --> MailDMB_Cpt[✉️ Notification Email Accusé Compta ──► Structure DMB]
```

---

## 4. Diagrammes de Séquence Détaillés

### Phase 1 : Ingestion EDI, Filtrage & Rétention Source

Ce diagramme détaille comment un fichier EDI déposé dans le dossier `source/` est détecté, analysé, validé pour l'unicité et persisté en base de données sans suppression du fichier physique.

```mermaid
sequenceDiagram
    autonumber
    actor Client as 💻 Système e-Banking / Client BDL
    participant Watcher as 👁️ FileWatcherService
    participant Proc as ⚡ ProcessingService
    participant Parser as 📄 EdiParser
    participant Storage as 📁 FolderStorageService
    participant DB as 🗄️ MySQL Database
    participant Mail as ✉️ EmailService
    actor DMB as 🏢 Structure DMB

    Client->>Storage: Dépôt fichier VIRMNE_20260914.edi dans source/
    Watcher->>Proc: Événement `add` détecté sur le fichier
    Proc->>Storage: Calcul Hash SHA-256 / MD5 du fichier
    Proc->>DB: Recherche Remise par fileHash ou nomFichier
    alt Fichier déjà présent en Base
        DB-->>Proc: Remise existante trouvée
        Proc->>Proc: Log info 'Fichier déjà ingéré' (Rétention intégrale sans suppression)
    else Nouveau Fichier
        Proc->>Parser: parseEdi(content)
        Parser-->>Proc: { entete (EE), corps (EC[]), fin (EF) }
        Proc->>DB: Remise.create({ nomFichier, fileHash, montantTotal, nbOperations })
        
        loop Pour chaque virement extrait de EC
            Proc->>DB: Vérification doublon (libelle, nomBeneficiaire, montant)
            alt Doublon Détecté
                Proc->>Storage: Écriture SI_VIR_RJT_*.txt dans si_retour/
                Proc->>DB: Virement.create({ statut: 'REJETE_DOUBLON' })
                Proc->>Mail: sendSiRetourNotification(type: 'REJET', motif: 'Doublon')
                Mail-->>DMB: Email d'alerte Rejet Doublon
            else Virement Valide
                alt Montant >= 1 000 000 DZD ET Banque Donneur != Bénéficiaire
                    Proc->>DB: Virement.create({ statut: 'RECU', oracleVerifie: false })
                else Hors Critères RTGS
                    Proc->>DB: Virement.create({ statut: 'IGNORE_FILTRE' })
                end
            end
        end
        Proc->>DB: TraitementLog.create({ type: 'INGESTION_EDI', niveau: 'SUCCESS' })
    end
```

---

### Phase 2 : Ordonnancement des Lots OD & Contrôle Solde SAB

Ce diagramme illustre le déclenchement de l'ordonnanceur aux heures programmées (12:00, 15:00, 16:30), l'interrogation synchrone du solde sur le Core Banking SAB, le rejet automatique en cas de défaut de provision et la génération du lot OD global.

```mermaid
sequenceDiagram
    autonumber
    participant Timer as ⏰ OdSchedulerService
    participant DB as 🗄️ MySQL Database
    participant Oracle as 🏛️ OracleService (SAB 11g)
    participant OdGen as 📄 OdBatchGenerator
    participant SiRjtGen as 📄 SiRetourGenerator
    participant Storage as 📁 FolderStorageService
    participant Mail as ✉️ EmailService
    actor DCC as 🏢 Structure DCC
    actor DMB as 🏢 Structure DMB

    Timer->>Timer: Déclenchement horaire (ex: 12:00:00)
    Timer->>DB: Virement.findAll({ statut: 'RECU' })
    DB-->>Timer: Liste des virements en attente

    loop Pour chaque virement au statut RECU
        Timer->>Oracle: checkAccountBalance(compteDonneur15)
        Oracle->>Oracle: SQL SELECT soldecen FROM zcompte0 JOIN zsolde0
        Oracle-->>Timer: { found: true, soldeDinar: 50000000.00 }
        
        alt Solde Insuffisant (soldeDinar < virement.montant)
            Timer->>SiRjtGen: generate(virement, motif: 'Solde insuffisant dans SAB')
            SiRjtGen-->>Timer: Contenu texte SI_VIR_RJT
            Timer->>Storage: writeOutputFile('si_retour', 'SI_VIR_RJT_*.txt', content)
            Timer->>DB: Virement.update({ statut: 'REJETE', motifRejet: 'Solde insuffisant' })
            Timer->>Mail: sendSiRetourNotification(type: 'REJET', virement, pieceJointe)
            Mail-->>DMB: Email Rejet Solde Insuffisant + Fichier SI_VIR_RJT
        else Solde Suffisant
            Timer->>Timer: Ajouter à la liste `virementsValides`
        end
    end

    alt Au moins 1 virement avec solde suffisant
        Timer->>OdGen: generateBatch(virementsValides)
        OdGen-->>Timer: Contenu normé ZCPTODA9_YYYYMMDD_HHMMSS.dat (98 car./ligne)
        Timer->>Storage: writeOutputFile('generated_od', 'ZCPTODA9_*.dat', content)
        
        loop Pour chaque virement validé
            Timer->>DB: Virement.update({ statut: 'OD_GEN', fichierOdBatch: 'ZCPTODA9_*.dat' })
            Timer->>Oracle: registerMockOd(virement, cleUniciteSab) (si mode simulation)
        end
        
        Timer->>Mail: sendOdNotification({ odFileName, totalMontant, virements, pieceJointe })
        Mail-->>DCC: Email Lot OD généré + Fichier ZCPTODA9_*.dat attaché
    end
```

---

### Phase 3 : Polling SAB, Émission SWIFT MT103 & Accusés SI

Ce diagramme détaille la surveillance périodique de la table `sabstd.zcptod0` par polling toutes les 5 minutes et les actions consécutives à la comptabilisation définitive.

```mermaid
sequenceDiagram
    autonumber
    participant Poller as ⏰ OdSchedulerService (Polling Loop)
    participant DB as 🗄️ MySQL Database
    participant Oracle as 🏛️ OracleService (SAB 11g)
    participant MtGen as 📄 Mt103Generator
    participant SiCptGen as 📄 SiCptGenerator
    participant Storage as 📁 FolderStorageService
    participant Mail as ✉️ EmailService
    actor DTM as 🏢 Structure DTM
    actor DMB as 🏢 Structure DMB

    Poller->>Poller: Intervalle 5 minutes atteint
    Poller->>DB: Virement.findAll({ statut: ['OD_GEN', 'INTEGRE'] })
    DB-->>Poller: Liste des virements en attente comptabilisation

    loop Pour chaque virement OD_GEN / INTEGRE
        Poller->>Oracle: checkOdComptabilisation(virement, cleUniciteSab)
        Oracle->>Oracle: SELECT CPTODDCO, CPTODETA FROM sabstd.zcptod0 WHERE CPTODLI2 = :cle
        Oracle-->>Poller: { status: 'COMPTABILISE', cptoddco: '987654321', cptodeta: '003' }

        alt CPTODETA = '003' (Comptabilisé avec N° Écriture DCO)
            Poller->>DB: BanqueRef.findByPk(codeBanqueBeneficiaire)
            DB-->>Poller: Informations BIC SWIFT & Compte de règlement
            
            %% 1. Génération SWIFT MT103
            Poller->>MtGen: generate(virement, banqueBenif)
            MtGen-->>Poller: Contenu SWIFT normé {1:...}{2:...}{4:...}
            Poller->>Storage: writeOutputFile('generated_mt103', 'MT103_*.txt', content)
            
            %% 2. Génération SI Retour Comptabilisé
            Poller->>SiCptGen: generate(virement, { cptoddco: '987654321' })
            SiCptGen-->>Poller: Contenu SI_VIR_CPT
            Poller->>Storage: writeOutputFile('si_retour', 'SI_VIR_CPT_*.txt', content)
            
            %% 3. Mise à jour statut virement
            Poller->>DB: Virement.update({ statut: 'ENVOYE', cptoddco: '987654321' })
            
            %% 4. Notifications Emails Parallèles
            Poller->>Mail: sendMt103Notification({ virement, banqueBenif, cptoddco, pieceJointe })
            Mail-->>DTM: Email Émission SWIFT MT103 + Fichier MT103 attaché
            
            Poller->>Mail: sendSiRetourNotification(type: 'COMPTABILISATION', cptoddco, pieceJointe)
            Mail-->>DMB: Email Confirmation Comptabilisation + Fichier SI_VIR_CPT attaché

        else CPTODETA = '001' (Intégré dans SAB, attente compta)
            Poller->>DB: Virement.update({ statut: 'INTEGRE' })
        else CPTODETA = '002' (Rejet Comptable SAB)
            Poller->>Storage: writeOutputFile('si_retour', 'SI_VIR_RJT_*.txt', content)
            Poller->>DB: Virement.update({ statut: 'REJETE', motifRejet: 'Rejet comptable SAB 002' })
            Poller->>Mail: sendSiRetourNotification(type: 'REJET', motif: 'Rejet SAB 002')
            Mail-->>DMB: Email Rejet Comptable SAB
        end
    end
```

---

## 5. Diagramme de la Machine à États des Virements (State Machine)

Ce diagramme d'état illustre l'ensemble des statuts possibles d'un virement, les conditions de transition et les états terminaux.

```mermaid
stateDiagram-v2
    [*] --> Ingestion : Fichier EDI déposé dans source/

    state Ingestion {
        [*] --> AnalyseUnicite
        AnalyseUnicite --> REJETE_DOUBLON : Doublon détecté en base ou remise
        AnalyseUnicite --> EvaluationRTGS : Virement unique
        EvaluationRTGS --> IGNORE_FILTRE : Montant < 1M DZD OU Intrabancaire (005 -> 005)
        EvaluationRTGS --> RECU : Montant >= 1M DZD ET Interbancaire
    }

    REJETE_DOUBLON --> NotificationDMB_Doublon : Génération SI_VIR_RJT
    NotificationDMB_Doublon --> [*]

    IGNORE_FILTRE --> ArchiveFiltre : Traitement circuit classique
    ArchiveFiltre --> [*]

    state CyclePlanification {
        RECU --> VerificationSolde : Heure de lot (12:00, 15:00, 16:30)
        VerificationSolde --> REJETE : Solde SAB Insuffisant (Rejet Automatique)
        VerificationSolde --> OD_GEN : Solde SAB Suffisant (Inclusion ZCPTODA9_*.dat)
    }

    REJETE --> NotificationDMB_RejetSolde : Génération SI_VIR_RJT
    NotificationDMB_RejetSolde --> [*]

    state CycleComptabilisationSAB {
        OD_GEN --> NotificationDCC_OD : Fichier .dat généré
        NotificationDCC_OD --> PollingSAB : Surveillance zcptod0 (toutes les 5 min)
        PollingSAB --> INTEGRE : CPTODETA = '001' (Pris en charge)
        INTEGRE --> PollingSAB : Poursuite du check
        PollingSAB --> REJETE : CPTODETA = '002' (Refus SAB)
        PollingSAB --> ENVOYE : CPTODETA = '003' (Comptabilisé, DCO != 0)
    }

    state EmissionTelecompensation {
        ENVOYE --> EmissionMT103 : Génération SWIFT MT103
        EmissionMT103 --> NotificationDTM : Envoi email DTM
        ENVOYE --> EmissionSiCpt : Génération SI_VIR_CPT
        EmissionSiCpt --> NotificationDMB_Cpt : Envoi email DMB
    }

    NotificationDTM --> ClotureSucces : Opération Terminée
    NotificationDMB_Cpt --> ClotureSucces
    ClotureSucces --> [*]
```

---

## 6. Diagramme Entité-Relation & Schéma de Base de Données (ERD)

Ce diagramme représente la modélisation relationnelle des données dans MySQL / Sequelize.

```mermaid
erDiagram
    REMISES ||--o{ VIREMENTS : "contient"
    REMISES ||--o{ TRAITEMENT_LOGS : "historise"
    VIREMENTS ||--o{ TRAITEMENT_LOGS : "génère"
    BANQUE_REFS ||--o{ VIREMENTS : "est destinataire"

    REMISES {
        int id PK
        string nomFichier "Nom du fichier EDI d'origine"
        string fileHash "Empreinte SHA-256 / MD5 pour unicité"
        string referenceRemise "N° séquentiel remise (pos 165-167)"
        decimal montantTotal "Somme totale déclarée en entête EE"
        int nombreOperations "Nombre total de virements déclarés"
        date dateRemise "Date d'ordre AAAAMMJJ"
        enum statutGlobal "EN_ATTENTE, PARTIEL, TRAITE, REJETE"
        datetime createdAt
        datetime updatedAt
    }

    VIREMENTS {
        int id PK
        int remiseId FK "Référence à la remise parent"
        string numeroOrdre "Identifiant unique virement (pos 1-10)"
        decimal montant "Montant de l'opération en DZD"
        string ribDonneur "RIB complet 20 car. BDL (005...)"
        string compteDonneur15 "Compte Core Banking SAB 15 car."
        string nomDonneur "Raison sociale donneur d'ordre"
        string adresseDonneur "Adresse physique donneur"
        string ribBeneficiaire "RIB complet 20 car. banque tierce"
        string codeBanqueBeneficiaire FK "Code banque 3 car. (ex: 008 SGA)"
        string nomBeneficiaire "Nom complet ou raison sociale tiers"
        string adresseBeneficiaire "Adresse complète tiers"
        string libelle "Motif de l'opération"
        enum statut "RECU, OD_GEN, INTEGRE, ENVOYE, REJETE, IGNORE_FILTRE, REJETE_DOUBLON"
        string cleUniciteSab "Clé unique CPTODLI2 pour zcptod0"
        string cptoddco "N° d'écriture comptable SAB DCO"
        datetime dateComptabilisationSab "Horodatage comptabilisation"
        string fichierOdBatch "Nom fichier ZCPTODA9_*.dat"
        string fichierMt103Genere "Nom fichier MT103_*.txt"
        string fichierSiRetGenere "Nom fichier SI_VIR_RJT_*.txt"
        string fichierSiCptGenere "Nom fichier SI_VIR_CPT_*.txt"
        string motifRejetOuIgnorer "Explication textuelle du rejet"
        datetime createdAt
        datetime updatedAt
    }

    BANQUE_REFS {
        string codeBanque PK "Code 3 chiffres (001 à 017)"
        string nomBanque "Nom officiel de la banque algérienne"
        string bicSwift "Code BIC SWIFT (8 à 11 car.)"
        string compteReglement "N° compte de règlement Banque d'Algérie"
        datetime createdAt
        datetime updatedAt
    }

    FOLDER_CONFIGS {
        string folderKey PK "source, generated_od, si_retour, generated_mt103"
        string label "Libellé affiché à l'écran"
        string description "Rôle du répertoire"
        enum type "LOCAL, FTP, SFTP"
        string localPath "Chemin absolu ou relatif local"
        string host "Adresse IP / Hostname serveur distant"
        int port "Port de connexion (21 FTP, 22 SFTP)"
        string username "Utilisateur authentification"
        string password "Mot de passe chiffré"
        string remotePath "Chemin du répertoire sur serveur distant"
        boolean secureTls "Activation TLS / STARTTLS pour FTP"
        boolean isActive "Activer/Désactiver le connecteur"
        datetime createdAt
        datetime updatedAt
    }

    SYSTEM_SETTINGS {
        string key PK "od_batch_hours, sab_poll_interval_minutes, email_structure_*"
        text value "Valeur sérialisée JSON ou scalaire"
        string description "Explication du paramètre système"
        datetime createdAt
        datetime updatedAt
    }

    USERS {
        int id PK
        string username UK "Identifiant de connexion"
        string email UK "Adresse email utilisateur"
        string password "Mot de passe haché Bcrypt"
        string fullName "Nom complet de l'agent BDL"
        enum role "administrateur, consultation"
        boolean isActive "État du compte"
        datetime createdAt
        datetime updatedAt
    }

    TRAITEMENT_LOGS {
        int id PK
        string type "INGESTION_EDI, LOT_OD, COMPTA_SAB, REJET..."
        enum niveau "INFO, WARNING, ERROR, SUCCESS"
        text message "Description de l'action système"
        string nomFichier "Fichier concerné"
        int virementId FK "Virement optionnel concerné"
        json details "Payload JSON contenant variables d'audit"
        datetime createdAt
    }
```

---

## 7. Diagramme des Composants & Modules Backend

Ce diagramme montre l'organisation modulaire du code source backend (`backend/src/`).

```mermaid
graph LR
    subgraph RoutesLayer ["Routes Express (`src/routes/`)"]
        AuthRoute["authRoutes.js<br/>(Login, Reset, Profile)"]
        VirementRoute["virementRoutes.js<br/>(Listing, Détail, Export)"]
        RemiseRoute["remiseRoutes.js<br/>(Remises, Stats)"]
        SystemRoute["systemRoutes.js<br/>(Schedule, Folders, Banques, SAB)"]
        LogRoute["logRoutes.js<br/>(Logs d'audit & Traitement)"]
    end

    subgraph ServiceLayer ["Services Métiers (`src/services/`)"]
        ProcServ["processingService.js<br/>• Traitement EDI complet<br/>• Recalcul statut remises"]
        SchedServ["odSchedulerService.js<br/>• Lots OD heures fixes<br/>• Polling SAB zcptod0<br/>• Timer Check"]
        WatchServ["fileWatcherService.js<br/>• Surveillance Chokidar<br/>• Déclenchement parsing"]
        StoreServ["folderStorageService.js<br/>• Connecteurs Local/FTP/SFTP<br/>• Écriture/Lecture sécurisée"]
        MailServ["emailService.js<br/>• Nodemailer STARTTLS<br/>• Notifications DCC/DTM/DMB"]
    end

    subgraph ConfigLayer ["Connecteurs & Config (`src/config/`)"]
        OracleConf["oracle.js<br/>• Mode ORACLE_PROD (node-oracledb)<br/>• Mode SIMULATION (Mock SAB)"]
        FolderConf["folders.js<br/>• Chemins répertoires"]
        DBConf["database.js<br/>• Sequelize Pool MySQL/SQLite"]
    end

    subgraph EngineLayer ["Générateurs & Parseurs (`src/generators/` & `src/parsers/`)"]
        EdiParserClass["ediParser.js<br/>• Découpage positions EE, EC, EF"]
        OdBatchGenClass["odBatchGenerator.js<br/>• Format 98 car. BDL & Clés"]
        Mt103GenClass["mt103Generator.js<br/>• SWIFT MT103 :20: à :72:"]
        SiRetGenClass["siRetourGenerator.js<br/>• Format SI_VIR_RJT"]
        SiCptGenClass["siCptGenerator.js<br/>• Format SI_VIR_CPT"]
    end

    RoutesLayer --> ServiceLayer
    ServiceLayer --> EngineLayer
    ServiceLayer --> ConfigLayer
```

---

## 8. Diagramme de Déploiement Réseau & Sécurité

Ce schéma illustre le cloisonnement réseau de la BDL (DMZ, Zone Applicative Interne, Zone Base de Données et Réseau Monétique).

```mermaid
graph TB
    subgraph DMZ ["🌐 Zone DMZ / Frontale e-Banking BDL"]
        EBankingServer["💻 Serveur e-Banking BDL<br/>(Dépôt des fichiers EDI clients)"]
        ReverseProxy["🛡️ NGINX Reverse Proxy / WAF<br/>(Terminaison SSL HTTPS Port 443)"]
    end

    subgraph AppZone ["🏢 Zone Sécurisée Applicative RTGS (VLAN Applicatif)"]
        NodeServer["⚙️ Serveur Applicatif RTGS BDL<br/>• Frontend Web React (Port 3000)<br/>• Backend API Node.js (Port 5000)<br/>• Service FileWatcher & Ordonnanceur"]
        StorageEngine["📁 Espace Disque Partagé / SAN<br/>(directories/source, generated_od,<br/>generated_mt103, si_retour)"]
    end

    subgraph DBZone ["🗄️ Zone Base de Données (VLAN Données)"]
        MySQLCluster[("🗄️ Serveur Base de Données MySQL 8<br/>Port 3306 (Tables RTGS e-Banking)")]
    end

    subgraph CoreZone ["🏛️ Zone Core Banking & Réseau Interbancaire"]
        OracleSAB[("🏛️ Serveur Oracle 11g Core Banking SAB<br/>IP: 10.121.2.x | Port: 1521 (SID: SABDEV)<br/>Schéma: sabstd (zcompte0, zsolde0, zcptod0)")]
        SMTPServer["📫 Serveur Messagerie BDL Exchange / SMTP<br/>IP: 10.121.2.50 | Port: 587 (STARTTLS)"]
        SWIFTGate["🌐 Passerelle SWIFT / RTGS Banque d'Algérie<br/>(Télécompensation interbancaire)"]
    end

    %% Flux réseau
    EBankingServer -->|SFTP Port 22 / FTP Port 21| StorageEngine
    ReverseProxy -->|Proxy Pass HTTP:5000| NodeServer
    NodeServer -->|Lecture / Écriture Fichiers| StorageEngine
    NodeServer -->|TCP 3306 SQL| MySQLCluster
    NodeServer -->|TCP 1521 Oracle Net8| OracleSAB
    NodeServer -->|TCP 587 SMTP STARTTLS| SMTPServer
    StorageEngine -.->|Récupération MT103| SWIFTGate
```

---

## 9. Matrice des Flux, Protocoles & Spécifications d'Interfaces

| N° | Flux / Interface | Source | Destination | Protocole | Fréquence / Déclencheur | Format / Norme |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Ingestion Remise EDI** | e-Banking / Entreprise | `directories/source/` | FS Local / SFTP / FTP | Temps réel (Watcher) / Polling régulier | Fichier texte structuré largeur fixe (`EE`, `EC`, `EF`). |
| **2** | **Vérification Provision** | Backend RTGS (`oracle.js`) | Oracle 11g SAB (`sabstd`) | TCP 1521 (Oracle SQL Net8) | Aux heures fixes de lot (`12:00`, `15:00`, `16:30`) | Requête SQL `SELECT` sur `zcompte0` et `zsolde0`. |
| **3** | **Production Lot OD** | Backend RTGS (`odBatchGen`) | `directories/generated_od/` | I/O FS Local / SFTP / FTP | Aux heures de lot (si solde $\ge$ montant) | Fichier `ZCPTODA9_*.dat` (Format 98 positions normé BDL). |
| **4** | **Notification Email OD** | Backend RTGS (`emailService`) | Structure **DCC** | SMTP 587 (STARTTLS) | À chaque génération de lot OD | Email HTML Corporate BDL + Fichier `.dat` en pièce jointe. |
| **5** | **Surveillance SAB** | Backend RTGS (`odScheduler`) | Oracle 11g SAB (`zcptod0`) | TCP 1521 (Oracle SQL Net8) | Toutes les 5 minutes (paramétrable) | Requête SQL `SELECT` avec clé `CPTODLI2`. |
| **6** | **Émission SWIFT MT103** | Backend RTGS (`mt103Gen`) | `directories/generated_mt103/`| I/O FS Local / SFTP / FTP | Dès confirmation SAB (`CPTODETA = '003'`) | Fichier texte normé SWIFT MT103 standard interbancaire. |
| **7** | **Notification Email MT103**| Backend RTGS (`emailService`) | Structure **DTM** | SMTP 587 (STARTTLS) | Dès comptabilisation SAB (`CPTODETA = '003'`) | Email HTML Corporate BDL + Fichier `MT103_*.txt` en pièce jointe. |
| **8** | **Production SI Retour RJT**| Backend RTGS (`siRetourGen`) | `directories/si_retour/` | I/O FS Local / SFTP / FTP | Lors de rejet (solde, doublon ou SAB) | Fichier `SI_VIR_RJT_*.txt` normé BDL. |
| **9** | **Production SI Retour CPT**| Backend RTGS (`siCptGen`) | `directories/si_retour/` | I/O FS Local / SFTP / FTP | Dès confirmation SAB (`CPTODETA = '003'`) | Fichier `SI_VIR_CPT_*.txt` normé BDL. |
| **10**| **Notification Email SI** | Backend RTGS (`emailService`) | Structure **DMB** | SMTP 587 (STARTTLS) | À chaque rejet ou confirmation de compta | Email HTML Corporate BDL + Fichier `SI_VIR_*.txt` en pièce jointe. |
| **11**| **Supervision Web UI** | Navigateur Utilisateur | API Express Backend | HTTPS / REST JSON (JWT) | À la demande (IHM Web SPA) | Payloads JSON chiffrés, pagination et filtres avancés. |

---
*Document technique d'architecture et de modélisation du système BDL RTGS E-Banking.*
