import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  HardDrive, 
  Server, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Save, 
  Eye, 
  EyeOff, 
  ArrowRightLeft,
  FolderInput,
  FolderOutput,
  FileText,
  Radio
} from 'lucide-react';
import api from '../services/api';

const FOLDER_ICONS = {
  source: FolderInput,
  generated_od: FolderOutput,
  si_retour: AlertTriangle,
  generated_mt103: Radio
};

export const FolderConfigs = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFolderKey, setActiveFolderKey] = useState('source');
  const [formState, setFormState] = useState({});
  const [showPassword, setShowPassword] = useState({});
  const [testResults, setTestResults] = useState({});
  const [testingKey, setTestingKey] = useState(null);
  const [savingKey, setSavingKey] = useState(null);
  const [syncingSource, setSyncingSource] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/system/folders-config');
      setConfigs(res.data);
      
      const initialForm = {};
      res.data.forEach(cfg => {
        initialForm[cfg.folderKey] = { ...cfg };
      });
      setFormState(initialForm);
    } catch (err) {
      console.error('Erreur chargement configurations dossiers:', err);
      setFeedbackMsg({ type: 'error', text: 'Impossible de charger la configuration des dossiers.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleInputChange = (folderKey, field, value) => {
    setFormState(prev => ({
      ...prev,
      [folderKey]: {
        ...prev[folderKey],
        [field]: value
      }
    }));
  };

  const handleTypeChange = (folderKey, newType) => {
    setFormState(prev => {
      const current = prev[folderKey] || {};
      let defaultPort = current.port;
      if (newType === 'FTP' && (!current.port || current.port === 22)) defaultPort = 21;
      if (newType === 'SFTP' && (!current.port || current.port === 21)) defaultPort = 22;

      return {
        ...prev,
        [folderKey]: {
          ...current,
          type: newType,
          port: defaultPort
        }
      };
    });
  };

  const handleSave = async (folderKey) => {
    try {
      setSavingKey(folderKey);
      setFeedbackMsg(null);
      const data = formState[folderKey];
      const res = await api.put(`/system/folders-config/${folderKey}`, data);
      
      setFeedbackMsg({
        type: 'success',
        text: `Configuration pour "${data.label || folderKey}" enregistrée avec succès.`
      });
      await fetchConfigs();
    } catch (err) {
      console.error('Erreur enregistrement config:', err);
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || 'Erreur lors de l\'enregistrement.'
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handleTestConnection = async (folderKey) => {
    try {
      setTestingKey(folderKey);
      setTestResults(prev => ({ ...prev, [folderKey]: null }));
      const data = formState[folderKey];
      const res = await api.post('/system/folders-config/test', data);
      
      setTestResults(prev => ({
        ...prev,
        [folderKey]: res.data
      }));
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [folderKey]: {
          success: false,
          message: err.response?.data?.message || err.message
        }
      }));
    } finally {
      setTestingKey(null);
    }
  };

  const handleSyncSource = async () => {
    try {
      setSyncingSource(true);
      setFeedbackMsg(null);
      const res = await api.post('/system/folders-config/sync-source');
      setFeedbackMsg({
        type: res.data.polled > 0 ? 'success' : 'info',
        text: res.data.message
      });
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || 'Erreur lors de la synchronisation distante.'
      });
    } finally {
      setSyncingSource(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#772281]" />
        <p className="text-xs font-semibold">Chargement des configurations des dossiers...</p>
      </div>
    );
  }

  const activeConfig = formState[activeFolderKey] || {};
  const IconComponent = FOLDER_ICONS[activeFolderKey] || FolderTree;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-purple-50 via-white to-amber-50 dark:from-[#171026] dark:via-[#0d1322] dark:to-[#1a1528] border border-[#772281]/20 dark:border-[#772281]/30 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#772281]/15 dark:bg-[#772281]/30 flex items-center justify-center text-[#772281] dark:text-[#f9b307] border border-[#772281]/30">
            <FolderTree className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Configuration des Dossiers RTGS
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#f9b307]/20 text-[#772281] dark:text-[#f9b307] border border-[#f9b307]/40">
                Multi-Protocoles
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Paramétrez individuellement chaque répertoire en mode <strong>Chemin Local</strong>, <strong>Serveur FTP</strong> ou <strong>SFTP Sécurisé</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {formState.source?.type !== 'LOCAL' && (
            <button
              onClick={handleSyncSource}
              disabled={syncingSource}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#f9b307] hover:bg-[#e0a006] text-slate-900 shadow-sm transition-all duration-150 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingSource ? 'animate-spin' : ''}`} />
              <span>{syncingSource ? 'Synchronisation...' : 'Synchroniser Source'}</span>
            </button>
          )}
          <button
            onClick={fetchConfigs}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Feedback message banner */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
          feedbackMsg.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
            : feedbackMsg.type === 'error'
            ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
            : 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30'
        }`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs font-bold px-2 py-0.5 hover:underline">
            Fermer
          </button>
        </div>
      )}

      {/* Directory Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {configs.map(cfg => {
          const isSelected = activeFolderKey === cfg.folderKey;
          const currentData = formState[cfg.folderKey] || cfg;
          const CurrentIcon = FOLDER_ICONS[cfg.folderKey] || FolderTree;

          return (
            <button
              key={cfg.folderKey}
              onClick={() => {
                setActiveFolderKey(cfg.folderKey);
                setFeedbackMsg(null);
              }}
              className={`p-4 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between gap-3 ${
                isSelected
                  ? 'bg-gradient-to-br from-[#772281]/15 to-[#f9b307]/10 dark:from-[#772281]/25 dark:to-[#f9b307]/15 border-[#772281] dark:border-[#772281] shadow-md ring-1 ring-[#772281]'
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`p-2 rounded-xl ${
                  isSelected 
                    ? 'bg-[#772281] text-white' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  <CurrentIcon className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                  currentData.type === 'LOCAL'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    : currentData.type === 'FTP'
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                }`}>
                  {currentData.type}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                  {cfg.label}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                  {currentData.type === 'LOCAL' 
                    ? (currentData.localPath || 'Chemin par défaut')
                    : `${currentData.host || 'Serveur'}:${currentData.port || (currentData.type === 'SFTP' ? 22 : 21)}`}
                </p>
              </div>

              <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Statut :</span>
                {cfg.lastTestStatus === 'SUCCESS' ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connecté
                  </span>
                ) : cfg.lastTestStatus === 'ERROR' ? (
                  <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Erreur
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium">Non testé</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Configuration Card for Active Directory */}
      <div className="rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#772281]/15 text-[#772281] dark:text-[#f9b307] flex items-center justify-center">
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {activeConfig.label || activeFolderKey}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activeConfig.description || `Configuration du dossier ${activeFolderKey}`}
              </p>
            </div>
          </div>

          {/* Active Switch */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Surveillance active :
            </span>
            <button
              onClick={() => handleInputChange(activeFolderKey, 'isActive', !activeConfig.isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                activeConfig.isActive ? 'bg-[#772281]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                  activeConfig.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Protocol Selector Tabs */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            Protocole de Stockage & Transfert
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleTypeChange(activeFolderKey, 'LOCAL')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-bold transition-all ${
                activeConfig.type === 'LOCAL'
                  ? 'bg-[#772281]/10 dark:bg-[#772281]/25 border-[#772281] text-[#772281] dark:text-[#f9b307]'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              <HardDrive className="w-5 h-5" />
              <span>Chemin Local / Réseau</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange(activeFolderKey, 'FTP')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-bold transition-all ${
                activeConfig.type === 'FTP'
                  ? 'bg-amber-500/10 dark:bg-amber-500/25 border-amber-500 text-amber-700 dark:text-amber-400'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              <Server className="w-5 h-5" />
              <span>Serveur FTP</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange(activeFolderKey, 'SFTP')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-xs font-bold transition-all ${
                activeConfig.type === 'SFTP'
                  ? 'bg-purple-500/10 dark:bg-purple-500/25 border-purple-500 text-purple-700 dark:text-purple-300'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              <Shield className="w-5 h-5" />
              <span>Serveur SFTP (SSH)</span>
            </button>
          </div>
        </div>

        {/* Dynamic Form based on Type */}
        {activeConfig.type === 'LOCAL' ? (
          <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Chemin du répertoire sur disque ou Partage Réseau UNC
              </label>
              <input
                type="text"
                value={activeConfig.localPath || ''}
                onChange={(e) => handleInputChange(activeFolderKey, 'localPath', e.target.value)}
                placeholder="Ex : directories/source ou \\serveur-bdl\edi\in"
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#772281] dark:text-slate-100 font-mono"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Indiquez un chemin relatif ou absolu accessible par le service Node.js.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adresse IP / Nom d'Hôte ({activeConfig.type})
                </label>
                <input
                  type="text"
                  value={activeConfig.host || ''}
                  onChange={(e) => handleInputChange(activeFolderKey, 'host', e.target.value)}
                  placeholder="Ex : 10.121.2.60 ou ftp.bdl.dz"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#772281] dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={activeConfig.port || (activeConfig.type === 'SFTP' ? 22 : 21)}
                  onChange={(e) => handleInputChange(activeFolderKey, 'port', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#772281] dark:text-slate-100 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom d'utilisateur / Login
                </label>
                <input
                  type="text"
                  value={activeConfig.username || ''}
                  onChange={(e) => handleInputChange(activeFolderKey, 'username', e.target.value)}
                  placeholder="Ex : bdl_rtgs_agent"
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#772281] dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword[activeFolderKey] ? 'text' : 'password'}
                    value={activeConfig.password || ''}
                    onChange={(e) => handleInputChange(activeFolderKey, 'password', e.target.value)}
                    placeholder="Laisser vide pour conserver le mot de passe actuel"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#772281] dark:text-slate-100 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => ({ ...prev, [activeFolderKey]: !prev[activeFolderKey] }))}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword[activeFolderKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Chemin du Répertoire Distant
              </label>
              <input
                type="text"
                value={activeConfig.remotePath || ''}
                onChange={(e) => handleInputChange(activeFolderKey, 'remotePath', e.target.value)}
                placeholder="Ex : /incoming/edi ou /accounting/od"
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#772281] dark:text-slate-100 font-mono"
              />
            </div>

            {activeConfig.type === 'FTP' && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="secureTls"
                  checked={Boolean(activeConfig.secureTls)}
                  onChange={(e) => handleInputChange(activeFolderKey, 'secureTls', e.target.checked)}
                  className="rounded border-slate-300 text-[#772281] focus:ring-[#772281]"
                />
                <label htmlFor="secureTls" className="text-xs text-slate-600 dark:text-slate-300 select-none">
                  Activer le chiffrement TLS / FTPS sécurisé
                </label>
              </div>
            )}
          </div>
        )}

        {/* Live Test Feedback Area */}
        {testResults[activeFolderKey] && (
          <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
            testResults[activeFolderKey].success
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/30'
          }`}>
            {testResults[activeFolderKey].success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
            )}
            <div className="space-y-1">
              <span className="font-bold">
                {testResults[activeFolderKey].success ? 'Test Réussi :' : 'Échec du Test :'}
              </span>
              <p className="leading-relaxed">{testResults[activeFolderKey].message}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {activeConfig.lastTestDate && (
              <span>
                Dernier test : {new Date(activeConfig.lastTestDate).toLocaleString('fr-FR')} (
                <strong className={activeConfig.lastTestStatus === 'SUCCESS' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {activeConfig.lastTestStatus}
                </strong>)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleTestConnection(activeFolderKey)}
              disabled={testingKey === activeFolderKey}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingKey === activeFolderKey ? 'animate-spin' : ''}`} />
              <span>{testingKey === activeFolderKey ? 'Test en cours...' : 'Tester Connexion'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave(activeFolderKey)}
              disabled={savingKey === activeFolderKey}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#772281] hover:bg-[#601968] text-white shadow-md shadow-[#772281]/25 transition-all disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingKey === activeFolderKey ? 'Enregistrement...' : 'Enregistrer'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderConfigs;
