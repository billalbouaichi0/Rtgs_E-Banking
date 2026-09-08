const { Op } = require('sequelize');
const { Virement, Remise, BanqueRef, TraitementLog, SystemSetting } = require('../models');
const oracleService = require('../config/oracle');
const folderStorageService = require('./folderStorageService');
const OdBatchGenerator = require('../generators/odBatchGenerator');
const Mt103Generator = require('../generators/mt103Generator');
const SiRetourGenerator = require('../generators/siRetourGenerator');
const SiCptGenerator = require('../generators/siCptGenerator');

class OdSchedulerService {
  constructor() {
    this.batchHours = ['12:00', '15:00', '16:30'];
    this.pollIntervalMinutes = 5;
    this.autoEnabled = true;

    this.checkTimer = null;
    this.sabPollTimer = null;
    this.isRunning = false;
    this.isProcessingBatch = false;
    this.isProcessingSabPoll = false;

    this.lastBatchExecution = null;
    this.lastSabPollExecution = null;
    this.executedHoursToday = new Set();
  }

  /**
   * Initialise les paramètres depuis la base de données
   */
  async loadSettings() {
    try {
      const hoursSetting = await SystemSetting.findByPk('od_batch_hours');
      if (hoursSetting && hoursSetting.value) {
        try {
          this.batchHours = JSON.parse(hoursSetting.value);
        } catch {
          this.batchHours = hoursSetting.value.split(',').map(h => h.trim()).filter(Boolean);
        }
      }

      const pollSetting = await SystemSetting.findByPk('sab_poll_interval_minutes');
      if (pollSetting && pollSetting.value) {
        this.pollIntervalMinutes = Number(pollSetting.value) || 5;
      }

      const enabledSetting = await SystemSetting.findByPk('scheduler_auto_enabled');
      if (enabledSetting && enabledSetting.value) {
        this.autoEnabled = enabledSetting.value === 'true' || enabledSetting.value === true;
      }
    } catch (err) {
      console.warn('[OdScheduler] Utilisation des paramètres par défaut :', err.message);
    }
  }

  /**
   * Sauvegarde les paramètres dans la base de données
   */
  async saveSettings(settings) {
    // 1. Heures de génération
    let hours = settings.batchHours !== undefined ? settings.batchHours : settings.od_generation_hours;
    if (typeof hours === 'string') {
      hours = hours.split(',').map(h => h.trim()).filter(Boolean);
    }
    if (Array.isArray(hours) && hours.length > 0) {
      this.batchHours = hours;
      await SystemSetting.upsert({
        key: 'od_batch_hours',
        value: JSON.stringify(this.batchHours),
        description: 'Heures programmées de génération du lot OD (ex: 12:00, 15:00, 16:30)'
      });
    }

    // 2. Fréquence polling SAB
    const pollInterval = settings.pollIntervalMinutes !== undefined ? settings.pollIntervalMinutes : settings.sab_polling_interval_minutes;
    if (pollInterval !== undefined && !isNaN(pollInterval)) {
      this.pollIntervalMinutes = Number(pollInterval);
      await SystemSetting.upsert({
        key: 'sab_poll_interval_minutes',
        value: String(this.pollIntervalMinutes),
        description: 'Fréquence en minutes du polling de comptabilisation SAB zcptod0'
      });
    }

    // 3. Activation automatique
    const auto = settings.autoEnabled !== undefined 
      ? settings.autoEnabled 
      : (settings.od_auto_batch_enabled !== undefined ? settings.od_auto_batch_enabled : settings.sab_auto_poll_enabled);
    if (auto !== undefined) {
      this.autoEnabled = Boolean(auto === true || auto === 'true');
      await SystemSetting.upsert({
        key: 'scheduler_auto_enabled',
        value: String(this.autoEnabled),
        description: 'Activer/Désactiver le planificateur automatique OD & SAB'
      });
    }

    // Réinitialiser les timers avec les nouveaux paramètres
    this.stop();
    this.start();

    return this.getSettings();
  }

