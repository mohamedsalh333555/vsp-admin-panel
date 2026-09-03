import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Search,
  Ban,
  CheckCircle,
  RotateCcw,
  Crown,
  ShieldAlert,
  Loader2,
  Trash2,
  Users,
  ShieldCheck,
  RefreshCw,
  Phone,
  Mail,
  UserX,
} from 'lucide-react';

export const UsersModerationPage = () => {
  const { t, lang, isRTL } = useLanguage();
  const isAr = lang === 'ar' || isRTL;
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingId, setProcessingId] = useState(null);

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState(null);

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminService.fetchAllUsers({
        searchQuery: search,
        roleFilter,
        statusFilter,
      });
      setUsers(data || []);
    } catch (e) {
      showToast(t('error_loading'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, statusFilter]);

  // Block / Unblock Toggle
  const handleToggleBlock = async (userId, isBlocked) => {
    setProcessingId(userId);
    try {
      const nextBlocked = !isBlocked;
      const res = await adminService.toggleUserBlockStatus(userId, nextBlocked);
      if (res.success) {
        showToast(t('save_booking_success'));
        fetchUsers();
      } else {
        showToast(res.error || t('error_loading'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Reset No-Show Count
  const handleResetNoShow = async (userId) => {
    setProcessingId(userId);
    try {
      const res = await adminService.resetNoShowCount(userId);
      if (res.success) {
        showToast(t('save_booking_success'));
        fetchUsers();
      } else {
        showToast(res.error || t('error_loading'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Approve Admin User
  const handleApproveAdmin = async (userId) => {
    setProcessingId(userId);
    try {
      const res = await adminService.approveAdminUser(userId);
      if (res.success) {
        showToast(t('save_booking_success'));
        fetchUsers();
      } else {
        showToast(res.error || t('error_loading'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Delete User Permanently
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setProcessingId(userToDelete.id);
    try {
      const res = await adminService.deleteUserPermanently(userToDelete.id);
      if (res.success) {
        showToast(t('delete_booking_success'));
        setUserToDelete(null);
        fetchUsers();
      } else {
        showToast(res.error || t('error_loading'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

const COFOUNDER_EMAILS = [
  'mohamedsalh333555@gmail.com',
  'admin@vsp.com',
  'hana.ramadan@vsp.com',
  'ceo@vsp.com',
];

  const renderRoleBadge = (user) => {
    const isCoFounder =
      user.role === 'cofounder' ||
      user.role === 'co_founder' ||
      COFOUNDER_EMAILS.includes((user.email || '').toLowerCase().trim());

    if (isCoFounder) {
      return (
        <Badge variant="accent" size="sm">
          <Crown className="w-3 h-3 text-amber-400 inline fill-amber-400" />
          <span>{t('cofounder')}</span>
        </Badge>
      );
    }

    // إذا كان المستخدم قد تقدم كصاحب ملعب وبانتظار التوثيق
    const isPendingOwner =
      (user.has_stadium || Boolean(user.additional_data?.verificationDocuments)) &&
      user.verification_status === 'pending';

    if (isPendingOwner) {
      return (
        <Badge variant="warning" size="sm">
          <Building2 className="w-3 h-3 inline ml-1" />
          <span>{isAr ? 'صاحب ملعب (قيد التوثيق)' : 'Owner (Pending)'}</span>
        </Badge>
      );
    }

    switch (user.role) {
      case 'admin':
      case 'super_admin':
        return (
          <Badge variant="blue" size="sm">
            <ShieldCheck className="w-3 h-3 inline" />
            <span>{t('admin')}</span>
          </Badge>
        );
      case 'owner':
        return (
          <Badge variant="warning" size="sm">
            <Building2 className="w-3 h-3 inline ml-1" />
            <span>{t('owner')}</span>
          </Badge>
        );
      case 'pending_admin':
        return (
          <Badge variant="purple" size="sm">
            {t('pending')}
          </Badge>
        );
      case 'player':
      default:
        return (
          <Badge variant="default" size="sm">
            {t('player')}
          </Badge>
        );
    }
  };

  const totalBlocked = users.filter((u) => u.is_blocked).length;
  const totalViolators = users.filter((u) => (u.no_show_count || 0) >= 3).length;

  return (
    <div className="p-6 space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-zinc-400" />
            <span>{t('users_management_title')}</span>
          </h1>
          <p className="text-xs text-vsp-textSecondary mt-0.5">
            {t('users_management_subtitle')}
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="p-2.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-vsp-textSecondary hover:text-white rounded-xl transition-all self-end sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-vsp-surface border border-vsp-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] text-vsp-textSecondary font-bold">{t('total_users_shown')}</span>
            <h3 className="text-xl font-black text-white mt-1">{users.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-vsp-surface border border-vsp-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] text-vsp-textSecondary font-bold">{t('blocked_accounts')}</span>
            <h3 className="text-xl font-black text-white mt-1">{totalBlocked}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
            <Ban className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-vsp-surface border border-vsp-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] text-vsp-textSecondary font-bold">{t('no_show_col')}</span>
            <h3 className="text-xl font-black text-white mt-1">{totalViolators}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search')}
            className="w-full bg-vsp-surface border border-vsp-border rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full md:w-auto bg-vsp-surface border border-vsp-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-semibold"
        >
          <option value="all">{t('all_roles')}</option>
          <option value="player">{t('role_players')}</option>
          <option value="owner">{t('role_owners')}</option>
          <option value="admin">{t('role_admins')}</option>
          <option value="cofounder">{t('role_cofounders')}</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full md:w-auto bg-vsp-surface border border-vsp-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-semibold"
        >
          <option value="all">{t('all_statuses')}</option>
          <option value="active">{t('status_active_only')}</option>
          <option value="blocked">{t('status_blocked_only')}</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={UserX}
            title={t('no_data')}
            subtitle=""
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-vsp-card/50 text-vsp-textSecondary border-b border-vsp-border">
                <tr>
                  <th className="px-6 py-4 font-bold">{t('user_col')}</th>
                  <th className="px-6 py-4 font-bold">{t('role')}</th>
                  <th className="px-6 py-4 font-bold">{t('governorate')}</th>
                  <th className="px-6 py-4 font-bold">{t('no_show_col')}</th>
                  <th className="px-6 py-4 font-bold">{t('account_status_col')}</th>
                  <th className="px-6 py-4 font-bold text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vsp-border/50">
                {users.map((user) => {
                  const isBlocked = user.is_blocked || false;
                  const isProcessing = processingId === user.id;
                  const isPendingAdmin = user.role === 'pending_admin';
                  const isCoFounder =
                    user.role === 'cofounder' ||
                    user.role === 'co_founder' ||
                    COFOUNDER_EMAILS.includes((user.email || '').toLowerCase().trim());

                  return (
                    <tr key={user.id} className="hover:bg-vsp-card/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center font-bold text-white shrink-0 overflow-hidden">
                            {user.profile_image_url ? (
                              <img
                                src={user.profile_image_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              user.name?.charAt(0) || 'U'
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-white flex items-center gap-1.5">
                              <span>{user.name || '-'}</span>
                              {isCoFounder && (
                                <Crown className="w-3.5 h-3.5 text-vsp-accent fill-vsp-accent" />
                              )}
                            </h4>
                            <div className="flex items-center gap-1.5 text-[11px] text-vsp-textSecondary mt-0.5">
                              {user.phone && user.phone !== '-' && <span>{user.phone}</span>}
                              {user.phone && user.phone !== '-' && user.email && <span>•</span>}
                              {user.email && (
                                <span className="truncate max-w-[170px] font-mono text-[10px] text-zinc-400">
                                  {user.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {renderRoleBadge(user)}
                      </td>

                      <td className="px-6 py-4 text-vsp-textSecondary font-semibold">
                        {user.governorate || '-'}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-black text-xs font-mono px-2 py-0.5 rounded-md ${
                              (user.no_show_count || 0) >= 3
                                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                : (user.no_show_count || 0) > 0
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                : 'bg-vsp-card text-zinc-400 border border-vsp-border'
                            }`}
                          >
                            {user.no_show_count || 0}
                          </span>
                          {(user.no_show_count || 0) > 0 && (
                            <button
                              onClick={() => handleResetNoShow(user.id)}
                              disabled={isProcessing}
                              title={t('reset_noshow_btn')}
                              className="p-1 hover:bg-vsp-card text-zinc-400 hover:text-white rounded-lg transition-colors border border-transparent hover:border-vsp-border"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {isBlocked ? (
                          <Badge variant="danger" size="sm">
                            {t('blocked')}
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            {t('active')}
                          </Badge>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {isCoFounder ? (
                          <div className="flex items-center justify-center">
                            <span className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-sm">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>{t('protected_cofounder_account')}</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            {isPendingAdmin && (
                              <button
                                onClick={() => handleApproveAdmin(user.id)}
                                disabled={isProcessing}
                                className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/30 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1 shadow-sm"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>{t('approve_admin_btn')}</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleToggleBlock(user.id, isBlocked)}
                              disabled={isProcessing}
                              className={`px-3 py-1.5 font-bold text-xs rounded-xl border transition-all inline-flex items-center gap-1.5 shadow-sm ${
                                isBlocked
                                  ? 'bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-black border-emerald-500/30'
                                  : 'bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 border-zinc-700 hover:border-red-500/30'
                              }`}
                            >
                              {isBlocked ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>{t('unblock_user')}</span>
                                </>
                              ) : (
                                <>
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>{t('block_user')}</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => setUserToDelete(user)}
                              disabled={isProcessing}
                              title={t('delete_permanent')}
                              className="p-1.5 bg-vsp-card hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-vsp-border hover:border-red-500/30 rounded-xl transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        title={t('confirm_delete_user')}
      >
        {userToDelete && (
          <div className="space-y-4">
            <p className="text-xs text-vsp-textSecondary leading-relaxed">
              {t('delete_user_prompt')} <strong className="text-white">"{userToDelete.name}"</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-vsp-border">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-vsp-card border border-vsp-border text-zinc-300 hover:text-white rounded-xl text-xs font-bold"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={processingId !== null}
                className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
              >
                {processingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{t('yes_delete_permanently')}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
