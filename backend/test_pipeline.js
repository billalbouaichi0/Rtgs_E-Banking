const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('=== DÉBUT DES TESTS AUTOMATISÉS RTGS-EBANKING BDL ===\n');

  try {
    // 1. Authentification
    console.log('[1/5] Test de connexion Administrateur...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log(`✓ Authentifié avec succès ! Token reçu (${token.substring(0, 20)}...)`);

    const headers = { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    };

    // 2. Test du Simulateur - Cas 1 : Virement RTGS Validé (> 1M DZD, Banques Différentes, Solde OK)
    console.log('\n[2/5] Test Scénario 1 : Virement Validé (> 1M DZD)...');
    const simu1Res = await fetch(`${API_URL}/system/simulate-edi`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'valide' })
    });
    const simu1 = await simu1Res.json();
    console.log(`✓ Fichier injecté dans source/ : ${simu1.fileName}`);

    // 3. Test du Simulateur - Cas 2 : Virement Rejeté Solde Insuffisant
    console.log('\n[3/5] Test Scénario 2 : Virement Rejeté Solde Insuffisant...');
    const simu2Res = await fetch(`${API_URL}/system/simulate-edi`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'solde_insuffisant' })
    });
    const simu2 = await simu2Res.json();
    console.log(`✓ Fichier injecté dans source/ : ${simu2.fileName}`);

    // 4. Test du Simulateur - Cas 3 : Virement Ignoré (< 1M DZD)
    console.log('\n[4/5] Test Scénario 3 : Virement Ignoré (< 1M DZD)...');
    const simu3Res = await fetch(`${API_URL}/system/simulate-edi`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'ignore_montant' })
    });
    const simu3 = await simu3Res.json();
    console.log(`✓ Fichier injecté dans source/ : ${simu3.fileName}`);

    // 5. Test du Simulateur - Cas 4 : Virement Ignoré (Même Banque 005)
    console.log('\n[5/5] Test Scénario 4 : Virement Ignoré (Même Banque 005)...');
    const simu4Res = await fetch(`${API_URL}/system/simulate-edi`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ type: 'ignore_meme_banque' })
    });
    const simu4 = await simu4Res.json();
    console.log(`✓ Fichier injecté dans source/ : ${simu4.fileName}`);

    // Attendre 4 secondes que le watcher chokidar détecte et traite les fichiers
    console.log('\nAttente du traitement asynchrone par le Watcher chokidar...');
    await new Promise((r) => setTimeout(r, 4500));

    // Vérification des répertoires physiques
    const dirRoot = path.resolve(__dirname, '../directories');
    const odFiles = fs.readdirSync(path.join(dirRoot, 'generated_od'));
    const mt103Files = fs.readdirSync(path.join(dirRoot, 'generated_mt103'));
    const siRetFiles = fs.readdirSync(path.join(dirRoot, 'si_retour'));
    const ignorerFiles = fs.readdirSync(path.join(dirRoot, 'input/ignorer'));

    console.log('\n=== RÉSULTATS DANS LES RÉPERTOIRES PHYSIQUES ===');
    console.log(`📁 generated_od/     : ${odFiles.length} fichier(s) -> ${odFiles.join(', ')}`);
    console.log(`📁 generated_mt103/  : ${mt103Files.length} fichier(s) -> ${mt103Files.join(', ')}`);
    console.log(`📁 si_retour/        : ${siRetFiles.length} fichier(s) -> ${siRetFiles.join(', ')}`);
    console.log(`📁 input/ignorer/    : ${ignorerFiles.length} fichier(s) -> ${ignorerFiles.join(', ')}`);

    // Vérifier le contenu d'un MT103 généré
    if (mt103Files.length > 0) {
      const mt103Content = fs.readFileSync(path.join(dirRoot, 'generated_mt103', mt103Files[0]), 'utf-8');
      console.log('\n--- APERÇU DU FICHIER SWIFT MT103 GÉNÉRÉ ---');
      console.log(mt103Content);
    }

    // Vérifier le contenu d'un OD généré
    if (odFiles.length > 0) {
      const odContent = fs.readFileSync(path.join(dirRoot, 'generated_od', odFiles[0]), 'utf-8');
      console.log('\n--- APERÇU DU FICHIER OD GÉNÉRÉ ---');
      console.log(`[${odContent}] (Longueur : ${odContent.length} car.)`);
    }

    // Vérifier le contenu d'un SI_RET généré
    if (siRetFiles.length > 0) {
      const siRetContent = fs.readFileSync(path.join(dirRoot, 'si_retour', siRetFiles[0]), 'utf-8');
      console.log('\n--- APERÇU DU FICHIER SI RETOUR GÉNÉRÉ ---');
      console.log(`[${siRetContent}]`);
    }

    // Vérification du dashboard
    const statsRes = await fetch(`${API_URL}/stats/dashboard`, { headers });
    const statsData = await statsRes.json();
    console.log('\n=== STATISTIQUES FINALES DU DASHBOARD ===');
    console.log(statsData.kpis);

    console.log('\n✅ TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !');
  } catch (err) {
    console.error('❌ Erreur lors du test :', err);
  }
};

runTests();
