import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowUpRight, 
  TrendingUp, 
  DollarSign, 
  FileText, 
  FileCode, 
  ShieldCheck, 
  RefreshCw,
  Zap,
  Building,
  Eye,
  Layers,
  AlertOctagon,
  Check,
  X
} from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import VirementDetailModal from '../components/VirementDetailModal';
import FileViewerModal from '../components/FileViewerModal';

export const Dashboard = ({ setActiveTab }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVirementId, setSelectedVirementId] = useState(null);
  const [quickViewer, setQuickViewer] = useState(null); // { id, type, title }
  const [actionLoading, setActionLoading] = useState({});
  const [actionMessage, setActionMessage] = useState(null);

  const fetchDashboardStats = async () => {
    try {
      const res = await api.get('/stats/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error('Erreur stats dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleValiderVirement = async (virementId) => {
    setActionLoading((prev) => ({ ...prev, [virementId]: 'validating' }));
    setActionMessage(null);
    try {
      const res = await api.post(`/virements/${virementId}/valider`);
      setActionMessage({ type: 'success', text: res.data.message || 'Virement validé avec succès (OD + MT103 générés).' });
      await fetchDashboardStats();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setActionLoading((prev) => ({ ...prev, [virementId]: null }));
    }
  };

  const handleRefuserVirement = async (virementId) => {
    setActionLoading((prev) => ({ ...prev, [virementId]: 'refusing' }));
    setActionMessage(null);
    try {
      const res = await api.post(`/virements/${virementId}/refuser`, {
        motif: 'Refus manuel pour solde insuffisant dans SAB (DZD)'
      });
      setActionMessage({ type: 'success', text: res.data.message || 'Virement refusé (Fichier SI Retour généré).' });
      await fetchDashboardStats();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.message || err.message });
    } finally {
      setActionLoading((prev) => ({ ...prev, [virementId]: null }));
    }
  };

  const k = stats?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="rounded-3xl bdl-gradient-corporate p-6 sm:p-8 text-white shadow-xl shadow-[#772281]/20 relative overflow-hidden border border-[#772281]/40">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 transform origin-top-right pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-[#f9b307] border border-[#f9b307]/30">
              <ShieldCheck className="w-4 h-4 text-[#f9b307]" />
              <span>Supervision Centrale RTGS • Banque du Développement Local (BDL)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tableau de Bord des Flux Interbancaires
            </h1>
            <p className="text-xs sm:text-sm text-purple-100/90 max-w-2xl leading-relaxed">
              Traitement temps réel des remises EDI, contrôle du solde SAB (Oracle 11g), détection anti-doublons et génération automatisée des messages SWIFT MT103, OD et SI Retour.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('simulateur')}
              className="px-4 py-2.5 rounded-xl bg-[#f9b307] text-[#772281] hover:bg-[#e0a006] text-xs font-bold shadow-lg shadow-[#f9b307]/20 transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-[#772281]" />
              <span>Simuler un Flux</span>
            </button>
            <button
              onClick={() => { setLoading(true); fetchDashboardStats(); }}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
              title="Rafraîchir les métriques"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Validé & Traité (OD + MT103) */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Validés RTGS (OD + MT103)
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {Number(k.totalMontantValide || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-emerald-400">DZD</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              <strong className="text-slate-200">{k.validesCount || 0}</strong> virement(s) générés avec succès
            </p>
          </div>
        </div>

        {/* En Attente de Décision Solde (NOUVEAU) */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 space-y-3 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Alertes Solde Insuffisant
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-amber-300">
              {Number(k.totalMontantAttente || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-amber-400">DZD</span>
            </div>
            <p className="text-xs text-amber-200/80 mt-1">
              <strong className="text-amber-100">{k.attenteSoldeCount || 0}</strong> virement(s) en attente de décision
            </p>
          </div>
        </div>

        {/* Rejetés Solde Insuffisant */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Refusés (SI Retour)
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {Number(k.totalMontantRejete || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-rose-400">DZD</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              <strong className="text-slate-200">{k.rejetesCount || 0}</strong> virement(s) avec fichier SI_RET
            </p>
          </div>
        </div>

        {/* Ignorés (Filtre RTGS) */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ignorés (Filtre RTGS)
            </span>
            <div className="p-2 rounded-xl bg-slate-500/10 text-slate-400 border border-slate-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {Number(k.totalMontantIgnore || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-slate-400">DZD</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              <strong className="text-slate-200">{k.ignoresCount || 0}</strong> opération(s) dans <code className="text-slate-300 text-[10px]">input/ignorer</code>
            </p>
          </div>
        </div>
      </div>

      {/* SECTION ALERTES SOLDE : Décision Requise (Validation / Refus) */}
      {stats?.alertesSolde && stats.alertesSolde.length > 0 && (
        <div className="rounded-2xl bg-amber-950/30 border border-amber-500/40 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertOctagon className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-amber-300">
                  Virements en attente de décision Solde ({stats.alertesSolde.length})
                </h3>
                <p className="text-xs text-amber-200/70">
                  Le solde du compte donneur d'ordre est insuffisant. Vous pouvez forcer la validation (OD + MT103) ou refuser (Génération SI Retour).
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.alertesSolde.map((v) => (
              <div key={v.id} className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      N° {v.numeroOrdre}
                    </span>
                    <h4 className="text-xs font-bold text-white mt-1">{v.libelle}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Donneur : <strong className="text-slate-200">{v.nomDonneur}</strong> ({v.compteDonneur15})
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Bénéficiaire : <strong className="text-slate-200">{v.nomBeneficiaire}</strong> (Banque {v.codeBanqueBeneficiaire})
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-extrabold text-white">
                      {Number(v.montant).toLocaleString('fr-FR')} DZD
                    </div>
                    <div className="text-[10px] text-rose-400 mt-0.5">
                      Solde SAB : {v.soldeCompteTrouve !== null ? `${Number(v.soldeCompteTrouve).toLocaleString('fr-FR')} DZD` : '0 DZD'}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setSelectedVirementId(v.id)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Détails</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={!!actionLoading[v.id]}
                      onClick={() => handleRefuserVirement(v.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{actionLoading[v.id] === 'refusing' ? 'Refus...' : 'Refuser (SI_RET)'}</span>
                    </button>
                    <button
                      disabled={!!actionLoading[v.id]}
                      onClick={() => handleValiderVirement(v.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{actionLoading[v.id] === 'validating' ? 'Validation...' : 'Valider (OD+MT)'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid: Banques Répartition & Recent Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Banques Réceptrices RTGS */}
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Distribution par Banque Bénéficiaire
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('banques')}
              className="text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Référentiel</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {stats?.banqueDistribution && stats.banqueDistribution.length > 0 ? (
              stats.banqueDistribution.map((b, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-400">
                      {b.codeBanqueBeneficiaire}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">
                        Banque Code {b.codeBanqueBeneficiaire}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {b.count} opération(s)
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-white">
                      {Number(b.totalMontant).toLocaleString('fr-FR')} DZD
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                Aucune donnée de distribution disponible pour le moment.
              </div>
            )}
          </div>
        </div>

        {/* Dernières Opérations */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Flux Récents Traités
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('virements')}
              className="text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Voir tout ({k.totalVirements || 0})</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-800 font-semibold text-[11px]">
                  <th className="pb-2.5">N° Ordre</th>
                  <th className="pb-2.5">Bénéficiaire</th>
                  <th className="pb-2.5">Montant</th>
                  <th className="pb-2.5">Statut</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {stats?.recentsVirements && stats.recentsVirements.length > 0 ? (
                  stats.recentsVirements.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 font-mono font-medium text-slate-300">
                        {v.numeroOrdre}
                      </td>
                      <td className="py-3">
                        <div className="font-semibold text-slate-200">{v.nomBeneficiaire || 'N/A'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {v.codeBanqueBeneficiaire} • {v.ribBeneficiaire?.substring(0, 10)}...
                        </div>
                      </td>
                      <td className="py-3 font-extrabold text-white">
                        {Number(v.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DZD
                      </td>
                      <td className="py-3">
                        <StatusBadge statut={v.statut} />
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {v.statut === 'ATTENTE_VALIDATION_SOLDE' && (
                            <>
                              <button
                                onClick={() => handleRefuserVirement(v.id)}
                                className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-[10px] font-bold"
                                title="Refuser (SI_RET)"
                              >
                                Refuser
                              </button>
                              <button
                                onClick={() => handleValiderVirement(v.id)}
                                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                                title="Valider (OD+MT)"
                              >
                                Valider
                              </button>
                            </>
                          )}
                          {v.fichierMt103Genere && (
                            <button
                              onClick={() => setQuickViewer({ id: v.id, type: 'mt103', title: 'SWIFT MT103' })}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              title="Voir SWIFT MT103"
                            >
                              <FileCode className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {v.fichierOdGenere && (
                            <button
                              onClick={() => setQuickViewer({ id: v.id, type: 'od', title: 'Fichier OD' })}
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              title="Voir Fichier OD"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {v.fichierSiRetGenere && (
                            <button
                              onClick={() => setQuickViewer({ id: v.id, type: 'si_ret', title: 'Fichier SI Retour' })}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              title="Voir SI Retour"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedVirementId(v.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="Détails complets"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Aucun virement n'a encore été traité. Utilisez le <strong>Simulateur</strong> ou l'<strong>Import Manuel</strong>.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modales */}
      {selectedVirementId && (
        <VirementDetailModal
          isOpen={true}
          onClose={() => { setSelectedVirementId(null); fetchDashboardStats(); }}
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

export default Dashboard;
