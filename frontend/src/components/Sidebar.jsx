import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  UploadCloud, 
  PlayCircle, 
  Building2, 
  Database, 
  FileText,
  ShieldCheck,
  Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { isAdmin } = useAuth();

  const navigation = [
    { id: 'dashboard', name: 'Tableau de Bord', icon: LayoutDashboard },
    { id: 'virements', name: 'Virements & Remises', icon: ArrowLeftRight },
    { id: 'upload', name: 'Traitement Manuel EDI', icon: UploadCloud },
    { id: 'simulateur', name: 'Simulateur de Flux', icon: PlayCircle },
    { id: 'banques', name: 'Référentiel Banques DZ', icon: Building2 },
    { id: 'sab', name: 'Comptes SAB (Oracle 11g)', icon: Database },
    { id: 'logs', name: 'Journal d\'Audit & Logs', icon: FileText }
  ];

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-800 bg-slate-950/50 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        {/* Navigation list */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Supervision RTGS
          </p>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600/20 to-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* Info Box - Règles Métier */}
        <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            Règles RTGS BDL
          </div>
          <ul className="text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
            <li>• Seuil : <span className="text-slate-200 font-medium">≥ 1 000 000 DZD</span></li>
            <li>• Éligibilité : <span className="text-slate-200 font-medium">Interbancaire</span></li>
            <li>• Core Banking : <span className="text-slate-200 font-medium">Oracle 11g SAB</span></li>
            <li>• Sorties : <span className="text-emerald-400 font-medium">OD + MT103</span> ou <span className="text-rose-400 font-medium">SI_RET</span></li>
          </ul>
        </div>
      </div>

      {/* Role Indicator Footer */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {isAdmin ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Mode : <strong className="text-slate-200">Administrateur</strong></span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 text-sky-400" />
              <span>Mode : <strong className="text-slate-200">Consultation</strong></span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
