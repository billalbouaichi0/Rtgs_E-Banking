const fs = require('fs');
const path = require('path');
const { FOLDERS } = require('../config/folders');
const oracleService = require('../config/oracle');
const EdiParser = require('../parsers/ediParser');
const Mt103Generator = require('../generators/mt103Generator');
const OdGenerator = require('../generators/odGenerator');
const OdBatchGenerator = require('../generators/odBatchGenerator');
const SiRetourGenerator = require('../generators/siRetourGenerator');
const folderStorageService = require('./folderStorageService');
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
      // 0. Vérification si le fichier a déjà été reçu et enregistré
      const existingRemise = await Remise.findOne({
        where: { nomFichier: fileName }
      });

      if (existingRemise) {
        console.log(`[ProcessingService] Fichier ${fileName} déjà reçu et enregistré (Remise ID #${existingRemise.id}). Non retraité.`);
        return {
          success: true,
          alreadyProcessed: true,
          remiseId: existingRemise.id,
          nomFichier: fileName,
          message: `Fichier ${fileName} déjà reçu et intégré précédemment.`
        };
      }

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
          // Rejeter le virement pour doublon et générer le fichier SI_RETOUR normé BDL
          const siRetFileName = SiRetourGenerator.getFileName(virement);
          const siRetContent = SiRetourGenerator.generate({
            ...virData,
            nomFichier: fileName,
            referenceRemise: remise.referenceRemise,
            motif: 'Remise en double detectee'
          });
          await folderStorageService.writeOutputFile('si_retour', siRetFileName, siRetContent);

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

        // 4. Attribution du statut initial : RECU (En attente du créneau de génération OD)
        const cleUnicite = OdBatchGenerator.getCleUnicite(virData, remise);

        await virement.update({
          statut: 'RECU',
          cleUniciteSab: cleUnicite
        });

        await TraitementLog.create({
          type: 'INGESTION_RECU',
          niveau: 'INFO',
          message: `Virement N° ${virData.numeroOrdre} vérifié et accepté. Statut : RECU (en attente du créneau de génération du lot OD). Clé SAB : ${cleUnicite}`,
          nomFichier: fileName,
          virementId: virement.id,
          details: { cleUnicite, montant: virData.montant, compteDonneur: virData.compteDonneur15 }
        });

        countValides++;
      }

      // Mise à jour du statut global de la remise
      let globalStatut = 'RECU';
      if (allIgnored) {
        globalStatut = 'IGNORE';
        const destIgnorerPath = path.join(FOLDERS.ignorer, fileName);
        try {
          if (fs.existsSync(filePath)) {
            fs.copyFileSync(filePath, destIgnorerPath);
          }
        } catch (e) {
          console.error('[ProcessingService] Erreur copie vers ignorer', e);
        }
      } else if (countRejetes > 0 && countValides > 0) {
        globalStatut = 'PARTIEL';
      } else if (countValides > 0) {
        globalStatut = 'EN_ATTENTE_OD';
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
    await folderStorageService.writeOutputFile('generated_mt103', mt103FileName, mt103Content);

    // 3. Génération du Fichier OD
    const odContent = OdGenerator.generate(virement);
    const odFileName = `OD_${virement.id}_${virement.numeroOrdre}.txt`;
    await folderStorageService.writeOutputFile('generated_od', odFileName, odContent);

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

    // 1. Génération du Fichier SI Retour normé BDL
    const siRetFileName = SiRetourGenerator.getFileName(virement);
    const siRetContent = SiRetourGenerator.generate({
      ...virement.toJSON(),
      nomFichier: virement.remise?.nomFichier || 'VIRMNE_31800215_2605260011.txt',
      referenceRemise: virement.remise?.referenceRemise || virement.numeroOrdre,
      motif: 'Solde insuffisant dans SAB (DZD)'
    });
    await folderStorageService.writeOutputFile('si_retour', siRetFileName, siRetContent);

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

    const hasRecu = virements.some(v => v.statut === 'RECU' || v.statut === 'EN_ATTENTE');
    const hasInSab = virements.some(v => v.statut === 'OD_GEN' || v.statut === 'INTEGRE');
    const hasEnvoyes = virements.some(v => v.statut === 'ENVOYE' || v.statut === 'VALIDE_TRAITE');
    const hasRejetes = virements.some(v => v.statut === 'REJETE' || v.statut === 'REJETE_SOLDE' || v.statut === 'REJETE_DOUBLON');
    const allIgnored = virements.every(v => v.statut === 'IGNORE_FILTRE');

    let newStatut = 'TRAITE_COMPLET';
    if (allIgnored) {
      newStatut = 'IGNORE';
    } else if (hasRecu) {
      newStatut = 'EN_ATTENTE_OD';
    } else if (hasInSab) {
      newStatut = 'EN_COURS_SAB';
    } else if (hasEnvoyes && hasRejetes) {
      newStatut = 'TRAITE_PARTIEL';
    } else if (hasEnvoyes && !hasRejetes) {
      newStatut = 'TRAITE_COMPLET';
    } else if (!hasEnvoyes && hasRejetes) {
      newStatut = 'REJETE_TOTAL';
    }

    await remise.update({ statut: newStatut });
  }
}

module.exports = new ProcessingService();
