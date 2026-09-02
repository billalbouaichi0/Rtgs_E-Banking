import React, { useState } from 'react';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Clock, 
  Database,
  FileCode,
  Layers
} from 'lucide-react';
import api from '../services/api';

export const ManualUpload = ({ setActiveTab }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/virements/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data.result);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du traitement du fichier EDI.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">
          Traitement Manuel d'un Fichier EDI
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Déposez une remise EDI pour exécuter immédiatement le parsing, le filtre RTGS et la vérification de solde Oracle SAB.
        </p>
      </div>

      {/* Upload Box */}
      <div className="glass-panel rounded-3xl p-8 space-y-6 shadow-2xl border border-slate-800">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              dragActive
                ? 'border-[#f9b307] bg-[#f9b307]/10'
                : file
                ? 'border-[#772281] bg-[#772281]/10'
                : 'border-slate-700 hover:border-[#772281]/50 bg-slate-900/40'
            }`}
          >
            <input
              type="file"
              id="edi-upload"
              accept=".edi,.txt,.dat"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="edi-upload" className="cursor-pointer block space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#772281]/20 border border-[#772281]/40 text-[#f9b307] flex items-center justify-center shadow-lg">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <span className="text-sm font-bold text-white">
                  {file ? file.name : 'Cliquez pour sélectionner un fichier EDI ou glissez-déposez ici'}
                </span>
                <p className="text-xs text-slate-400 mt-1">
                  Format supporté : Fichier texte EDI positions fixes (Entête VIRM, Corps, Fin FVIR)
                </p>
                {file && (
                  <p className="text-xs text-[#f9b307] font-mono mt-2 font-semibold">
                    Taille : {(file.size / 1024).toFixed(2)} Ko
                  </p>
                )}
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f9b307]"></span>
              Traitement automatique dans <code className="text-slate-300 font-mono">directories/input</code>
            </div>

            <button
              type="submit"
              disabled={!file || uploading}
              className="px-6 py-2.5 rounded-xl bg-[#772281] hover:bg-[#8d2a99] text-white text-xs font-bold shadow-lg shadow-[#772281]/40 flex items-center gap-2 transition-all disabled:opacity-40"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Traitement en cours...</span>
                </>
              ) : (
                <>
                  <span>Lancer le Traitement</span>
                  <ArrowRight className="w-4 h-4 text-[#f9b307]" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Result Summary */}
        {result && (
          <div className="rounded-2xl bg-slate-900 border border-emerald-500/30 p-6 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-sm font-bold text-white">
                  Remise {result.nomFichier} traitée avec succès !
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Statut : {result.statut}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400">Validés (OD + MT103)</span>
                <div className="text-xl font-extrabold text-emerald-400 mt-1">
                  {result.countValides}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400">Rejetés Solde (SI_RET)</span>
                <div className="text-xl font-extrabold text-rose-400 mt-1">
                  {result.countRejetes}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400">Ignorés (Hors Seuil)</span>
                <div className="text-xl font-extrabold text-amber-400 mt-1">
                  {result.countIgnores}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveTab('virements')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <span>Voir les détails dans le Registre</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline Explanation Steps */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Architecture du Pipeline de Traitement Automatisé
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div className="font-bold text-white">Ingestion & Détection</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Surveillance chokidar du répertoire <code className="text-slate-300">source/</code> et transfert vers <code className="text-slate-300">input/</code>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
              2
            </div>
            <div className="font-bold text-white">Filtre RTGS</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Montant ≥ 1 000 000 DZD & Code Banque émetteur ≠ récepteur. Sinon déplacement vers <code className="text-slate-300">input/ignorer</code>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs">
              3
            </div>
            <div className="font-bold text-white">Vérif Solde Oracle</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Requête SQL sur <code className="text-slate-300">sabstd.zcompte0</code> et <code className="text-slate-300">sabstd.zsolde0</code>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <div className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-xs">
              4
            </div>
            <div className="font-bold text-white">Génération Flux</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Si OK : <strong className="text-emerald-400">OD + MT103</strong>.<br />
              Si Rejet : <strong className="text-rose-400">SI_RET_Libelle.txt</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualUpload;
