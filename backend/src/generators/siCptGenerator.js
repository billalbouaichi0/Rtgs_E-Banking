/**
 * Générateur de fichier SI Retour Comptabilisé (Acceptation & Intégration SAB)
 * 
 * Règle de nommage demandée :
 * SI_VIR_CPT_yyyymmdd_yyyymmddHHmm_montant(sur16POS)_ribdonneurordre.txt
 * 
 * Exemple :
 * SI_VIR_CPT_20260908_202609081200_0000024373580000_00500133400218153023.txt
 */

class SiCptGenerator {
  /**
   * Génère le nom de fichier normalisé BDL pour la confirmation de comptabilisation
   * @param {Object} virement 
   * @param {Date} dateExecution 
   */
  static getFileName(virement, dateExecution = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = dateExecution.getFullYear();
    const mm = pad(dateExecution.getMonth() + 1);
    const dd = pad(dateExecution.getDate());
    const hh = pad(dateExecution.getHours());
    const min = pad(dateExecution.getMinutes());

    const dateDay = `${yyyy}${mm}${dd}`;
    const dateTimestamp = `${yyyy}${mm}${dd}${hh}${min}`;

    // Montant sur 16 positions (en centimes cadré à gauche avec des 0)
    const montantCentimes = Math.round((Number(virement.montant) || 0) * 100);
    const montant16 = String(montantCentimes).padStart(16, '0').substring(0, 16);

    // RIB donneur d'ordre sur 20 positions
    const ribDonneur = (virement.ribDonneur || '00500000000000000000').padEnd(20, '0').substring(0, 20);

    return `SI_VIR_CPT_${dateDay}_${dateTimestamp}_${montant16}_${ribDonneur}.txt`;
  }

  /**
   * Génère le contenu du fichier SI Retour Comptabilisé
   * @param {Object} virement 
   * @param {Object} detailsCompta 
   */
  static generate(virement, detailsCompta = {}) {
    const nomFichierEdi = virement.remise?.nomFichier || virement.nomFichier || 'VIRMNE_EDI.txt';
    const referenceRemise = virement.remise?.referenceRemise || virement.numeroOrdre || '001';
    const numOrdre = virement.numeroOrdre || '0000000001';
    const ribDonneur = virement.ribDonneur || 'N/A';
    const ribBenef = virement.ribBeneficiaire || 'N/A';
    const montantDZD = Number(virement.montant || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 });
    const dateCompta = detailsCompta.dateComptabilisation || new Date().toISOString();
    const cptoddco = detailsCompta.cptoddco || 'OK';

    return `================================================================================
BANQUE DE DEVELOPPEMENT LOCAL - SYSTEME RTGS E-BANKING
ACCUSE DE COMPTABILISATION ET EXECUTION DU VIREMENT (SI_VIR_CPT)
================================================================================
FICHIER SOURCE REMISE : ${nomFichierEdi}
REFERENCE REMISE      : ${referenceRemise}
NUMERO ORDRE VIREMENT : ${numOrdre}
CLE UNICITE SAB       : ${virement.cleUniciteSab || `${virement.compteDonneur15}||${referenceRemise}`}

ETAT OPERATION SAB    : COMPTABILISE (CPTODETA: 003, CPTODDCO: ${cptoddco})
CODE EVENEMENT / OPER : RTG / *A9
DATE COMPTABILISATION : ${dateCompta}

DONNEUR D'ORDRE       : ${virement.nomDonneur || 'N/A'} (RIB: ${ribDonneur})
BENEFICIAIRE          : ${virement.nomBeneficiaire || 'N/A'} (RIB: ${ribBenef})
MONTANT DU VIREMENT   : ${montantDZD} DZD
LIBELLE OPERATION     : ${virement.libelle || 'VIREMENT RTGS'}

MESSAGE SWIFT ASSOCIE : MT103 (Fichier généré et transmis au réseau RTGS)
FICHIER BATCH OD LIE  : ${virement.fichierOdBatch || 'ZCPTODA9.dat'}
STATUT GLOBAL FINAL   : ENVOYE (EXECUTE AVEC SUCCES)
================================================================================`;
  }
}

module.exports = SiCptGenerator;
