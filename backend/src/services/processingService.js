const fs = require('fs');
const path = require('path');
const { FOLDERS } = require('../config/folders');
const oracleService = require('../config/oracle');
const EdiParser = require('../parsers/ediParser');
const Mt103Generator = require('../generators/mt103Generator');
const OdGenerator = require('../generators/odGenerator');
const SiRetourGenerator = require('../generators/siRetourGenerator');
const { Op } = require('sequelize');
const { Remise, Virement, BanqueRef, TraitementLog } = require('../models');

const RTGS_MIN_AMOUNT = Number(process.env.RTGS_MIN_AMOUNT || 1000000);

class ProcessingService {
  /**
   * Traite un fichier EDI complet déposé ou uploadé
   * @param {string} filePath Chemin du fichier EDI
   * @param {string} originalFileName Nom d'origine
   */
  async processEdiFile(filePath, originalFileName) {
    const fileName = originalFileName || path.basename(filePath);
    console.log(`[ProcessingService] Démarrage du traitement de ${fileName}`);

    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const parsedData = EdiParser.parse(fileContent, fileName);

      // 1. Enregistrement de la remise en base de données
      const remise = await Remise.create({
        nomFichier: fileName,
        dateRemiseOrdre: parsedData.entete.dateRemiseOrdre,
        referenceRemise: parsedData.entete.referenceRemise,
        codeBanqueDonneur: parsedData.entete.codeBanqueDonneur,
        natureOperation: parsedData.entete.natureOperation,
        natureFonds: parsedData.entete.natureFonds,
        ribDonneurOrdre: parsedData.entete.ribDonneurOrdre,
        nomDonneurOrdre: parsedData.entete.nomDonneurOrdre,
        adresseDonneurOrdre: parsedData.entete.adresseDonneurOrdre,
        nombreOperations: parsedData.virements.length,
        montantTotal: parsedData.virements.reduce((sum, v) => sum + v.montant, 0),
        statut: 'EN_COURS',
        cheminFichier: filePath
      });

      await TraitementLog.create({
        type: 'INGESTION',
        niveau: 'INFO',
        message: `Fichier EDI ${fileName} parsé avec succès. ${parsedData.virements.length} opération(s) détectée(s).`,
        nomFichier: fileName
      });

      let allIgnored = true;
      let countValides = 0;
      let countAttenteValidation = 0;
      let countRejetes = 0;
      let countIgnores = 0;

      const seenLibelles = new Set();
      const seenNomsBenef = new Set();

      for (const virData of parsedData.virements) {
        // Enregistrement initial du virement
        const virement = await Virement.create({
          remiseId: remise.id,
          numeroOrdre: virData.numeroOrdre,
          ribDonneur: virData.ribDonneur,
          codeBanqueDonneur: virData.codeBanqueDonneur,
          codeAgenceDonneur: virData.codeAgenceDonneur,
          compteDonneur15: virData.compteDonneur15,
          nomDonneur: virData.nomDonneur,
          adresseDonneur: virData.adresseDonneur,
          ribBeneficiaire: virData.ribBeneficiaire,
          codeBanqueBeneficiaire: virData.codeBanqueBeneficiaire,
          codeAgenceBeneficiaire: virData.codeAgenceBeneficiaire,
          nomBeneficiaire: virData.nomBeneficiaire,
          adresseBeneficiaire: virData.adresseBeneficiaire,
          montant: virData.montant,
          libelle: virData.libelle,
          dateValeur: virData.dateValeur,
          statut: 'EN_ATTENTE'
        });

        // 2. Vérification des conditions de filtrage RTGS :
        // Condition a : Montant >= 1 000 000 DZD
        // Condition b : Code banque bénéficiaire != Code banque donneur d'ordre
        const isAmountEligible = virData.montant >= RTGS_MIN_AMOUNT;
        const isInterbank = virData.codeBanqueDonneur !== virData.codeBanqueBeneficiaire;

        if (!isAmountEligible || !isInterbank) {
          const motifs = [];
          if (!isAmountEligible) {
            motifs.push(`Montant (${virData.montant} DZD) inférieur au seuil RTGS (${RTGS_MIN_AMOUNT} DZD)`);
          }
          if (!isInterbank) {
            motifs.push(`Virement intrabancaire (Banque donneur ${virData.codeBanqueDonneur} = Banque bénif ${virData.codeBanqueBeneficiaire})`);
          }
          const motifFinal = motifs.join(' & ');

          await virement.update({
            statut: 'IGNORE_FILTRE',
            motifRejetOuIgnorer: motifFinal
          });

          await TraitementLog.create({
            type: 'FILTRE_RTGS',
            niveau: 'WARNING',
            message: `Opération ${virData.numeroOrdre} ignorée : ${motifFinal}`,
            nomFichier: fileName,
            virementId: virement.id
          });

          countIgnores++;
          continue;
        }

        // Si le virement passe le filtre RTGS
        allIgnored = false;

        // 3. Contrôle anti-doublon (Nom ou Libellé)
        const normLibelle = (virData.libelle || '').trim().toUpperCase();
        const normNomBenef = (virData.nomBeneficiaire || '').trim().toUpperCase();

        let motifDoublon = null;

        if (normLibelle && seenLibelles.has(normLibelle)) {
          motifDoublon = `Doublon intra-fichier : Le libellé "${virData.libelle}" apparaît en double dans cette remise`;
        } else if (normNomBenef && seenNomsBenef.has(normNomBenef)) {
          motifDoublon = `Doublon intra-fichier : Le nom du bénéficiaire "${virData.nomBeneficiaire}" apparaît en double dans cette remise`;
        } else {
          // Contrôle en base de données contre les virements existants actifs ou traités
          const existingDbVirement = await Virement.findOne({
            where: {
              id: { [Op.ne]: virement.id },
              remiseId: { [Op.ne]: remise.id },
              statut: { [Op.in]: ['VALIDE_TRAITE', 'ATTENTE_VALIDATION_SOLDE', 'EN_ATTENTE'] },
              [Op.or]: [
                { libelle: virData.libelle },
                {
                  nomBeneficiaire: virData.nomBeneficiaire,
                  ribDonneur: virData.ribDonneur,
                  montant: virData.montant
                }
              ]
            }
          });

          if (existingDbVirement) {
            if (existingDbVirement.libelle === virData.libelle) {
              motifDoublon = `Doublon en base : Virement avec le même libellé "${virData.libelle}" déjà existant (ID #${existingDbVirement.id})`;
            } else {
              motifDoublon = `Doublon en base : Virement identique pour "${virData.nomBeneficiaire}" déjà existant (ID #${existingDbVirement.id})`;
            }
          }
        }

        if (motifDoublon) {
          // Rejeter le virement pour doublon et générer le fichier SI_RETOUR
          const siRetFileName = SiRetourGenerator.getFileName(virData.libelle, virement.id);
          const siRetContent = SiRetourGenerator.generate(virData);
          const siRetPath = path.join(FOLDERS.si_retour, siRetFileName);
          fs.writeFileSync(siRetPath, siRetContent, 'utf-8');

          await virement.update({
            statut: 'REJETE_DOUBLON',
            motifRejetOuIgnorer: motifDoublon,
            fichierSiRetGenere: siRetFileName
          });

          await TraitementLog.create({
            type: 'DOUBLON_DETECTE',
            niveau: 'WARNING',
            message: `[DOUBLON REJETÉ] Virement N° ${virData.numeroOrdre} rejeté : ${motifDoublon}. Fichier SI Retour généré (${siRetFileName}).`,
            nomFichier: fileName,
            virementId: virement.id,
            details: { motifDoublon, siRetFileName, libelle: virData.libelle, nomBeneficiaire: virData.nomBeneficiaire }
          });

          countRejetes++;
          continue;
        }

        // Mémoriser le libellé et le nom pour détecter les doublons suivants
        if (normLibelle) seenLibelles.add(normLibelle);
        if (normNomBenef) seenNomsBenef.add(normNomBenef);

        // 4. Vérification du solde via Oracle 11g SAB
        let oracleRes;
        try {
          oracleRes = await oracleService.checkAccountBalance(virData.compteDonneur15);
        } catch (oracleErr) {
          console.error(`[Oracle 11g] Erreur pour compte ${virData.compteDonneur15}`, oracleErr);
          oracleRes = { found: false, soldeDinar: 0 };
        }

        const soldeDinar = oracleRes.soldeDinar || 0;
        const hasSufficientBalance = oracleRes.found && soldeDinar >= virData.montant;

        await virement.update({
          soldeCompteTrouve: soldeDinar,
          oracleVerifie: true
        });

        if (hasSufficientBalance) {
          // Solde suffisant -> Générer Fichier OD et Fichier MT103 automatiquement
          const banqueBenif = await BanqueRef.findByPk(virData.codeBanqueBeneficiaire);

          // Génération MT103
          const mt103Content = Mt103Generator.generate(virData, banqueBenif);
          const mt103FileName = `MT103_${virement.id}_${virData.numeroOrdre}.txt`;
          const mt103Path = path.join(FOLDERS.generated_mt103, mt103FileName);
          fs.writeFileSync(mt103Path, mt103Content, 'utf-8');

          // Génération OD
          const odContent = OdGenerator.generate(virData);
          const odFileName = `OD_${virement.id}_${virData.numeroOrdre}.txt`;
          const odPath = path.join(FOLDERS.generated_od, odFileName);
          fs.writeFileSync(odPath, odContent, 'utf-8');

          await virement.update({
            statut: 'VALIDE_TRAITE',
            fichierMt103Genere: mt103FileName,
            fichierOdGenere: odFileName
          });

          await TraitementLog.create({
            type: 'GENERATION_MT103',
            niveau: 'SUCCESS',
            message: `Virement ${virData.numeroOrdre} validé automatiquement. MT103 généré (${mt103FileName}) et Fichier OD généré (${odFileName}). Solde SAB : ${soldeDinar.toLocaleString()} DZD`,
            nomFichier: fileName,
            virementId: virement.id,
            details: { mt103FileName, odFileName, soldeDinar }
          });

          countValides++;
        } else {
          // Solde insuffisant -> Notification & Mise en attente de décision (Valider / Refuser)
          const motifAlerte = oracleRes.found
            ? `Solde insuffisant (${soldeDinar.toLocaleString()} DZD < ${virData.montant.toLocaleString()} DZD)`
            : `Compte donneur d'ordre (${virData.compteDonneur15}) introuvable dans SAB (DZD)`;

          await virement.update({
            statut: 'ATTENTE_VALIDATION_SOLDE',
            motifRejetOuIgnorer: `${motifAlerte} - En attente de validation ou refus manuel.`
          });

          await TraitementLog.create({
            type: 'ALERTE_SOLDE',
            niveau: 'WARNING',
            message: `[ALERTE SOLDE] Virement N° ${virData.numeroOrdre} : ${motifAlerte}. Veuillez valider (forçage) ou refuser l'opération.`,
            nomFichier: fileName,
            virementId: virement.id,
            details: { soldeDinar, montantRequis: virData.montant, compteDonneur: virData.compteDonneur15 }
          });

          countAttenteValidation++;
        }
      }

      // Mise à jour du statut global de la remise
      let globalStatut = 'TRAITE_COMPLET';
      if (allIgnored) {
        globalStatut = 'IGNORE';
        // Déplacement du fichier de input vers input/ignorer
        const destIgnorerPath = path.join(FOLDERS.ignorer, fileName);
        try {
          if (fs.existsSync(filePath)) {
            fs.copyFileSync(filePath, destIgnorerPath);
            fs.unlinkSync(filePath);
            console.log(`[ProcessingService] Fichier déplacé vers ${destIgnorerPath}`);
          }
        } catch (e) {
          console.error('[ProcessingService] Erreur déplacement vers ignorer', e);
        }
      } else if (countAttenteValidation > 0) {
        globalStatut = 'ATTENTE_VALIDATION';
      } else if (countRejetes > 0 && countValides > 0) {
        globalStatut = 'TRAITE_PARTIEL';
      }

      await remise.update({ statut: globalStatut });

      return {
        success: true,
        remiseId: remise.id,
        nomFichier: fileName,
        countValides,
        countAttenteValidation,
        countRejetes,
        countIgnores,
        statut: globalStatut
      };
    } catch (err) {
      console.error(`[ProcessingService] Erreur traitement fichier ${fileName}:`, err);
      await TraitementLog.create({
        type: 'SYSTEM',
        niveau: 'ERROR',
        message: `Échec du traitement du fichier ${fileName} : ${err.message}`,
        nomFichier: fileName
      });
      throw err;
    }
  }

  /**
   * Valide manuellement un virement en attente de décision solde (Génère OD et MT103)
   * @param {number} virementId ID du virement
   * @param {Object} user Utilisateur effectuant la validation
   */
  async validerVirementManuellement(virementId, user = null) {
    const virement = await Virement.findByPk(virementId, { include: [{ model: Remise, as: 'remise' }] });
    if (!virement) {
      throw new Error(`Virement ID ${virementId} introuvable.`);
    }

    if (virement.statut === 'VALIDE_TRAITE') {
      throw new Error(`Ce virement est déjà validé et traité.`);
    }

    const username = user?.username || user?.fullName || 'Admin BDL';

    // 1. Récupération de la banque bénéficiaire
    const banqueBenif = await BanqueRef.findByPk(virement.codeBanqueBeneficiaire);

    // 2. Génération du MT103
    const mt103Content = Mt103Generator.generate(virement, banqueBenif);
    const mt103FileName = `MT103_${virement.id}_${virement.numeroOrdre}.txt`;
    const mt103Path = path.join(FOLDERS.generated_mt103, mt103FileName);
    fs.writeFileSync(mt103Path, mt103Content, 'utf-8');

    // 3. Génération du Fichier OD
    const odContent = OdGenerator.generate(virement);
    const odFileName = `OD_${virement.id}_${virement.numeroOrdre}.txt`;
    const odPath = path.join(FOLDERS.generated_od, odFileName);
    fs.writeFileSync(odPath, odContent, 'utf-8');

    // 4. Mise à jour du virement
    await virement.update({
      statut: 'VALIDE_TRAITE',
      fichierMt103Genere: mt103FileName,
      fichierOdGenere: odFileName,
      decisionPar: username,
      decisionDate: new Date(),
      decisionType: 'VALIDE_FORCE',
      motifRejetOuIgnorer: `Validé manuellement avec forçage par ${username}`
    });

    // 5. Log d'audit
    await TraitementLog.create({
      type: 'VALIDATION_MANUELLE',
      niveau: 'SUCCESS',
      message: `Virement N° ${virement.numeroOrdre} VALIDÉ manuellement par ${username}. MT103 (${mt103FileName}) et Fichier OD (${odFileName}) générés avec succès.`,
      nomFichier: virement.remise?.nomFichier || 'N/A',
      virementId: virement.id,
      details: { mt103FileName, odFileName, username }
    });

    // 6. Recalculer le statut global de la remise
    if (virement.remiseId) {
      await this.recalculateRemiseStatut(virement.remiseId);
    }

    return {
      success: true,
      message: 'Virement validé avec succès. Fichiers OD et MT103 générés.',
      virement
    };
  }

  /**
   * Refuse manuellement un virement en attente de décision solde (Génère le SI Retour)
   * @param {number} virementId ID du virement
   * @param {Object} user Utilisateur effectuant le refus
   * @param {string} motif Motif du refus
   */
  async refuserVirementManuellement(virementId, user = null, motif = null) {
    const virement = await Virement.findByPk(virementId, { include: [{ model: Remise, as: 'remise' }] });
    if (!virement) {
      throw new Error(`Virement ID ${virementId} introuvable.`);
    }

    if (virement.statut === 'REJETE_SOLDE') {
      throw new Error(`Ce virement est déjà rejeté.`);
    }

    const username = user?.username || user?.fullName || 'Admin BDL';
    const motifFinal = motif || `Refusé manuellement suite à solde insuffisant par ${username}`;

    // 1. Génération du Fichier SI Retour
    const siRetFileName = SiRetourGenerator.getFileName(virement.libelle, virement.id);
    const siRetContent = SiRetourGenerator.generate(virement);
    const siRetPath = path.join(FOLDERS.si_retour, siRetFileName);
    fs.writeFileSync(siRetPath, siRetContent, 'utf-8');

    // 2. Mise à jour du virement
    await virement.update({
      statut: 'REJETE_SOLDE',
      fichierSiRetGenere: siRetFileName,
      motifRejetOuIgnorer: motifFinal,
      decisionPar: username,
      decisionDate: new Date(),
      decisionType: 'REFUSE_MANUEL'
    });

    // 3. Log d'audit
    await TraitementLog.create({
      type: 'REFUS_MANUEL',
      niveau: 'ERROR',
      message: `Virement N° ${virement.numeroOrdre} REFUSÉ manuellement par ${username}. Fichier SI Retour généré (${siRetFileName}). Motif : ${motifFinal}`,
      nomFichier: virement.remise?.nomFichier || 'N/A',
      virementId: virement.id,
      details: { siRetFileName, motif: motifFinal, username }
    });

    // 4. Recalculer le statut global de la remise
    if (virement.remiseId) {
      await this.recalculateRemiseStatut(virement.remiseId);
    }

    return {
      success: true,
      message: 'Virement refusé. Fichier SI Retour généré.',
      virement
    };
  }

  /**
   * Recalcule et met à jour le statut global d'une remise selon ses virements
   * @param {number} remiseId 
   */
  async recalculateRemiseStatut(remiseId) {
    const remise = await Remise.findByPk(remiseId);
    if (!remise) return;

    const virements = await Virement.findAll({ where: { remiseId } });
    if (!virements || virements.length === 0) return;

    const hasPending = virements.some(v => v.statut === 'ATTENTE_VALIDATION_SOLDE' || v.statut === 'EN_ATTENTE');
    const hasValides = virements.some(v => v.statut === 'VALIDE_TRAITE');
    const hasRejetes = virements.some(v => v.statut === 'REJETE_SOLDE' || v.statut === 'REJETE_DOUBLON');
    const allIgnored = virements.every(v => v.statut === 'IGNORE_FILTRE');

    let newStatut = 'TRAITE_COMPLET';
    if (allIgnored) {
      newStatut = 'IGNORE';
    } else if (hasPending) {
      newStatut = 'ATTENTE_VALIDATION';
    } else if (hasValides && hasRejetes) {
      newStatut = 'TRAITE_PARTIEL';
    } else if (hasValides && !hasRejetes) {
      newStatut = 'TRAITE_COMPLET';
    } else if (!hasValides && hasRejetes) {
      newStatut = 'TRAITE_COMPLET';
    }

    await remise.update({ statut: newStatut });
  }
}

module.exports = new ProcessingService();
