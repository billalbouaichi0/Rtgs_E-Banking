import React, { useState, useEffect } from 'react';
import { FileText, Filter, RefreshCw, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import api from '../services/api';

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [niveau, setNiveau] = useState('ALL');
  const [type, setType] = useState('ALL');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/stats/logs', {
        params: { niveau, type, limit: 100 }
      });
      setLogs(res.data);
    } catch (err) {
      console.error('Erreur chargement logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [niveau, type]);

  const getIcon = (lvl) => {
    switch (lvl) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'ERROR':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'INFO':
      default:
        return <Info className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Journal d'Audit & Traçabilité Système
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Historique exhaustif et horodaté de toutes les actions et transformations de flux
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser les Logs</span>
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
          <Filter className="w-4 h-4" />
          <span>Filtres :</span>
        </div>

        <select
          value={niveau}
          onChange={(e) => setNiveau(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">Tous les Niveaux</option>
          <option value="SUCCESS">Succès (Générations OK)</option>
          <option value="WARNING">Avertissements (Ignorés)</option>
          <option value="ERROR">Erreurs & Rejets (SI_RET)</option>
          <option value="INFO">Informations</option>
        </select>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">Tous les Types d'Événements</option>
          <option value="INGESTION">Ingestion Fichier EDI</option>
          <option value="FILTRE_RTGS">Filtre RTGS</option>
          <option value="GENERATION_MT103">Génération SWIFT MT103</option>
          <option value="GENERATION_OD">Génération Fichier OD</option>
          <option value="GENERATION_SI_RET">Génération SI Retour</option>
          <option value="SYSTEM">Système & Surveillance</option>
        </select>
      </div>

      {/* Logs Table / List */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
        <div className="divide-y divide-slate-800/60">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              Chargement des événements...
            </div>
          ) : logs.length > 0 ? (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-900/60 transition-colors flex items-start gap-4 text-xs"
              >
                <div className="pt-0.5">{getIcon(log.niveau)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {log.type}
                    </span>
                    {log.nomFichier && (
                      <span className="font-mono text-[11px] text-emerald-400">
                        [{log.nomFichier}]
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed">{log.message}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              Aucun log correspondant aux filtres sélectionnés.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
