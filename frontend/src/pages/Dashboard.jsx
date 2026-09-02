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
  Layers
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

  const k = stats?.kpis || {};

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="rounded-3xl bdl-gradient-header p-6 sm:p-8 text-white shadow-xl shadow-emerald-950/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 transform origin-top-right pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-emerald-100 border border-white/20">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Supervision Centrale RTGS • BDL Alger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tableau de Bord des Flux Interbancaires
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/80 max-w-2xl leading-relaxed">
              Traitement temps réel des remises EDI, contrôle du solde SAB (Oracle 11g) et génération automatisée des messages SWIFT MT103, OD et SI Retour.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('simulateur')}
              className="px-4 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold shadow-lg transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-emerald-700" />
              <span>Simuler un Flux</span>
            </button>
            <button
              onClick={() => { setLoading(true); fetchDashboardStats(); }}
              className="p-2.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-900 text-white border border-emerald-400/30 transition-all"
              title="Rafraîchir les métriques"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

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

        {/* Rejetés Solde Insuffisant */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Rejets Solde (SI Retour)
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
              <strong className="text-slate-200">{k.rejetesCount || 0}</strong> virement(s) en solde insuffisant SAB
            </p>
          </div>
        </div>

        {/* Ignorés (Filtre RTGS) */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Ignorés (Hors Seuil / Intrabancaire)
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {Number(k.totalMontantIgnore || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-xs font-bold text-amber-400">DZD</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              <strong className="text-slate-200">{k.ignoresCount || 0}</strong> opération(s) déplacée(s) vers <code className="text-slate-300 text-[10px]">input/ignorer</code>
            </p>
          </div>
        </div>

        {/* Volume Global & Taux de Validation */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Taux de Succès Global
            </span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-white">
              {k.tauxValidation || 0}%
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Total analysé : <strong className="text-slate-200">{k.totalVirements || 0}</strong> opérations
            </p>
          </div>
        </div>
      </div>

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
          onClose={() => setSelectedVirementId(null)}
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
