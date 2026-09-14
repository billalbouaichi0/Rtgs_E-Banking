package dz.bdl.rtgs.model;

import java.math.BigDecimal;

/**
 * Modèle de l'entête d'une remise EDI (Enregistrement Entête - VIRM)
 */
public class EdiHeader {
    private String tag = "VIRM";               // Pos 1-4 : VIRM
    private String codeBanqueDonneur;          // Pos 5-7 : Code banque (005)
    private String natureOperation = "010";     // Pos 8-10 : Nature opération
    private String natureFonds = "0";          // Pos 11 : Nature des fonds
    private String indicateurRibIban = "1";    // Pos 12 : 1=RIB, 2=IBAN
    private String ribDonneurOrdre;            // Pos 13-32 : RIB donneur d'ordre d'origine (20 car)
    private String prefixeIban = "DZ00";       // Pos 33-36 : Préfixe IBAN
    private String nomDonneurOrdre;            // Pos 37-86 : Nom / Raison sociale (50 car)
    private String adresseDonneurOrdre;        // Pos 87-156 : Adresse (70 car)
    private String dateRemiseOrdre;            // Pos 157-164 : Date YYYYMMDD
    private String referenceRemise;            // Pos 165-167 : Référence remise (3 car)
    private int nombreOperations;              // Pos 168-173 : Nb virements (6 car)
    private BigDecimal montantTotal;           // Pos 174-189 : Montant total (16 car avec 2 décimales)
    private String rawHeaderLine;

    public EdiHeader() {}

    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }

    public String getCodeBanqueDonneur() { return codeBanqueDonneur; }
    public void setCodeBanqueDonneur(String codeBanqueDonneur) { this.codeBanqueDonneur = codeBanqueDonneur; }

    public String getNatureOperation() { return natureOperation; }
    public void setNatureOperation(String natureOperation) { this.natureOperation = natureOperation; }

    public String getNatureFonds() { return natureFonds; }
    public void setNatureFonds(String natureFonds) { this.natureFonds = natureFonds; }

    public String getIndicateurRibIban() { return indicateurRibIban; }
    public void setIndicateurRibIban(String indicateurRibIban) { this.indicateurRibIban = indicateurRibIban; }

    public String getRibDonneurOrdre() { return ribDonneurOrdre; }
    public void setRibDonneurOrdre(String ribDonneurOrdre) { this.ribDonneurOrdre = ribDonneurOrdre; }

    public String getPrefixeIban() { return prefixeIban; }
    public void setPrefixeIban(String prefixeIban) { this.prefixeIban = prefixeIban; }

    public String getNomDonneurOrdre() { return nomDonneurOrdre; }
    public void setNomDonneurOrdre(String nomDonneurOrdre) { this.nomDonneurOrdre = nomDonneurOrdre; }

    public String getAdresseDonneurOrdre() { return adresseDonneurOrdre; }
    public void setAdresseDonneurOrdre(String adresseDonneurOrdre) { this.adresseDonneurOrdre = adresseDonneurOrdre; }

    public String getDateRemiseOrdre() { return dateRemiseOrdre; }
    public void setDateRemiseOrdre(String dateRemiseOrdre) { this.dateRemiseOrdre = dateRemiseOrdre; }

    public String getReferenceRemise() { return referenceRemise; }
    public void setReferenceRemise(String referenceRemise) { this.referenceRemise = referenceRemise; }

    public int getNombreOperations() { return nombreOperations; }
    public void setNombreOperations(int nombreOperations) { this.nombreOperations = nombreOperations; }

    public BigDecimal getMontantTotal() { return montantTotal; }
    public void setMontantTotal(BigDecimal montantTotal) { this.montantTotal = montantTotal; }

    public String getRawHeaderLine() { return rawHeaderLine; }
    public void setRawHeaderLine(String rawHeaderLine) { this.rawHeaderLine = rawHeaderLine; }
}
