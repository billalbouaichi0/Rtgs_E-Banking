import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Shield, Lock, User, AlertCircle, ArrowRight, Sun, Moon } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants invalides ou erreur serveur.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickUser = (userRole) => {
    if (userRole === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('consultant');
      setPassword('consult123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#070a12] p-4 relative overflow-hidden transition-colors duration-200">
      {/* Top right Theme Switch */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-[#772281] dark:hover:text-[#f9b307] shadow-md transition-all text-xs font-semibold"
          title={isDark ? 'Passer en Mode Clair' : 'Passer en Mode Sombre'}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-[#f9b307]" />
              <span>Mode Clair</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-[#772281]" />
              <span>Mode Sombre</span>
            </>
          )}
        </button>
      </div>

      {/* Background ambient decorative glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-[#772281]/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#f9b307]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Card with Official BDL Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-white shadow-xl shadow-[#772281]/25 border border-slate-200 dark:border-slate-700/60 mb-1">
            <img 
              src="/logo-bdl.png" 
              alt="Logo BDL" 
              className="h-10 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Banque de Développement Local
          </h1>
          <p className="text-xs font-bold text-[#772281] dark:text-[#f9b307] tracking-wider uppercase">
            Plateforme RTGS e-Banking • Traitement EDI & MT103
          </p>
        </div>

        {/* Login Form Box */}
        <div className="glass-panel rounded-3xl p-8 shadow-2xl border border-slate-800 space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-100">Authentification Sécurisée</h2>
            <p className="text-xs text-slate-400">
              Veuillez vous identifier pour accéder au terminal RTGS.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Identifiant Agent / Matricule</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin ou consultant"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs font-medium focus:outline-none focus:border-[#f9b307] focus:ring-1 focus:ring-[#f9b307] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Mot de Passe</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs font-medium focus:outline-none focus:border-[#f9b307] focus:ring-1 focus:ring-[#f9b307] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#772281] to-[#9a38a6] hover:from-[#651c6e] hover:to-[#872d93] text-white text-xs font-bold shadow-lg shadow-[#772281]/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Ouvrir la Session</span>
                  <ArrowRight className="w-4 h-4 text-[#f9b307]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Fill Buttons */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <p className="text-[11px] text-center text-slate-500 font-medium">
              Comptes de Démonstration :
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickUser('admin')}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-[#772281]/20 border border-slate-700 hover:border-[#772281]/50 text-[11px] font-semibold text-[#f9b307] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillQuickUser('consultant')}
                className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-[#772281]/20 border border-slate-700 hover:border-[#772281]/50 text-[11px] font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <User className="w-3.5 h-3.5" />
                <span>Consultation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500">
          Banque de Développement Local • DSI RTGS © 2026
        </p>
      </div>
    </div>
  );
};

export default Login;
