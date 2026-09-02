import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Building2, 
  Shield, 
  User as UserIcon, 
  LogOut, 
  Power,
  RefreshCw,
  Sun,
  Moon
} from 'lucide-react';
import api from '../services/api';

export const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const [watcherStatus, setWatcherStatus] = useState(null);
  const [loadingToggle, setLoadingToggle] = useState(false);

  const fetchWatcherStatus = async () => {
    try {
      const res = await api.get('/system/watcher-status');
      setWatcherStatus(res.data);
    } catch (e) {
      console.error('Erreur statut watcher', e);
    }
  };

  useEffect(() => {
    fetchWatcherStatus();
    const interval = setInterval(fetchWatcherStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleWatcher = async () => {
    if (!isAdmin) return;
    try {
      setLoadingToggle(true);
      const action = watcherStatus?.isRunning ? 'stop' : 'start';
      const res = await api.post('/system/watcher-toggle', { action });
      setWatcherStatus(res.data);
    } catch (e) {
      console.error('Erreur toggle watcher', e);
    } finally {
      setLoadingToggle(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#090d16]/90 backdrop-blur-xl transition-colors duration-200">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand BDL with Official Logo */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center h-10 px-2.5 rounded-xl bg-white border border-slate-200 dark:border-slate-700 shadow-md shadow-[#772281]/15">
            <img 
              src="/logo-bdl.png" 
              alt="Logo BDL" 
              className="h-7 w-auto object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-slate-900 dark:text-white text-base sm:text-lg">
                BDL <span className="text-[#f9b307]">RTGS</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#772281]/15 text-[#772281] dark:text-[#e293f0] border border-[#772281]/30">
                e-Banking
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Traitement EDI • SWIFT MT103 • SAB Core Banking
            </p>
          </div>
        </div>

        {/* Watcher Status, Theme Toggle & User Info */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme Toggle Button (Light / Dark Switch) */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#772281] dark:hover:text-[#f9b307] transition-all shadow-sm"
            title={isDark ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-[#f9b307]" />
                <span className="text-[11px] font-bold hidden lg:inline">Mode Clair</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-[#772281]" />
                <span className="text-[11px] font-bold hidden lg:inline">Mode Sombre</span>
              </>
            )}
          </button>

          {/* Watcher Live Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 text-xs">
            <span className="relative flex h-2 w-2">
              {watcherStatus?.isRunning && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b307] opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${watcherStatus?.isRunning ? 'bg-[#f9b307]' : 'bg-rose-500'}`}></span>
            </span>
            <span className="text-slate-600 dark:text-slate-300 font-medium hidden md:inline">Surveillance Dossier :</span>
            <span className={`font-semibold ${watcherStatus?.isRunning ? 'text-[#772281] dark:text-[#f9b307]' : 'text-rose-600 dark:text-rose-400'}`}>
              {watcherStatus?.isRunning ? 'ACTIF' : 'ARRÊTÉ'}
            </span>
            {isAdmin && (
              <button
                onClick={handleToggleWatcher}
                disabled={loadingToggle}
                title={watcherStatus?.isRunning ? 'Arrêter la surveillance' : 'Démarrer la surveillance'}
                className="ml-1 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <Power className={`w-3.5 h-3.5 ${watcherStatus?.isRunning ? 'text-[#772281] dark:text-[#f9b307]' : 'text-slate-400 dark:text-slate-500'}`} />
              </button>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-300 dark:border-slate-800">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{user?.fullName || user?.username}</div>
              <div className="text-[10px] font-bold text-[#772281] dark:text-[#f9b307] uppercase tracking-wider">
                {user?.role === 'administrateur' ? 'Administrateur' : 'Consultation'}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#772281]/15 dark:bg-[#772281]/20 border border-[#772281]/30 dark:border-[#772281]/40 flex items-center justify-center text-[#772281] dark:text-[#e293f0] font-bold text-xs">
              {user?.role === 'administrateur' ? (
                <Shield className="w-4 h-4 text-[#772281] dark:text-[#f9b307]" />
              ) : (
                <UserIcon className="w-4 h-4 text-sky-500 dark:text-sky-400" />
              )}
            </div>
            <button
              onClick={logout}
              title="Déconnexion"
              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
