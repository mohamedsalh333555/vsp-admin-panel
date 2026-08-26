import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useLanguage } from '../context/LanguageContext';
import { StatCard } from '../components/ui/StatCard';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  CreditCard,
  RefreshCw,
  CheckCircle2,
  Clock,
  Search,
  DollarSign,
  Loader2,
  Receipt,
  Download,
  TrendingUp,
  Landmark,
  Smartphone,
  Check,
  Send,
  ArrowUpRight,
} from 'lucide-react';

export const PayoutSettlementsPage = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'ledger' | 'requests'
  const [search, setSearch] = useState('');

  // Financial Data
  const [financialData, setFinancialData] = useState({
    ownerMatrix: [],
    transactions: [],
    settlements: [],
    kpis: {
      totalGrossSystemVolume: 0,
      totalPlatformRevenue: 0,
      totalPendingOwnerDues: 0,
      totalSettledPayouts: 0,
    },
  });

  // Smart Settlement Modal State
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settlementForm, setSettlementForm] = useState({
    amount: '',
    method: 'vodafone_cash',
    destination: '',
    referenceNumber: '',
    notes: '',
  });

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadFinancials = async () => {
    setLoading(true);
    try {
      const data = await adminService.fetchFinancialOverview();
      setFinancialData(data);
    } catch (e) {
      showToast(t('error_loading'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancials();
  }, []);

  const openSettlementModal = (owner) => {
    setSelectedOwner(owner);
    const dest = owner.p2p_vodafone || owner.p2p_instapay || owner.phone || '';
    const meth = owner.p2p_instapay ? 'instapay' : 'vodafone_cash';
    setSettlementForm({
      amount: owner.netBalance > 0 ? owner.netBalance : '',
      method: meth,
      destination: dest,
      referenceNumber: `TXN_${Date.now().toString().slice(-6)}`,
      notes: '',
    });
  };

  const handleExecuteSettlement = async (e) => {
    e.preventDefault();
    if (!selectedOwner || !settlementForm.amount) return;

    setIsProcessing(true);
    try {
      const res = await adminService.recordSmartOwnerSettlement({
        ownerId: selectedOwner.ownerId,
        amount: Number(settlementForm.amount),
        method: settlementForm.method,
        destination: settlementForm.destination,
        referenceNumber: settlementForm.referenceNumber,
        notes: settlementForm.notes,
      });

      if (res.success) {
        showToast(t('save_booking_success'));
        setSelectedOwner(null);
        loadFinancials();
      } else {
        showToast(res.error || t('error_loading'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (financialData.ownerMatrix.length === 0) {
      showToast(t('no_data'), 'warning');
      return;
    }

    const headers = [
      t('owner_statement_col'),
      t('phone'),
      t('governorate'),
      t('gross_volume_col'),
      t('platform_fee_col'),
      t('settled_payouts_col'),
      t('net_withdrawable_col'),
    ];
    const rows = financialData.ownerMatrix.map((o) => [
      `"${o.name}"`,
      `"${o.phone}"`,
      `"${o.governorate}"`,
      o.grossVolume,
      o.platformCommission,
      o.totalPaidOut,
      o.netBalance,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Financial_Statement_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(t('export_data'));
  };

  // Filter owners
  const filteredOwners = financialData.ownerMatrix.filter((o) => {
    const q = search.toLowerCase();
    return (
      (o.name || '').toLowerCase().includes(q) ||
      (o.phone || '').includes(q) ||
      (o.stadiumNames || '').toLowerCase().includes(q) ||
      (o.governorate || '').toLowerCase().includes(q)
    );
  });

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
          <h1 className="text-xl font-black text-white">{t('payout_title')}</h1>
          <p className="text-xs text-vsp-textSecondary mt-0.5">
            {t('payout_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>{t('export_data')}</span>
          </button>

          <button
            onClick={loadFinancials}
            disabled={loading}
            className="p-2.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-zinc-400 hover:text-white rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Financial KPI Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('kpi_gross_volume')}
          value={`${Number(financialData.kpis.totalGrossSystemVolume).toLocaleString()} ${t('currency')}`}
          icon={TrendingUp}
          subtext={t('kpi_revenue_subtext')}
        />
        <StatCard
          label={t('kpi_platform_commission')}
          value={`${Number(financialData.kpis.totalPlatformRevenue).toLocaleString()} ${t('currency')}`}
          icon={DollarSign}
          subtext={t('kpi_revenue_subtext')}
        />
        <StatCard
          label={t('kpi_pending_dues')}
          value={`${Number(financialData.kpis.totalPendingOwnerDues).toLocaleString()} ${t('currency')}`}
          icon={Clock}
          subtext={t('kpi_users_subtext')}
        />
        <StatCard
          label={t('kpi_total_settled')}
          value={`${Number(financialData.kpis.totalSettledPayouts).toLocaleString()} ${t('currency')}`}
          icon={CheckCircle2}
          subtext={t('kpi_bookings_subtext')}
        />
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-vsp-surface border border-vsp-border rounded-xl">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'matrix'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-vsp-textSecondary hover:text-white'
            }`}
          >
            {t('tab_owner_matrix')} ({financialData.ownerMatrix.length})
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'ledger'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-vsp-textSecondary hover:text-white'
            }`}
          >
            {t('tab_ledger')} ({financialData.transactions.length})
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'requests'
                ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                : 'text-vsp-textSecondary hover:text-white'
            }`}
          >
            {t('tab_requests')} ({financialData.settlements.length})
          </button>
        </div>

        {activeTab === 'matrix' && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className="w-full bg-vsp-surface border border-vsp-border rounded-xl pr-10 pl-4 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="h-64 flex items-center justify-center bg-vsp-surface border border-vsp-border rounded-2xl">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
        </div>
      ) : activeTab === 'matrix' ? (
        /* TAB 1: OWNER ACCOUNTS & BALANCES MATRIX */
        <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-xl">
          {filteredOwners.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title={t('no_data')}
              subtitle=""
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-vsp-card/50 text-vsp-textSecondary border-b border-vsp-border">
                  <tr>
                    <th className="px-6 py-4 font-bold">{t('owner_statement_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('transfer_method')}</th>
                    <th className="px-6 py-4 font-bold">{t('gross_volume_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('platform_fee_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('settled_payouts_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('net_withdrawable_col')}</th>
                    <th className="px-6 py-4 font-bold text-center">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vsp-border/50">
                  {filteredOwners.map((owner) => {
                    const isPositive = owner.netBalance > 0;

                    return (
                      <tr key={owner.ownerId} className="hover:bg-vsp-card/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-bold text-white text-sm">{owner.name || '-'}</div>
                            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                              {owner.phone}
                              {owner.stadiumNames && !owner.stadiumNames.match(/^\d+$/) && (
                                <span> • {owner.stadiumNames}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-[11px] font-mono text-zinc-300">
                            {owner.p2p_instapay ? (
                              <span className="bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-md text-zinc-200 inline-block">
                                {t('instapay')}: {owner.p2p_instapay}
                              </span>
                            ) : owner.p2p_vodafone ? (
                              <span className="bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-md text-zinc-200 inline-block">
                                {t('vodafone_cash')}: {owner.p2p_vodafone}
                              </span>
                            ) : (
                              <span className="text-zinc-500 font-mono">{owner.phone || '-'}</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-bold text-white">
                            {Number(owner.grossVolume || 0).toLocaleString()} {t('currency')}
                          </span>
                          <span className="block text-[10px] text-zinc-500">
                            {owner.completedBookingsCount || 0} {t('total_bookings')}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-semibold text-zinc-300">
                            {Number(owner.platformCommission || 0).toLocaleString()} {t('currency')}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-zinc-400 font-mono">
                            {Number(owner.totalPaidOut || 0).toLocaleString()} {t('currency')}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-black font-mono ${
                                isPositive ? 'text-white' : 'text-zinc-500'
                              }`}
                            >
                              {Number(owner.netBalance || 0).toLocaleString()} {t('currency')}
                            </span>
                            {isPositive && (
                              <Badge variant="success" size="xs">
                                {t('pending')}
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          {isPositive ? (
                            <button
                              onClick={() => openSettlementModal(owner)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 hover:border-zinc-500 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 mx-auto"
                            >
                              <Check className="w-3.5 h-3.5 text-vsp-accent" />
                              <span>{t('settle_now_btn')}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-zinc-600 font-medium">
                              {t('completed')}
                            </span>
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
      ) : activeTab === 'ledger' ? (
        /* TAB 2: FINANCIAL TRANSACTIONS LEDGER */
        <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-xl">
          {financialData.transactions.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={t('no_data')}
              subtitle=""
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-vsp-card/50 text-vsp-textSecondary border-b border-vsp-border">
                  <tr>
                    <th className="px-6 py-4 font-bold">{t('booking_id')}</th>
                    <th className="px-6 py-4 font-bold">{t('status')}</th>
                    <th className="px-6 py-4 font-bold">{t('booking_total_price')}</th>
                    <th className="px-6 py-4 font-bold">{t('transfer_method')}</th>
                    <th className="px-6 py-4 font-bold">{t('account_status_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vsp-border/50">
                  {financialData.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-vsp-card/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-[11px] text-zinc-400 font-bold">
                        {tx.reference_number || `#${tx.id?.substring(0, 8)}`}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="default" size="xs">
                          {tx.type === 'payout' ? t('settle_now_btn') : t('confirmed')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-white font-mono">
                          {Number(tx.amount || 0).toLocaleString()} {t('currency')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-vsp-textSecondary">
                        {tx.payment_method || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={tx.status === 'completed' || tx.status === 'paid' ? 'success' : 'warning'}
                          size="xs"
                        >
                          {tx.status === 'completed' || tx.status === 'paid' ? t('completed') : t('pending')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-zinc-400 font-mono text-[11px]">
                        {tx.created_at
                          ? new Date(tx.created_at).toLocaleString(t('lang_button') === 'English' ? 'ar-EG' : 'en-US', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* TAB 3: WITHDRAWAL REQUESTS */
        <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-xl">
          {financialData.settlements.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title={t('no_data')}
              subtitle=""
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-vsp-card/50 text-vsp-textSecondary border-b border-vsp-border">
                  <tr>
                    <th className="px-6 py-4 font-bold">{t('owner_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('booking_total_price')}</th>
                    <th className="px-6 py-4 font-bold">{t('transfer_method')}</th>
                    <th className="px-6 py-4 font-bold">{t('wallet_number_account')}</th>
                    <th className="px-6 py-4 font-bold">{t('status')}</th>
                    <th className="px-6 py-4 font-bold">{t('date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vsp-border/50">
                  {financialData.settlements.map((s) => (
                    <tr key={s.id} className="hover:bg-vsp-card/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{s.users?.name || '-'}</td>
                      <td className="px-6 py-4 font-black text-white text-sm">
                        {Number(s.amount || 0).toLocaleString()} {t('currency')}
                      </td>
                      <td className="px-6 py-4 text-vsp-textSecondary">{s.method || '-'}</td>
                      <td className="px-6 py-4 font-mono text-zinc-400">{s.destination || '-'}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={s.status === 'paid' || s.status === 'completed' ? 'success' : 'warning'}
                          size="xs"
                        >
                          {s.status === 'paid' || s.status === 'completed' ? t('completed') : t('pending')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-mono text-zinc-400 text-[11px]">
                        {s.created_at
                          ? new Date(s.created_at).toLocaleDateString(t('lang_button') === 'English' ? 'ar-EG' : 'en-US')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Smart Payout & Settlement Modal */}
      <Modal
        isOpen={Boolean(selectedOwner)}
        onClose={() => setSelectedOwner(null)}
        title={t('payout_modal_title')}
        maxWidth="max-w-lg"
      >
        {selectedOwner && (
          <form onSubmit={handleExecuteSettlement} className="space-y-4">
            {/* Owner Info Box */}
            <div className="p-3.5 bg-vsp-card border border-vsp-border rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">{t('owner_col')}:</span>
                <span className="font-bold text-white text-sm">{selectedOwner.name}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-vsp-border/50">
                <span className="text-zinc-400">{t('net_withdrawable_col')}:</span>
                <span className="font-black text-white text-sm">
                  {selectedOwner.netBalance.toLocaleString()} {t('currency')}
                </span>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                {t('amount_to_transfer')}
              </label>
              <input
                type="number"
                required
                value={settlementForm.amount}
                onChange={(e) => setSettlementForm({ ...settlementForm, amount: e.target.value })}
                className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-zinc-500 focus:outline-none font-bold"
                placeholder="250"
              />
            </div>

            {/* Method & Destination */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">{t('transfer_method')}</label>
                <select
                  value={settlementForm.method}
                  onChange={(e) => setSettlementForm({ ...settlementForm, method: e.target.value })}
                  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-zinc-500 focus:outline-none"
                >
                  <option value="vodafone_cash">{t('vodafone_cash')}</option>
                  <option value="instapay">{t('instapay')}</option>
                  <option value="bank_transfer">{t('bank_transfer')}</option>
                  <option value="cash_direct">{t('cash_direct')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  {t('wallet_number_account')}
                </label>
                <input
                  type="text"
                  required
                  value={settlementForm.destination}
                  onChange={(e) => setSettlementForm({ ...settlementForm, destination: e.target.value })}
                  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-zinc-500 focus:outline-none font-mono"
                  placeholder="010XXXXXXXX"
                />
              </div>
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                {t('reference_number')}
              </label>
              <input
                type="text"
                required
                value={settlementForm.referenceNumber}
                onChange={(e) => setSettlementForm({ ...settlementForm, referenceNumber: e.target.value })}
                className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-zinc-500 focus:outline-none font-mono"
                placeholder="TXN_987654"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-vsp-border">
              <button
                type="button"
                onClick={() => setSelectedOwner(null)}
                className="px-4 py-2.5 bg-vsp-card hover:bg-vsp-border text-zinc-300 hover:text-white border border-vsp-border rounded-xl text-xs font-bold transition-all"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2.5 bg-zinc-100 hover:bg-white text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
              >
                {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{t('confirm_payout_btn')}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
