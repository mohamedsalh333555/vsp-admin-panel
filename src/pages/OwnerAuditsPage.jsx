import React, { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { useLanguage } from '../context/LanguageContext';
import { ImagePreviewModal } from '../components/ui/ImagePreviewModal';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import {
  TickCircle,
  CloseCircle,
  AddCircle,
  Building,
  Call,
  Sms,
  Location,
  DocumentText,
  ClipboardTick,
  RotateRight,
  Eye,
  Refresh2,
  Clock,
  ShieldTick,
  InfoCircle,
  Messages3,
} from 'iconsax-react';

export const OwnerAuditsPage = () => {
  const { t, lang, isRTL } = useLanguage();
  const isAr = lang === 'ar' || isRTL;
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [owners, setOwners] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('ready'); // 'ready' | 'incomplete'
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

  const readyOwners = owners.filter((o) => o.isReadyForReview);
  const incompleteOwners = owners.filter((o) => !o.isReadyForReview);
  const displayedOwners = activeSubTab === 'ready' ? readyOwners : incompleteOwners;

  const fetchPendingOwners = async () => {
    setLoading(true);
    try {
      const data = await adminService.fetchPendingOwners();
      const allOwners = data || [];
      setOwners(allOwners);

      const curReady = allOwners.filter((o) => o.isReadyForReview);
      const curIncomplete = allOwners.filter((o) => !o.isReadyForReview);

      // Auto-switch to incomplete tab if ready is empty but incomplete has items
      let targetTab = activeSubTab;
      if (curReady.length === 0 && curIncomplete.length > 0 && activeSubTab === 'ready') {
        setActiveSubTab('incomplete');
        targetTab = 'incomplete';
      }

      const currentList = targetTab === 'ready' ? curReady : curIncomplete;
      if (currentList.length > 0) {
        selectOwnerItem(currentList[0]);
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
    if (owner.linkedStadium) {
      setLinkedStadium(owner.linkedStadium);
    } else {
      const stadium = await adminService.fetchStadiumForOwner(owner.id);
      setLinkedStadium(stadium);
    }
  };

  const handleTabSwitch = (tab) => {
    setActiveSubTab(tab);
    const list = tab === 'ready' ? readyOwners : incompleteOwners;
    if (list.length > 0) {
      selectOwnerItem(list[0]);
    } else {
      setSelectedOwner(null);
      setLinkedStadium(null);
    }
  };

  useEffect(() => {
    fetchPendingOwners();
  }, []);

  // WhatsApp Contact Direct Action
  const handleWhatsAppContact = (phone, name) => {
    if (!phone) return;
    let clean = String(phone).replace(/[^0-9]/g, '');
    if (clean.startsWith('01')) {
      clean = '20' + clean.slice(1);
    } else if (!clean.startsWith('20') && clean.length === 10) {
      clean = '20' + clean;
    }
    const msg = encodeURIComponent(
      isAr
        ? `مرحباً أستاذ ${name || ''}، معك إدارة منصة VSP. بخصوص حسابك كصاحب ملعب والبدء في تسجيل ملعبك على المنصة...`
        : `Hello ${name || ''}, this is VSP Platform Administration regarding your stadium onboarding...`
    );
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank');
  };

  // Approve Owner
  const handleApprove = async () => {
    if (!selectedOwner) return;
    if (!selectedOwner.isReadyForReview) {
      showToast(t('cannot_approve_empty_owner'), 'warning');
      return;
    }

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
    if (!owner) return [];
    const addData = owner.additional_data || {};
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
            <ClipboardTick className="w-6 h-6 text-vsp-accent" variant="Outline" />
            <span>{t('owner_audits_title')}</span>
          </h1>
          <p className="text-xs text-vsp-textSecondary mt-0.5">
            {t('owner_audits_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchPendingOwners}
            className="p-2.5 bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-vsp-textSecondary hover:text-white rounded-xl transition-all"
            title="Refresh"
          >
            <Refresh2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} variant="Outline" />
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-vsp-accent hover:bg-vsp-accentHover text-black font-bold text-xs rounded-xl shadow-lg shadow-vsp-accent/20 transition-all"
          >
            <AddCircle className="w-4 h-4" variant="Outline" />
            <span>{t('add_owner_manual')}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <RotateRight className="w-8 h-8 text-vsp-accent animate-spin" variant="Outline" />
        </div>
      ) : owners.length === 0 ? (
        <EmptyState
          icon={TickCircle}
          title={t('no_pending_audits_title')}
          subtitle={t('no_pending_audits_sub')}
          actionText={t('add_owner_manual')}
          onAction={() => setShowAddModal(true)}
          actionIcon={AddCircle}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Owners List Column */}
          <div className="lg:col-span-5 space-y-3">
            {/* Segmented Sub-Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-vsp-card/70 border border-vsp-border rounded-xl">
              <button
                type="button"
                onClick={() => handleTabSwitch('ready')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeSubTab === 'ready'
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>{t('tab_ready_audits')}</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                    activeSubTab === 'ready'
                      ? 'bg-vsp-accent/20 text-vsp-accent border border-vsp-accent/30'
                      : 'bg-vsp-surface text-zinc-500'
                  }`}
                >
                  {readyOwners.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabSwitch('incomplete')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeSubTab === 'incomplete'
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>{t('tab_incomplete_onboarding')}</span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                    activeSubTab === 'incomplete'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-vsp-surface text-zinc-500'
                  }`}
                >
                  {incompleteOwners.length}
                </span>
              </button>
            </div>

            {/* List header note */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-vsp-textSecondary">
                {activeSubTab === 'ready' ? t('tab_ready_audits') : t('tab_incomplete_onboarding')} (
                {displayedOwners.length})
              </span>
              <Badge variant={activeSubTab === 'ready' ? 'warning' : 'default'} size="xs">
                {activeSubTab === 'ready' ? t('action_required') : t('badge_draft_lead')}
              </Badge>
            </div>

            {displayedOwners.length === 0 ? (
              <div className="p-8 bg-vsp-surface border border-vsp-border rounded-2xl text-center space-y-2">
                <p className="text-xs font-bold text-white">
                  {activeSubTab === 'ready'
                    ? t('no_pending_audits_title')
                    : t('no_incomplete_owners_title')}
                </p>
                <p className="text-[11px] text-vsp-textSecondary">
                  {activeSubTab === 'ready'
                    ? t('no_pending_audits_sub')
                    : t('no_incomplete_owners_sub')}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[75vh] overflow-y-auto pr-1">
                {displayedOwners.map((owner) => {
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
                                ? new Date(owner.created_at).toLocaleDateString(
                                    t('lang_button') === 'English' ? 'ar-EG' : 'en-US'
                                  )
                                : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-vsp-textSecondary mt-1">
                            <span className="truncate">{owner.phone || '-'}</span>
                            <span>•</span>
                            <span className="text-zinc-400 font-semibold">{owner.governorate || '-'}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {owner.hasStadium ? (
                              <Badge variant="accent" size="xs">
                                <Building className="w-3 h-3 text-vsp-accent" variant="Outline" />
                                <span>{owner.linkedStadium?.name || t('stadium_info')}</span>
                              </Badge>
                            ) : null}

                            <Badge variant={docsCount > 0 ? 'success' : 'default'} size="xs">
                              <DocumentText className="w-3 h-3" variant="Outline" />
                              <span>
                                {docsCount} {t('uploaded_documents') || 'Documents'}
                              </span>
                            </Badge>

                            {!owner.isReadyForReview && (
                              <Badge variant="warning" size="xs">
                                <Clock className="w-3 h-3 text-amber-400" variant="Outline" />
                                <span>{t('badge_draft_lead')}</span>
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

                  {selectedOwner.isReadyForReview ? (
                    <Badge variant="warning" size="sm">
                      <Clock className="w-3 h-3" variant="Outline" />
                      <span>{t('pending')}</span>
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm">
                      <Clock className="w-3 h-3 text-amber-400" variant="Outline" />
                      <span>{t('badge_draft_lead')}</span>
                    </Badge>
                  )}
                </div>

                {/* Incomplete Warning Banner if user has no stadium and no docs */}
                {!selectedOwner.isReadyForReview && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 shadow-sm">
                    <InfoCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" variant="Outline" />
                    <div className="space-y-0.5">
                      <h5 className="text-xs font-bold text-amber-200">{t('incomplete_warning_title')}</h5>
                      <p className="text-[11px] text-amber-300/80 leading-relaxed">
                        {t('incomplete_warning_desc')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Contact & Location Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-vsp-card/60 border border-vsp-border rounded-xl p-3.5 space-y-2">
                    <span className="text-[11px] text-vsp-textSecondary font-semibold">{t('owner_info')}</span>
                    <div className="flex items-center gap-2 text-xs text-white font-bold">
                      <Call className="w-3.5 h-3.5 text-zinc-400" variant="Outline" />
                      <span>{selectedOwner.phone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <Sms className="w-3.5 h-3.5" variant="Outline" />
                      <span className="truncate">{selectedOwner.email || '-'}</span>
                    </div>

                    {/* Direct Contact Actions */}
                    {selectedOwner.phone && (
                      <div className="flex items-center gap-2 pt-1 border-t border-vsp-border/50">
                        <button
                          type="button"
                          onClick={() => handleWhatsAppContact(selectedOwner.phone, selectedOwner.name)}
                          className="px-2.5 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Messages3 className="w-3.5 h-3.5" variant="Outline" />
                          <span>{t('whatsapp_contact')}</span>
                        </button>

                        <a
                          href={`tel:${selectedOwner.phone}`}
                          className="px-2.5 py-1 bg-vsp-surface hover:bg-zinc-800 border border-vsp-border text-zinc-300 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Call className="w-3.5 h-3.5" variant="Outline" />
                          <span>{t('call_owner')}</span>
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="bg-vsp-card/60 border border-vsp-border rounded-xl p-3.5 space-y-1">
                    <span className="text-[11px] text-vsp-textSecondary font-semibold">{t('governorate')}</span>
                    <div className="flex items-center gap-2 text-xs text-white font-bold">
                      <Location className="w-3.5 h-3.5 text-zinc-400" variant="Outline" />
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
                      <Building className="w-4 h-4 text-zinc-400" variant="Outline" />
                      <span>{t('stadium_info')}</span>
                    </h4>
                    {linkedStadium ? (
                      <Badge variant="accent" size="xs">
                        {t('registered_stadiums') || 'Registered'}
                      </Badge>
                    ) : (
                      <Badge variant="default" size="xs">
                        {t('no_stadium_yet_title')}
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
                        <p className="font-bold text-white">
                          {linkedStadium.price_per_hour || 0} {t('currency')}
                        </p>
                      </div>
                      <div>
                        <span className="text-vsp-textSecondary text-[11px]">{t('governorate')}:</span>
                        <p className="font-bold text-white">
                          {linkedStadium.city || linkedStadium.governorate || '-'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-vsp-surface/60 border border-dashed border-vsp-border rounded-xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-500 shrink-0">
                        <Building className="w-5 h-5" variant="Outline" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-zinc-200">{t('no_stadium_yet_title')}</p>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{t('no_stadium_yet_desc')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Document Verification Section */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white flex items-center gap-2">
                    <ClipboardTick className="w-4 h-4 text-zinc-400" variant="Outline" />
                    <span>{t('owner_audits_subtitle')}</span>
                  </h4>

                  {getOwnerDocuments(selectedOwner).length === 0 ? (
                    <div className="p-4 bg-vsp-surface/60 border border-dashed border-vsp-border rounded-xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-vsp-card border border-vsp-border flex items-center justify-center text-zinc-500 shrink-0">
                        <DocumentText className="w-5 h-5" variant="Outline" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-zinc-200">{t('no_docs_yet_title')}</p>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{t('no_docs_yet_desc')}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {getOwnerDocuments(selectedOwner).map((doc, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-vsp-card border border-vsp-border rounded-xl flex items-center justify-between group hover:border-zinc-700 transition-all"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <DocumentText className="w-4 h-4 text-zinc-400 shrink-0" variant="Outline" />
                            <span className="text-xs font-semibold text-white truncate">{doc.label}</span>
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
                            <Eye className="w-3.5 h-3.5" variant="Outline" />
                            <span>{t('view') || 'Preview'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-vsp-border">
                  <div className="w-full sm:flex-1 space-y-1">
                    <button
                      onClick={handleApprove}
                      disabled={processing || !selectedOwner.isReadyForReview}
                      title={!selectedOwner.isReadyForReview ? t('cannot_approve_empty_owner') : ''}
                      className={`w-full py-3 font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all ${
                        selectedOwner.isReadyForReview
                          ? 'bg-zinc-100 hover:bg-white text-black cursor-pointer'
                          : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {processing ? (
                        <RotateRight className="w-4 h-4 animate-spin" variant="Outline" />
                      ) : (
                        <TickCircle className="w-4 h-4" variant="Outline" />
                      )}
                      <span>{t('approve_owner_btn')}</span>
                    </button>
                    {!selectedOwner.isReadyForReview && (
                      <p className="text-[10px] text-center text-zinc-500 font-semibold">
                        {t('cannot_approve_empty_owner')}
                      </p>
                    )}
                    {/* تحذير: المالك يملك ملعباً لكن لا توجد وثائق هوية */}
                    {selectedOwner.hasStadium && !selectedOwner.hasDocs && (
                      <div className="flex items-start gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl mt-1">
                        <span className="text-red-400 text-xs mt-0.5">⚠</span>
                        <p className="text-[11px] text-red-300 leading-relaxed">
                          {isAr
                            ? 'لم يتم رفع وثائق إثبات الهوية (بطاقة رقم قومي أو سجل تجاري). الاعتماد بدون وثائق يُعرّض المنصة للمسؤولية القانونية.'
                            : 'No identity documents uploaded (National ID or Commercial Register). Approving without documents creates legal exposure.'}
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processing}
                    className="w-full sm:w-auto px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <CloseCircle className="w-4 h-4" variant="Outline" />
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
        ownerPhone={selectedOwner?.phone}
        ownerName={selectedOwner?.name}
      />

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={t('reject_modal_title')}
      >
        <div className="space-y-4">
          <p className="text-xs text-vsp-textSecondary">
            {selectedOwner && !selectedOwner.isReadyForReview
              ? t('incomplete_warning_desc')
              : t('reject_reason_prompt')}
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
            <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">
              {t('owner_name_label')}
            </label>
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
            <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">
              {t('stadium_name_label')}
            </label>
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
              <label className="block text-[11px] font-bold text-vsp-textSecondary mb-1">
                {t('price_per_hour_label')}
              </label>
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
