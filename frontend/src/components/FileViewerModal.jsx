import React, { useState, useEffect } from 'react';
import { X, Copy, Download, Check, FileCode, FileText } from 'lucide-react';
import api from '../services/api';

export const FileViewerModal = ({ isOpen, onClose, virementId, fileType, title }) => {
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && virementId && fileType) {
      setLoading(true);
      setError(null);
      api.get(`/virements/${virementId}/file/${fileType}`)
        .then((res) => {
          setFileData(res.data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.response?.data?.message || 'Erreur lors du chargement du fichier.');
          setLoading(false);
        });
    }
  }, [isOpen, virementId, fileType]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (fileData?.content) {
      navigator.clipboard.writeText(fileData.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (fileData) {
      const blob = new Blob([fileData.content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData.fileName || `${fileType}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {fileType === 'mt103' ? <FileCode className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {title || `Fichier ${fileType.toUpperCase()}`}
              </h3>
              <p className="text-xs text-slate-400">
                {fileData?.fileName || 'Chargement du flux...'}
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
        <div className="flex-1 p-6 overflow-y-auto bg-slate-950/40">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Chargement du contenu...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          ) : (
            <div className="relative group">
              <pre className="p-5 rounded-xl bg-slate-950 border border-slate-800/80 text-emerald-300 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap selection:bg-emerald-500/30 selection:text-white">
                {fileData?.content}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <div className="text-xs text-slate-400">
            {fileData?.fullPath && (
              <span className="font-mono text-[11px] truncate max-w-sm block">
                Chemin : {fileData.fullPath}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              disabled={!fileData}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copié !' : 'Copier'}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={!fileData}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileViewerModal;
