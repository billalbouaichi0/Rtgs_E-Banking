import React, { useState, useEffect } from 'react';
import { Building2, Search, Plus, Edit2, Shield, Check, X } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ReferentielBanques = () => {
  const { isAdmin } = useAuth();
  const [banques, setBanques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingBanque, setEditingBanque] = useState(null);
  const [formData, setFormData] = useState({ codeBanque: '', nomBanque: '', bicSwift: '', compteReglement: '' });
  const [saving, setSaving] = useState(false);

  const fetchBanques = async () => {
    try {
      const res = await api.get('/system/banques');
      setBanques(res.data);
    } catch (err) {
      console.error('Erreur chargement banques', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanques();
  }, []);

  const handleEdit = (b) => {
    setEditingBanque(b);
    setFormData({ ...b });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      await api.post('/system/banques', formData);
      setEditingBanque(null);
      fetchBanques();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const filtered = banques.filter((b) =>
    b.nomBanque.toLowerCase().includes(search.toLowerCase()) ||
    b.codeBanque.includes(search) ||
    b.bicSwift.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Référentiel des Banques Algériennes & BIC SWIFT
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Table de correspondance officielle utilisée pour générer les balises <code className="text-emerald-400 font-mono">:57A:</code> du message MT103
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setEditingBanque({});
              setFormData({ codeBanque: '', nomBanque: '', bicSwift: '', compteReglement: '' });
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une Banque</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par code (003), nom (BEA, BNA, CPA...), ou BIC SWIFT..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Code Banque</th>
                <th className="py-3 px-4">Établissement Bancaire</th>
                <th className="py-3 px-4">Code BIC SWIFT (Tag 57A)</th>
                <th className="py-3 px-4">Compte Règlement Banque d'Algérie</th>
                {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Chargement du référentiel bancaire...
                  </td>
                </tr>
              ) : filtered.map((b) => (
                <tr key={b.codeBanque} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                    {b.codeBanque}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-200">
                    {b.nomBanque}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-amber-400 font-semibold">
                    {b.bicSwift}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {b.compteReglement}
                  </td>
                  {isAdmin && (
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleEdit(b)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Add Modal */}
      {editingBanque && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">
                {editingBanque.codeBanque ? 'Modifier la Banque' : 'Ajouter une Banque'}
              </h3>
              <button
                onClick={() => setEditingBanque(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Code Banque (3 chiffres)</label>
                <input
                  type="text"
                  required
                  maxLength={3}
                  disabled={!!editingBanque.codeBanque}
                  value={formData.codeBanque}
                  onChange={(e) => setFormData({ ...formData, codeBanque: e.target.value })}
                  placeholder="ex: 003"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono disabled:opacity-50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nom de la Banque</label>
                <input
                  type="text"
                  required
                  value={formData.nomBanque}
                  onChange={(e) => setFormData({ ...formData, nomBanque: e.target.value })}
                  placeholder="ex: BEA - BANQUE EXTERIEURE D ALGERIE"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">BIC SWIFT (Tag 57A)</label>
                <input
                  type="text"
                  required
                  maxLength={11}
                  value={formData.bicSwift}
                  onChange={(e) => setFormData({ ...formData, bicSwift: e.target.value.toUpperCase() })}
                  placeholder="ex: BEAADZALXXX"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-amber-400 font-mono text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Compte Règlement Banque d'Algérie</label>
                <input
                  type="text"
                  required
                  value={formData.compteReglement}
                  onChange={(e) => setFormData({ ...formData, compteReglement: e.target.value })}
                  placeholder="ex: 9711000003"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBanque(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg"
                >
                  {saving ? 'Enregistrement...' : 'Sauvegarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferentielBanques;
