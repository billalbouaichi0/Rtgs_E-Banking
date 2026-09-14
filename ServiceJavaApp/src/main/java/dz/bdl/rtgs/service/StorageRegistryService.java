package dz.bdl.rtgs.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import dz.bdl.rtgs.config.AppConfig;
import dz.bdl.rtgs.model.AccountingStatus;
import dz.bdl.rtgs.model.TransactionRecord;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Service de persistance et de registre des transactions traitées
 */
@Service
public class StorageRegistryService {

    private static final Logger log = LoggerFactory.getLogger(StorageRegistryService.class);

    private final AppConfig appConfig;
    private final ObjectMapper objectMapper;
    private final Map<String, TransactionRecord> registry = new ConcurrentHashMap<>();

    public StorageRegistryService(AppConfig appConfig) {
        this.appConfig = appConfig;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.enable(SerializationFeature.INDENT_OUTPUT);
    }

    @PostConstruct
    public void init() {
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

    public List<TransactionRecord> getBySubstitutedFileName(String fileName) {
        return registry.values().stream()
                .filter(r -> fileName.equals(r.getSubstitutedFileName()))
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
                log.info("[StorageRegistryService] Registre chargé depuis le disque : {} transactions trouvées.", registry.size());
            } catch (IOException e) {
                log.error("[StorageRegistryService] Erreur lors du chargement du registre JSON : {}", e.getMessage());
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
            log.error("[StorageRegistryService] Erreur lors de l'écriture du registre sur disque : {}", e.getMessage());
        }
    }
}
