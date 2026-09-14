package dz.bdl.rtgs.model;

import java.math.BigDecimal;

/**
 * Modèle d'une ligne de virement EDI (Enregistrement Corps)
 */
public class EdiTransaction {
    private String numeroOrdre;            // Pos 1-10 (10 car)
    private String indicateurRibIban = "1"; // Pos 11
    private String ribBeneficiaire;        // Pos 12-31 (20 car)
    private String prefixeIban = "DZ00";   // Pos 32-35 (4 car)
    private String nomBeneficiaire;        // Pos 36-85 (50 car)
    private String adresseBeneficiaire;    // Pos 86-155 (70 car)
    private BigDecimal montant;            // Pos 156-170 (15 car)
    private String libelle;                // Pos 171-240 (70 car)

    private String codeBanqueBeneficiaire; // 3 premiers chiffres du RIB bénéficiaire
    private String codeBanqueDonneur;      // Code banque du donneur d'ordre
    private String ribDonneurOriginal;     // RIB donneur d'ordre d'origine
    private boolean rtgsEligible;          // Indique si interbancaire & >= 1 000 000 DZD
    private String rawLine;

    public EdiTransaction() {}

    public String getNumeroOrdre() { return numeroOrdre; }
    public void setNumeroOrdre(String numeroOrdre) { this.numeroOrdre = numeroOrdre; }

    public String getIndicateurRibIban() { return indicateurRibIban; }
    public void setIndicateurRibIban(String indicateurRibIban) { this.indicateurRibIban = indicateurRibIban; }

    public String getRibBeneficiaire() { return ribBeneficiaire; }
    public void setRibBeneficiaire(String ribBeneficiaire) { this.ribBeneficiaire = ribBeneficiaire; }

    public String getPrefixeIban() { return prefixeIban; }
    public void setPrefixeIban(String prefixeIban) { this.prefixeIban = prefixeIban; }

    public String getNomBeneficiaire() { return nomBeneficiaire; }
    public void setNomBeneficiaire(String nomBeneficiaire) { this.nomBeneficiaire = nomBeneficiaire; }

    public String getAdresseBeneficiaire() { return adresseBeneficiaire; }
    public void setAdresseBeneficiaire(String adresseBeneficiaire) { this.adresseBeneficiaire = adresseBeneficiaire; }

    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal montant) { this.montant = montant; }

    public String getLibelle() { return libelle; }
    public void setLibelle(String libelle) { this.libelle = libelle; }

    public String getCodeBanqueBeneficiaire() { return codeBanqueBeneficiaire; }
    public void setCodeBanqueBeneficiaire(String codeBanqueBeneficiaire) { this.codeBanqueBeneficiaire = codeBanqueBeneficiaire; }

    public String getCodeBanqueDonneur() { return codeBanqueDonneur; }
    public void setCodeBanqueDonneur(String codeBanqueDonneur) { this.codeBanqueDonneur = codeBanqueDonneur; }

    public String getRibDonneurOriginal() { return ribDonneurOriginal; }
    public void setRibDonneurOriginal(String ribDonneurOriginal) { this.ribDonneurOriginal = ribDonneurOriginal; }

    public boolean isRtgsEligible() { return rtgsEligible; }
    public void setRtgsEligible(boolean rtgsEligible) { this.rtgsEligible = rtgsEligible; }

    public String getRawLine() { return rawLine; }
    public void setRawLine(String rawLine) { this.rawLine = rawLine; }
}
