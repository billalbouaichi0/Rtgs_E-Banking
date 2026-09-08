import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Play, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Settings2, 
  Database, 
  FileCode, 
  Send, 
  XCircle, 
  Calendar, 
  Layers,
  ArrowRight,
  ShieldAlert,
  Info
} from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';

export const OdScheduler = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningBatch, setRunningBatch] = useState(false);
  const [checkingSab, setCheckingSab] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Configuration state
  const [fixedHoursStr, setFixedHoursStr] = useState('12:00, 15:00, 16:30');
  const [pollingMinutes, setPollingMinutes] = useState(5);
  const [autoBatchEnabled, setAutoBatchEnabled] = useState(true);
  const [autoSabPollEnabled, setAutoSabPollEnabled] = useState(true);

  // Status & SAB state
  const [statusCounts, setStatusCounts] = useState({
    RECU: 0,
    OD_GEN: 0,
    INTEGRE: 0,
    ENVOYE: 0,
    REJETE: 0,
    IGNORE_FILTRE: 0
  });
  const [sabRecords, setSabRecords] = useState([]);
  const [nextExecution, setNextExecution] = useState(null);

  const fetchScheduleData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/system/od-schedule');
      
      const data = res.data || {};
      const settings = data.settings || data || {};
      const counts = data.statusCounts || {};
      
      // Extraction sécurisée des heures
      let hoursValue = settings.od_generation_hours;
      if (!hoursValue && Array.isArray(settings.batchHours)) {
        hoursValue = settings.batchHours.join(', ');
      } else if (!hoursValue && typeof settings.batchHours === 'string') {
        hoursValue = settings.batchHours;
      }
      setFixedHoursStr(hoursValue || '12:00, 15:00, 16:30');

      // Extraction sécurisée de la fréquence polling
      const intervalVal = settings.sab_polling_interval_minutes !== undefined 
        ? settings.sab_polling_interval_minutes 
        : (settings.pollIntervalMinutes !== undefined ? settings.pollIntervalMinutes : 5);
      setPollingMinutes(parseInt(intervalVal, 10) || 5);

      // Extraction sécurisée des switches automatiques
      const autoBatch = settings.od_auto_batch_enabled !== undefined 
        ? settings.od_auto_batch_enabled 
        : (settings.autoEnabled !== undefined ? settings.autoEnabled : true);
      setAutoBatchEnabled(autoBatch === 'true' || autoBatch === true);

      const autoSab = settings.sab_auto_poll_enabled !== undefined 
        ? settings.sab_auto_poll_enabled 
        : (settings.autoEnabled !== undefined ? settings.autoEnabled : true);
      setAutoSabPollEnabled(autoSab === 'true' || autoSab === true);
      
      if (counts && typeof counts === 'object') {
        setStatusCounts(prev => ({ ...prev, ...counts }));
      }
      
      // Fetch SAB live table
      try {
        const sabRes = await api.get('/system/od-schedule/sab-table');
        const records = sabRes.data?.records || sabRes.data?.zcptod0 || [];
        setSabRecords(Array.isArray(records) ? records : []);
      } catch (sabErr) {
        console.warn('Erreur chargement table SAB:', sabErr);
      }
      
    } catch (err) {
      console.error('Erreur chargement planificateur OD:', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScheduleData();
    const interval = setInterval(() => {
      fetchScheduleData();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      // Validation des heures
      const hoursList = fixedHoursStr.split(',').map(h => h.trim()).filter(Boolean);
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      for (const h of hoursList) {
        if (!timeRegex.test(h)) {
          throw new Error(`Format d'heure invalide : "${h}". Utilisez le format HH:mm (ex: 12:00, 15:00)`);
        }
      }

      await api.put('/system/od-schedule', {
        od_generation_hours: hoursList.join(', '),
        sab_polling_interval_minutes: parseInt(pollingMinutes, 10),
        od_auto_batch_enabled: autoBatchEnabled,
        sab_auto_poll_enabled: autoSabPollEnabled
      });

      setMessage('Paramètres de planification mis à jour avec succès');
      await fetchScheduleData();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRunBatchNow = async () => {
    if (!window.confirm('Voulez-vous déclencher immédiatement la génération du lot OD pour tous les virements éligibles en attente (RECU) ?')) {
      return;
    }
    try {
      setRunningBatch(true);
      setError(null);
      setMessage(null);
      const res = await api.post('/system/od-schedule/run-batch');
      setMessage(res.data.message || 'Génération du lot OD exécutée.');
      await fetchScheduleData();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setRunningBatch(false);
    }
  };

  const handleCheckSabNow = async () => {
    try {
      setCheckingSab(true);
      setError(null);
      setMessage(null);
      const res = await api.post('/system/od-schedule/check-sab');
      setMessage(res.data.message || 'Vérification comptabilisation SAB exécutée.');
      await fetchScheduleData();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setCheckingSab(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-[#772281]/10 text-[#772281] dark:text-[#f9b307] border border-[#772281]/20">
              <Clock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Planificateur des Lots OD & Suivi SAB
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ordonnancement des ordres de débit (OD) à heures fixes et surveillance périodique de la comptabilisation SAB.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchScheduleData}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Pipeline Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">1. Reçus (Attente OD)</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-amber-500">{statusCounts.RECU || 0}</span>
            <Clock className="w-5 h-5 text-amber-500/40" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">2. Lot OD Généré</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-[#772281] dark:text-[#f9b307]">{statusCounts.OD_GEN || 0}</span>
            <FileCode className="w-5 h-5 text-[#772281]/40" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">3. Intégré SAB (001)</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-blue-500">{statusCounts.INTEGRE || 0}</span>
            <Database className="w-5 h-5 text-blue-500/40" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">4. Comptabilisé & Envoyé</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-emerald-500">{statusCounts.ENVOYE || 0}</span>
            <Send className="w-5 h-5 text-emerald-500/40" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Rejetés (SI_RJT)</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-rose-500">{statusCounts.REJETE || 0}</span>
            <XCircle className="w-5 h-5 text-rose-500/40" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">Ignorés / Filtrés</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-black text-slate-400">{statusCounts.IGNORE_FILTRE || 0}</span>
            <Layers className="w-5 h-5 text-slate-400/40" />
          </div>
        </div>
      </div>

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <Settings2 className="w-5 h-5 text-[#772281] dark:text-[#f9b307]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Configuration des Horaires & Polling
            </h2>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Heures de génération des lots OD (séparées par des virgules)
              </label>
              <input
                type="text"
                value={fixedHoursStr}
                onChange={(e) => setFixedHoursStr(e.target.value)}
                placeholder="12:00, 15:00, 16:30"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#772281]"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                À chaque heure configurée, le système vérifiera le solde de tous les virements reçus et produira le fichier global <code className="text-[#772281] dark:text-[#f9b307]">ZCPTODA9_YYYYMMDD_HHMMSS.dat</code>.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Fréquence de vérification de comptabilisation SAB (Minutes)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={pollingMinutes}
                  onChange={(e) => setPollingMinutes(e.target.value)}
                  className="w-32 px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#772281]"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">minute(s) (Défaut : 5 min)</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Recherche automatique des OD comptabilisées dans <code className="text-[#772281] dark:text-[#f9b307]">sabstd.zcptod0</code> (CPTODDCO &lt;&gt; 0 et CPTODETA = '003').
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoBatchEnabled}
                  onChange={(e) => setAutoBatchEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#772281] focus:ring-[#772281] border-slate-300 dark:border-slate-700"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Activer la génération automatique des lots OD aux heures configurées
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSabPollEnabled}
                  onChange={(e) => setAutoSabPollEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-[#772281] focus:ring-[#772281] border-slate-300 dark:border-slate-700"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Activer la surveillance périodique automatique de comptabilisation SAB
                </span>
              </label>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#772281] to-[#591961] hover:from-[#8d2a9a] hover:to-[#772281] transition-all shadow-md shadow-[#772281]/20 disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Manual Actions & Status Details */}
        <div className="lg:col-span-5 space-y-6">
          {/* Manual Trigger Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Play className="w-5 h-5 text-[#f9b307]" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Déclencheurs Manuels
              </h2>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleRunBatchNow}
                disabled={runningBatch}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#772281] to-[#8d2a9a] hover:brightness-110 transition-all shadow-sm disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5">
                  <Play className={`w-4 h-4 ${runningBatch ? 'animate-spin' : ''}`} />
                  <span>Générer Lot OD Immédiatement</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px]">
                  {statusCounts.RECU || 0} en attente
                </span>
              </button>

              <button
                onClick={handleCheckSabNow}
                disabled={checkingSab}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-bold text-slate-800 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
              >
                <div className="flex items-center gap-2.5">
                  <RefreshCw className={`w-4 h-4 ${checkingSab ? 'animate-spin' : ''}`} />
                  <span>Vérifier Comptabilisation SAB</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px]">
                  {((statusCounts.OD_GEN || 0) + (statusCounts.INTEGRE || 0))} en cours
                </span>
              </button>
            </div>
          </div>

          {/* Business Rules Summary Card */}
          <div className="bg-gradient-to-br from-[#772281]/10 via-[#f9b307]/5 to-transparent rounded-2xl border border-[#772281]/20 p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#772281] dark:text-[#f9b307]">
              <Info className="w-4 h-4" />
              <span>Règles de Traitement par Lot</span>
            </div>
            <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-[#772281] dark:text-[#f9b307] flex-shrink-0" />
                <span><strong>Réception EDI :</strong> Statut <code>RECU</code> attribué aux virements éligibles (Interbancaire &gt;= 1M DZD).</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-[#772281] dark:text-[#f9b307] flex-shrink-0" />
                <span><strong>Heure Fixe :</strong> Contrôle solde SAB. Si insuffisant, <code>SI_VIR_RJT</code> généré. Si suffisant, inclusion dans <code>ZCPTODA9_*.dat</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-[#772281] dark:text-[#f9b307] flex-shrink-0" />
                <span><strong>Comptabilisation SAB :</strong> Dès que <code>CPTODETA = '003'</code> et <code>CPTODDCO &lt;&gt; 0</code>, émission du MT103 et de <code>SI_VIR_CPT_*.txt</code>.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Live Monitor Table: sabstd.zcptod0 */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-sky-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Supervision Oracle SAB : <code className="text-xs text-sky-500 font-mono">sabstd.zcptod0</code>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Lignes d'opérations diverses (OD) générées et leur état de comptabilisation.
              </p>
            </div>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {sabRecords.length} enregistrement(s) trouvé(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-medium">
                <th className="py-2.5 px-3">CPTODETA</th>
                <th className="py-2.5 px-3">CPTODDCO</th>
                <th className="py-2.5 px-3">CPTODCOM (Compte)</th>
                <th className="py-2.5 px-3">CPTODMO1 (Montant)</th>
                <th className="py-2.5 px-3">CPTODLI2 (Clé d'Unicité)</th>
                <th className="py-2.5 px-3">Statut SAB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              {sabRecords.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-400 font-sans">
                    Aucun enregistrement SAB en cours dans la table.
                  </td>
                </tr>
              ) : (
                sabRecords.map((rec, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold ${
                        rec.CPTODETA === '003' 
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : rec.CPTODETA === '001'
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}>
                        {rec.CPTODETA}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {rec.CPTODDCO !== 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{rec.CPTODDCO}</span>
                      ) : (
                        <span className="text-slate-400">0 (Non comptabilisé)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">{rec.CPTODCOM}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                      {Number(rec.CPTODMO1 || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DZD
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {rec.CPTODLI2}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {rec.CPTODETA === '003' && rec.CPTODDCO !== 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">Comptabilisé</span>
                      ) : rec.CPTODETA === '001' ? (
                        <span className="text-blue-600 dark:text-blue-400 font-semibold text-[11px]">Intégré</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px]">En attente</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OdScheduler;
