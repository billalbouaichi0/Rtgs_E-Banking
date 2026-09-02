/**
 * Parseur EDI conforme aux spécifications exactes de positionnement fixe BDL / RTGS
 */

// Helper pour extraire une sous-chaîne selon positions 1-indexées inclusives
const substr1 = (str, start, end) => {
  if (!str) return '';
  return str.substring(start - 1, end);
};

// Parser un montant numérique (15 ou 16 chiffres avec 2 décimales implicites en centimes ou valeur directe)
const parseAmount = (rawStr) => {
  if (!rawStr) return 0;
  const cleaned = rawStr.trim();
  const num = Number(cleaned);
  if (isNaN(num)) return 0;
  // Si le format contient 2 décimales implicites (standard interbancaire algérien centimes)
  // Par exemple 000000243735800 -> 2437358.00 DZD
  // ou 000000000500000 -> 5000.00 DZD (500000 centimes)
  return num / 100;
};

class EdiParser {
  /**
   * Parse un contenu de fichier EDI brut ligne par ligne
   * @param {string} fileContent Contenu texte du fichier EDI
   * @param {string} fileName Nom du fichier
   */
  static parse(fileContent, fileName = 'virement.edi') {
    if (!fileContent || typeof fileContent !== 'string') {
      throw new Error('Le contenu du fichier EDI est vide ou invalide');
    }

    const lines = fileContent
      .split(/\r?\n/)
      .map((l) => l.trimEnd())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new Error('Le fichier EDI doit contenir au moins une entête et une ligne de corps ou de fin.');
    }

    const headerLine = lines[0];
    const enteteTag = substr1(headerLine, 1, 4);

    if (enteteTag !== 'VIRM') {
      throw new Error(`Entête de remise invalide : attendu 'VIRM', reçu '${enteteTag}'`);
    }

    // Extraction de l'Entête (EE)
    const codeBanqueDonneur = substr1(headerLine, 5, 7).trim();
    const natureOperation = substr1(headerLine, 8, 10).trim();
    const natureFonds = substr1(headerLine, 11, 11).trim();
    const indicateurRibIban = substr1(headerLine, 12, 12).trim();
    const ribDonneurOrdre = substr1(headerLine, 13, 32).trim();
    const prefixeIban = substr1(headerLine, 33, 36).trim();
    const nomDonneurOrdre = substr1(headerLine, 37, 86).trim();
    const adresseDonneurOrdre = substr1(headerLine, 87, 156).trim();
    const dateRemiseOrdre = substr1(headerLine, 157, 164).trim();
    const referenceRemise = substr1(headerLine, 165, 167).trim();
    const nombreOperations = parseInt(substr1(headerLine, 168, 173).trim(), 10) || 0;
    const montantTotalRaw = substr1(headerLine, 174, 189).trim();
    const montantTotal = parseAmount(montantTotalRaw);

    // Extraction du code agence et du compte 15 positions du donneur d'ordre
    // RIB = Code Banque (3) + Code Agence (5) + N° Compte (10) + Clé (2) = 20 pos
    // Compte SAB 15 positions = Code Agence (5) + N° Compte (10)
    let codeAgenceDonneur = '';
    let compteDonneur15 = '';
    if (ribDonneurOrdre.length === 20) {
      codeAgenceDonneur = ribDonneurOrdre.substring(3, 8);
      compteDonneur15 = ribDonneurOrdre.substring(3, 18); // Agence (5) + Compte (10) = 15 positions
    } else {
      codeAgenceDonneur = '00000';
      compteDonneur15 = ribDonneurOrdre.padEnd(15, '0').substring(0, 15);
    }

    const entete = {
      nomFichier: fileName,
      codeBanqueDonneur,
      natureOperation,
      natureFonds,
      indicateurRibIban,
      ribDonneurOrdre,
      codeAgenceDonneur,
      compteDonneur15,
      prefixeIban,
      nomDonneurOrdre,
      adresseDonneurOrdre,
      dateRemiseOrdre,
      referenceRemise,
      nombreOperations,
      montantTotal,
      rawHeader: headerLine
    };

    const virements = [];
    let finRemise = null;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const tag = substr1(line, 1, 4);

      if (tag === 'FVIR') {
        finRemise = {
          tag: 'FVIR',
          filler: substr1(line, 5, 100).trim(),
          rawLine: line
        };
        break;
      }

      // Enregistrement Corps (EC)
      const numeroOrdre = substr1(line, 1, 10).trim();
      const indicateurRibIbanCorps = substr1(line, 11, 11).trim();
      const ribBeneficiaire = substr1(line, 12, 31).trim();
      const prefixeIbanCorps = substr1(line, 32, 35).trim();
      const nomBeneficiaire = substr1(line, 36, 85).trim();
      const adresseBeneficiaire = substr1(line, 86, 155).trim();
      const montantRaw = substr1(line, 156, 170).trim();
      const montant = parseAmount(montantRaw);
      const libelle = substr1(line, 171, 240).trim();

      let codeBanqueBeneficiaire = '';
      let codeAgenceBeneficiaire = '';
      if (ribBeneficiaire.length >= 8) {
        codeBanqueBeneficiaire = ribBeneficiaire.substring(0, 3);
        codeAgenceBeneficiaire = ribBeneficiaire.substring(3, 8);
      }

      virements.push({
        numeroOrdre,
        indicateurRibIban: indicateurRibIbanCorps,
        ribBeneficiaire,
        codeBanqueBeneficiaire,
        codeAgenceBeneficiaire,
        prefixeIban: prefixeIbanCorps,
        nomBeneficiaire,
        adresseBeneficiaire,
        montant,
        montantRaw,
        libelle,
        dateValeur: dateRemiseOrdre,
        // Données du donneur d'ordre héritées de l'entête
        ribDonneur: ribDonneurOrdre,
        codeBanqueDonneur,
        codeAgenceDonneur,
        compteDonneur15,
        nomDonneur: nomDonneurOrdre,
        adresseDonneur: adresseDonneurOrdre,
        rawLine: line
      });
    }

    return {
      entete,
      virements,
      finRemise
    };
  }
}

module.exports = EdiParser;
