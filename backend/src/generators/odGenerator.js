/**
 * Générateur de fichier OD (Opérations Diverses comptables)
 * Structure :
 * - Code établissement : 3 positions (code banque donneur ordre)
 * - Code agence : 5 positions (code agence donneur ordre)
 * - Montant : 20 positions (montant en centimes cadré à droite avec zéros)
 * - Filler : 70 positions (espaces)
 */

class OdGenerator {
  /**
   * Génère une ligne ou un fichier OD complet
   * @param {Object} virement Données du virement
   */
  static generateLine(virement) {
    const codeBanque = (virement.codeBanqueDonneur || '005').padStart(3, '0').substring(0, 3);
    const codeAgence = (virement.codeAgenceDonneur || '00000').padStart(5, '0').substring(0, 5);
    
    // Montant sur 20 positions en centimes (ex: 2437358.00 DZD -> 243735800 cadré à gauche avec des zéros)
    const montantCentimes = Math.round((Number(virement.montant) || 0) * 100);
    const montant20 = String(montantCentimes).padStart(20, '0').substring(0, 20);
    
    const filler70 = ''.padEnd(70, ' ');

    return `${codeBanque}${codeAgence}${montant20}${filler70}`;
  }

  static generate(virement) {
    return this.generateLine(virement);
  }
}

module.exports = OdGenerator;