  getSettings() {
    const hoursStr = Array.isArray(this.batchHours) ? this.batchHours.join(', ') : (this.batchHours || '12:00, 15:00, 16:30');
    return {
      batchHours: this.batchHours,
      od_generation_hours: hoursStr,
      pollIntervalMinutes: this.pollIntervalMinutes,
      sab_polling_interval_minutes: this.pollIntervalMinutes,
      autoEnabled: this.autoEnabled,
      od_auto_batch_enabled: this.autoEnabled,
      sab_auto_poll_enabled: this.autoEnabled,
      isRunning: this.isRunning,
      lastBatchExecution: this.lastBatchExecution,
      lastSabPollExecution: this.lastSabPollExecution
    };
  }

  /**
   * Démarre les timers de planification
   */
  async start() {
    if (this.isRunning) return;

    await this.loadSettings();

    console.log(`[OdScheduler] Planificateur actif.`);
    console.log(`[OdScheduler] Horaires de lots OD : ${this.batchHours.join(', ')}`);
    console.log(`[OdScheduler] Fréquence de vérification SAB : toutes les ${this.pollIntervalMinutes} min.`);

    // 1. Timer de vérification des heures fixes OD (toutes les 30 secondes)
    this.checkTimer = setInterval(() => {
      this.checkScheduledHours();
    }, 30000);

    // 2. Timer de polling SAB (toutes les X minutes)
    const pollMs = Math.max(1, this.pollIntervalMinutes) * 60 * 1000;
    this.sabPollTimer = setInterval(async () => {
      if (this.autoEnabled) {
        await this.verifierComptabilisationSab();
      }
    }, pollMs);

    this.isRunning = true;
  }

