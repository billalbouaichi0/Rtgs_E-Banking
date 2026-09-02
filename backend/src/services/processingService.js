const fs = require('fs');
const path = require('path');
const { FOLDERS } = require('../config/folders');
const oracleService = require('../config/oracle');
const EdiParser = require('../parsers/ediParser');
const Mt103Generator = require('../generators/mt103Generator');
const OdGenerator = require('../generators/odGenerator');
const SiRetourGenerator = require('../generators/siRetourGenerator');
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
      let countRejetes = 0;
      let countIgnores = 0;

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

        // Si le virement passe le filtre
        allIgnored = false;

        // 3. Vérification du solde via Oracle 11g SAB
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
          // Solde suffisant -> Générer Fichier OD et Fichier MT103
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
            message: `Virement ${virData.numeroOrdre} validé. MT103 généré (${mt103FileName}) et Fichier OD généré (${odFileName}). Solde SAB : ${soldeDinar.toLocaleString()} DZD`,
            nomFichier: fileName,
            virementId: virement.id,
            details: { mt103FileName, odFileName, soldeDinar }
          });

          countValides++;
        } else {
          // Solde insuffisant -> Générer SI Retour
          const siRetFileName = SiRetourGenerator.getFileName(virData.libelle, virement.id);
          const siRetContent = SiRetourGenerator.generate(virData);
          const siRetPath = path.join(FOLDERS.si_retour, siRetFileName);
          fs.writeFileSync(siRetPath, siRetContent, 'utf-8');

          const motif = oracleRes.found
            ? `Solde insuffisant (${soldeDinar.toLocaleString()} DZD < ${virData.montant.toLocaleString()} DZD)`
            : `Compte donneur d'ordre (${virData.compteDonneur15}) introuvable dans SAB (DZD)`;

          await virement.update({
            statut: 'REJETE_SOLDE',
            motifRejetOuIgnorer: motif,
            fichierSiRetGenere: siRetFileName
          });

          await TraitementLog.create({
            type: 'GENERATION_SI_RET',
            niveau: 'ERROR',
            message: `Virement ${virData.numeroOrdre} rejeté. Fichier ${siRetFileName} généré. Motif : ${motif}`,
            nomFichier: fileName,
            virementId: virement.id,
            details: { siRetFileName, motif, soldeDinar }
          });

          countRejetes++;
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
      } else if (countRejetes > 0 && countValides > 0) {
        globalStatut = 'TRAITE_PARTIEL';
      } else if (countRejetes > 0 && countValides === 0) {
        globalStatut = 'TRAITE_COMPLET'; // Tous traités mais rejetés
      }

      await remise.update({ statut: globalStatut });

      return {
        success: true,
        remiseId: remise.id,
        nomFichier: fileName,
        countValides,
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
}

module.exports = new ProcessingService();
