package dz.bdl.rtgs.generator;

import dz.bdl.rtgs.model.EdiFile;
import dz.bdl.rtgs.model.EdiHeader;
import dz.bdl.rtgs.model.EdiTransaction;
import org.springframework.stereotype.Component;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

/**
 * Générateur de fichiers EDI au format positionnel fixe strict BDL
 */
@Component
public class EdiWriter {

    public static String rpad(String value, int length) {
        if (value == null) value = "";
        if (value.length() >= length) return value.substring(0, length);
        StringBuilder sb = new StringBuilder(value);
        while (sb.length() < length) {
            sb.append(' ');
        }
        return sb.toString();
    }

    public static String lpad(String value, int length, char padChar) {
        if (value == null) value = "";
        if (value.length() >= length) return value.substring(value.length() - length);
        StringBuilder sb = new StringBuilder();
        while (sb.length() + value.length() < length) {
            sb.append(padChar);
        }
        sb.append(value);
        return sb.toString();
    }

    public static String formatAmountCentimes(BigDecimal amount, int length) {
        if (amount == null) amount = BigDecimal.ZERO;
        long centimes = amount.multiply(new BigDecimal("100")).longValue();
        return lpad(String.valueOf(centimes), length, '0');
    }

    /**
     * Génère la ligne d'entête VIRM...
     */
    public String buildHeaderLine(EdiHeader header) {
        StringBuilder sb = new StringBuilder();
        sb.append(rpad(header.getTag() != null ? header.getTag() : "VIRM", 4)); // 1-4
        sb.append(rpad(header.getCodeBanqueDonneur(), 3));                      // 5-7
        sb.append(rpad(header.getNatureOperation(), 3));                        // 8-10
        sb.append(rpad(header.getNatureFonds(), 1));                            // 11
        sb.append(rpad(header.getIndicateurRibIban(), 1));                      // 12
        sb.append(rpad(header.getRibDonneurOrdre(), 20));                       // 13-32
        sb.append(rpad(header.getPrefixeIban(), 4));                            // 33-36
        sb.append(rpad(header.getNomDonneurOrdre(), 50));                       // 37-86
        sb.append(rpad(header.getAdresseDonneurOrdre(), 70));                   // 87-156
        sb.append(rpad(header.getDateRemiseOrdre(), 8));                        // 157-164
        sb.append(rpad(header.getReferenceRemise(), 3));                        // 165-167
        sb.append(lpad(String.valueOf(header.getNombreOperations()), 6, '0'));  // 168-173
        sb.append(formatAmountCentimes(header.getMontantTotal(), 16));          // 174-189
        return sb.toString();
    }

    /**
     * Génère une ligne de transaction corps
     */
    public String buildTransactionLine(EdiTransaction tx) {
        StringBuilder sb = new StringBuilder();
        sb.append(lpad(tx.getNumeroOrdre(), 10, '0'));                          // 1-10
        sb.append(rpad(tx.getIndicateurRibIban(), 1));                          // 11
        sb.append(rpad(tx.getRibBeneficiaire(), 20));                           // 12-31
        sb.append(rpad(tx.getPrefixeIban(), 4));                                // 32-35
        sb.append(rpad(tx.getNomBeneficiaire(), 50));                           // 36-85
        sb.append(rpad(tx.getAdresseBeneficiaire(), 70));                       // 86-155
        sb.append(formatAmountCentimes(tx.getMontant(), 15));                   // 156-170
        sb.append(rpad(tx.getLibelle(), 70));                                   // 171-240
        return sb.toString();
    }

    /**
     * Écrit un objet EdiFile complet vers un fichier sur le disque
     */
    public void writeToFile(EdiFile ediFile, File targetFile) throws IOException {
        if (targetFile.getParentFile() != null && !targetFile.getParentFile().exists()) {
            targetFile.getParentFile().mkdirs();
        }

        try (BufferedWriter writer = new BufferedWriter(new FileWriter(targetFile, StandardCharsets.UTF_8))) {
            // 1. Entête
            writer.write(buildHeaderLine(ediFile.getHeader()));
            writer.newLine();

            // 2. Corps
            for (EdiTransaction tx : ediFile.getTransactions()) {
                writer.write(buildTransactionLine(tx));
                writer.newLine();
            }

            // 3. Fin Remise FVIR
            String trailer = ediFile.getTrailerLine();
            if (trailer == null || trailer.trim().isEmpty()) {
                trailer = rpad("FVIR", 100);
            }
            writer.write(trailer);
            writer.newLine();
        }
    }
}