  stop() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    if (this.sabPollTimer) {
      clearInterval(this.sabPollTimer);
      this.sabPollTimer = null;
    }
    this.isRunning = false;
    console.log('[OdScheduler] Planificateur arrêté.');
  }

  /**
   * Vérifie si l'heure actuelle correspond à un créneau de lot OD
   */
  async checkScheduledHours() {
    if (!this.autoEnabled || this.isProcessingBatch) return;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const currentTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const todayKey = `${now.toISOString().slice(0, 10)}_${currentTimeStr}`;

    // Réinitialiser la liste d'exécution à minuit
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      this.executedHoursToday.clear();
    }

    if (this.batchHours.includes(currentTimeStr) && !this.executedHoursToday.has(todayKey)) {
      this.executedHoursToday.add(todayKey);
      console.log(`[OdScheduler] Créneau programmé déclenché : ${currentTimeStr}`);
      await this.executerGenerationLotOd({ trigger: 'SCHEDULED', hour: currentTimeStr });
    }
  }

  /**
   * ÉTAPE 2 DU CYCLE :
   * Exécute la génération du lot OD pour tous les virements au statut 'RECU'.
   * 1. Vérification du solde SAB pour chaque virement.
   * 2. Si solde insuffisant -> statut REJETE + génération SI_VIR_RJT_*.txt
   * 3. Si solde suffisant -> statut OD_GEN + génération du fichier global ZCPTODA9_*.dat
   */
  async executerGenerationLotOd(options = {}) {
    if (this.isProcessingBatch) {
      console.log('[OdScheduler] Un traitement de lot OD est déjà en cours.');
      return { success: false, message: 'Traitement déjà en cours.' };
    }

    this.isProcessingBatch = true;
    this.lastBatchExecution = new Date();
    console.log('[OdScheduler] === Démarrage de la génération de lot OD ===');

    try {
      // 1. Récupérer tous les virements en attente 'RECU'
      const virementsRecus = await Virement.findAll({
        where: {
          statut: {
            [Op.in]: ['RECU', 'EN_ATTENTE']
          }
        },
        include: [{ model: Remise, as: 'remise' }]
      });

      if (virementsRecus.length === 0) {
        console.log('[OdScheduler] Aucun virement en attente (statut RECU).');
        this.isProcessingBatch = false;
        return {
          success: true,
          message: 'Aucun virement au statut RECU à traiter.',
          processedCount: 0,
          validesCount: 0,
          rejetesCount: 0
        };
      }

      console.log(`[OdScheduler] ${virementsRecus.length} virement(s) à analyser pour le lot OD.`);

      const virementsValides = [];
      const virementsRejetes = [];

      // 2. Vérifier le solde pour chaque virement
      for (const virement of virementsRecus) {
        let oracleRes;
        try {
          oracleRes = await oracleService.checkAccountBalance(virement.compteDonneur15);
        } catch (err) {
          console.error(`[OdScheduler] Erreur Oracle pour virement #${virement.id}:`, err);
          oracleRes = { found: false, soldeDinar: 0 };
        }

        const soldeDinar = oracleRes.soldeDinar || 0;
        const hasSufficientBalance = oracleRes.found && soldeDinar >= Number(virement.montant);

        const cleUnicite = OdBatchGenerator.getCleUnicite(virement, virement.remise);

        await virement.update({
          soldeCompteTrouve: soldeDinar,
          oracleVerifie: true,
          cleUniciteSab: cleUnicite
        });

        if (hasSufficientBalance) {
          virementsValides.push(virement);
        } else {
          // Solde insuffisant -> Rejet automatique et génération SI Retour
          const motifRejet = oracleRes.found
            ? `Solde insuffisant dans SAB (${soldeDinar.toLocaleString()} DZD < ${Number(virement.montant).toLocaleString()} DZD)`
            : `Compte donneur d'ordre (${virement.compteDonneur15}) introuvable dans SAB (DZD)`;

          const siRetFileName = SiRetourGenerator.getFileName(virement);
          const siRetContent = SiRetourGenerator.generate({
            ...virement.toJSON(),
            nomFichier: virement.remise?.nomFichier || 'VIRMNE_EDI.txt',
            referenceRemise: virement.remise?.referenceRemise || virement.numeroOrdre,
            motif: 'Solde insuffisant dans SAB (DZD)'
          });

          // Écriture du SI Retour de rejet
          await folderStorageService.writeOutputFile('si_retour', siRetFileName, siRetContent);

          await virement.update({
            statut: 'REJETE',
            motifRejetOuIgnorer: motifRejet,
            fichierSiRetGenere: siRetFileName,
            decisionDate: new Date(),
            decisionType: 'REJET_SOLDE_INSUFFISANT'
          });

          await TraitementLog.create({
            type: 'REJET_SOLDE',
            niveau: 'ERROR',
            message: `[LOT OD] Virement N° ${virement.numeroOrdre} REJETÉ pour solde insuffisant (${soldeDinar.toLocaleString()} DZD). Fichier SI Retour généré : ${siRetFileName}`,
            nomFichier: virement.remise?.nomFichier || 'N/A',
            virementId: virement.id,
            details: { motifRejet, soldeDinar, montant: virement.montant, siRetFileName }
          });

          virementsRejetes.push(virement);
        }
      }

      let odBatchFileName = null;

      // 3. Si des virements ont un solde suffisant -> Générer le fichier batch OD global
      if (virementsValides.length > 0) {
        odBatchFileName = OdBatchGenerator.getBatchFileName();
        const odBatchContent = OdBatchGenerator.generateBatch(virementsValides);

        // Écriture du fichier batch OD global
        await folderStorageService.writeOutputFile('generated_od', odBatchFileName, odBatchContent);

        const now = new Date();
        for (const v of virementsValides) {
          await v.update({
            statut: 'OD_GEN',
            fichierOdBatch: odBatchFileName,
            dateGenerationOd: now
          });

          // Enregistrement dans le simulateur Oracle si mode simulation
          oracleService.registerMockOd(v, v.cleUniciteSab);

          await TraitementLog.create({
            type: 'GENERATION_OD_BATCH',
            niveau: 'SUCCESS',
            message: `[LOT OD] Virement N° ${v.numeroOrdre} inclus dans le lot OD (${odBatchFileName}). Statut passé à OD_GEN. En attente de traitement SAB.`,
            nomFichier: v.remise?.nomFichier || 'N/A',
            virementId: v.id,
            details: { odBatchFileName, cleUnicite: v.cleUniciteSab, montant: v.montant }
          });
        }
      }

      // 4. Mettre à jour le statut global des remises impactées
      const affectedRemiseIds = [...new Set(virementsRecus.map(v => v.remiseId).filter(Boolean))];
      for (const rId of affectedRemiseIds) {
        try {
          const processingService = require('./processingService');
          await processingService.recalculateRemiseStatut(rId);
        } catch (rErr) {
          console.error(`[OdScheduler] Erreur recalcul statut remise #${rId}:`, rErr);
        }
      }

      console.log(`[OdScheduler] Lot OD terminé : ${virementsValides.length} validé(s), ${virementsRejetes.length} rejeté(s).`);

      return {
        success: true,
        message: `Lot OD exécuté : ${virementsValides.length} virement(s) intégrés dans ${odBatchFileName || 'aucun'}, ${virementsRejetes.length} rejeté(s) automatiquement pour solde insuffisant.`,
        processedCount: virementsRecus.length,
        validesCount: virementsValides.length,
        rejetesCount: virementsRejetes.length,
        odBatchFileName
      };
    } catch (err) {
      console.error('[OdScheduler] Erreur lors de la génération du lot OD :', err);
      throw err;
    } finally {
      this.isProcessingBatch = false;
    }
  }

  /**
   * ÉTAPE 3 DU CYCLE :
   * Surveillance / Polling de la comptabilisation SAB sur sabstd.zcptod0.
   * Analyse les virements au statut 'OD_GEN' ou 'INTEGRE'.
   * - Si comptabilisé (CPTODETA='003' & DCO<>0) -> Statut ENVOYE + Génération MT103 + SI_VIR_CPT_*.txt
   * - Si intégré (CPTODETA='001' & DCO=0) -> Statut INTEGRE (continue le check)
   * - Si refusé (CPTODETA='002' & DCO=0) -> Statut REJETE + SI_VIR_RJT_*.txt
   */
  async verifierComptabilisationSab() {
    if (this.isProcessingSabPoll) {
      return { success: false, message: 'Vérification SAB déjà en cours.' };
    }

    this.isProcessingSabPoll = true;
    this.lastSabPollExecution = new Date();

    try {
      const virementsEnAttente = await Virement.findAll({
        where: {
          statut: {
            [Op.in]: ['OD_GEN', 'INTEGRE']
          }
        },
        include: [{ model: Remise, as: 'remise' }]
      });

      if (virementsEnAttente.length === 0) {
        this.isProcessingSabPoll = false;
        return { success: true, count: 0, message: 'Aucun virement en attente de comptabilisation SAB.' };
      }

      console.log(`[OdScheduler] Vérification SAB zcptod0 pour ${virementsEnAttente.length} virement(s)...`);

      let countComptabilises = 0;
      let countIntegres = 0;
      let countRejetes = 0;

      for (const virement of virementsEnAttente) {
        try {
          const checkRes = await oracleService.checkOdComptabilisation(virement, virement.cleUniciteSab);

          if (checkRes.status === 'COMPTABILISE') {
            // 1. Opération comptabilisée par SAB !
            const banqueBenif = await BanqueRef.findByPk(virement.codeBanqueBeneficiaire);

            // Génération SWIFT MT103
            const mt103Content = Mt103Generator.generate(virement, banqueBenif);
            const mt103FileName = `MT103_${virement.id}_${virement.numeroOrdre}.txt`;
            await folderStorageService.writeOutputFile('generated_mt103', mt103FileName, mt103Content);

            // Génération SI Retour Comptabilisé (SI_VIR_CPT_*.txt)
            const dateCompta = new Date();
            const siCptFileName = SiCptGenerator.getFileName(virement, dateCompta);
            const siCptContent = SiCptGenerator.generate(virement, {
              dateComptabilisation: dateCompta.toISOString(),
              cptoddco: checkRes.cptoddco
            });
            await folderStorageService.writeOutputFile('si_retour', siCptFileName, siCptContent);

            await virement.update({
              statut: 'ENVOYE',
              dateComptabilisationSab: dateCompta,
              fichierMt103Genere: mt103FileName,
              fichierSiCptGenere: siCptFileName
            });

            await TraitementLog.create({
              type: 'COMPTABILISATION_SAB_SUCCESS',
              niveau: 'SUCCESS',
              message: `[SAB COMPTA] Virement N° ${virement.numeroOrdre} COMPTABILISÉ par SAB (DCO #${checkRes.cptoddco}). MT103 (${mt103FileName}) et Accusé SI_VIR_CPT (${siCptFileName}) générés et transmis. Statut : ENVOYE.`,
              nomFichier: virement.remise?.nomFichier || 'N/A',
              virementId: virement.id,
              details: { cptoddco: checkRes.cptoddco, mt103FileName, siCptFileName }
            });

            countComptabilises++;
          } else if (checkRes.status === 'INTEGRE') {
            // 2. Opération intégrée dans SAB mais pas encore comptabilisée
            if (virement.statut !== 'INTEGRE') {
              await virement.update({
                statut: 'INTEGRE',
                dateIntegrationSab: new Date()
              });

              await TraitementLog.create({
                type: 'INTEGRATION_SAB',
                niveau: 'INFO',
                message: `[SAB CHECK] Virement N° ${virement.numeroOrdre} confirmé INTÉGRÉ dans SAB (CPTODETA: 001). En attente de comptabilisation.`,
                nomFichier: virement.remise?.nomFichier || 'N/A',
                virementId: virement.id
              });
            }
            countIntegres++;
          } else if (checkRes.status === 'REJETE') {
            // 3. Opération rejetée par le SAB
            const siRetFileName = SiRetourGenerator.getFileName(virement);
            const siRetContent = SiRetourGenerator.generate({
              ...virement.toJSON(),
              nomFichier: virement.remise?.nomFichier || 'VIRMNE_EDI.txt',
              referenceRemise: virement.remise?.referenceRemise || virement.numeroOrdre,
              motif: 'Rejet lors du traitement comptable SAB (Code 002)'
            });
            await folderStorageService.writeOutputFile('si_retour', siRetFileName, siRetContent);

            await virement.update({
              statut: 'REJETE',
              motifRejetOuIgnorer: 'Rejet lors du traitement comptable SAB (CPTODETA 002)',
              fichierSiRetGenere: siRetFileName,
              decisionDate: new Date(),
              decisionType: 'REJET_SAB'
            });

            await TraitementLog.create({
              type: 'REJET_SAB',
              niveau: 'ERROR',
              message: `[SAB REJET] Virement N° ${virement.numeroOrdre} REJETÉ par le SAB (CPTODETA 002). Fichier SI Retour généré (${siRetFileName}). Statut : REJETE.`,
              nomFichier: virement.remise?.nomFichier || 'N/A',
              virementId: virement.id
            });

            countRejetes++;
          }
        } catch (itemErr) {
          console.error(`[OdScheduler] Erreur vérification SAB pour virement #${virement.id}:`, itemErr);
        }
      }

      // Mettre à jour le statut global des remises impactées
      const affectedRemiseIds = [...new Set(virementsEnAttente.map(v => v.remiseId).filter(Boolean))];
      for (const rId of affectedRemiseIds) {
        try {
          const processingService = require('./processingService');
          await processingService.recalculateRemiseStatut(rId);
        } catch (rErr) {
          console.error(`[OdScheduler] Erreur recalcul statut remise #${rId}:`, rErr);
        }
      }

      console.log(`[OdScheduler] Fin vérification SAB : ${countComptabilises} comptabilisé(s) (ENVOYE), ${countIntegres} intégré(s), ${countRejetes} rejeté(s).`);

      return {
        success: true,
        checkedCount: virementsEnAttente.length,
        countComptabilises,
        countIntegres,
        countRejetes,
        message: `Vérification SAB : ${countComptabilises} comptabilisé(s), ${countIntegres} en attente, ${countRejetes} rejeté(s).`
      };
    } catch (err) {
      console.error('[OdScheduler] Erreur globale lors du polling SAB :', err);
      throw err;
    } finally {
      this.isProcessingSabPoll = false;
    }
  }
}

module.exports = new OdSchedulerService();
