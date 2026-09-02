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
  ExternalLink
} from 'lucide-react';
import api from '../services/api';
import StatusBadge from './StatusBadge';
import FileViewerModal from './FileViewerModal';

export const VirementDetailModal = ({ isOpen, onClose, virementId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewerFile, setViewerFile] = useState(null); // { type, title }

  useEffect(() => {
    if (isOpen && virementId) {
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
  }, [isOpen, virementId]);

  if (!isOpen) return null;

  const v = data?.virement;
  const bBenif = data?.banqueBeneficiaireInfo;
  const bDonneur = data?.banqueDonneurInfo;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
        <div className="w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Opération RTGS N° {v?.numeroOrdre || '...'}
                  </h3>
                  {v && <StatusBadge statut={v.statut} />}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Remise : {v?.remise?.nomFichier || 'N/A'} • Réf : {v?.remise?.referenceRemise || 'N/A'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Chargement des données détaillées...</span>
              </div>
            ) : v ? (
              <>
                {/* Montant & Libellé Banner */}
                <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Montant du Virement
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                      {Number(v.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} <span className="text-emerald-400 text-lg font-bold">DZD</span>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-slate-400 font-medium">Libellé de l'opération :</span>
                    <div className="text-sm font-semibold text-slate-200 mt-0.5 max-w-md">
                      {v.libelle}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Date valeur : <span className="font-mono text-slate-200">{v.dateValeur}</span>
                    </div>
                  </div>
                </div>

                {/* Donneur d'Ordre vs Bénéficiaire Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Donneur d'Ordre */}
                  <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                      <User className="w-4 h-4 text-emerald-400" />
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        Donneur d'Ordre (Émetteur BDL)
                      </h4>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500">Nom / Raison Sociale :</span>
                        <div className="font-semibold text-slate-200">{v.nomDonneur || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">RIB Complet (20 pos) :</span>
                        <div className="font-mono text-emerald-400 bg-slate-900 px-2 py-1 rounded mt-0.5 select-all">
                          {v.ribDonneur}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-slate-500">Code Banque :</span>
                          <div className="font-semibold text-slate-300">{v.codeBanqueDonneur} ({bDonneur?.nomBanque || 'BDL'})</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Code Agence :</span>
                          <div className="font-semibold text-slate-300">{v.codeAgenceDonneur}</div>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Compte SAB (15 pos) :</span>
                        <div className="font-mono text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded mt-0.5">
                          {v.compteDonneur15}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Adresse :</span>
                        <div className="text-slate-400">{v.adresseDonneur || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Bénéficiaire */}
                  <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
                      <Building className="w-4 h-4 text-sky-400" />
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                        Bénéficiaire (Banque Destinataire)
                      </h4>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500">Nom / Raison Sociale :</span>
                        <div className="font-semibold text-slate-200">{v.nomBeneficiaire || 'N/A'}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">RIB Bénéficiaire (20 pos) :</span>
                        <div className="font-mono text-sky-400 bg-slate-900 px-2 py-1 rounded mt-0.5 select-all">
                          {v.ribBeneficiaire}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-slate-500">Banque Réceptrice :</span>
                          <div className="font-semibold text-slate-300">
                            {v.codeBanqueBeneficiaire} - {bBenif?.nomBanque || 'Banque Tiers'}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-500">BIC SWIFT :</span>
                          <div className="font-mono text-amber-400 font-semibold">{bBenif?.bicSwift || `BK${v.codeBanqueBeneficiaire}DZALXXX`}</div>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Compte Règlement Banque d'Algérie :</span>
                        <div className="font-mono text-slate-300 bg-slate-900/80 px-2 py-0.5 rounded mt-0.5">
                          {bBenif?.compteReglement || `97110000${v.codeBanqueBeneficiaire}`}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Adresse :</span>
                        <div className="text-slate-400">{v.adresseBeneficiaire || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Contrôle Solde Oracle 11g */}
                <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-slate-200">
                        Vérification Solde Core Banking (Oracle 11g - SAB)
                      </span>
                    </div>
                    {v.oracleVerifie && (
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                        Requête SAB Exécutée
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-900">
                      <span className="text-slate-500">Compte Interrogé (15 pos) :</span>
                      <div className="font-mono text-slate-200 font-semibold mt-0.5">{v.compteDonneur15}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900">
                      <span className="text-slate-500">Solde Trouvé dans SAB :</span>
                      <div className="font-mono text-white font-bold mt-0.5">
                        {v.soldeCompteTrouve !== null
                          ? `${Number(v.soldeCompteTrouve).toLocaleString('fr-FR')} DZD`
                          : 'Non vérifié'}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900">
                      <span className="text-slate-500">Décision & Règle :</span>
                      <div className="font-semibold mt-0.5">
                        {v.statut === 'VALIDE_TRAITE' ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Solde Suffisant (OK)
                          </span>
                        ) : v.statut === 'REJETE_SOLDE' ? (
                          <span className="text-rose-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Solde Insuffisant (Rejet)
                          </span>
                        ) : (
                          <span className="text-amber-400">Non éligible RTGS</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {v.motifRejetOuIgnorer && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mt-2">
                      <strong>Motif :</strong> {v.motifRejetOuIgnorer}
                    </div>
                  )}
                </div>

                {/* Section Fichiers Générés */}
                <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Fichiers Produits par le Système
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Fichier SWIFT MT103 */}
                    <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${v.fichierMt103Genere ? 'bg-slate-900/90 border-emerald-500/30' : 'bg-slate-900/30 border-slate-800/40 opacity-50'}`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">SWIFT MT103</span>
                          <FileCode className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {v.fichierMt103Genere || 'Non généré'}
                        </p>
                      </div>
                      {v.fichierMt103Genere && (
                        <button
                          onClick={() => setViewerFile({ type: 'mt103', title: 'Message SWIFT MT103' })}
                          className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Visualiser MT103</span>
                        </button>
                      )}
                    </div>

                    {/* Fichier OD */}
                    <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${v.fichierOdGenere ? 'bg-slate-900/90 border-emerald-500/30' : 'bg-slate-900/30 border-slate-800/40 opacity-50'}`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">Fichier OD (Comptable)</span>
                          <FileText className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {v.fichierOdGenere || 'Non généré'}
                        </p>
                      </div>
                      {v.fichierOdGenere && (
                        <button
                          onClick={() => setViewerFile({ type: 'od', title: 'Fichier OD (Opérations Diverses)' })}
                          className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Visualiser OD</span>
                        </button>
                      )}
                    </div>

                    {/* Fichier SI Retour */}
                    <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${v.fichierSiRetGenere ? 'bg-rose-950/20 border-rose-500/30' : 'bg-slate-900/30 border-slate-800/40 opacity-50'}`}>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-rose-300">Fichier SI Retour</span>
                          <FileText className="w-4 h-4 text-rose-400" />
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          {v.fichierSiRetGenere || 'Non généré'}
                        </p>
                      </div>
                      {v.fichierSiRetGenere && (
                        <button
                          onClick={() => setViewerFile({ type: 'si_ret', title: 'Fichier SI Retour (Rejet)' })}
                          className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold border border-rose-500/30 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Visualiser SI_RET</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Historique des logs / Traçabilité */}
                {v.logs && v.logs.length > 0 && (
                  <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Journal des Événements & Audit
                    </h4>
                    <div className="space-y-2">
                      {v.logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs">
                          <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap pt-0.5">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            log.niveau === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' :
                            log.niveau === 'ERROR' ? 'bg-rose-500/20 text-rose-400' :
                            log.niveau === 'WARNING' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-300'
                          }`}>
                            {log.type}
                          </span>
                          <span className="text-slate-300 flex-1">{log.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-950/70">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

      {/* Nested file preview modal */}
      {viewerFile && (
        <FileViewerModal
          isOpen={true}
          onClose={() => setViewerFile(null)}
          virementId={v.id}
          fileType={viewerFile.type}
          title={viewerFile.title}
        />
      )}
    </>
  );
};

export default VirementDetailModal;
