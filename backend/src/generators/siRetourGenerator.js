/**
 * Générateur de fichier SI_RETOUR en cas de solde insuffisant ou rejet
 * Nom : SI_RET_{libelle}.txt
 * Contenu : le virement {libele}  du montant {montant de la transaction} na pas ete comptabilise
 */

class SiRetourGenerator {
  /**
   * Génère le nom de fichier SI_RET
   * @param {string} libelle
   */
  static getFileName(libelle, virementId = '') {
    const cleanLibelle = (libelle || 'VIREMENT')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 40);
    return `SI_RET_${cleanLibelle}${virementId ? '_' + virementId : ''}.txt`;
  }

  /**
   * Génère le contenu du fichier SI Retour
   * @param {Object} virement
   */
  static generate(virement) {
    const libelle = virement.libelle || 'VIREMENT';
    const montant = Number(virement.montant || 0).toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `le virement ${libelle}  du montant ${montant} DZD na pas ete comptabilise`;
  }
}

module.exports = SiRetourGenerator;
