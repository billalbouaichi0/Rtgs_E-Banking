import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Eye, 
  EyeOff,
  Sun,
  Moon
} from 'lucide-react';
import api from '../services/api';

export const ResetPassword = () => {
  const { toggleTheme, isDark } = useTheme();
  const [token, setToken] = useState('');
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenValidating, setTokenValidating] = useState(true);
  const [tokenError, setTokenError] = useState(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');

    if (!tokenParam) {
      setTokenError('Aucun jeton de réinitialisation fourni dans le lien.');
      setTokenValidating(false);
      return;
    }

    setToken(tokenParam);

    // Vérifier la validité du token auprès du backend
    api.get(`/auth/verify-reset-token/${tokenParam}`)
      .then((res) => {
        setTokenInfo(res.data);
        setTokenValidating(false);
      })
      .catch((err) => {
        setTokenError(err.response?.data?.message || 'Ce lien de réinitialisation est invalide ou a expiré (validité 24h).');
        setTokenValidating(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (password.length < 6) {
      setSubmitError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Les mots de passe saisis ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: password
      });
      setIsSuccess(true);
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Échec de la réinitialisation du mot de passe.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#070a12] flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors duration-200">
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

      {/* Background Decorative Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#772281]/25 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#f9b307]/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header Branding with Logo */}
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
          <p className="text-xs text-[#772281] dark:text-[#f9b307] font-bold tracking-wider uppercase">
            Initialisation du Mot de Passe RTGS
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6">
          {tokenValidating ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-[#f9b307] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs">Vérification de la validité du lien...</span>
            </div>
          ) : tokenError ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Lien Invalide ou Expiré</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                {tokenError}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => window.location.href = '/login'}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  Retour à la page de connexion
                </button>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="space-y-4 text-center py-4 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-[#772281]/20 border border-[#772281]/40 text-[#e293f0] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-[#f9b307]" />
              </div>
              <h3 className="text-lg font-bold text-white">Mot de Passe Défini avec Succès !</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Votre mot de passe a été mis à jour et votre compte est prêt à être utilisé.
              </p>
              <div className="pt-3">
                <button
                  onClick={() => window.location.href = '/login'}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#772281] to-[#9a38a6] hover:from-[#651c6e] hover:to-[#872d93] text-white text-xs font-bold shadow-lg shadow-[#772281]/40 transition-all flex items-center justify-center gap-2"
                >
                  <span>Accéder à la Connexion</span>
                  <ArrowRight className="w-4 h-4 text-[#f9b307]" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* User badge */}
              {tokenInfo && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Compte :</span>
                    <div className="font-semibold text-slate-200">{tokenInfo.fullName || tokenInfo.username}</div>
                  </div>
                  <div className="font-mono text-[#f9b307] font-bold bg-[#f9b307]/10 px-2 py-0.5 rounded border border-[#f9b307]/30">
                    {tokenInfo.username}
                  </div>
                </div>
              )}

              {submitError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                  {submitError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Nouveau Mot de Passe *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Au moins 6 caractères"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#f9b307]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Confirmer le Mot de Passe *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ressaisissez le mot de passe"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#f9b307]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#772281] to-[#9a38a6] hover:from-[#651c6e] hover:to-[#872d93] text-white text-xs font-bold shadow-lg shadow-[#772281]/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4 text-[#f9b307]" />
                  <span>{submitting ? 'Enregistrement...' : 'Définir mon Mot de Passe'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security Notice */}
        <p className="text-center text-[11px] text-slate-500">
          Banque de Développement Local • Plateforme Sécurisée RTGS DSI
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
