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
  Eye,
  Users
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

  if (isAdmin) {
    navigation.push({ id: 'users', name: 'Gestion Utilisateurs', icon: Users });
  }

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-200/80 dark:border-slate-800/80 bg-slate-50/90 dark:bg-[#070a12]/60 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)] transition-colors duration-200">
      <div className="space-y-6">
        {/* Navigation list */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
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
                    ? 'bg-gradient-to-r from-[#772281]/25 to-[#f9b307]/15 text-[#772281] dark:text-white border border-[#772281]/40 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#772281] dark:text-[#f9b307]' : 'text-slate-500 dark:text-slate-400'}`} />
                <span className={isActive ? 'font-bold' : ''}>{item.name}</span>
              </button>
            );
          })}
        </div>

        {/* Info Box - Règles Métier BDL */}
        <div className="rounded-2xl bg-gradient-to-br from-purple-50 to-slate-100 dark:from-[#171026] dark:to-[#0d1322] border border-[#772281]/20 dark:border-[#772281]/30 p-3.5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f9b307] shadow-sm shadow-[#f9b307]/50"></div>
            Règles RTGS BDL
          </div>
          <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
            <li>• Seuil : <span className="text-[#772281] dark:text-[#f9b307] font-semibold">≥ 1 000 000 DZD</span></li>
            <li>• Éligibilité : <span className="text-slate-700 dark:text-slate-200 font-medium">Interbancaire</span></li>
            <li>• Core Banking : <span className="text-slate-700 dark:text-slate-200 font-medium">Oracle 11g SAB</span></li>
            <li>• Sorties : <span className="text-emerald-600 dark:text-emerald-400 font-medium">OD + MT103</span> ou <span className="text-rose-600 dark:text-rose-400 font-medium">SI_RET</span></li>
          </ul>
        </div>
      </div>

      {/* Role Indicator Footer */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {isAdmin ? (
            <>
              <ShieldCheck className="w-4 h-4 text-[#772281] dark:text-[#f9b307]" />
              <span>Mode : <strong className="text-slate-800 dark:text-slate-200">Administrateur</strong></span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              <span>Mode : <strong className="text-slate-800 dark:text-slate-200">Consultation</strong></span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
