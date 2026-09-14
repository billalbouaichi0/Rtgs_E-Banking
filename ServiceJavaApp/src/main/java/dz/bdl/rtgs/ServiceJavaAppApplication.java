package dz.bdl.rtgs;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Point d'entrée principal de l'application ServiceJavaApp
 * Surveillance EDI, Substitution de RIB Compte Interne et Reconstitution RTGS BDL
 */
@SpringBootApplication
@EnableScheduling
public class ServiceJavaAppApplication {

    public static void main(String[] args) {
        SpringApplication.run(ServiceJavaAppApplication.class, args);
    }
}
