require('dotenv').config();

// Table de simulation en mémoire de sabstd.zcompte0 et sabstd.zsolde0
const MOCK_SAB_DATABASE = [
  {
    comptecom: '001334002181530', // Agence 00133 + Compte 4002181530 (15 positions)
    soldecom: '001334002181530',
    comptedev: 'DZD',
    soldecen: 5000000000 // 50 000 000.00 DZD -> Solde suffisant
  },
  {
    comptecom: '001334002181531',
    soldecom: '001334002181531',
    comptedev: 'DZD',
    soldecen: 50000000 // 500 000.00 DZD -> Solde insuffisant (< 15M)
  },
  {
    comptecom: '001334002181532',
    soldecom: '001334002181532',
    comptedev: 'DZD',
    soldecen: 1500000000 // 15 000 000.00 DZD -> Solde suffisant
  },
  {
    comptecom: '001201234567890',
    soldecom: '001201234567890',
    comptedev: 'DZD',
    soldecen: 8500000000 // 85 000 000.00 DZD -> Solde suffisant
  }
];

// Table de simulation en mémoire de sabstd.zcptod0 pour le suivi de comptabilisation des OD
const MOCK_ZCPTOD0_TABLE = [];

class OracleService {
  constructor() {
    this.mode = (process.env.SOLDE_VERIFICATION_MODE || 'SIMULATION').toUpperCase();
    this.isSimulatorMode = this.mode !== 'ORACLE_PROD';
    this.connection = null;
    this.mockAccounts = [...MOCK_SAB_DATABASE];
    this.mockZcptod0 = MOCK_ZCPTOD0_TABLE;
  }

  getModeInfo() {
    return {
      mode: this.isSimulatorMode ? 'SIMULATION' : 'ORACLE_PROD',
      isSimulatorMode: this.isSimulatorMode,
      connectString: process.env.ORACLE_CONNECT_STRING || '127.0.0.1:1521/SABDEV',
      user: process.env.ORACLE_USER || 'sabstd'
    };
  }

  async connect() {
    if (this.isSimulatorMode) {
      console.log('=======================================================');
      console.log('  [SAB ORACLE] Mode : SIMULATION (Tables SAB en mémoire)');
      console.log('=======================================================');
      return true;
    }

    console.log('=======================================================');
    console.log('  [SAB ORACLE] Mode : ORACLE_PROD (Connexion Oracle 11g SAB)');
    console.log(`  Connexion : ${process.env.ORACLE_USER}@${process.env.ORACLE_CONNECT_STRING}`);
    console.log('=======================================================');

    try {
      const oracledb = require('oracledb');

      if (process.env.ORACLE_CLIENT_DIR) {
        try {
          oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_DIR });
          console.log(`[Oracle 11g] Oracle Client initialisé : ${process.env.ORACLE_CLIENT_DIR}`);
        } catch (initErr) {
          console.warn('[Oracle 11g] Note initOracleClient:', initErr.message);
        }
      }

