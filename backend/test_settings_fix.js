const odSchedulerService = require('./src/services/odSchedulerService');
const seedDatabase = require('./src/seeders/initData');
const { SystemSetting } = require('./src/models');

async function testSettings() {
  console.log('=== Test de la sauvegarde et du rechargement des paramètres OD ===\n');

  await seedDatabase();

  console.log('1. Paramètres initiaux :', odSchedulerService.getSettings());

  // Simulation d'une mise à jour depuis le frontend (changement des heures et de la fréquence)
  console.log('\n2. Mise à jour des paramètres : Heures="11:00, 14:00, 17:00", Polling=3 min');
  const updated = await odSchedulerService.saveSettings({
    od_generation_hours: '11:00, 14:00, 17:00',
    sab_polling_interval_minutes: 3,
    od_auto_batch_enabled: true,
    sab_auto_poll_enabled: true
  });

  console.log('3. Paramètres renvoyés après mise à jour :', updated);

  // Vérification directe dans la base de données
  const dbHours = await SystemSetting.findByPk('od_batch_hours');
  const dbPoll = await SystemSetting.findByPk('sab_poll_interval_minutes');
  console.log('\n4. Valeurs en base de données :');
  console.log(' - od_batch_hours en DB :', dbHours.value);
  console.log(' - sab_poll_interval_minutes en DB :', dbPoll.value);

  if (dbHours.value !== JSON.stringify(['11:00', '14:00', '17:00'])) {
    throw new Error('Les heures ne correspondent pas en base de données');
  }
  if (dbPoll.value !== '3') {
    throw new Error('L intervalle de polling ne correspond pas en base de données');
  }

  console.log('\n✅ TEST RÉUSSI AVEC SUCCÈS : Les paramètres sont bien sauvegardés en base et chargés sans undefined !');
  odSchedulerService.stop();
  process.exit(0);
}

testSettings().catch(err => {
  console.error('Erreur test:', err);
  process.exit(1);
});
