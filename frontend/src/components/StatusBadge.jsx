import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Database, 
  FileText, 
  Send, 
  Inbox, 
  Copy,
  Layers
} from 'lucide-react';

export const StatusBadge = ({ statut }) => {
  switch (statut) {
    case 'RECU':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 shadow-sm">
          <Inbox className="w-3.5 h-3.5 text-sky-500" />
          Reçu (Attente Lot OD)
        </span>
      );

    case 'OD_GEN':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-sm">
          <Layers className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          OD Généré (Attente SAB)
        </span>
      );

    case 'INTEGRE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-[#772281] dark:text-purple-300 border border-[#772281]/30 shadow-sm">
          <Database className="w-3.5 h-3.5 text-[#772281] dark:text-purple-400 animate-pulse" />
          Intégré SAB (Non Compta)
        </span>
      );

    case 'ENVOYE':
    case 'VALIDE_TRAITE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-sm">
          <Send className="w-3.5 h-3.5 text-emerald-500" />
          Comptabilisé & MT103 Émis
        </span>
      );

    case 'REJETE':
    case 'REJETE_SOLDE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 shadow-sm">
          <XCircle className="w-3.5 h-3.5 text-rose-500" />
          Rejeté (SI Retour Émis)
        </span>
      );

    case 'REJETE_DOUBLON':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 shadow-sm">
          <Copy className="w-3.5 h-3.5 text-rose-500" />
          Rejeté (Doublon Détecté)
        </span>
      );

    case 'IGNORE_FILTRE':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20 shadow-sm">
          <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
          Ignoré (Filtre RTGS)
        </span>
      );

    case 'EN_ATTENTE':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          En attente
        </span>
      );
  }
};

export default StatusBadge;