      this.connection = await oracledb.getConnection({
        user: process.env.ORACLE_USER || 'sabstd',
        password: process.env.ORACLE_PASSWORD || 'sabpass',
        connectString: process.env.ORACLE_CONNECT_STRING || '127.0.0.1:1521/SABDEV'
      });
      console.log('[Oracle 11g] ✓ Connecté avec succès au serveur Oracle SAB Core Banking');
      return true;
    } catch (err) {
      console.error('[Oracle 11g] ❌ Erreur de connexion Oracle Production :', err.message);
      console.warn('[Oracle 11g] Basculement temporaire de sécurité en mode SIMULATION.');
      this.isSimulatorMode = true;
      return true;
    }
  }

  /**
   * Vérification du solde SAB du compte donneur d'ordre
   */
  async checkAccountBalance(compteDonneurOrdre) {
    const cleanCompte = (compteDonneurOrdre || '').trim();

    if (this.isSimulatorMode) {
      const account = this.mockAccounts.find(
        (a) => a.comptecom === cleanCompte && a.comptedev === 'DZD'
      );

      if (!account) {
        const partial = this.mockAccounts.find((a) => a.comptecom.includes(cleanCompte));
        if (partial) {
          return {
            found: true,
            comptecom: partial.comptecom,
            soldecen: partial.soldecen,
            soldeDinar: partial.soldecen / 100,
            modeSource: 'SIMULATION'
          };
        }
        return {
          found: false,
          comptecom: cleanCompte,
          soldecen: 0,
          soldeDinar: 0,
          modeSource: 'SIMULATION'
        };
      }

      return {
        found: true,
        comptecom: account.comptecom,
        soldecen: account.soldecen,
        soldeDinar: account.soldecen / 100,
        modeSource: 'SIMULATION'
      };
    }

    try {
      const oracledb = require('oracledb');
      if (!this.connection) {
        await this.connect();
      }

      const sql = `
        SELECT s.soldecen, c.comptecom
        FROM sabstd.zcompte0 c
        LEFT JOIN sabstd.zsolde0 s ON TRIM(c.comptecom) = TRIM(s.soldecom)
        WHERE c.comptedev = 'DZD' 
          AND LENGTH(TRIM(c.comptecom)) = 15
          AND TRIM(c.comptecom) = :compte
        GROUP BY c.comptecom, s.soldecen
      `;

      const result = await this.connection.execute(
        sql,
        { compte: cleanCompte },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        const soldecen = Number(row.SOLDECEN || row.soldecen || 0);
        return {
          found: true,
          comptecom: row.COMPTECOM || row.comptecom,
          soldecen: soldecen,
          soldeDinar: soldecen / 100,
          modeSource: 'ORACLE_PROD'
        };
      }

      return {
        found: false,
        comptecom: cleanCompte,
        soldecen: 0,
        soldeDinar: 0,
        modeSource: 'ORACLE_PROD'
      };
    } catch (err) {
      console.error('[Oracle 11g] Erreur lors de la requête de solde :', err);
      throw err;
    }
  }

  /**
   * Enregistre un OD dans le mock SAB lors de la génération du lot
   */
  registerMockOd(virement, cleUnicite) {
    const existing = this.mockZcptod0.find(o => o.cleUnicite === cleUnicite);
    const montantCentimes = Math.round((Number(virement.montant) || 0) * 100);
    
    if (!existing) {
      this.mockZcptod0.push({
        CPTODDCO: 0,
        CPTODETA: '001', // Intégré par défaut
        CPTODCOM: virement.compteDonneur15,
        CPTODMO1: String(montantCentimes),
        CPTODMO4: String(virement.montant),
        CPTODOPE: '*A9',
        CPTODEVE: 'RTG',
        CPTODLI2: cleUnicite,
        cleUnicite,
        virementId: virement.id,
        createdAt: new Date(),
        // Simulation de comptabilisation automatique après 1 cycle
        comptabiliseAt: Date.now() + 10000 
      });
    }
  }

  /**
   * Vérifie le statut d'un OD dans sabstd.zcptod0 selon la requête fournie :
   * 
   * SELECT CPTODDCO, CPTODETA, CPTODCOM, CPTODMO1, CPTODMO4 
   * FROM sabstd.zcptod0 
   * WHERE CPTODOPE = '*A9' 
   *   AND CPTODEVE = 'RTG' 
   *   AND CPTODCOM LIKE '%compte donneur%' 
   *   AND CPTODMO1 = 'montantvirment' 
   *   AND CPTODLI2 LIKE '%comptedonneur||dateremise||numeroremise%';
   * 
   * Règles de décision :
   * - CPTODDCO <> 0 ET CPTODETA = '003' -> COMPTABILISE (ENVOYE + MT103 + SI_VIR_CPT)
   * - CPTODDCO = 0 ET CPTODETA = '001'  -> INTEGRE (en attente comptabilisation)
   * - CPTODDCO = 0 ET CPTODETA = '002'  -> REJETE (rejeté par SAB)
   * - Non trouvé                        -> EN_ATTENTE_INTEGRATION
   */
  async checkOdComptabilisation(virement, cleUnicite) {
    const compteDonneur = (virement.compteDonneur15 || '').trim();
    const montantCentimes = String(Math.round((Number(virement.montant) || 0) * 100));
    const searchKey = cleUnicite || `${compteDonneur}||${virement.remise?.dateRemiseOrdre || ''}||${virement.remise?.referenceRemise || virement.numeroOrdre || ''}`;

    // 1. Mode SIMULATION
    if (this.isSimulatorMode) {
      let odRecord = this.mockZcptod0.find(
        (o) => o.cleUnicite === searchKey || (o.CPTODCOM === compteDonneur && o.CPTODMO1 === montantCentimes)
      );

      if (!odRecord) {
        // Enregistrer automatiquement comme intégré si non encore présent
        this.registerMockOd(virement, searchKey);
        odRecord = this.mockZcptod0.find((o) => o.cleUnicite === searchKey);
      }

      // Si le délai simulé est dépassé, passer en comptabilisé
      if (odRecord && Date.now() >= odRecord.comptabiliseAt && odRecord.CPTODETA === '001') {
        odRecord.CPTODETA = '003';
        odRecord.CPTODDCO = Math.floor(Math.random() * 900000) + 100000; // Numéro comptable SAB généré
      }

      const cptoddco = Number(odRecord?.CPTODDCO || 0);
      const cptodeta = odRecord?.CPTODETA || '001';

      if (cptoddco !== 0 && cptodeta === '003') {
        return {
          status: 'COMPTABILISE',
          cptoddco,
          cptodeta,
          message: `Opération OD comptabilisée avec succès dans SAB (DCO #${cptoddco})`,
          raw: odRecord
        };
      } else if (cptoddco === 0 && cptodeta === '001') {
        return {
          status: 'INTEGRE',
          cptoddco: 0,
          cptodeta: '001',
          message: `Opération OD intégrée dans SAB, en attente de validation comptable.`,
          raw: odRecord
        };
      } else if (cptodeta === '002') {
        return {
          status: 'REJETE',
          cptoddco: 0,
          cptodeta: '002',
          message: `Opération OD rejetée par le SAB.`,
          raw: odRecord
        };
      }

      return {
        status: 'EN_ATTENTE_INTEGRATION',
        cptoddco,
        cptodeta,
        message: `Opération en cours de transmission SAB.`,
        raw: odRecord
      };
    }

    // 2. Mode ORACLE_PROD
    try {
      const oracledb = require('oracledb');
      if (!this.connection) {
        await this.connect();
      }

      const sql = `
        SELECT CPTODDCO, CPTODETA, CPTODCOM, CPTODMO1, CPTODMO4, CPTODLI2
        FROM sabstd.zcptod0
        WHERE CPTODOPE = '*A9'
          AND CPTODEVE = 'RTG'
          AND CPTODCOM LIKE :compteParam
          AND CPTODMO1 = :montantParam
          AND CPTODLI2 LIKE :cleParam
      `;

      const result = await this.connection.execute(
        sql,
        {
          compteParam: `%${compteDonneur}%`,
          montantParam: montantCentimes,
          cleParam: `%${searchKey}%`
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0];
        const cptoddco = Number(row.CPTODDCO || row.cptoddco || 0);
        const cptodeta = String(row.CPTODETA || row.cptodeta || '').trim();

        if (cptoddco !== 0 && cptodeta === '003') {
          return {
            status: 'COMPTABILISE',
            cptoddco,
            cptodeta,
            message: `Opération OD comptabilisée dans Oracle SAB (DCO: ${cptoddco})`,
            raw: row
          };
        } else if (cptoddco === 0 && cptodeta === '001') {
          return {
            status: 'INTEGRE',
            cptoddco: 0,
            cptodeta: '001',
            message: `Opération OD intégrée dans SAB, en attente de comptabilisation.`,
            raw: row
          };
        } else if (cptoddco === 0 && cptodeta === '002') {
          return {
            status: 'REJETE',
            cptoddco: 0,
            cptodeta: '002',
            message: `Opération OD rejetée par SAB (Code 002).`,
            raw: row
          };
        }
      }

      return {
        status: 'EN_ATTENTE_INTEGRATION',
        cptoddco: 0,
        cptodeta: 'NON_TROUVE',
        message: 'Opération non encore trouvée dans sabstd.zcptod0.'
      };
    } catch (err) {
      console.error('[Oracle 11g] Erreur vérification zcptod0 :', err);
      throw err;
    }
  }

  addOrUpdateMockAccount(comptecom, soldeDinar) {
    const existing = this.mockAccounts.find((a) => a.comptecom === comptecom);
    const soldecen = Math.round(soldeDinar * 100);
    if (existing) {
      existing.soldecen = soldecen;
    } else {
      this.mockAccounts.push({
        comptecom,
        soldecom: comptecom,
        comptedev: 'DZD',
        soldecen
      });
    }
  }

  getMockAccounts() {
    return this.mockAccounts;
  }

  getMockZcptod0() {
    return this.mockZcptod0;
  }
}

module.exports = new OracleService();
