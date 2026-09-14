package dz.bdl.rtgs.model;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Registre de traçabilité pour conserver les correspondances entre
 * le RIB d'origine du client et le RIB du compte interne BDL substitué,
 * permettant la reconstitution exacte post-comptabilisation.
 */
public class TransactionRecord {
    private String id;                        // Identifiant unique
    private String originalFileName;         // Nom du fichier EDI reçu
    private String substitutedFileName;      // Nom du fichier envoyé au Core Banking (SAB)
    private String reconstitutedFileName;    // Nom du fichier reconstitué pour le RTGS
    private String numeroOrdre;              // N° d'ordre du virement (10 car)
    
    // Données Donneur d'Ordre d'origine
    private String originalRibDonneur;
    private String originalNomDonneur;
    private String originalAdresseDonneur;
    private String codeBanqueDonneur;

    // Données Bénéficiaire d'origine
    private String originalRibBeneficiaire;
    private String originalNomBeneficiaire;
    private String originalAdresseBeneficiaire;
    private String codeBanqueBeneficiaire;

    // Données Compte Interne substitué
    private String substitutedRibInterne;
    private String substitutedNomInterne;

    // Détails financier et libellé
    private BigDecimal montant;
    private String libelle;
    private String dateValeur;

    // Statut et horodatage
    private AccountingStatus status;
    private boolean rtgsEligible;
    private LocalDateTime createdAt;
    private LocalDateTime substitutedAt;
    private LocalDateTime accountedAt;
    private LocalDateTime reconstitutedAt;
    private String comptaReference;

    public TransactionRecord() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOriginalFileName() { return originalFileName; }
    public void setOriginalFileName(String originalFileName) { this.originalFileName = originalFileName; }

    public String getSubstitutedFileName() { return substitutedFileName; }
    public void setSubstitutedFileName(String substitutedFileName) { this.substitutedFileName = substitutedFileName; }

    public String getReconstitutedFileName() { return reconstitutedFileName; }
    public void setReconstitutedFileName(String reconstitutedFileName) { this.reconstitutedFileName = reconstitutedFileName; }

    public String getNumeroOrdre() { return numeroOrdre; }
    public void setNumeroOrdre(String numeroOrdre) { this.numeroOrdre = numeroOrdre; }

    public String getOriginalRibDonneur() { return originalRibDonneur; }
    public void setOriginalRibDonneur(String originalRibDonneur) { this.originalRibDonneur = originalRibDonneur; }

    public String getOriginalNomDonneur() { return originalNomDonneur; }
    public void setOriginalNomDonneur(String originalNomDonneur) { this.originalNomDonneur = originalNomDonneur; }

    public String getOriginalAdresseDonneur() { return originalAdresseDonneur; }
    public void setOriginalAdresseDonneur(String originalAdresseDonneur) { this.originalAdresseDonneur = originalAdresseDonneur; }

    public String getCodeBanqueDonneur() { return codeBanqueDonneur; }
    public void setCodeBanqueDonneur(String codeBanqueDonneur) { this.codeBanqueDonneur = codeBanqueDonneur; }

    public String getOriginalRibBeneficiaire() { return originalRibBeneficiaire; }
    public void setOriginalRibBeneficiaire(String originalRibBeneficiaire) { this.originalRibBeneficiaire = originalRibBeneficiaire; }

    public String getOriginalNomBeneficiaire() { return originalNomBeneficiaire; }
    public void setOriginalNomBeneficiaire(String originalNomBeneficiaire) { this.originalNomBeneficiaire = originalNomBeneficiaire; }

    public String getOriginalAdresseBeneficiaire() { return originalAdresseBeneficiaire; }
    public void setOriginalAdresseBeneficiaire(String originalAdresseBeneficiaire) { this.originalAdresseBeneficiaire = originalAdresseBeneficiaire; }

    public String getCodeBanqueBeneficiaire() { return codeBanqueBeneficiaire; }
    public void setCodeBanqueBeneficiaire(String codeBanqueBeneficiaire) { this.codeBanqueBeneficiaire = codeBanqueBeneficiaire; }

    public String getSubstitutedRibInterne() { return substitutedRibInterne; }
    public void setSubstitutedRibInterne(String substitutedRibInterne) { this.substitutedRibInterne = substitutedRibInterne; }

    public String getSubstitutedNomInterne() { return substitutedNomInterne; }
    public void setSubstitutedNomInterne(String substitutedNomInterne) { this.substitutedNomInterne = substitutedNomInterne; }

    public BigDecimal getMontant() { return montant; }
    public void setMontant(BigDecimal montant) { this.montant = montant; }

    public String getLibelle() { return libelle; }
    public void setLibelle(String libelle) { this.libelle = libelle; }

    public String getDateValeur() { return dateValeur; }
    public void setDateValeur(String dateValeur) { this.dateValeur = dateValeur; }

    public AccountingStatus getStatus() { return status; }
    public void setStatus(AccountingStatus status) { this.status = status; }

    public boolean isRtgsEligible() { return rtgsEligible; }
    public void setRtgsEligible(boolean rtgsEligible) { this.rtgsEligible = rtgsEligible; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getSubstitutedAt() { return substitutedAt; }
    public void setSubstitutedAt(LocalDateTime substitutedAt) { this.substitutedAt = substitutedAt; }

    public LocalDateTime getAccountedAt() { return accountedAt; }
    public void setAccountedAt(LocalDateTime accountedAt) { this.accountedAt = accountedAt; }

    public LocalDateTime getReconstitutedAt() { return reconstitutedAt; }
    public void setReconstitutedAt(LocalDateTime reconstitutedAt) { this.reconstitutedAt = reconstitutedAt; }

    public String getComptaReference() { return comptaReference; }
    public void setComptaReference(String comptaReference) { this.comptaReference = comptaReference; }
}
