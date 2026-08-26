import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useLanguage } from '../context/LanguageContext';
import { ImagePreviewModal } from '../components/ui/ImagePreviewModal';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  CheckCircle2,
  XCircle,
  PlusCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  FileCheck,
  Loader2,
  Eye,
  RefreshCw,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const OwnerAuditsPage = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [owners, setOwners] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [linkedStadium, setLinkedStadium] = useState(null);

  // Document preview modal
  const [activeDoc, setActiveDoc] = useState({ isOpen: false, url: '', title: '', isPdf: false });

  // Reject Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Manual Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: '',
    phone: '',
    email: '',
    stadiumName: '',
    governorate: '',
    pricePerHour: 350,
  });

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchPendingOwners = async () => {
    setLoading(true);
    try {
      const data = await adminService.fetchPendingOwners();
      setOwners(data || []);

      if (data && data.length > 0) {
        selectOwnerItem(data[0]);
      } else {
        setSelectedOwner(null);
        setLinkedStadium(null);
      }
    } catch (e) {
      showToast(t('error_loading'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectOwnerItem = async (owner) => {
    setSelectedOwner(owner);
    const stadium = await adminService.fetchStadiumForOwner(owner.id);
    setLinkedStadium(stadium);
  };

  useEffect(() => {
    fetchPendingOwners();
  }, []);

  // Approve Owner
  const handleApprove = async () => {
    if (!selectedOwner) return;
    setProcessing(true);
    try {
      const res = await adminService.approveOwner({
        ownerId: selectedOwner.id,
        stadiumId: linkedStadium?.id,
      });

      if (res.success) {
        showToast(t('toast_owner_approved'));
        fetchPendingOwners();
      } else {
        showToast(res.error || t('toast_fail_generic'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Reject Owner
  const handleReject = async () => {
    if (!selectedOwner) return;
    setProcessing(true);
    try {
      const res = await adminService.rejectOwner({
        ownerId: selectedOwner.id,
        reason: rejectReason.trim() || t('toast_fail_generic'),
      });

      if (res.success) {
        showToast(t('toast_owner_rejected'));
        setShowRejectModal(false);
        setRejectReason('');
        fetchPendingOwners();
      } else {
        showToast(res.error || t('toast_fail_generic'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Manual Creation
  const handleManualCreate = async (e) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.phone || !manualForm.stadiumName) {
      showToast(t('toast_fill_required'), 'error');
      return;
    }

    setProcessing(true);
    try {
      const res = await adminService.createOwnerAndStadiumManually(manualForm);
      if (res.success) {
        showToast(t('toast_owner_added'));
        setShowAddModal(false);
        setManualForm({
          name: '',
          phone: '',
          email: '',
          stadiumName: '',
          governorate: '',
          pricePerHour: 350,
        });
        fetchPendingOwners();
      } else {
        showToast(res.error || t('toast_fail_generic'), 'error');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  // Helper to extract docs
  const getOwnerDocuments = (owner) => {
    const addData = owner?.additional_data || {};
    const docs = addData.verificationDocuments || addData.documents || {};
    const list = [];

    if (docs.commercialRegisterUrl || addData.commercial_register_url) {
      list.push({
        label: t('commercial_register'),
        url: docs.commercialRegisterUrl || addData.commercial_register_url,
      });
    }
    if (docs.taxCardUrl || addData.tax_card_url) {
      list.push({
        label: t('tax_card'),
        url: docs.taxCardUrl || addData.tax_card_url,
      });
    }
    if (docs.nationalIdFrontUrl || addData.national_id_front_url) {
      list.push({
        label: t('national_id_front'),
        url: docs.nationalIdFrontUrl || addData.national_id_front_url,
      });
    }
    if (docs.nationalIdBackUrl || addData.national_id_back_url) {
      list.push({
        label: t('national_id_back'),
        url: docs.nationalIdBackUrl || addData.national_id_back_url,
      });
    }
    if (docs.leaseContractUrl || addData.lease_contract_url) {
      list.push({
        label: t('lease_contract'),
        url: docs.leaseContractUrl || addData.lease_contract_url,
      });
    }

    return list;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast Notification */}
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
            <ShieldCheck className="w-6 h-6 text-vsp-accent" />
            <span>{t('owner_audits_title')}</span>
          </h1>
          <p className="text-xs text-vsp-textSecondary mt-0.5">
            {t('owner_audits_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPendingOwners}
            className="p-2.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-vsp-textSecondary hover:text-white rounded-xl transition-all"
            title={t('refresh_data')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-vsp-accent hover:bg-vsp-accentHover text-black font-bold text-xs rounded-xl shadow-lg shadow-vsp-accent/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('add_owner_manual')}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-vsp-accent animate-spin" />
        </div>
      ) : owners.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={t('no_pending_audits_title')}
          subtitle={t('no_pending_audits_sub')}
          actionText={t('add_owner_manual')}
          onAction={() => setShowAddModal(true)}
          actionIcon={PlusCircle}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Owners List Column */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-vsp-textSecondary">
                {t('pending_requests_count')} ({owners.length})
              </span>
              <Badge variant="warning" size="xs">
                {t('action_required')}
              </Badge>
            </div>

            <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
              {owners.map((owner) => {
                const isSelected = selectedOwner?.id === owner.id;
                const docsCount = getOwnerDocuments(owner).length;

                return (
                  <div
                    key={owner.id}
                    onClick={() => selectOwnerItem(owner)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-vsp-card border-vsp-accent shadow-lg shadow-vsp-accent/5'
                        : 'bg-vsp-surface border-vsp-border hover:border-zinc-700 hover:bg-vsp-card/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center font-bold text-white shrink-0 overflow-hidden">
                        {owner.profile_image_url ? (
                          <img
                            src={owner.profile_image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          owner.name?.charAt(0) || 'M'
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white truncate">
                            {owner.name || '-'}
                          </h4>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {owner.created_at
                              ? new Date(owner.created_at).toLocaleDateString(t('lang_button') === 'English' ? 'ar-EG' : 'en-US')
                              : ''}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-vsp-textSecondary mt-1">
                          <span className="truncate">{owner.phone || '-'}</span>
                          <span>•</span>
                          <span className="text-zinc-400 font-semibold">{owner.governorate || '-'}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={docsCount > 0 ? 'accent' : 'default'} size="xs">
                            <FileText className="w-3 h-3" />
                            <span>{docsCount} {t('uploaded_documents') || 'Documents'}</span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Owner Details & Inspection Column */}
          <div className="lg:col-span-7">
            {selectedOwner && (
              <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-6 space-y-6">
                {/* Profile Header */}
                <div className="flex items-start justify-between border-b border-vsp-border pb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-vsp-card border border-vsp-border flex items-center justify-center font-black text-xl text-zinc-200 overflow-hidden">
                      {selectedOwner.profile_image_url ? (
                        <img
                          src={selectedOwner.profile_image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        selectedOwner.name?.charAt(0) || 'O'
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">{selectedOwner.name}</h3>
                      <p className="text-xs text-vsp-textSecondary mt-0.5">
                        {t('user_col')}: <span className="font-mono text-zinc-400">{selectedOwner.id}</span>
                      </p>
                    </div>
                  </div>

                  <Badge variant="warning" size="sm">
                    <Clock className="w-3 h-3" />
                    <span>{t('pending')}</span>
                  </Badge>
                </div>

                {/* Contact & Location Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-vsp-card/60 border border-vsp-border rounded-xl p-3.5 space-y-1">
                    <span className="text-[11px] text-vsp-textSecondary font-semibold">{t('owner_info')}</span>
                    <div className="flex items-center gap-2 text-xs text-white font-bold">
                      <Phone className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{selectedOwner.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="truncate">{selectedOwner.email || '-'}</span>
                    </div>
                  </div>

                  <div className="bg-vsp-card/60 border border-vsp-border rounded-xl p-3.5 space-y-1">
                    <span className="text-[11px] text-vsp-textSecondary font-semibold">{t('governorate')}</span>
                    <div className="flex items-center gap-2 text-xs text-white font-bold">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{selectedOwner.governorate || '-'}</span>
                    </div>
                    <span className="text-[11px] text-zinc-500 block">
                      {t('status')}: {selectedOwner.status || t('active')}
                    </span>
                  </div>
                </div>

                {/* Linked Stadium Info */}
                <div className="bg-vsp-card/40 border border-vsp-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-zinc-400" />
                      <span>{t('stadium_info')}</span>
                    </h4>
                    {linkedStadium ? (
                      <Badge variant="accent" size="xs">
                        {t('registered_stadiums')}
                      </Badge>
                    ) : (
                      <Badge variant="default" size="xs">
                        {t('no_data')}
                      </Badge>
                    )}
                  </div>

                  {linkedStadium ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-vsp-textSecondary text-[11px]">{t('stadium_name_label')}:</span>
                        <p className="font-bold text-white">{linkedStadium.name}</p>
                      </div>
                      <div>
                        <span className="text-vsp-textSecondary text-[11px]">{t('price_per_hour_label')}:</span>
                        <p className="font-bold text-white">{linkedStadium.price_per_hour || 0} {t('currency')}</p>
                      </div>
                      <div>
                        <span className="text-vsp-textSecondary text-[11px]">{t('governorate')}:</span>
                        <p className="font-bold text-white">{linkedStadium.city || linkedStadium.governorate || '-'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-vsp-textSecondary">
                      {t('no_data')}
                    </p>
                  )}
                </div>

                {/* Document Verification Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-zinc-400" />
                    <span>{t('owner_audits_subtitle')}</span>
                  </h4>

                  {getOwnerDocuments(selectedOwner).length === 0 ? (
                    <div className="p-4 bg-vsp-card/40 border border-vsp-border rounded-xl text-center text-xs text-vsp-textSecondary">
                      {t('no_data')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {getOwnerDocuments(selectedOwner).map((doc, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-vsp-card border border-vsp-border rounded-xl flex items-center justify-between group hover:border-zinc-700 transition-all"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                            <span className="text-xs font-semibold text-white truncate">
                              {doc.label}
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setActiveDoc({
                                isOpen: true,
                                url: doc.url,
                                title: doc.label,
                                isPdf: doc.url?.endsWith('.pdf'),
                              })
                            }
                            className="p-1.5 bg-vsp-surface hover:bg-zinc-800 hover:text-white border border-vsp-border rounded-lg text-vsp-textSecondary transition-all flex items-center gap-1 text-[11px] font-bold px-2.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{t('view') || 'Preview'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-vsp-border">
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="w-full sm:flex-1 py-3 bg-zinc-100 hover:bg-white text-black font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{t('approve_owner_btn')}</span>
                  </button>

                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processing}
                    className="w-full sm:w-auto px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>{t('reject_owner_btn')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      <ImagePreviewModal
        isOpen={activeDoc.isOpen}
        onClose={() => setActiveDoc({ isOpen: false, url: '', title: '', isPdf: false })}
        title={activeDoc.title}
        imageUrl={activeDoc.url}
        isPdf={activeDoc.isPdf}
      />

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={t('reject_modal_title')}
      >
        <div className="space-y-4">
          <p className="text-xs text-vsp-textSecondary">
            {t('reject_reason_prompt')}
          </p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t('reject_reason_placeholder')}
            rows={4}
            className="w-full bg-vsp-card border border-vsp-border rounded-xl p-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setShowRejectModal(false)}
              className="px-4 py-2 bg-vsp-card border border-vsp-border text-vsp-textSecondary hover:text-white rounded-xl text-xs font-bold"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleReject}
              disabled={processing || !rejectReason.trim()}
              className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {processing ? t('processing') : t('reject_owner_btn')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Owner & Stadium Manually Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={t('add_owner_title')}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleManualCreate} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">{t('owner_name_label')}</label>
            <input
              type="text"
              required
              value={manualForm.name}
              onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
              placeholder="Captain Ahmed"
              className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">{t('phone')}</label>
              <input
                type="tel"
                required
                value={manualForm.phone}
                onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })}
                placeholder="010XXXXXXXX"
                className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">{t('email')}</label>
              <input
                type="email"
                value={manualForm.email}
                onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                placeholder="owner@example.com"
                className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">{t('stadium_name_label')}</label>
            <input
              type="text"
              required
              value={manualForm.stadiumName}
              onChange={(e) => setManualForm({ ...manualForm, stadiumName: e.target.value })}
              placeholder="Stadium Name"
              className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">{t('governorate')}</label>
              <input
                type="text"
                value={manualForm.governorate}
                onChange={(e) => setManualForm({ ...manualForm, governorate: e.target.value })}
                placeholder="Cairo"
                className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">{t('price_per_hour_label')}</label>
              <input
                type="number"
                value={manualForm.pricePerHour}
                onChange={(e) => setManualForm({ ...manualForm, pricePerHour: e.target.value })}
                className="w-full bg-vsp-card border border-vsp-border rounded-xl px-3 py-2 text-xs text-white focus:border-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-vsp-border">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 bg-vsp-card border border-vsp-border text-vsp-textSecondary hover:text-white rounded-xl text-xs font-bold"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={processing}
              className="px-5 py-2 bg-zinc-100 hover:bg-white text-black rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              {processing ? t('processing') : t('confirm')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
