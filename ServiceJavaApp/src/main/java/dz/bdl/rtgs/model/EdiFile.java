package dz.bdl.rtgs.model;

import java.util.ArrayList;
import java.util.List;

/**
 * Modèle complet représentant un fichier de remise EDI
 */
public class EdiFile {
    private String fileName;
    private EdiHeader header;
    private List<EdiTransaction> transactions = new ArrayList<>();
    private String trailerLine; // Ligne de fin FVIR...

    public EdiFile() {}

    public EdiFile(String fileName, EdiHeader header, List<EdiTransaction> transactions, String trailerLine) {
        this.fileName = fileName;
        this.header = header;
        this.transactions = transactions != null ? transactions : new ArrayList<>();
        this.trailerLine = trailerLine;
    }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public EdiHeader getHeader() { return header; }
    public void setHeader(EdiHeader header) { this.header = header; }

    public List<EdiTransaction> getTransactions() { return transactions; }
    public void setTransactions(List<EdiTransaction> transactions) { this.transactions = transactions; }

    public String getTrailerLine() { return trailerLine; }
    public void setTrailerLine(String trailerLine) { this.trailerLine = trailerLine; }
}
