/**
 * Générateur de fichier SI_RETOUR (Rejet de Virement / Doublon / Solde Insuffisant)
 * 
 * Norme BDL :
 * - Nom du fichier : SI_VIR_RJT_VIRMNE_YYYYMMDD_HHMMSS.txt (ou SI_VIR_RJT_VIRMNE_YYYYMMNN_HHMMSS.txt)
 * - Contenu : Le virement dont le nom du fichier {nomFichierEDI}_{referenceRemise} est rejete pour motif: {motif (cadré à 70 car)}_{referenceRemise_libelle}.
 * 
 * Exemple officiel BDL :
 * Le virement dont le nom du fichier VIRMNE_31800215_2605260011.txt_1260526 est rejete pour motif: Remise en double detectee                                             _01041.
 */

class SiRetourGenerator {
  /**
   * Génère le nom du fichier SI_RETOUR normé
   * @param {Object|string} virement Données du virement ou nom de fichier
   * @param {Object} options Options supplémentaires (date, etc.)
   * @returns {string} ex: SI_VIR_RJT_VIRMNE_20260902_185430.txt
   */
  static getFileName(virement = null, options = {}) {
    const now = options.date instanceof Date ? options.date : new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    // Format BDL officiel : SI_VIR_RJT_VIRMNE_YYYYMMDD_HHMMSS.txt
    return `SI_VIR_RJT_VIRMNE_${yyyy}${mm}${dd}_${hh}${min}${ss}.txt`;
  }

  /**
   * Génère le contenu textuel du fichier SI Retour selon la norme BDL
   * @param {Object} virement Données du virement rejeté
   * @param {Object} options Paramètres contextuels (nomFichier, referenceRemise, motif)
   * @returns {string}
   */
  static generate(virement, options = {}) {
    if (!virement) virement = {};

    // 1. Nom du fichier EDI source
    const nomFichierEDI = 
      virement.nomFichier || 
      virement.remise?.nomFichier || 
      virement.remiseNomFichier || 
      options.nomFichier || 
      'VIRMNE_31800215_2605260011.txt';

    // 2. Référence de la remise (entête VIRM ou virement)
    const referenceRemise = 
      virement.referenceRemise || 
      virement.remise?.referenceRemise || 
      options.referenceRemise || 
      virement.numeroOrdre || 
      '1260526';

    // 3. Libellé du virement / référence
    const libelle = virement.libelle || options.libelle || '01041';

    // 4. Motif de rejet normalisé
    let motif = virement.motifRejetOuIgnorer || virement.motif || options.motif || 'Remise en double detectee';
    if (motif.toLowerCase().includes('doublon')) {
      motif = 'Remise en double detectee';
    } else if (motif.toLowerCase().includes('solde')) {
      motif = 'Solde insuffisant dans SAB (DZD)';
    }

    // 5. Cadrage du motif à 70 caractères (padding avec espaces)
    const motifPadded = motif.padEnd(70, ' ');

    // 6. Formatage suffixe _referenceRemise_libelle (ex: _01041. ou _1260526_01041.)
    const cleanLibelle = libelle.replace(/^\.+|\.+$/g, '').trim();
    const suffixeLibelle = cleanLibelle.startsWith('_') ? cleanLibelle : `_${cleanLibelle}`;

    return `Le virement dont le nom du fichier ${nomFichierEDI}_${referenceRemise} est rejete pour motif: ${motifPadded}${suffixeLibelle}.`;
  }
}

module.exports = SiRetourGenerator;
