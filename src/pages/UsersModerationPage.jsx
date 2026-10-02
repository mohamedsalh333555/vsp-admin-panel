import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Toast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  SearchNormal1,
  Forbidden2,
  TickCircle,
  RotateLeft,
  Crown,
  ShieldCross,
  RotateRight,
  Trash,
  Profile2User,
  ShieldTick,
  Refresh2,
  Call,
  Sms,
  UserRemove,
  Building,
  Danger,
  MessageText,
  CloseCircle,
  DocumentText,
} from 'iconsax-react';

export const UsersModerationPage = () => {
  const { t, lang, isRTL } = useLanguage();
  const { user: currentAuthUser } = useAuth();
  const isAr = lang === 'ar' || isRTL;
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingId, setProcessingId] = useState(null);

  // Tab state: 'users' | 'reports'
  const [activeModerationTab, setActiveModerationTab] = useState('users');

  // Reports state
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [reportActionModal, setReportActionModal] = useState(null); // { report, targetStatus: 'resolved' | 'dismissed' }
  const [reportNotes, setReportNotes] = useState('');

  // Delete modal state
  const [userToDelete, setUserToDelete] = useState(null);

  // Block / Unblock modal state
  const [userToToggleBlock, setUserToToggleBlock] = useState(null);

  const [toast, setToast] = useState(null);

  const isProtectedUser = (target) => {
    if (!target) return false;
    if (currentAuthUser && target.id === currentAuthUser.id) return true;
    const role = (target.role || '').toLowerCase();
    return ['cofounder', 'co_founder', 'super_admin'].includes(role);
  };

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

  const fetchReportsList = async () => {
    setReportsLoading(true);
    try {
      const res = await adminService.fetchReports({ statusFilter: reportStatusFilter });
      if (res.success) {
        setReports(res.data || []);
      } else {
        showToast(res.error || 'تعذر تحميل البلاغات', 'error');
      }
    } catch (e) {
      showToast(e.message || 'تعذر تحميل البلاغات', 'error');
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeModerationTab === 'reports') {
      fetchReportsList();
    }
  }, [activeModerationTab, reportStatusFilter]);

  const handleExecuteReportAction = async () => {
    if (!reportActionModal) return;
    const { report, targetStatus } = reportActionModal;
    setProcessingId(report.id);
    try {
      const res = await adminService.resolveReport({
        reportId: report.id,
        status: targetStatus,
        notes: reportNotes.trim(),
      });
      if (res.success) {
        showToast(targetStatus === 'resolved' ? 'تم حل البلاغ وتوثيق القرار بنجاح' : 'تم رفض وتجاهل البلاغ');
        setReportActionModal(null);
        setReportNotes('');
        fetchReportsList();
      } else {
        showToast(res.error || 'فشلت معالجة البلاغ', 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, statusFilter]);

  // Block / Unblock Confirmation Action
  const handleConfirmToggleBlock = async () => {
    if (!userToToggleBlock) return;
    const targetUser = userToToggleBlock;

    // حماية سيادية: منع حظر الحساب الحالي أو المؤسسين الشركاء
    if (isProtectedUser(targetUser)) {
      showToast(t('cannot_block_self_or_cofounder'), 'error');
      setUserToToggleBlock(null);
      return;
    }

    const nextBlocked = !targetUser.is_blocked;
    setProcessingId(targetUser.id);
    setUserToToggleBlock(null); // إغلاق النافذة فوراً للعودة للشاشة
    try {
      const res = await adminService.toggleUserBlockStatus(targetUser.id, nextBlocked);
      if (res.success) {
        showToast(
          isAr
            ? nextBlocked
              ? `تم حظر حساب ${targetUser.name} بنجاح`
              : `تم إلغاء حظر حساب ${targetUser.name} بنجاح`
            : nextBlocked
            ? `User ${targetUser.name} blocked successfully`
            : `User ${targetUser.name} unblocked successfully`
        );
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
        showToast(t('noshow_reset_success'));
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
        showToast(t('admin_approved_success'));
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
    if (isProtectedUser(userToDelete)) {
      showToast(t('cannot_block_self_or_cofounder'), 'error');
      setUserToDelete(null);
      return;
    }
    setProcessingId(userToDelete.id);
    try {
      const res = await adminService.deleteUserPermanently(userToDelete.id);
      if (res.success) {
        showToast(t('user_deleted_success'));
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

  const renderRoleBadge = (user) => {
    const isCoFounder = ['cofounder', 'co_founder', 'super_admin'].includes((user.role || '').toLowerCase());

    if (isCoFounder) {
      return (
        <Badge variant="accent" size="sm">
          <Crown className="w-3.5 h-3.5 text-vsp-accent inline" variant="Outline" />
          <span>{t('cofounder')}</span>
        </Badge>
      );
    }

    // إذا كان المستخدم صاحب ملعب أو تقدم كصاحب ملعب
    const isOwnerUser =
      user.role === 'owner' ||
      user.has_stadium === true ||
      Boolean(user.additional_data?.verificationDocuments);

    if (isOwnerUser) {
      if (user.verification_status === 'pending') {
        return (
          <Badge variant="warning" size="sm">
            <Building className="w-3 h-3 inline ml-1" variant="Outline" />
            <span>{isAr ? 'صاحب ملعب (قيد التوثيق)' : 'Owner (Pending)'}</span>
          </Badge>
        );
      }
      return (
        <Badge variant="default" size="sm">
          {t('owner')}
        </Badge>
      );
    }

    switch (user.role) {
      case 'admin':
      case 'super_admin':
        return (
          <Badge variant="blue" size="sm">
            <ShieldTick className="w-3 h-3 inline" variant="Outline" />
            <span>{t('admin')}</span>
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

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Profile2User className="w-6 h-6 text-zinc-400" variant="Outline" />
            <span>{isAr ? 'الرقابة وإدارة الحسابات والبلاغات' : 'Moderation & Accounts Management'}</span>
          </h1>
          <p className="text-xs text-vsp-textSecondary mt-0.5">
            {isAr ? 'التحكم في حسابات المستخدمين والمشرفين ومتابعة بلاغات وشكاوى المجتمع' : 'Moderate platform users, admins and resolve player reports'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="bg-vsp-surface p-1 rounded-xl border border-vsp-border flex items-center gap-1">
            <button
              onClick={() => setActiveModerationTab('users')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeModerationTab === 'users'
                  ? 'bg-vsp-accent text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Profile2User className="w-3.5 h-3.5" variant="Outline" />
              <span>{isAr ? 'المستخدمين والحسابات' : 'Users & Accounts'}</span>
            </button>
            <button
              onClick={() => setActiveModerationTab('reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeModerationTab === 'reports'
                  ? 'bg-vsp-accent text-black shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Danger className="w-3.5 h-3.5" variant="Outline" />
              <span>{isAr ? 'البلاغات والشكاوى' : 'Reports & Abuse'}</span>
              {reports.filter(r => r.status === 'pending').length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          </div>

          <button
            onClick={activeModerationTab === 'users' ? fetchUsers : fetchReportsList}
            className="p-2.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-vsp-textSecondary hover:text-white rounded-xl transition-all"
          >
            <Refresh2 className={`w-4 h-4 ${(loading || reportsLoading) ? 'animate-spin' : ''}`} variant="Outline" />
          </button>
        </div>
      </div>

      {activeModerationTab === 'users' ? (
        <div className="space-y-6">
          {/* Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-vsp-surface border border-vsp-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] text-vsp-textSecondary font-bold">{t('total_users_shown')}</span>
            <h3 className="text-xl font-black text-white mt-1">{users.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
            <Profile2User className="w-4 h-4" variant="Outline" />
          </div>
        </div>

        <div className="bg-vsp-surface border border-vsp-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] text-vsp-textSecondary font-bold">{t('blocked_accounts')}</span>
            <h3 className="text-xl font-black text-white mt-1">{totalBlocked}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
            <Forbidden2 className="w-4 h-4" variant="Outline" />
          </div>
        </div>

        <div className="bg-vsp-surface border border-vsp-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] text-vsp-textSecondary font-bold">{t('no_show_col')}</span>
            <h3 className="text-xl font-black text-white mt-1">{totalViolators}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
            <ShieldCross className="w-4 h-4" variant="Outline" />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <SearchNormal1 className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" variant="Outline" />
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
            <RotateRight className="w-8 h-8 text-zinc-400 animate-spin" variant="Outline" />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={UserRemove}
            title={t('no_users_found')}
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
                  const isCoFounder = isProtectedUser(user);

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
                                <Crown className="w-3.5 h-3.5 text-vsp-accent" variant="Outline" />
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
                                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
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
                              <RotateLeft className="w-3 h-3" variant="Outline" />
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
                            <span className="px-3 py-1.5 bg-vsp-card border border-vsp-border text-zinc-300 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-sm">
                              <ShieldTick className="w-3.5 h-3.5 text-vsp-accent" variant="Outline" />
                              <span>{t('protected_cofounder_account')}</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            {isPendingAdmin && (
                              <button
                                onClick={() => handleApproveAdmin(user.id)}
                                disabled={isProcessing}
                                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-vsp-accent border border-vsp-accent/30 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1 shadow-sm"
                              >
                                <ShieldTick className="w-3.5 h-3.5" variant="Outline" />
                                <span>{t('approve_admin_btn')}</span>
                              </button>
                            )}

                            <button
                              onClick={() => setUserToToggleBlock(user)}
                              disabled={isProcessing}
                              className={`px-3 py-1.5 font-bold text-xs rounded-xl border transition-all inline-flex items-center gap-1.5 shadow-sm ${
                                isBlocked
                                  ? 'bg-zinc-800 hover:bg-zinc-700 text-vsp-accent border-vsp-accent/30'
                                  : 'bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 border-zinc-700 hover:border-red-500/30'
                              }`}
                            >
                              {isBlocked ? (
                                <>
                                  <TickCircle className="w-3.5 h-3.5" variant="Outline" />
                                  <span>{t('unblock_user')}</span>
                                </>
                              ) : (
                                <>
                                  <Forbidden2 className="w-3.5 h-3.5" variant="Outline" />
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
                              <Trash className="w-3.5 h-3.5" variant="Outline" />
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
        </div>
      ) : (
        <div className="space-y-6">
          {/* Reports Summary Chips */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-vsp-surface border border-vsp-border rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] text-vsp-textSecondary font-bold">{isAr ? 'إجمالي البلاغات المسجلة' : 'Total Reports'}</span>
                <h3 className="text-xl font-black text-white mt-1">{reports.length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
                <Danger className="w-4 h-4" variant="Outline" />
              </div>
            </div>

            <div className="bg-vsp-surface border border-vsp-border rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] text-vsp-textSecondary font-bold">{isAr ? 'بلاغات قيد الانتظار' : 'Pending Review'}</span>
                <h3 className="text-xl font-black text-amber-400 mt-1">{reports.filter((r) => r.status === 'pending').length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <RotateRight className="w-4 h-4" variant="Outline" />
              </div>
            </div>

            <div className="bg-vsp-surface border border-vsp-border rounded-xl p-4 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[11px] text-vsp-textSecondary font-bold">{isAr ? 'بلاغات تم حلها ومعالجتها' : 'Resolved Reports'}</span>
                <h3 className="text-xl font-black text-vsp-accent mt-1">{reports.filter((r) => r.status === 'resolved').length}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-vsp-accent">
                <TickCircle className="w-4 h-4" variant="Outline" />
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-3">
            <select
              value={reportStatusFilter}
              onChange={(e) => setReportStatusFilter(e.target.value)}
              className="bg-vsp-surface border border-vsp-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-semibold"
            >
              <option value="all">{isAr ? 'جميع حالات البلاغات' : 'All Statuses'}</option>
              <option value="pending">{isAr ? 'قيد الانتظار فقط' : 'Pending Only'}</option>
              <option value="resolved">{isAr ? 'تم الحل والمعالجة' : 'Resolved'}</option>
              <option value="dismissed">{isAr ? 'مرفوض / تم التجاهل' : 'Dismissed'}</option>
            </select>
          </div>

          {/* Reports Table */}
          <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-xl">
            {reportsLoading ? (
              <div className="h-64 flex items-center justify-center">
                <RotateRight className="w-8 h-8 text-zinc-400 animate-spin" variant="Outline" />
              </div>
            ) : reports.length === 0 ? (
              <EmptyState
                icon={Danger}
                title={isAr ? 'لا توجد بلاغات مسجلة' : 'No Reports Found'}
                subtitle={isAr ? 'لم يقم أي مستخدم بالإبلاغ عن أي مخالفات حالياً' : 'Clean sheet! No reports found matching current filter.'}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-vsp-card/50 text-vsp-textSecondary border-b border-vsp-border">
                    <tr>
                      <th className="px-6 py-4 font-bold">{isAr ? 'المُبلّغ' : 'Reporter'}</th>
                      <th className="px-6 py-4 font-bold">{isAr ? 'نوع وموضوع البلاغ' : 'Target & Type'}</th>
                      <th className="px-6 py-4 font-bold">{isAr ? 'السبب والتفاصيل' : 'Reason & Details'}</th>
                      <th className="px-6 py-4 font-bold">{isAr ? 'الحالة' : 'Status'}</th>
                      <th className="px-6 py-4 font-bold">{isAr ? 'التاريخ' : 'Date'}</th>
                      <th className="px-6 py-4 font-bold text-center">{isAr ? 'الإجراء الإداري' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-vsp-border/50">
                    {reports.map((rep) => {
                      const isPending = rep.status === 'pending';
                      const isProcessing = processingId === rep.id;
                      const formattedDate = rep.created_at ? new Date(rep.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '-';

                      return (
                        <tr key={rep.id} className="hover:bg-vsp-card/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{rep.users?.name || (isAr ? 'مستخدم مجهول' : 'Unknown User')}</div>
                            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{rep.users?.phone || rep.reporter_id || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-[11px] font-mono text-zinc-300">
                              {rep.target_type || 'user'}: {rep.target_id?.slice(0, 8)}...
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <div className="font-bold text-white">{rep.reason || '-'}</div>
                            {rep.details && (
                              <div className="text-[11px] text-zinc-400 mt-1 whitespace-pre-wrap line-clamp-2 leading-relaxed">
                                {rep.details}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {rep.status === 'pending' ? (
                              <Badge variant="warning" size="sm">{isAr ? 'قيد المراجعة' : 'Pending'}</Badge>
                            ) : rep.status === 'resolved' ? (
                              <Badge variant="success" size="sm">{isAr ? 'تم الحل' : 'Resolved'}</Badge>
                            ) : (
                              <Badge variant="default" size="sm">{isAr ? 'مرفوض/متجاهل' : 'Dismissed'}</Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 text-zinc-400 font-mono text-[11px]">
                            {formattedDate}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {isPending ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setReportActionModal({ report: rep, targetStatus: 'resolved' })}
                                  disabled={isProcessing}
                                  title={isAr ? 'اعتماد وحل البلاغ' : 'Resolve Report'}
                                  className="px-2.5 py-1.5 bg-vsp-card hover:bg-zinc-800 text-vsp-accent border border-vsp-border rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                                >
                                  <TickCircle className="w-3.5 h-3.5" variant="Outline" />
                                  <span>{isAr ? 'حل البلاغ' : 'Resolve'}</span>
                                </button>
                                <button
                                  onClick={() => setReportActionModal({ report: rep, targetStatus: 'dismissed' })}
                                  disabled={isProcessing}
                                  title={isAr ? 'رفض وتجاهل البلاغ' : 'Dismiss Report'}
                                  className="px-2.5 py-1.5 bg-vsp-card hover:bg-zinc-800 text-zinc-400 hover:text-white border border-vsp-border rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                                >
                                  <CloseCircle className="w-3.5 h-3.5" variant="Outline" />
                                  <span>{isAr ? 'تجاهل' : 'Dismiss'}</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-zinc-500 font-bold">{isAr ? 'تم الحسم' : 'Closed'}</span>
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
        </div>
      )}
      
      {/* Report Action Modal */}
      <Modal
        isOpen={Boolean(reportActionModal)}
        onClose={() => setReportActionModal(null)}
        title={
          reportActionModal?.targetStatus === 'resolved'
            ? (isAr ? 'حل واعتماد البلاغ' : 'Resolve Report')
            : (isAr ? 'تجاهل ورفض البلاغ' : 'Dismiss Report')
        }
      >
        {reportActionModal && (
          <div className="space-y-4">
            <p className="text-xs text-vsp-textSecondary leading-relaxed">
              {reportActionModal.targetStatus === 'resolved'
                ? (isAr ? 'سيتم وضع علامة على هذا البلاغ كـ "تم الحل والمعالجة" وتوثيق الملاحظات في سجل التدقيق.' : 'This report will be marked as resolved with official admin notes.')
                : (isAr ? 'سيتم رفض البلاغ وتجاهله دون اتخاذ إجراء عقابي.' : 'This report will be dismissed as unsubstantiated.')}
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-zinc-400">
                {isAr ? 'ملاحظات الإدارة (اختياري، تظهر في سجل البلاغ):' : 'Admin Notes:'}
              </label>
              <textarea
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                placeholder={isAr ? 'اكتب الإجراء المتخذ أو سبب القرار...' : 'Enter action notes or rationale...'}
                rows={3}
                className="w-full bg-vsp-card border border-vsp-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-vsp-border">
              <button
                onClick={() => setReportActionModal(null)}
                className="px-4 py-2 bg-vsp-card border border-vsp-border text-zinc-300 hover:text-white rounded-xl text-xs font-bold"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleExecuteReportAction}
                disabled={processingId !== null}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
                  reportActionModal.targetStatus === 'resolved'
                    ? 'bg-vsp-accent text-black font-extrabold hover:bg-vsp-accentHover'
                    : 'bg-zinc-700 hover:bg-zinc-600 text-white'
                }`}
              >
                {processingId ? <RotateRight className="w-4 h-4 animate-spin" variant="Outline" /> : <TickCircle className="w-4 h-4" variant="Outline" />}
                <span>{isAr ? 'تأكيد وحفظ الإجراء' : 'Confirm Action'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

{/* Block / Unblock Confirmation Modal */}
      <Modal
        isOpen={Boolean(userToToggleBlock)}
        onClose={() => setUserToToggleBlock(null)}
        title={
          userToToggleBlock?.is_blocked
            ? (isAr ? 'تأكيد إلغاء حظر الحساب' : 'Confirm Unblock User')
            : (isAr ? 'تأكيد حظر حساب المستخدم' : 'Confirm Block User')
        }
      >
        {userToToggleBlock && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-vsp-border flex items-start gap-3">
              <div
                className={`p-2 rounded-lg ${
                  userToToggleBlock.is_blocked
                    ? 'bg-zinc-800 text-vsp-accent'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {userToToggleBlock.is_blocked ? (
                  <TickCircle className="w-5 h-5" variant="Outline" />
                ) : (
                  <Forbidden2 className="w-5 h-5" variant="Outline" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-white font-bold">{userToToggleBlock.name}</p>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {userToToggleBlock.is_blocked
                    ? (isAr
                        ? 'هل أنت متأكد من رغبتك في إلغاء حظر هذا الحساب؟ سيتمكن المستخدم من تسجيل الدخول واستعادة حسابه في التطبيق فوراً.'
                        : 'Are you sure you want to unblock this account? The user will be able to log in and use the app immediately.')
                    : (isAr
                        ? 'هل أنت متأكد من رغبتك في حظر هذا الحساب؟ سيتم منعه فوراً من تسجيل الدخول أو إجراء أي حجوزات في التطبيق.'
                        : 'Are you sure you want to block this account? The user will be restricted from logging in or booking stadiums.')}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-vsp-border">
              <button
                onClick={() => setUserToToggleBlock(null)}
                className="px-4 py-2 bg-vsp-card border border-vsp-border text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmToggleBlock}
                disabled={processingId !== null}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
                  userToToggleBlock.is_blocked
                    ? 'bg-vsp-accent hover:bg-vsp-accentHover text-black font-extrabold'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {processingId ? (
                  <RotateRight className="w-4 h-4 animate-spin" variant="Outline" />
                ) : userToToggleBlock.is_blocked ? (
                  <TickCircle className="w-4 h-4" variant="Outline" />
                ) : (
                  <Forbidden2 className="w-4 h-4" variant="Outline" />
                )}
                <span>
                  {userToToggleBlock.is_blocked
                    ? (isAr ? 'تأكيد فك الحظر' : 'Confirm Unblock')
                    : (isAr ? 'تأكيد الحظر' : 'Confirm Block')}
                </span>
              </button>
            </div>
          </div>
        )}
      </Modal>

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
                {processingId ? <RotateRight className="w-4 h-4 animate-spin" variant="Outline" /> : <Trash className="w-4 h-4" variant="Outline" />}
                <span>{t('yes_delete_permanently')}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

