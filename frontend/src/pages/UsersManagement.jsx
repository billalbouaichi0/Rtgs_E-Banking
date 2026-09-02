import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  KeyRound, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Trash2, 
  RefreshCw, 
  Check, 
  X, 
  Copy, 
  AlertCircle,
  ExternalLink,
  Search,
  Lock
} from 'lucide-react';
import api from '../services/api';

export const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Modal Form State
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    role: 'consultation'
  });
  const [formError, setFormError] = useState(null);
  const [createdResult, setCreatedResult] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Erreur chargement utilisateurs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setFormError(null);
    setCreatedResult(null);

    if (!formData.fullName || !formData.username || !formData.email) {
      setFormError('Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    try {
      const res = await api.post('/auth/users', formData);
      setCreatedResult(res.data);
      setNotification({
        type: 'success',
        text: `Utilisateur ${formData.username} créé avec succès ! ${res.data.emailSent ? 'Email de réinitialisation envoyé.' : ''}`
      });
      fetchUsers();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message);
    }
  };

  const handleResendResetEmail = async (userId, userEmail) => {
    setActionLoading((prev) => ({ ...prev, [userId]: 'resending' }));
    try {
      const res = await api.post(`/auth/users/${userId}/resend-reset`);
      setNotification({
        type: 'success',
        text: `Email de réinitialisation renvoyé à ${userEmail}.`
      });
      fetchUsers();
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.response?.data?.message || err.message
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: null }));
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = !user.isActive;
    setActionLoading((prev) => ({ ...prev, [user.id]: 'toggling' }));
    try {
      await api.put(`/auth/users/${user.id}`, { isActive: newStatus });
      setNotification({
        type: 'success',
        text: `Compte de ${user.username} ${newStatus ? 'activé' : 'désactivé'}.`
      });
      fetchUsers();
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.response?.data?.message || err.message
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [user.id]: null }));
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur ${user.username} ?`)) {
      return;
    }
    setActionLoading((prev) => ({ ...prev, [user.id]: 'deleting' }));
    try {
      await api.delete(`/auth/users/${user.id}`);
      setNotification({
        type: 'success',
        text: `Utilisateur ${user.username} supprimé avec succès.`
      });
      fetchUsers();
    } catch (err) {
      setNotification({
        type: 'error',
        text: err.response?.data?.message || err.message
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [user.id]: null }));
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      (u.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#772281]/20 text-[#f9b307] border border-[#772281]/40 text-xs font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#f9b307]" />
            <span>Administration Centrale & Sécurité BDL</span>
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">
            Gestion des Utilisateurs & Droits d'Accès
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Création de comptes, attribution des rôles et envoi automatique d'emails de réinitialisation SMTP BDL.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormData({ fullName: '', username: '', email: '', role: 'consultation' });
              setFormError(null);
              setCreatedResult(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#772281] hover:bg-[#8d2a99] text-white text-xs font-bold shadow-lg shadow-[#772281]/40 transition-all"
          >
            <UserPlus className="w-4 h-4 text-[#f9b307]" />
            <span>Ajouter un Utilisateur</span>
          </button>
          <button
            onClick={fetchUsers}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
            title="Actualiser la liste"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between ${
          notification.type === 'success'
            ? 'bg-[#772281]/20 border-[#772281]/50 text-purple-200'
            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
        }`}>
          <span>{notification.text}</span>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, identifiant, email..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#772281]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-200 text-xs focus:outline-none focus:border-[#772281]"
          >
            <option value="ALL">Tous les Rôles</option>
            <option value="administrateur">Administrateur</option>
            <option value="consultation">Consultation</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Utilisateur</th>
                <th className="py-3 px-4">Identifiant (Login)</th>
                <th className="py-3 px-4">Email Professionnel</th>
                <th className="py-3 px-4">Rôle</th>
                <th className="py-3 px-4">Statut Compte</th>
                <th className="py-3 px-4">Mot de Passe</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Chargement des utilisateurs...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {u.fullName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-400 font-medium">
                      {u.username}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.role === 'administrateur' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          <ShieldCheck className="w-3 h-3 text-purple-400" />
                          Administrateur
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          Consultation
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Actif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          Désactivé
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[11px]">
                      {u.mustChangePassword ? (
                        <span className="text-amber-400 font-medium flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5" /> Initialisation en attente
                        </span>
                      ) : (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5 text-slate-500" /> Déjà défini
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          disabled={!!actionLoading[u.id]}
                          onClick={() => handleResendResetEmail(u.id, u.email)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                          title="Renvoyer l'email de réinitialisation de mot de passe"
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={!!actionLoading[u.id]}
                          onClick={() => handleToggleStatus(u)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            u.isActive
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          }`}
                          title={u.isActive ? 'Désactiver le compte' : 'Activer le compte'}
                        >
                          {u.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          disabled={!!actionLoading[u.id]}
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                          title="Supprimer l'utilisateur"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ajout Utilisateur */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ajouter un Nouvel Utilisateur</h3>
                  <p className="text-xs text-slate-400">Création et envoi automatique de l'email d'activation</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              {createdResult ? (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-[#772281]/20 border border-[#772281]/40 text-purple-200 space-y-2">
                    <div className="font-bold text-sm text-[#f9b307] flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-[#f9b307]" /> Utilisateur créé avec succès !
                    </div>
                    <p>
                      {createdResult.emailSent
                        ? `L'email d'initialisation a été envoyé à ${createdResult.user.email} via le serveur SMTP BDL.`
                        : `Le compte est actif. Vous pouvez transmettre le lien ci-dessous à l'utilisateur :`}
                    </p>
                    {createdResult.user.resetUrl && (
                      <div className="mt-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-[#f9b307] break-all select-all">
                        {createdResult.user.resetUrl}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 py-2 rounded-xl bg-[#772281] hover:bg-[#8d2a99] text-white font-bold transition-all shadow-lg shadow-[#772281]/30"
                    >
                      Terminer
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Nom et Prénom *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Karim Benali"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#772281]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Identifiant de connexion (Login) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: k.benali"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono placeholder-slate-500 focus:outline-none focus:border-[#772281]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Adresse Email BDL *</label>
                    <input
                      type="email"
                      required
                      placeholder="Ex: k.benali@bdl.dz"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#772281]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Rôle et Permissions *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-[#772281]"
                    >
                      <option value="consultation">Consultation (Visualisation et export des flux)</option>
                      <option value="administrateur">Administrateur (Gestion complète et validation des alertes)</option>
                    </select>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-3.5 border border-slate-800/80 text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-300">
                      <Mail className="w-3.5 h-3.5 text-[#f9b307]" />
                      <span>Notification automatique SMTP BDL</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Dès validation, un email contenant un lien sécurisé permettant à l'utilisateur de définir son mot de passe sera immédiatement acheminé via le serveur SMTP interne BDL (<code className="text-[#f9b307]">10.121.2.50:587</code>).
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#772281] hover:bg-[#8d2a99] text-white shadow-lg shadow-[#772281]/40 transition-all flex items-center gap-2"
                    >
                      <Check className="w-4 h-4 text-[#f9b307]" />
                      <span>Créer & Envoyer Email</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
