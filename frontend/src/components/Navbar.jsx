import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Shield, 
  User as UserIcon, 
  LogOut, 
  Power,
  RefreshCw
} from 'lucide-react';
import api from '../services/api';

export const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand BDL with Official Logo */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center justify-center h-10 px-2.5 rounded-xl bg-white/95 border border-slate-700 shadow-md shadow-[#772281]/20">
            <img 
              src="/logo-bdl.png" 
              alt="Logo BDL" 
              className="h-7 w-auto object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-base sm:text-lg">
                BDL <span className="text-[#f9b307]">RTGS</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#772281]/20 text-[#e293f0] border border-[#772281]/40">
                e-Banking
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Traitement EDI • SWIFT MT103 • SAB Core Banking
            </p>
          </div>
        </div>

        {/* Watcher Status & User Info */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Watcher Live Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
            <span className="relative flex h-2 w-2">
              {watcherStatus?.isRunning && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f9b307] opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${watcherStatus?.isRunning ? 'bg-[#f9b307]' : 'bg-rose-500'}`}></span>
            </span>
            <span className="text-slate-300 font-medium hidden md:inline">Surveillance Dossier :</span>
            <span className={`font-semibold ${watcherStatus?.isRunning ? 'text-[#f9b307]' : 'text-rose-400'}`}>
              {watcherStatus?.isRunning ? 'ACTIF' : 'ARRÊTÉ'}
            </span>
            {isAdmin && (
              <button
                onClick={handleToggleWatcher}
                disabled={loadingToggle}
                title={watcherStatus?.isRunning ? 'Arrêter la surveillance' : 'Démarrer la surveillance'}
                className="ml-1 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <Power className={`w-3.5 h-3.5 ${watcherStatus?.isRunning ? 'text-[#f9b307]' : 'text-slate-500'}`} />
              </button>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-200">{user?.fullName || user?.username}</div>
              <div className="text-[10px] font-bold text-[#f9b307] uppercase tracking-wider">
                {user?.role === 'administrateur' ? 'Administrateur' : 'Consultation'}
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-[#772281]/20 border border-[#772281]/40 flex items-center justify-center text-[#e293f0] font-bold text-xs">
              {user?.role === 'administrateur' ? (
                <Shield className="w-4 h-4 text-[#f9b307]" />
              ) : (
                <UserIcon className="w-4 h-4 text-sky-400" />
              )}
            </div>
            <button
              onClick={logout}
              title="Déconnexion"
              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/20 transition-all"
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
