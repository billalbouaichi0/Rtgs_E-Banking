/**
 * Générateur de message SWIFT MT103 standard RTGS Banque d'Algérie
 */

// Découpe une chaîne d'adresse en 3 lignes de 35 caractères max
const splitAddressTo3Lines = (address, defaultName = '') => {
  const clean = (address || defaultName || 'ALGER ALGERIE').trim();
  const maxLineLen = 35;
  const lines = [];

  let remaining = clean;
  while (remaining.length > 0 && lines.length < 3) {
    if (remaining.length <= maxLineLen) {
      lines.push(remaining);
      remaining = '';
    } else {
      // Couper au dernier espace avant 35 car si possible
      let cutIndex = remaining.lastIndexOf(' ', maxLineLen);
      if (cutIndex <= 0) cutIndex = maxLineLen;
      lines.push(remaining.substring(0, cutIndex).trim());
      remaining = remaining.substring(cutIndex).trim();
    }
  }

  // Garantir au moins 1 ligne et max 3 lignes
  while (lines.length < 3) {
    if (lines.length === 1) lines.push('ALGER');
    else if (lines.length === 2) lines.push('ALGERIE');
    else lines.push('');
  }

  return lines.slice(0, 3);
};

// Formater la date au format SWIFT YYMMDD
const formatSwiftDate = (dateStr) => {
  // attendu AAAAMMJJ (ex: 20260902 -> 260902)
  if (dateStr && dateStr.length === 8) {
    return dateStr.substring(2); // 260902
  }
  const now = new Date();
  const yy = String(now.getFullYear()).substring(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
};

// Formater le montant SWIFT avec virgule décimale (ex: 2437358,00 ou 2437358,)
const formatSwiftAmount = (montant) => {
  const num = Number(montant) || 0;
  // Format standard SWIFT avec virgule comme séparateur décimal
  const parts = num.toFixed(2).split('.');
  if (parts[1] === '00') {
    return `${parts[0]},`; // ou parts[0] + ',00'
  }
  return `${parts[0]},${parts[1]}`;
};

class Mt103Generator {
  /**
   * Génère le texte MT103 complet pour une opération de virement
   * @param {Object} virement Données du virement
   * @param {Object} banqueBenifRef Référentiel BIC et compte compensation de la banque bénéficiaire
   */
  static generate(virement, banqueBenifRef = null) {
    const libelle20 = (virement.libelle || 'VIREMENT RTGS').substring(0, 35).trim();
    const swiftDate = formatSwiftDate(virement.dateValeur);
    const swiftAmount = formatSwiftAmount(virement.montant);

    const addrDonneurLines = splitAddressTo3Lines(
      virement.adresseDonneur,
      virement.nomDonneur || 'DONNEUR D ORDRE'
    );
    const addrBenifLines = splitAddressTo3Lines(
      virement.adresseBeneficiaire,
      virement.nomBeneficiaire || 'BENEFICIAIRE'
    );

    // Référentiel banque bénéficiaire (BIC & Compte compensation)
    const bicBenif = banqueBenifRef ? banqueBenifRef.bicSwift : `BK${virement.codeBanqueBeneficiaire || '000'}DZALXXX`;
    const compteReglementBenif = banqueBenifRef
      ? banqueBenifRef.compteReglement
      : `9711${(virement.codeBanqueBeneficiaire || '000').padStart(6, '0')}`;

    const mt103Content = `{1:F01BDLODZALAXXXSN....ISN.}{2:I103BALGDZALXXXXN}{3:{103:DLP}}{4:
:20:${libelle20}
:23B:CRED
:23E:SDVA
:32A:${swiftDate}DZD${swiftAmount}
:50K:/${virement.ribDonneur || ''}
${addrDonneurLines[0]}
${addrDonneurLines[1]}
${addrDonneurLines[2]}
:53A:/9711000005
BDLODZALXXX
:57A:/${compteReglementBenif}
${bicBenif}
:59:/${virement.ribBeneficiaire || ''}
${addrBenifLines[0]}
${addrBenifLines[1]}
${addrBenifLines[2]}
:70:${libelle20}
:71A:SHA
:72:/CODTYPTR/001
-}`;

    return mt103Content;
  }
}

module.exports = Mt103Generator;
