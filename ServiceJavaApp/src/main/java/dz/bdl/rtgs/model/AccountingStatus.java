package dz.bdl.rtgs.model;

/**
 * Statuts d'avancement comptable et RTGS d'une remise ou d'un virement
 */
public enum AccountingStatus {
    RECU_NON_TRAITE,
    SUBSTITUE_ENVOYE_COMPTA,
    EN_ATTENTE_COMPTABILISATION,
    COMPTABILISE,
    REJETE_COMPTA,
    RECONSTITUE_PRET_RTGS,
    IGNORE_NON_RTGS
}
