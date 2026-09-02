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
    soldecen: 50000000 // 500 000.00 DZD -> Solde insuffisant
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

class OracleService {
  constructor() {
    this.mode = (process.env.SOLDE_VERIFICATION_MODE || 'SIMULATION').toUpperCase();
    this.isSimulatorMode = this.mode !== 'ORACLE_PROD';
    this.connection = null;
    this.mockAccounts = [...MOCK_SAB_DATABASE];
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
    // Mode Simulation explicite
    if (this.isSimulatorMode) {
      console.log('=======================================================');
      console.log('  [SOLDE] Mode : SIMULATION (Table SAB en mémoire)');
      console.log('=======================================================');
      return true;
    }

    // Mode Production avec Oracle 11g
    console.log('=======================================================');
    console.log('  [SOLDE] Mode : ORACLE_PROD (Connexion Oracle 11g SAB)');
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
   * Exécute la requête demandée :
   * select s.soldecen, c.comptecom
   * from sabstd.zcompte0 c
   * left join sabstd.zsolde0 s on trim(comptecom)=trim(soldecom)
   * where comptedev='DZD' and length(trim(comptecom))=15
   * and trim(comptecom) = 'Compte_donneur_ordre'
   * group by comptecom, soldecen
   */
  async checkAccountBalance(compteDonneurOrdre) {
    const cleanCompte = (compteDonneurOrdre || '').trim();

    // 1. Vérification en mode SIMULATION
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

    // 2. Vérification en mode ORACLE_PROD
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
}

module.exports = new OracleService();
