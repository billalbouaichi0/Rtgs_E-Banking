import React, { useState } from 'react';
import { 
  PlayCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FolderSync, 
  Sparkles, 
  ArrowRight,
  Database,
  Building2,
  FileCode
} from 'lucide-react';
import api from '../services/api';

export const SimulateurEDI = ({ setActiveTab }) => {
  const [loadingType, setLoadingType] = useState(null);
  const [simulationLogs, setSimulationLogs] = useState([]);

  const runSimulation = async (type, label) => {
    setLoadingType(type);
    try {
      const res = await api.post('/system/simulate-edi', { type });
      const newLog = {
        id: Date.now(),
        type,
        label,
        fileName: res.data.fileName,
        timestamp: new Date().toLocaleTimeString(),
        message: res.data.message
      };
      setSimulationLogs((prev) => [newLog, ...prev]);
    } catch (err) {
      console.error('Erreur simulation EDI', err);
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">
          Simulateur de Flux & Jeux d'Essais EDI
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Déposez en un clic des fichiers EDI normés dans le dossier <code className="text-emerald-400 font-mono">directories/source/</code> et observez la surveillance automatique en temps réel.
        </p>
      </div>

      {/* 4 Scenarios Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Scénario 1 */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-6 space-y-4 border-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              Scénario 1 • Cas Nominal
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Virement RTGS Validé (&gt; 1M DZD & Solde OK)
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              • Montant : <strong className="text-white">2 437 358.00 DZD</strong> (≥ 1 000 000 DZD)<br />
              • Banques : <strong className="text-white">BDL (005)</strong> vers <strong className="text-white">BEA (008)</strong><br />
              • Compte SAB <code className="text-slate-300">001334002181530</code> : Solde <strong className="text-emerald-400">50 000 000 DZD</strong><br />
              • Résultat : Génère <strong className="text-emerald-400">OD</strong> et <strong className="text-emerald-400">SWIFT MT103</strong>
            </p>
          </div>
          <button
            onClick={() => runSimulation('valide', 'Virement RTGS Validé (OD + MT103)')}
            disabled={loadingType !== null}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loadingType === 'valide' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Injecter dans directories/source</span>
              </>
            )}
          </button>
        </div>

        {/* Scénario 2 */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-6 space-y-4 border-rose-500/30">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-bold">
              Scénario 2 • Rejet Solde
            </span>
            <XCircle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Virement Rejeté (Solde SAB Insuffisant)
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              • Montant : <strong className="text-white">15 000 000.00 DZD</strong> (≥ 1 000 000 DZD)<br />
              • Banques : <strong className="text-white">BDL (005)</strong> vers <strong className="text-white">BEA (003)</strong><br />
              • Compte SAB <code className="text-slate-300">001334002181531</code> : Solde <strong className="text-rose-400">500 000 DZD</strong><br />
              • Résultat : Génère le fichier <strong className="text-rose-400">SI_RET_Libelle.txt</strong>
            </p>
          </div>
          <button
            onClick={() => runSimulation('solde_insuffisant', 'Virement Rejeté Solde SAB (SI_RET)')}
            disabled={loadingType !== null}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loadingType === 'solde_insuffisant' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Injecter dans directories/source</span>
              </>
            )}
          </button>
        </div>

        {/* Scénario 3 */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-6 space-y-4 border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
              Scénario 3 • Ignoré Montant
            </span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Virement Inférieur au Seuil (&lt; 1M DZD)
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              • Montant : <strong className="text-white">25 000.00 DZD</strong> (inférieur à 1M DZD)<br />
              • Banques : <strong className="text-white">BDL (005)</strong> vers <strong className="text-white">BEA (008)</strong><br />
              • Règle RTGS : Ne doit pas être compensé en RTGS gros montants.<br />
              • Résultat : Fichier déplacé vers <strong className="text-amber-400">input/ignorer</strong>
            </p>
          </div>
          <button
            onClick={() => runSimulation('ignore_montant', 'Virement Ignoré (< 1M DZD)')}
            disabled={loadingType !== null}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loadingType === 'ignore_montant' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Injecter dans directories/source</span>
              </>
            )}
          </button>
        </div>

        {/* Scénario 4 */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-6 space-y-4 border-slate-700">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold">
              Scénario 4 • Même Banque
            </span>
            <Building2 className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Virement Intrabancaire (Même Banque 005)
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              • Montant : <strong className="text-white">5 000 000.00 DZD</strong><br />
              • Banques : <strong className="text-white">BDL (005)</strong> vers <strong className="text-white">BDL (005)</strong><br />
              • Règle RTGS : Traitement interne BDL, hors RTGS interbancaire.<br />
              • Résultat : Fichier déplacé vers <strong className="text-slate-300">input/ignorer</strong>
            </p>
          </div>
          <button
            onClick={() => runSimulation('ignore_meme_banque', 'Virement Ignoré (Intrabancaire 005)')}
            disabled={loadingType !== null}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loadingType === 'ignore_meme_banque' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Injecter dans directories/source</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Activity Log Feed */}
      {simulationLogs.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Journal des Injections Simulées
            </h3>
            <button
              onClick={() => setActiveTab('virements')}
              className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Vérifier dans le Registre</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {simulationLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-slate-500">{log.timestamp}</span>
                  <div>
                    <strong className="text-white">{log.label}</strong>
                    <div className="font-mono text-[10px] text-slate-400">{log.fileName}</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Déposé dans source/
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulateurEDI;
