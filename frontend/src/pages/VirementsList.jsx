import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  FileCode, 
  FileText, 
  Eye, 
  Download, 
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Check,
  X
} from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import VirementDetailModal from '../components/VirementDetailModal';
import FileViewerModal from '../components/FileViewerModal';

export const VirementsList = () => {
  const [virements, setVirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('ALL');
  const [codeBanque, setCodeBanque] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedVirementId, setSelectedVirementId] = useState(null);
  const [quickViewer, setQuickViewer] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [notification, setNotification] = useState(null);

  const fetchVirements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/virements', {
        params: {
          search,
          statut,
          codeBanque,
          page,
          limit: 15
        }
      });
      setVirements(res.data.data);
      setTotalPages(res.data.totalPages);
      setTotalCount(res.data.total);
    } catch (err) {
      console.error('Erreur chargement virements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVirements();
  }, [page, statut, codeBanque]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchVirements();
  };

  const handleValiderVirement = async (virementId) => {
    setActionLoading((prev) => ({ ...prev, [virementId]: 'validating' }));
    try {
      const res = await api.post(`/virements/${virementId}/valider`);
      setNotification({ type: 'success', text: res.data.message || 'Virement validé avec succès (OD et MT103 générés).' });
      await fetchVirements();
    } catch (err) {
      setNotification({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setActionLoading((prev) => ({ ...prev, [virementId]: null }));
    }
  };

  const handleRefuserVirement = async (virementId) => {
    setActionLoading((prev) => ({ ...prev, [virementId]: 'refusing' }));
    try {
      const res = await api.post(`/virements/${virementId}/refuser`, {
        motif: 'Refusé manuellement pour solde insuffisant dans SAB'
      });
      setNotification({ type: 'success', text: res.data.message || 'Virement refusé (Fichier SI Retour généré).' });
      await fetchVirements();
    } catch (err) {
      setNotification({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setActionLoading((prev) => ({ ...prev, [virementId]: null }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Registre des Virements & Remises EDI
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Consultation, recherche multi-critères et validation manuelle des flux RTGS ({totalCount} opérations)
          </p>
        </div>

        <button
          onClick={fetchVirements}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
          notification.type === 'success'
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="glass-panel rounded-2xl p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par N° ordre, libellé, RIB, nom..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#772281]"
            />
          </div>

          {/* Statut Selector */}
          <div className="sm:col-span-4">
            <select
              value={statut}
              onChange={(e) => { setStatut(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 text-xs focus:outline-none focus:border-[#772281]"
            >
              <option value="ALL">Tous les Statuts</option>
              <option value="ATTENTE_VALIDATION_SOLDE">🚨 Solde Insuffisant (Action Requise)</option>
              <option value="VALIDE_TRAITE">Traités & Validés (OD + MT103)</option>
              <option value="REJETE_DOUBLON">🚫 Rejetés pour Doublon (SI Retour)</option>
              <option value="REJETE_SOLDE">Refusés / Rejetés Solde (SI Retour)</option>
              <option value="IGNORE_FILTRE">Ignorés (Filtre RTGS)</option>
              <option value="EN_ATTENTE">En Attente</option>
            </select>
          </div>

          {/* Code Banque Bénéficiaire */}
          <div className="sm:col-span-2">
            <input
              type="text"
              value={codeBanque}
              onChange={(e) => { setCodeBanque(e.target.value); setPage(1); }}
              placeholder="Code Banque (ex: 003)"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#772281]"
            />
          </div>

          {/* Submit */}
          <div className="sm:col-span-1">
            <button
              type="submit"
              className="w-full h-full py-2 rounded-xl bg-[#772281] hover:bg-[#8d2a99] text-white text-xs font-bold shadow-lg shadow-[#772281]/30 transition-colors flex items-center justify-center"
            >
              Filtrer
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">N° Ordre</th>
                <th className="py-3 px-4">Donneur d'Ordre (BDL)</th>
                <th className="py-3 px-4">Bénéficiaire & Banque</th>
                <th className="py-3 px-4">Montant (DZD)</th>
                <th className="py-3 px-4">Solde SAB</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions Flux</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Chargement du registre...</span>
                    </div>
                  </td>
                </tr>
              ) : virements.length > 0 ? (
                virements.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-300">
                      <div>{v.numeroOrdre}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                        {v.remise?.nomFichier}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{v.nomDonneur || 'N/A'}</div>
                      <div className="text-[10px] font-mono text-slate-500">{v.compteDonneur15}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{v.nomBeneficiaire || 'N/A'}</div>
                      <div className="text-[10px] font-mono text-emerald-400">
                        Banque Code: <strong>{v.codeBanqueBeneficiaire}</strong> • RIB: {v.ribBeneficiaire?.substring(0, 10)}...
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-white">
                      {Number(v.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-300">
                      {v.soldeCompteTrouve !== null ? `${Number(v.soldeCompteTrouve).toLocaleString('fr-FR')} DZD` : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge statut={v.statut} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {v.statut === 'ATTENTE_VALIDATION_SOLDE' && (
                          <div className="flex items-center gap-1 mr-1">
                            <button
                              disabled={!!actionLoading[v.id]}
                              onClick={() => handleRefuserVirement(v.id)}
                              className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-[10px] font-bold"
                              title="Refuser (Générer SI Retour)"
                            >
                              Refuser
                            </button>
                            <button
                              disabled={!!actionLoading[v.id]}
                              onClick={() => handleValiderVirement(v.id)}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow"
                              title="Valider (Générer OD + MT103)"
                            >
                              Valider
                            </button>
                          </div>
                        )}
                        {v.fichierMt103Genere && (
                          <button
                            onClick={() => setQuickViewer({ id: v.id, type: 'mt103', title: `SWIFT MT103 - ${v.numeroOrdre}` })}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            title="Voir SWIFT MT103"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {v.fichierOdGenere && (
                          <button
                            onClick={() => setQuickViewer({ id: v.id, type: 'od', title: `Fichier OD - ${v.numeroOrdre}` })}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            title="Voir Fichier OD"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {v.fichierSiRetGenere && (
                          <button
                            onClick={() => setQuickViewer({ id: v.id, type: 'si_ret', title: `SI Retour - ${v.numeroOrdre}` })}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            title="Voir SI Retour"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedVirementId(v.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Détails complets & audit"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Aucun virement ne correspond aux critères de recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
            <span className="text-xs text-slate-400">
              Page <strong className="text-white">{page}</strong> sur <strong className="text-white">{totalPages}</strong> ({totalCount} éléments)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-30 hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 disabled:opacity-30 hover:bg-slate-800"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      {selectedVirementId && (
        <VirementDetailModal
          isOpen={true}
          onClose={() => { setSelectedVirementId(null); fetchVirements(); }}
          virementId={selectedVirementId}
        />
      )}

      {quickViewer && (
        <FileViewerModal
          isOpen={true}
          onClose={() => setQuickViewer(null)}
          virementId={quickViewer.id}
          fileType={quickViewer.type}
          title={quickViewer.title}
        />
      )}
    </div>
  );
};

export default VirementsList;
