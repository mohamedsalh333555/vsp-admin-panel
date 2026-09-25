import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useLanguage } from '../context/LanguageContext';
import { StatCard } from '../components/ui/StatCard';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Card,
  Refresh2,
  TickCircle,
  Clock,
  SearchNormal1,
  DollarCircle,
  RotateRight,
  ReceiptItem,
  DocumentDownload,
  TrendUp,
  Bank,
  Mobile,
  Check,
  Send2,
  Danger,
  Wallet2,
} from 'iconsax-react';

export const PayoutSettlementsPage = () => {
  const { t, isRTL } = useLanguage();
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
      totalOnlineCollected: 0,
      totalPlatformRevenue: 0,
      totalPendingOwnerDues: 0,
      totalEscrowHeld: 0,
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
      if (data && !data.error && data.ownerMatrix) {
        setFinancialData(data);
      } else if (data?.error) {
        showToast(data.error, 'error');
      }
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
    const dest = owner.payoutDestination || owner.phone || '';
    const meth = owner.payoutMethod || (owner.p2p_instapay ? 'instapay' : 'vodafone_cash');
    setSettlementForm({
      amount: owner.netBalance > 0 ? owner.netBalance : '',
      method: meth,
      destination: dest,
      referenceNumber: '',
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
        showToast(t('settlement_success'));
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

  const ownerMatrix = financialData?.ownerMatrix || [];
  const transactions = financialData?.transactions || [];
  const settlements = financialData?.settlements || [];
  const kpis = financialData?.kpis || {
    totalGrossSystemVolume: 0,
    totalOnlineCollected: 0,
    totalPlatformRevenue: 0,
    totalPendingOwnerDues: 0,
    totalEscrowHeld: 0,
    totalSettledPayouts: 0,
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (ownerMatrix.length === 0) {
      showToast(t('no_data'), 'warning');
      return;
    }

    const headers = [
      t('owner_statement_col'),
      t('phone'),
      t('governorate'),
      t('gross_volume_col'),
      t('online_collected_col'),
      t('settled_payouts_col'),
      t('net_withdrawable_col'),
    ];
    const rows = ownerMatrix.map((o) => [
      `"${o.name}"`,
      `"${o.phone}"`,
      `"${o.governorate}"`,
      o.grossVolume,
      o.onlineVolume,
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
  const filteredOwners = ownerMatrix.filter((o) => {
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
            <DocumentDownload className="w-3.5 h-3.5 text-zinc-400" variant="Outline" />
            <span>{t('export_data')}</span>
          </button>

          <button
            onClick={loadFinancials}
            disabled={loading}
            className="p-2.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-zinc-400 hover:text-white rounded-xl transition-all disabled:opacity-50"
            title={t('refresh_data')}
          >
            <Refresh2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} variant="Outline" />
          </button>
        </div>
      </div>

      {/* Financial Executive KPI Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label={t('kpi_online_collected')}
          value={`${Number(kpis.totalOnlineCollected || 0).toLocaleString()} ${t('currency')}`}
          icon={Wallet2}
          subtext={t('kpi_online_subtext')}
        />
        <StatCard
          label={t('kpi_pending_dues')}
          value={`${Number(kpis.totalPendingOwnerDues || 0).toLocaleString()} ${t('currency')}`}
          icon={Clock}
          subtext={t('kpi_pending_subtext')}
        />
        <StatCard
          label={t('kpi_escrow_held')}
          value={`${Number(kpis.totalEscrowHeld || 0).toLocaleString()} ${t('currency')}`}
          icon={Clock}
          subtext={t('kpi_escrow_subtext')}
        />
        <StatCard
          label={t('kpi_total_settled')}
          value={`${Number(kpis.totalSettledPayouts || 0).toLocaleString()} ${t('currency')}`}
          icon={TickCircle}
          subtext={t('kpi_settled_subtext')}
        />
        <StatCard
          label={t('kpi_platform_commission')}
          value={`${Number(kpis.totalPlatformRevenue || 0).toLocaleString()} ${t('currency')}`}
          icon={DollarCircle}
          subtext={t('kpi_platform_subtext')}
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
            <SearchNormal1 className={`w-4 h-4 text-zinc-500 absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3.5' : 'left-3.5'}`} variant="Outline" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('search')}
              className={`w-full bg-vsp-surface border border-vsp-border rounded-xl py-2 text-xs text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none ${
                isRTL ? 'pr-10 pl-4 text-right' : 'pl-10 pr-4 text-left'
              }`}
            />
          </div>
        )}
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="h-64 flex items-center justify-center bg-vsp-surface border border-vsp-border rounded-2xl">
          <RotateRight className="w-8 h-8 text-zinc-400 animate-spin" variant="Outline" />
        </div>
      ) : activeTab === 'matrix' ? (
        /* TAB 1: OWNER ACCOUNTS & BALANCES MATRIX */
        <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-xl">
          {filteredOwners.length === 0 ? (
            <EmptyState
              icon={Card}
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
                    <th className="px-6 py-4 font-bold">{t('online_collected_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('settled_payouts_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('net_withdrawable_col')}</th>
                    <th className="px-6 py-4 font-bold text-center">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vsp-border/50">
                  {filteredOwners.map((owner) => {
                    const isDue = owner.netBalance > 0;
                    const isZero = owner.netBalance === 0;

                    return (
                      <tr key={owner.ownerId} className="hover:bg-vsp-card/30 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-bold text-white text-sm">{owner.name || '-'}</div>
                            <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                              {owner.phone}
                              {owner.stadiumNames && (
                                <span> • {owner.stadiumNames}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="text-[11px] font-mono text-zinc-300">
                            {owner.payoutDestination ? (
                              <span className="bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-md text-zinc-200 inline-flex items-center gap-1">
                                {owner.payoutMethod === 'instapay' ? (
                                  <span className="text-sky-400 font-bold">{t('instapay')}:</span>
                                ) : owner.payoutMethod === 'vodafone_cash' ? (
                                  <span className="text-rose-400 font-bold">{t('vodafone_cash')}:</span>
                                ) : (
                                  <span className="text-vsp-accent font-bold">{t('bank_transfer')}:</span>
                                )}
                                <span>{owner.payoutDestination}</span>
                              </span>
                            ) : (
                              <span className="text-zinc-500 italic flex items-center gap-1">
                                <Danger className="w-3 h-3 text-zinc-500" variant="Outline" />
                                <span>{t('no_destination_registered')}</span>
                              </span>
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
                          <span className="font-bold text-vsp-accent font-mono">
                            {Number(owner.onlineVolume || 0).toLocaleString()} {t('currency')}
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
                                isDue ? 'text-white' : 'text-zinc-500'
                              }`}
                            >
                              {Number(owner.netBalance || 0).toLocaleString()} {t('currency')}
                            </span>
                            {isDue ? (
                              <Badge variant="success" size="xs">
                                {t('ready_for_payout')}
                              </Badge>
                            ) : isZero ? (
                              <Badge variant="default" size="xs">
                                {t('no_dues')}
                              </Badge>
                            ) : (
                              <Badge variant="danger" size="xs">
                                {t('negative_due')}
                              </Badge>
                            )}
                          </div>
                          {owner.escrowHeld > 0 && (
                            <div
                              className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg w-fit"
                              title={t('kpi_escrow_subtext')}
                            >
                              <Clock className="w-3 h-3 text-amber-400 shrink-0" variant="Outline" />
                              <span>{Number(owner.escrowHeld).toLocaleString()} {t('currency')} {t('upcoming_escrow_note')}</span>
                              {owner.upcomingBookings && owner.upcomingBookings.length > 0 && (
                                <span className="text-[10px] text-amber-300/80 font-sans">
                                  ({new Date(owner.upcomingBookings[0].startTime).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })})
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-center">
                          {isDue ? (
                            <button
                              onClick={() => openSettlementModal(owner)}
                              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 hover:border-zinc-500 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 mx-auto"
                            >
                              <Check className="w-3.5 h-3.5 text-vsp-accent" variant="Outline" />
                              <span>{t('settle_now_btn')}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-zinc-600 font-medium">
                              {t('no_dues')}
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
              icon={ReceiptItem}
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
                      <td className="px-6 py-4 font-mono font-bold text-white">#{tx.id}</td>
                      <td className="px-6 py-4">
                        <Badge variant="accent" size="xs">
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-white">
                        {Number(tx.total_price || 0).toLocaleString()} {t('currency')}
                      </td>
                      <td className="px-6 py-4 text-vsp-textSecondary">
                        {tx.payment_method || '-'}
                      </td>
                      <td className="px-6 py-4 text-vsp-textSecondary">
                        {tx.payout_settlement_id ? (
                          <span className="text-vsp-accent font-semibold">{t('settled')}</span>
                        ) : tx.status === 'confirmed' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-medium">
                            <Clock className="w-3 h-3 shrink-0" variant="Outline" />
                            <span>{t('upcoming_escrow_note')}</span>
                          </span>
                        ) : tx.status === 'completed' ? (
                          <span className="text-emerald-400 font-semibold">{isRTL ? 'مكتمل (جاهز للصرف)' : 'Completed (Ready)'}</span>
                        ) : (
                          <span className="text-zinc-500 font-semibold">{t('pending')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-zinc-400 font-mono text-[11px]">
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString(t('lang_button') === 'English' ? 'ar-EG' : 'en-US') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* TAB 3: SETTLEMENTS AUDIT TRAIL */
        <div className="bg-vsp-surface border border-vsp-border rounded-2xl overflow-hidden shadow-xl">
          {financialData.settlements.length === 0 ? (
            <EmptyState
              icon={TickCircle}
              title={t('no_data')}
              subtitle=""
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-vsp-card/50 text-vsp-textSecondary border-b border-vsp-border">
                  <tr>
                    <th className="px-6 py-4 font-bold">{t('owner_statement_col')}</th>
                    <th className="px-6 py-4 font-bold">{t('booking_total_price')}</th>
                    <th className="px-6 py-4 font-bold">{t('transfer_method')}</th>
                    <th className="px-6 py-4 font-bold">{t('reference_number')}</th>
                    <th className="px-6 py-4 font-bold">{t('status')}</th>
                    <th className="px-6 py-4 font-bold">{t('date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vsp-border/50">
                  {financialData.settlements.map((set) => (
                    <tr key={set.id} className="hover:bg-vsp-card/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">
                        {set.users?.name || set.owner_name || 'صاحب ملعب'}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-vsp-accent">
                        {Number(set.amount || 0).toLocaleString()} {t('currency')}
                      </td>
                      <td className="px-6 py-4 text-vsp-textSecondary">
                        {set.payment_method || '-'}
                      </td>
                      <td className="px-6 py-4 font-mono text-zinc-400">
                        {set.reference_number || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="success" size="xs">
                          {t('completed')}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-mono text-zinc-400 text-[11px]">
                        {set.created_at ? new Date(set.created_at).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Smart Payout Execution Modal */}
      <Modal
        isOpen={Boolean(selectedOwner)}
        onClose={() => setSelectedOwner(null)}
        title={t('payout_modal_title')}
        maxWidth="max-w-lg"
      >
        {selectedOwner && (
          <form onSubmit={handleExecuteSettlement} className="space-y-4">
            <div className="p-4 bg-vsp-card border border-vsp-border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-vsp-textSecondary">{t('owner_statement_col')}:</div>
                  <div className="font-bold text-white text-base mt-0.5">{selectedOwner.name}</div>
                  <div className="text-xs text-zinc-400 font-mono mt-0.5">{selectedOwner.phone}</div>
                </div>
                <div className="text-left">
                  <div className="text-xs text-vsp-textSecondary">{t('net_withdrawable_col')}:</div>
                  <div className="text-lg font-black text-vsp-accent font-mono mt-0.5">
                    {Number(selectedOwner.netBalance || 0).toLocaleString()} {t('currency')}
                  </div>
                </div>
              </div>

              {selectedOwner.escrowHeld > 0 && (
                <div className="pt-2 border-t border-vsp-border/70 flex items-start gap-2.5 text-xs text-amber-400 bg-amber-500/10 -mx-4 -mb-4 p-3 rounded-b-xl">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" variant="Outline" />
                  <div className="space-y-0.5">
                    <div className="font-bold">
                      {t('kpi_escrow_held')}: {Number(selectedOwner.escrowHeld).toLocaleString()} {t('currency')}
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      {isRTL
                        ? 'هذا المبلغ محتجز كأمانة لحجز قادم ولم يُحتسب ضمن الرصيد القابل للصرف أعلاه. سيتم تحريره تلقائياً فور انتهاء موعد المباراة.'
                        : 'This amount is held in escrow for an upcoming booking and is excluded from the withdrawable balance above. It will unlock automatically once the match is completed.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-vsp-textSecondary mb-1.5">
                {t('amount_to_transfer')}
              </label>
              <input
                type="number"
                step="0.01"
                required
                max={selectedOwner.netBalance}
                value={settlementForm.amount}
                onChange={(e) => setSettlementForm({ ...settlementForm, amount: e.target.value })}
                className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-vsp-textSecondary mb-1.5">
                  {t('transfer_method')}
                </label>
                <select
                  value={settlementForm.method}
                  onChange={(e) => setSettlementForm({ ...settlementForm, method: e.target.value })}
                  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500"
                >
                  <option value="vodafone_cash">{t('vodafone_cash')}</option>
                  <option value="instapay">{t('instapay')}</option>
                  <option value="bank_transfer">{t('bank_transfer')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-vsp-textSecondary mb-1.5">
                  {t('wallet_number_account')}
                </label>
                <input
                  type="text"
                  required
                  value={settlementForm.destination}
                  onChange={(e) => setSettlementForm({ ...settlementForm, destination: e.target.value })}
                  placeholder="01XXXXXXXXX / username@instapay"
                  className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-vsp-textSecondary mb-1.5">
                {t('reference_number')}
              </label>
              <input
                type="text"
                value={settlementForm.referenceNumber}
                onChange={(e) => setSettlementForm({ ...settlementForm, referenceNumber: e.target.value })}
                className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedOwner(null)}
                className="flex-1 py-2.5 bg-vsp-card hover:bg-vsp-border text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition-all"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-white text-black font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isProcessing ? (
                  <RotateRight className="w-4 h-4 animate-spin" variant="Outline" />
                ) : (
                  <TickCircle className="w-4 h-4" variant="Outline" />
                )}
                <span>{t('confirm_payout_btn')}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
