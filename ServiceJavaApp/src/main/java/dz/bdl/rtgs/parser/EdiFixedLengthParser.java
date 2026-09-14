package dz.bdl.rtgs.parser;

import dz.bdl.rtgs.model.EdiFile;
import dz.bdl.rtgs.model.EdiHeader;
import dz.bdl.rtgs.model.EdiTransaction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Parseur EDI conforme aux spécifications exactes de positionnement fixe BDL / Algérie
 */
@Component
public class EdiFixedLengthParser {

    private static final Logger log = LoggerFactory.getLogger(EdiFixedLengthParser.class);

    /**
     * Extrait une sous-chaîne selon des positions 1-indexées inclusives
     */
    public static String substr1(String str, int start, int end) {
        if (str == null || str.length() < start) {
            return "";
        }
        int s = Math.max(0, start - 1);
        int e = Math.min(str.length(), end);
        if (s >= e) return "";
        return str.substring(s, e);
    }

    /**
     * Convertit une chaîne de montant brut (en centimes ou standard) en BigDecimal (DZD)
     */
    public static BigDecimal parseAmount(String rawStr) {
        if (rawStr == null || rawStr.trim().isEmpty()) {
            return BigDecimal.ZERO;
        }
        try {
            String cleaned = rawStr.trim();
            BigDecimal raw = new BigDecimal(cleaned);
            // Conversion des centimes (standard BDL : 2 décimales implicites)
            return raw.divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        } catch (Exception e) {
            log.warn("Impossible de parser le montant brut '{}' : {}", rawStr, e.getMessage());
            return BigDecimal.ZERO;
        }
    }

    /**
     * Parse un fichier EDI à partir de son chemin de fichier
     */
    public EdiFile parse(File file) throws IOException {
        List<String> lines = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.trim().isEmpty()) {
                    lines.add(line);
                }
            }
        }

        if (lines.isEmpty()) {
            throw new IllegalArgumentException("Le fichier EDI est vide : " + file.getName());
        }

        String headerLine = lines.get(0);
        String headerTag = substr1(headerLine, 1, 4);
        if (!"VIRM".equalsIgnoreCase(headerTag)) {
            throw new IllegalArgumentException("Entête de remise EDI invalide (attendu 'VIRM', reçu '" + headerTag + "')");
        }

        EdiHeader header = new EdiHeader();
        header.setTag("VIRM");
        header.setCodeBanqueDonneur(substr1(headerLine, 5, 7).trim());
        header.setNatureOperation(substr1(headerLine, 8, 10).trim());
        header.setNatureFonds(substr1(headerLine, 11, 11).trim());
        header.setIndicateurRibIban(substr1(headerLine, 12, 12).trim());
        header.setRibDonneurOrdre(substr1(headerLine, 13, 32).trim());
        header.setPrefixeIban(substr1(headerLine, 33, 36).trim());
        header.setNomDonneurOrdre(substr1(headerLine, 37, 86).trim());
        header.setAdresseDonneurOrdre(substr1(headerLine, 87, 156).trim());
        header.setDateRemiseOrdre(substr1(headerLine, 157, 164).trim());
        header.setReferenceRemise(substr1(headerLine, 165, 167).trim());
        try {
            header.setNombreOperations(Integer.parseInt(substr1(headerLine, 168, 173).trim()));
        } catch (Exception e) {
            header.setNombreOperations(0);
        }
        header.setMontantTotal(parseAmount(substr1(headerLine, 174, 189)));
        header.setRawHeaderLine(headerLine);

        List<EdiTransaction> transactions = new ArrayList<>();
        String trailerLine = "FVIR";

        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i);
            String tag = substr1(line, 1, 4);

            if ("FVIR".equalsIgnoreCase(tag)) {
                trailerLine = line;
                break;
            }

            EdiTransaction tx = new EdiTransaction();
            tx.setNumeroOrdre(substr1(line, 1, 10).trim());
            tx.setIndicateurRibIban(substr1(line, 11, 11).trim());
            String ribBenef = substr1(line, 12, 31).trim();
            tx.setRibBeneficiaire(ribBenef);
            tx.setPrefixeIban(substr1(line, 32, 35).trim());
            tx.setNomBeneficiaire(substr1(line, 36, 85).trim());
            tx.setAdresseBeneficiaire(substr1(line, 86, 155).trim());
            tx.setMontant(parseAmount(substr1(line, 156, 170)));
            tx.setLibelle(substr1(line, 171, 240).trim());

            if (ribBenef.length() >= 3) {
                tx.setCodeBanqueBeneficiaire(ribBenef.substring(0, 3));
            } else {
                tx.setCodeBanqueBeneficiaire("000");
            }

            tx.setCodeBanqueDonneur(header.getCodeBanqueDonneur());
            tx.setRibDonneurOriginal(header.getRibDonneurOrdre());
            tx.setRawLine(line);

            // Vérification de la condition RTGS :
            // 1. Code Banque Donneur != Code Banque Bénéficiaire (Interbancaire)
            // 2. Montant >= 1 000 000 DZD
            boolean isInterbank = !header.getCodeBanqueDonneur().equals(tx.getCodeBanqueBeneficiaire());
            boolean isAmountRtgs = tx.getMontant().compareTo(new BigDecimal("1000000.00")) >= 0;
            tx.setRtgsEligible(isInterbank && isAmountRtgs);

            transactions.add(tx);
        }

        return new EdiFile(file.getName(), header, transactions, trailerLine);
    }
}
