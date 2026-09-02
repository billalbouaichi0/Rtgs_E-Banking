import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';

export const StatusBadge = ({ statut }) => {
  switch (statut) {
    case 'VALIDE_TRAITE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Traité & Validé (OD + MT103)
        </span>
      );
    case 'REJETE_SOLDE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-sm">
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          Rejeté (Solde Insuffisant)
        </span>
      );
    case 'IGNORE_FILTRE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Ignoré (Filtre RTGS)
        </span>
      );
    case 'EN_ATTENTE':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-700/40 text-slate-300 border border-slate-600/30">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          En attente
        </span>
      );
  }
};

export default StatusBadge;
