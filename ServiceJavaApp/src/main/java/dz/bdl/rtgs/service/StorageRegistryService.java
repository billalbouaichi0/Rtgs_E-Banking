package dz.bdl.rtgs.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import dz.bdl.rtgs.config.AppConfig;
import dz.bdl.rtgs.model.AccountingStatus;
import dz.bdl.rtgs.model.TransactionRecord;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.logging.Logger;
import java.util.stream.Collectors;

/**
 * Service de persistance et de registre des transactions traitées (Pure Java)
 */
public class StorageRegistryService {

    private static final Logger log = Logger.getLogger(StorageRegistryService.class.getName());

    private final AppConfig appConfig;
    private final ObjectMapper objectMapper;
    private final Map<String, TransactionRecord> registry = new ConcurrentHashMap<>();

    public StorageRegistryService(AppConfig appConfig) {
        this.appConfig = appConfig;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
        loadFromDisk();
    }

    public synchronized void saveRecord(TransactionRecord record) {
        registry.put(record.getId(), record);
        flushToDisk();
    }

    public synchronized void saveAll(List<TransactionRecord> records) {
        for (TransactionRecord r : records) {
            registry.put(r.getId(), r);
        }
        flushToDisk();
    }

    public TransactionRecord getById(String id) {
        return registry.get(id);
    }

    public List<TransactionRecord> getAll() {
        return new ArrayList<>(registry.values());
    }

    public List<TransactionRecord> getByOriginalFileName(String fileName) {
        return registry.values().stream()
                .filter(r -> fileName.equals(r.getOriginalFileName()))
                .collect(Collectors.toList());
    }

    public List<TransactionRecord> getPendingCompta() {
        return registry.values().stream()
                .filter(r -> r.getStatus() == AccountingStatus.SUBSTITUE_ENVOYE_COMPTA
                        || r.getStatus() == AccountingStatus.EN_ATTENTE_COMPTABILISATION)
                .collect(Collectors.toList());
    }

    public List<TransactionRecord> getAccountedPendingReconstitution() {
        return registry.values().stream()
                .filter(r -> r.getStatus() == AccountingStatus.COMPTABILISE)
                .collect(Collectors.toList());
    }

    private void loadFromDisk() {
        File file = new File(appConfig.getRegistryFilePath());
        if (file.exists() && file.length() > 0) {
            try {
                List<TransactionRecord> list = objectMapper.readValue(file, new TypeReference<List<TransactionRecord>>() {});
                for (TransactionRecord r : list) {
                    registry.put(r.getId(), r);
                }
                log.info("[StorageRegistryService] Registre chargé : " + registry.size() + " transactions trouvées.");
            } catch (IOException e) {
                log.warning("[StorageRegistryService] Erreur lors du chargement du registre JSON : " + e.getMessage());
            }
        }
    }

    private synchronized void flushToDisk() {
        File file = new File(appConfig.getRegistryFilePath());
        if (file.getParentFile() != null && !file.getParentFile().exists()) {
            file.getParentFile().mkdirs();
        }
        try {
            objectMapper.writeValue(file, new ArrayList<>(registry.values()));
        } catch (IOException e) {
            log.warning("[StorageRegistryService] Erreur lors de l'écriture du registre sur disque : " + e.getMessage());
        }
    }
}
