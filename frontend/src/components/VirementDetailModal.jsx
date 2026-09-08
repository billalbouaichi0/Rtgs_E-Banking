import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Building, 
  ArrowRight, 
  CreditCard, 
  FileCode, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Database,
  ExternalLink,
  AlertOctagon,
  Check,
  Copy,
  Layers,
  Send,
  Calendar
} from 'lucide-react';
import api from '../services/api';
import StatusBadge from './StatusBadge';
import FileViewerModal from './FileViewerModal';

export const VirementDetailModal = ({ isOpen, onClose, virementId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewerFile, setViewerFile] = useState(null); // { type, title }
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const loadData = () => {
    if (virementId) {
      setLoading(true);
      api.get(`/virements/${virementId}`)
        .then((res) => {
          setData(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Erreur chargement virement', err);
          setLoading(false);
        });
    }
  };

  useEffect(() => {
    if (isOpen && virementId) {
      loadData();
    }
  }, [isOpen, virementId]);

  if (!isOpen) return null;

  const v = data?.virement;
  const bBenif = data?.banqueBeneficiaireInfo;
  const bDonneur = data?.banqueDonneurInfo;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#772281]/15 text-[#772281] dark:text-[#f9b307] border border-[#772281]/30">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Opération RTGS N° {v?.numeroOrdre || '...'}
                  </h3>
                  {v && <StatusBadge statut={v.statut} />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Remise source : <span className="font-mono">{v?.remise?.nomFichier || 'N/A'}</span> (Réf : {v?.remise?.referenceRemise || '001'})
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                <div className="w-8 h-8 border-2 border-[#772281] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-semibold">Chargement des données du virement...</span>
              </div>
            ) : !v ? (
              <div className="text-center py-12 text-rose-400 text-xs font-semibold">
                Impossible de charger les données du virement #{virementId}.
              </div>
            ) : (
              <>
                {/* Montant & Libellé Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-slate-50 to-amber-50 dark:from-[#171026] dark:via-[#0d1322] dark:to-[#1a1528] border border-[#772281]/20 dark:border-[#772281]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Montant de l'opération RTGS
                    </span>
                    <div className="text-2xl font-black text-[#772281] dark:text-[#f9b307] tracking-tight mt-0.5 font-mono">
                      {Number(v.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-sm font-semibold">DZD</span>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Libellé de la transaction
                    </span>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-sm mt-0.5">
                      {v.libelle || 'VIREMENT RTGS'}
                    </div>
                  </div>
                </div>

                {/* Donneur d'ordre vs Bénéficiaire */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Donneur d'ordre */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                      <User className="w-4 h-4 text-[#772281] dark:text-[#f9b307]" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Donneur d'Ordre (Émetteur BDL)
                      </h4>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-500">Nom / Raison Sociale :</span>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{v.nomDonneur || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">RIB Complet (20 pos) :</span>
                        <div className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{v.ribDonneur}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-slate-500">Banque :</span>
                          <div className="font-semibold text-slate-700 dark:text-slate-300">{v.codeBanqueDonneur} - {bDonneur?.nomBanque || 'BDL'}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Agence :</span>
                          <div className="font-mono text-slate-700 dark:text-slate-300">{v.codeAgenceDonneur}</div>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Compte SAB (15 pos) :</span>
                        <div className="font-mono text-[#772281] dark:text-[#f9b307] font-bold">{v.compteDonneur15}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Adresse :</span>
                        <div className="text-slate-600 dark:text-slate-400">{v.adresseDonneur || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Bénéficiaire */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                      <Building className="w-4 h-4 text-[#772281] dark:text-[#f9b307]" />
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Bénéficiaire (Banque Réceptrice)
                      </h4>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-500">Nom du Bénéficiaire :</span>
                        <div className="font-bold text-slate-800 dark:text-slate-200">{v.nomBeneficiaire || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">RIB Bénéficiaire (20 pos) :</span>
                        <div className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{v.ribBeneficiaire}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-slate-500">Banque Réceptrice :</span>
                          <div className="font-semibold text-slate-700 dark:text-slate-300">
                            {v.codeBanqueBeneficiaire} - {bBenif?.nomBanque || 'Banque Tiers'}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500">BIC SWIFT :</span>
                          <div className="font-mono text-[#772281] dark:text-[#f9b307] font-bold">{bBenif?.bicSwift || `BK${v.codeBanqueBeneficiaire}DZALXXX`}</div>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Compte Règlement BA :</span>
                        <div className="font-mono text-slate-700 dark:text-slate-300 bg-slate-200/60 dark:bg-slate-800/80 px-2 py-0.5 rounded mt-0.5">
                          {bBenif?.compteReglement || `97110000${v.codeBanqueBeneficiaire}`}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Adresse :</span>
                        <div className="text-slate-600 dark:text-slate-400">{v.adresseBeneficiaire || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Contrôle Solde Oracle 11g & Clé d'Unicité SAB */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-[#772281] dark:text-[#f9b307]" />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-200">
                        Suivi Comptable Core Banking SAB (Oracle 11g)
                      </span>
                    </div>
                    {v.cleUniciteSab && (
                      <span className="text-[11px] font-mono text-[#772281] dark:text-[#f9b307] bg-[#772281]/10 dark:bg-[#772281]/25 px-2.5 py-0.5 rounded border border-[#772281]/30">
                        Clé: {v.cleUniciteSab}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500">Solde Trouvé SAB :</span>
                      <div className="font-mono text-slate-900 dark:text-white font-bold mt-0.5">
                        {v.soldeCompteTrouve !== null
                          ? `${Number(v.soldeCompteTrouve).toLocaleString('fr-FR')} DZD`
                          : 'Vérifié lors du lot OD'}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500">Statut du Cycle RTGS :</span>
                      <div className="font-semibold mt-0.5">
                        <StatusBadge statut={v.statut} />
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500">Lot OD Lié :</span>
                      <div className="font-mono text-slate-800 dark:text-slate-300 font-semibold mt-0.5 truncate">
                        {v.fichierOdBatch || 'En attente lot'}
                      </div>
                    </div>
                  </div>

                  {v.motifRejetOuIgnorer && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs mt-2">
                      <strong>Motif de Rejet / Information :</strong> {v.motifRejetOuIgnorer}
                    </div>
                  )}
                </div>

                {/* Section Fichiers Générés */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                    Fichiers Produits par le Système
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Fichier Batch OD */}
                    <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${v.fichierOdBatch ? 'bg-white dark:bg-slate-900 border-amber-500/30' : 'bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/40 opacity-60'}`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">Lot OD (ZCPTODA9)</span>
                          <Layers className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {v.fichierOdBatch || 'Non généré'}
                        </p>
                      </div>
                    </div>

                    {/* Fichier SWIFT MT103 */}
                    <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${v.fichierMt103Genere ? 'bg-white dark:bg-slate-900 border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/40 opacity-60'}`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">SWIFT MT103</span>
                          <FileCode className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {v.fichierMt103Genere || 'En attente comptabilisation'}
                        </p>
                      </div>
                      {v.fichierMt103Genere && (
                        <button
                          onClick={() => setViewerFile({ type: 'mt103', title: 'Message SWIFT MT103' })}
                          className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Visualiser MT103</span>
                        </button>
                      )}
                    </div>

                    {/* Fichier SI Retour (Rejet ou Comptabilisé) */}
                    <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${(v.fichierSiRetGenere || v.fichierSiCptGenere) ? 'bg-white dark:bg-slate-900 border-[#772281]/30' : 'bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/40 opacity-60'}`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {v.fichierSiCptGenere ? 'Accusé SI_VIR_CPT' : 'SI Retour (Rejet)'}
                          </span>
                          <FileText className="w-4 h-4 text-[#772281] dark:text-[#f9b307]" />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {v.fichierSiCptGenere || v.fichierSiRetGenere || 'Non généré'}
                        </p>
                      </div>
                      {(v.fichierSiRetGenere || v.fichierSiCptGenere) && (
                        <button
                          onClick={() => setViewerFile({ 
                            type: v.fichierSiCptGenere ? 'si_cpt' : 'si_retour', 
                            title: v.fichierSiCptGenere ? 'Fichier SI_VIR_CPT (Comptabilisé)' : 'Fichier SI_VIR_RJT (Rejet)' 
                          })}
                          className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-[#772281]/15 hover:bg-[#772281]/25 text-[#772281] dark:text-[#f9b307] text-xs font-semibold border border-[#772281]/30 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Visualiser Fichier SI</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

      {/* Quick File Viewer Modal */}
      {viewerFile && (
        <FileViewerModal
          isOpen={true}
          onClose={() => setViewerFile(null)}
          virementId={virementId}
          fileType={viewerFile.type}
          title={viewerFile.title}
        />
      )}
    </>
  );
};

export default VirementDetailModal;
