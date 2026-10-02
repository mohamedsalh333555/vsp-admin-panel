import React, { useState, useEffect, useMemo } from 'react';
import { adminService } from '../services/adminService';
import { useLanguage } from '../context/LanguageContext';
import { Toast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  SecuritySafe,
  Refresh2,
  SearchNormal1,
  Eye,
  DocumentText,
  ShieldTick,
  Activity,
  Danger,
} from 'iconsax-react';

export const AuditLogsPage = () => {
  const { lang, isRTL } = useLanguage();
  const isAr = lang === 'ar' || isRTL;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await adminService.fetchSystemAuditLogs({
        actionFilter,
        tableFilter,
        limit: 150,
      });
      if (res.success) {
        setLogs(res.data || []);
      } else {
        showToast(res.error || 'تعذر تحميل سجل التدقيق', 'error');
      }
    } catch (e) {
      showToast(e.message || 'حدث خطأ أثناء تحميل السجل', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [actionFilter, tableFilter]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase().trim();
    return logs.filter((log) => {
      return (
        (log.action && log.action.toLowerCase().includes(q)) ||
        (log.table_name && log.table_name.toLowerCase().includes(q)) ||
        (log.record_id && log.record_id.toLowerCase().includes(q)) ||
        (log.changed_by_role && log.changed_by_role.toLowerCase().includes(q))
      );
    });
  }, [logs, search]);

  const adminActionsCount = logs.filter((l) => l.action?.startsWith('admin_')).length;
  const systemActionsCount = logs.filter((l) => !l.action?.startsWith('admin_')).length;

  const getActionBadgeVariant = (action) => {
    if (!action) return 'default';
    if (action.includes('delete') || action.includes('cancel') || action.includes('reject') || action === 'DELETE') {
      return 'danger';
    }
    if (action.includes('approve') || action.includes('resolve') || action.startsWith('admin_')) {
      return 'accent';
    }
    if (action.includes('update') || action === 'UPDATE') {
      return 'warning';
    }
    return 'default';
  };

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
            <SecuritySafe className="w-6 h-6 text-zinc-400" variant="Outline" />
            <span>{isAr ? 'سجل التدقيق والرقابة السيادية' : 'System Audit & Sovereignty Logs'}</span>
          </h1>
          <p className="text-xs text-vsp-textSecondary mt-0.5">
            {isAr
              ? 'سجل مركزي موثق لجميع التعديلات والقرارات الإدارية والمالية وإلغاءات الحجوزات'
              : 'Tamper-evident log of administrative actions, disputes, financial payouts and cancellations'}
          </p>
        </div>

        <button
          onClick={loadAuditLogs}
          className="p-2.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-vsp-textSecondary hover:text-white rounded-xl transition-all self-end sm:self-auto"
        >
          <Refresh2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} variant="Outline" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-vsp-surface border border-vsp-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] text-vsp-textSecondary font-bold">{isAr ? 'إجمالي السجلات المسترجعة' : 'Total Logs Loaded'}</span>
            <h3 className="text-xl font-black text-white mt-1">{logs.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
            <DocumentText className="w-4 h-4" variant="Outline" />
          </div>
        </div>

        <div className="bg-vsp-surface border border-vsp-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] text-vsp-textSecondary font-bold">{isAr ? 'قرارات الإدارة والمؤسسين' : 'Admin & Founder Actions'}</span>
            <h3 className="text-xl font-black text-vsp-accent mt-1">{adminActionsCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-vsp-accent">
            <ShieldTick className="w-4 h-4" variant="Outline" />
          </div>
        </div>

        <div className="bg-vsp-surface border border-vsp-border rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] text-vsp-textSecondary font-bold">{isAr ? 'عمليات السيرفر والنظام' : 'System Database Events'}</span>
            <h3 className="text-xl font-black text-zinc-300 mt-1">{systemActionsCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-400">
            <Activity className="w-4 h-4" variant="Outline" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <SearchNormal1 className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" variant="Outline" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isAr ? 'بحث بالعملية، الجدول، أو المعرف...' : 'Search by action, table, or ID...'}
            className="w-full bg-vsp-surface border border-vsp-border rounded-xl pr-10 pl-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-full md:w-auto bg-vsp-surface border border-vsp-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-semibold"
        >
          <option value="all">{isAr ? 'جميع العمليات' : 'All Actions'}</option>
          <option value="admin_resolve_dispute">admin_resolve_dispute</option>
          <option value="admin_cancel_booking">admin_cancel_booking</option>
          <option value="admin_approve_championship">admin_approve_championship</option>
          <option value="admin_reject_championship">admin_reject_championship</option>
          <option value="admin_update_championship_status">admin_update_championship_status</option>
          <option value="admin_set_admin_role">admin_set_admin_role</option>
          <option value="admin_broadcast_notification">admin_broadcast_notification</option>
          <option value="admin_resolve_report">admin_resolve_report</option>
          <option value="DELETE">DELETE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="INSERT">INSERT</option>
        </select>

        <select
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          className="w-full md:w-auto bg-vsp-surface border border-vsp-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-semibold"
        >
          <option value="all">{isAr ? 'جميع الجداول' : 'All Tables'}</option>
          <option value="bookings">bookings</option>
          <option value="championships">championships</option>
          <option value="users">users</option>
          <option value="reports">reports</option>
          <option value="notifications">notifications</option>
          <option value="stadiums">stadiums</option>
          <option value="transactions">transactions</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Refresh2 className="w-8 h-8 text-zinc-400 animate-spin" variant="Outline" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            icon={SecuritySafe}
            title={isAr ? 'لا توجد سجلات تدقيق مطابقة' : 'No Audit Logs Found'}
            subtitle={isAr ? 'جرّب تغيير خيارات البحث أو تصفية العمليات' : 'Try adjusting your search or filters'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-vsp-card/50 text-vsp-textSecondary border-b border-vsp-border">
                <tr>
                  <th className="px-6 py-4 font-bold">{isAr ? 'الوقت والتاريخ' : 'Timestamp'}</th>
                  <th className="px-6 py-4 font-bold">{isAr ? 'العملية الإدارية' : 'Action'}</th>
                  <th className="px-6 py-4 font-bold">{isAr ? 'الجدول المستهدف' : 'Table'}</th>
                  <th className="px-6 py-4 font-bold">{isAr ? 'المعرّف المرجعي' : 'Record ID'}</th>
                  <th className="px-6 py-4 font-bold">{isAr ? 'المنفّذ والدور' : 'Actor & Role'}</th>
                  <th className="px-6 py-4 font-bold text-center">{isAr ? 'البيانات والتفاصيل' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-vsp-border/50">
                {filteredLogs.map((log) => {
                  const formattedDate = log.created_at
                    ? new Date(log.created_at).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'medium' })
                    : '-';

                  return (
                    <tr key={log.id} className="hover:bg-vsp-card/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                        {formattedDate}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={getActionBadgeVariant(log.action)} size="sm">
                          {log.action}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 font-mono font-bold text-white">
                        {log.table_name || '-'}
                      </td>

                      <td className="px-6 py-4 font-mono text-[11px] text-zinc-400">
                        {log.record_id ? `${String(log.record_id).slice(0, 8)}...` : '-'}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-[11px]">
                          {log.changed_by_role || 'system'}
                        </div>
                        {log.changed_by && (
                          <div className="font-mono text-[10px] text-zinc-500">
                            {String(log.changed_by).slice(0, 8)}...
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1.5 bg-vsp-card hover:bg-zinc-800 text-zinc-300 hover:text-white border border-vsp-border rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5" variant="Outline" />
                          <span>{isAr ? 'عرض التفاصيل' : 'View Payload'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payload Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={isAr ? 'تفاصيل سجل التدقيق والبيانات' : 'Audit Log Payload Details'}
      >
        {selectedLog && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3 text-xs p-3 bg-zinc-900 border border-vsp-border rounded-xl">
              <div>
                <span className="text-zinc-500 text-[11px] font-bold">{isAr ? 'العملية:' : 'Action:'}</span>
                <p className="font-mono font-bold text-vsp-accent mt-0.5">{selectedLog.action}</p>
              </div>
              <div>
                <span className="text-zinc-500 text-[11px] font-bold">{isAr ? 'الجدول:' : 'Table:'}</span>
                <p className="font-mono font-bold text-white mt-0.5">{selectedLog.table_name}</p>
              </div>
              <div>
                <span className="text-zinc-500 text-[11px] font-bold">{isAr ? 'المعرّف:' : 'Record ID:'}</span>
                <p className="font-mono text-zinc-300 mt-0.5">{selectedLog.record_id || '-'}</p>
              </div>
              <div>
                <span className="text-zinc-500 text-[11px] font-bold">{isAr ? 'دور المنفّذ:' : 'Actor Role:'}</span>
                <p className="font-mono text-zinc-300 mt-0.5">{selectedLog.changed_by_role || 'system'}</p>
              </div>
            </div>

            {selectedLog.old_data && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-zinc-400">{isAr ? 'البيانات السابقة (Old Data):' : 'Old Data:'}</span>
                <pre className="p-3 bg-zinc-950 border border-vsp-border rounded-xl text-[11px] font-mono text-amber-300 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(selectedLog.old_data, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.new_data && (
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-zinc-400">{isAr ? 'البيانات المحدثة (New Data):' : 'New Data:'}</span>
                <pre className="p-3 bg-zinc-950 border border-vsp-border rounded-xl text-[11px] font-mono text-vsp-accent overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(selectedLog.new_data, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-vsp-border">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-vsp-card border border-vsp-border text-white rounded-xl text-xs font-bold hover:bg-vsp-border transition-all"
              >
                {isAr ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
