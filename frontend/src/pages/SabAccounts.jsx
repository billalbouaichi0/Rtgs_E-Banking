import React, { useState, useEffect } from 'react';
import { Database, Plus, RefreshCw, Edit3, Code, ShieldCheck, Check } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const SabAccounts = () => {
  const { isAdmin } = useAuth();
  const [data, setData] = useState({ isSimulatorMode: true, accounts: [] });
  const [loading, setLoading] = useState(true);
  const [comptecom, setComptecom] = useState('');
  const [soldeDinar, setSoldeDinar] = useState('');
  const [updating, setUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/system/oracle-accounts');
      setData(res.data);
    } catch (err) {
      console.error('Erreur chargement comptes SAB', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!isAdmin || !comptecom) return;
    setUpdating(true);
    try {
      await api.post('/system/oracle-accounts', {
        comptecom,
        soldeDinar: Number(soldeDinar)
      });
      setSuccessMsg(`Solde du compte ${comptecom} mis à jour avec succès.`);
      setComptecom('');
      setSoldeDinar('');
      fetchAccounts();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur');
    } finally {
      setUpdating(false);
    }
  };

  const fillForEdit = (acc) => {
    setComptecom(acc.comptecom);
    setSoldeDinar((acc.soldecen / 100).toString());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Comptes SAB & Moteur de Solde Oracle 11g
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Gestion des soldes donneurs d'ordres pour la vérification automatique des provisions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {data.isSimulatorMode ? 'Simulateur SAB Actif' : 'Oracle 11g Connecté'}
          </span>
          <button
            onClick={fetchAccounts}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* SQL Specification Banner */}
      <div className="glass-panel rounded-2xl p-5 space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
          <Code className="w-4 h-4 text-emerald-400" />
          <span>Requête SQL Oracle 11g de Référence (SAB Core Banking)</span>
        </div>
        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 leading-relaxed overflow-x-auto whitespace-pre">
{`SELECT s.soldecen, c.comptecom
FROM sabstd.zcompte0 c
LEFT JOIN sabstd.zsolde0 s ON trim(c.comptecom) = trim(s.soldecom)
WHERE c.comptedev = 'DZD' AND length(trim(c.comptecom)) = 15
  AND trim(c.comptecom) = 'Compte_donneur_ordre'
GROUP BY c.comptecom, s.soldecen;`}
        </pre>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table of Accounts */}
        <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Comptes Définis dans SAB ({data.accounts.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Compte SAB (15 pos)</th>
                  <th className="py-3 px-4">Devise</th>
                  <th className="py-3 px-4">Solde en Centimes</th>
                  <th className="py-3 px-4">Solde en Dinars (DZD)</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Modifier</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {data.accounts.map((acc, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {acc.comptecom}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-300">
                      {acc.comptedev}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {acc.soldecen?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-emerald-400 font-mono">
                      {(acc.soldecen / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DZD
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => fillForEdit(acc)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Modifier le solde"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Update / Add Solde Form (Admin) */}
        {isAdmin ? (
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white">
                Mettre à Jour un Solde Donneur
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ajustez le solde pour tester immédiatement les scénarios de validation ou de rejet (SI_RET).
              </p>
            </div>

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Numéro de Compte (15 positions)
                </label>
                <input
                  type="text"
                  required
                  maxLength={15}
                  value={comptecom}
                  onChange={(e) => setComptecom(e.target.value)}
                  placeholder="ex: 001334002181530"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Nouveau Solde en Dinars (DZD)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="1000"
                  value={soldeDinar}
                  onChange={(e) => setSoldeDinar(e.target.value)}
                  placeholder="ex: 50000000"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-emerald-400 font-mono text-xs font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition-colors flex items-center justify-center gap-2"
              >
                {updating ? 'Mise à jour...' : 'Appliquer le Nouveau Solde'}
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-6 text-center text-slate-400 text-xs space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-slate-500" />
            <p>La modification des soldes est réservée au profil <strong>Administrateur</strong>.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SabAccounts;
