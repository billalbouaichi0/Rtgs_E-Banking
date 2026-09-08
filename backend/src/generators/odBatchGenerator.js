/**
 * Générateur de fichier Batch OD Global (ZCPTODA9_YYYYMMDD_HHMMSS.dat)
 * Regroupe tous les virements ayant un solde suffisant pour le lot d'intégration SAB.
 * 
 * Clé d'unicité intégrée :
 * CPTODLI2 / Référence : (comptedonneur||dateremise||numeroremise)
 */

class OdBatchGenerator {
  /**
   * Génère le nom normalisé du fichier Batch OD
   * Format : ZCPTODA9_YYYYMMDD_HHMMSS.dat
   * @param {Date} date 
   */
  static getBatchFileName(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `ZCPTODA9_${yyyy}${mm}${dd}_${hh}${min}${ss}.dat`;
  }

  /**
   * Génère la clé d'unicité d'un virement pour le SAB
   * Format : comptedonneur||dateremise||numeroremise
   * @param {Object} virement 
   * @param {Object} remise 
   */
  static getCleUnicite(virement, remise = null) {
    const compteDonneur = (virement.compteDonneur15 || virement.ribDonneur?.substring(5, 20) || '').trim();
    const dateRemise = (remise?.dateRemiseOrdre || virement.remise?.dateRemiseOrdre || virement.dateValeur || new Date().toISOString().slice(0, 10).replace(/-/g, '')).trim();
    const numeroRemise = (remise?.referenceRemise || virement.remise?.referenceRemise || virement.numeroOrdre || '001').trim();
    return `${compteDonneur}||${dateRemise}||${numeroRemise}`;
  }

  /**
   * Formate une ligne unitaire d'Ordre de Débit pour le fichier .dat
   * Structure SAB standard BDL :
   * Code Op: *A9 | Evt: RTG | Compte: 15 chars | Montant: Centimes 15/16 chars | Clé Unicité: Libellé 2
   */
  static generateLine(virement, remise = null) {
    const codeBanque = (virement.codeBanqueDonneur || '005').padStart(3, '0').substring(0, 3);
    const codeAgence = (virement.codeAgenceDonneur || '00000').padStart(5, '0').substring(0, 5);
    const compteDonneur = (virement.compteDonneur15 || '').padEnd(15, ' ').substring(0, 15);
    const ribDonneur = (virement.ribDonneur || '').padEnd(20, ' ').substring(0, 20);
    const ribBenef = (virement.ribBeneficiaire || '').padEnd(20, ' ').substring(0, 20);

    const montantCentimes = Math.round((Number(virement.montant) || 0) * 100);
    const montantStr = String(montantCentimes).padStart(16, '0').substring(0, 16);

    const cleUnicite = this.getCleUnicite(virement, remise);
    const libelle1 = (virement.libelle || 'VIREMENT RTGS BDL').padEnd(40, ' ').substring(0, 40);
    const libelle2 = cleUnicite.padEnd(40, ' ').substring(0, 40);

    // Enregistrement structuré au format d'échange SAB BDL
    return `*A9|RTG|${codeBanque}|${codeAgence}|${compteDonneur}|${ribDonneur}|${ribBenef}|${montantStr}|${libelle1}|${libelle2}`;
  }

  /**
   * Génère le contenu complet du fichier batch OD
   * @param {Array} virements Liste des virements avec solde suffisant
   * @param {Date} dateLot Date de génération du lot
   */
  static generateBatch(virements, dateLot = new Date()) {
    if (!Array.isArray(virements) || virements.length === 0) {
      return '';
    }

    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = dateLot.getFullYear();
    const mm = pad(dateLot.getMonth() + 1);
    const dd = pad(dateLot.getDate());
    const hh = pad(dateLot.getHours());
    const min = pad(dateLot.getMinutes());
    const ss = pad(dateLot.getSeconds());
    const headerTimestamp = `${yyyy}${mm}${dd}${hh}${min}${ss}`;

    const totalMontantCentimes = virements.reduce((sum, v) => sum + Math.round((Number(v.montant) || 0) * 100), 0);
    const totalCount = virements.length;

    // Entête de lot BDL
    const header = `BATCH_OD_HEADER|ZCPTODA9|${headerTimestamp}|COUNT=${String(totalCount).padStart(6, '0')}|TOTAL=${String(totalMontantCentimes).padStart(18, '0')}`;
    
    // Corps : toutes les opérations OD
    const lines = virements.map(v => this.generateLine(v, v.remise));
    
    // Fin de lot
    const footer = `BATCH_OD_FOOTER|${headerTimestamp}|CHECKSUM=OK`;

    return [header, ...lines, footer].join('\n');
  }
}

module.exports = OdBatchGenerator;
