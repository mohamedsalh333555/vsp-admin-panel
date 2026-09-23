import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { bannersService } from '../services/bannersService';
import { Badge } from '../components/ui/Badge';
import { Toast } from '../components/ui/Toast';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ImagePreviewModal } from '../components/ui/ImagePreviewModal';
import {
  Speaker,
  Add,
  Refresh2,
  SearchNormal1,
  Eye,
  Mouse,
  Layer,
  Clock,
  Calendar,
  ExportCurve,
  Edit2,
  Trash,
  DocumentUpload,
  TickCircle,
  Danger,
  RotateRight,
  DiscountShape,
  Play,
  Pause,
  Gallery as ImageIcon,
} from 'iconsax-react';

const getInitialStartDate = () => {
  const nowWithBuffer = new Date(Date.now() - 5 * 60 * 1000);
  return nowWithBuffer.toISOString().slice(0, 16);
};

export const BannersManagementPage = () => {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [stats, setStats] = useState({
    totalBanners: 0,
    activeBanners: 0,
    totalClicks: 0,
    totalViews: 0,
    ctr: '0.0',
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlacement, setFilterPlacement] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modals & Actions
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    target_url: '',
    placement: 'home_slider',
    duration_seconds: 5,
    start_date: getInitialStartDate(),
    end_date: '',
    is_active: true,
    priority_order: 0,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [bannersRes, statsRes] = await Promise.all([
        bannersService.fetchBanners({ placement: filterPlacement, status: filterStatus }),
        bannersService.fetchBannerStats(),
      ]);

      if (bannersRes.success) {
        setBanners(bannersRes.data || []);
      } else {
        setLoadError(bannersRes.error || 'تعذر تحميل بيانات البانرات، يرجى المحاولة مرة أخرى');
        showToast(bannersRes.error || t('error_loading'), 'error');
      }

      if (statsRes.success) {
        setStats(statsRes.stats);
      }
    } catch (e) {
      setLoadError(e.message || 'تعذر تحميل بيانات البانرات، يرجى المحاولة مرة أخرى');
      showToast(e.message || t('error_loading'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterPlacement, filterStatus]);

  const openCreateModal = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      description: '',
      image_url: '',
      target_url: '',
      placement: 'home_slider',
      duration_seconds: 5,
      start_date: getInitialStartDate(),
      end_date: '',
      is_active: true,
      priority_order: 0,
    });
    setSelectedFile(null);
    setImagePreviewUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      description: banner.description || '',
      image_url: banner.image_url || '',
      target_url: banner.target_url || '',
      placement: banner.placement || 'home_slider',
      duration_seconds: banner.duration_seconds || 5,
      start_date: banner.start_date ? new Date(banner.start_date).toISOString().slice(0, 16) : '',
      end_date: banner.end_date ? new Date(banner.end_date).toISOString().slice(0, 16) : '',
      is_active: banner.is_active ?? true,
      priority_order: banner.priority_order || 0,
    });
    setSelectedFile(null);
    setImagePreviewUrl(banner.image_url || '');
    setIsModalOpen(true);
  };

  const validateAndSetFile = (file) => {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('حجم الصورة يتجاوز الحد الأقصى (5 ميجابايت)', 'error');
      return;
    }

    const fileExt = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['png', 'jpg', 'jpeg', 'webp'];
    if (!allowedExts.includes(fileExt)) {
      showToast('صيغة الملف غير مدعومة. يرجى اختيار صورة بصيغة JPG أو PNG أو WebP فقط.', 'error');
      return;
    }

    setSelectedFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
    if (e.target) {
      e.target.value = null;
    }
  };

  const handleSaveBanner = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    setActionLoading(true);
    try {
      let finalImageUrl = formData.image_url;

      // Upload new image if selected
      if (selectedFile) {
        showToast(t('uploading_image'), 'info');
        const uploadRes = await bannersService.uploadBannerImage(selectedFile);
        if (!uploadRes.success) {
          throw new Error(uploadRes.error || 'Failed to upload image');
        }
        finalImageUrl = uploadRes.url;
      }

      if (!finalImageUrl) {
        showToast(t('select_image_required'), 'error');
        setActionLoading(false);
        return;
      }

      const payload = {
        ...formData,
        image_url: finalImageUrl,
      };

      if (editingBanner) {
        const res = await bannersService.updateBanner(editingBanner.id, payload);
        if (res.success) {
          showToast(t('banner_saved_success'));
          setIsModalOpen(false);
          loadData();
        } else {
          showToast(res.error || 'Error saving banner', 'error');
        }
      } else {
        const res = await bannersService.createBanner(payload);
        if (res.success) {
          showToast(t('banner_saved_success'));
          setIsModalOpen(false);
          loadData();
        } else {
          showToast(res.error || 'Error creating banner', 'error');
        }
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error occurred', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (banner) => {
    try {
      const res = await bannersService.toggleBannerStatus(banner.id, banner.is_active);
      if (res.success) {
        showToast(t('banner_status_updated'));
        loadData();
      } else {
        showToast(res.error || 'Failed to toggle status', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteBanner = async () => {
    if (!deleteConfirmId) return;
    setActionLoading(true);
    try {
      const res = await bannersService.deleteBanner(deleteConfirmId);
      if (res.success) {
        showToast(t('banner_deleted_success'));
        setDeleteConfirmId(null);
        loadData();
      } else {
        showToast(res.error || 'Error deleting banner', 'error');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (banner) => {
    const now = new Date();
    const startDate = banner.start_date ? new Date(banner.start_date) : null;
    const endDate = banner.end_date ? new Date(banner.end_date) : null;

    if (!banner.is_active) {
      return <Badge variant="default">{t('status_disabled')}</Badge>;
    }
    if (endDate && endDate < now) {
      return <Badge variant="danger">{t('status_expired')}</Badge>;
    }
    if (startDate && startDate > now) {
      return <Badge variant="warning">{t('status_scheduled')}</Badge>;
    }
    return <Badge variant="success">{t('status_active')}</Badge>;
  };

  const getPlacementLabel = (placement) => {
    switch (placement) {
      case 'home_slider':
        return t('placement_home_slider');
      case 'popup':
        return t('placement_popup');
      case 'tournaments_screen':
        return t('placement_tournaments');
      default:
        return placement;
    }
  };

  // Filtered in-memory list
  const filteredBanners = banners.filter((banner) => {
    const matchesSearch =
      !searchQuery ||
      banner.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      banner.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      banner.target_url?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
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
            <Speaker className="w-6 h-6 text-vsp-accent" variant="Outline" />
            <span>{t('banners_title')}</span>
          </h1>
          <p className="text-xs text-vsp-textSecondary mt-1">
            {t('banners_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-vsp-surface hover:bg-vsp-card border border-vsp-border text-vsp-textSecondary hover:text-white text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <Refresh2 className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-vsp-accent' : ''}`} variant="Outline" />
            <span>{t('refresh_data')}</span>
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-vsp-accent hover:bg-vsp-accentHover text-black text-xs font-black flex items-center gap-2 shadow-lg shadow-vsp-accent/20 transition-all"
          >
            <Add className="w-4 h-4" variant="Outline" />
            <span>{t('add_new_banner')}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={t('total_banners')}
          value={stats.totalBanners}
          icon={Layer}
          subtext={`${stats.activeBanners} ${t('active_banners')}`}
        />
        <StatCard
          label={t('active_banners')}
          value={stats.activeBanners}
          icon={Play}
          subtext={`${stats.totalBanners - stats.activeBanners} ${t('status_disabled')}`}
        />
        <StatCard
          label={t('total_banner_views')}
          value={stats.totalViews.toLocaleString()}
          icon={Eye}
          subtext={t('total_banner_views')}
        />
        <StatCard
          label={t('total_banner_clicks')}
          value={stats.totalClicks.toLocaleString()}
          icon={Mouse}
          subtext={`${t('ctr_rate')}: ${stats.ctr}%`}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 glass-panel">
        <div className="relative w-full md:w-80">
          <SearchNormal1 className="w-4 h-4 text-vsp-textSecondary absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3" variant="Outline" />
          <input
            type="text"
            placeholder={t('search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 bg-vsp-card border border-vsp-border rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-vsp-accent transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Placement Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-vsp-textSecondary font-medium whitespace-nowrap">
              {t('filter_by_placement')}:
            </span>
            <select
              value={filterPlacement}
              onChange={(e) => setFilterPlacement(e.target.value)}
              className="px-3 py-1.5 bg-vsp-card border border-vsp-border rounded-xl text-xs text-white focus:outline-none focus:border-vsp-accent"
            >
              <option value="all">{t('placement_all')}</option>
              <option value="home_slider">{t('placement_home_slider')}</option>
              {banners.some((b) => b.placement === 'popup') && (
                <option value="popup">{t('placement_popup')}</option>
              )}
              {banners.some((b) => b.placement === 'tournaments_screen') && (
                <option value="tournaments_screen">{t('placement_tournaments')}</option>
              )}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-vsp-textSecondary font-medium whitespace-nowrap">
              {t('filter_by_status')}:
            </span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 bg-vsp-card border border-vsp-border rounded-xl text-xs text-white focus:outline-none focus:border-vsp-accent"
            >
              <option value="all">{t('all')}</option>
              <option value="active">{t('active')}</option>
              <option value="inactive">{t('status_disabled')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: Banners Grid/List */}
      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 bg-vsp-surface border border-vsp-border rounded-2xl">
          <RotateRight className="w-8 h-8 text-vsp-accent animate-spin" variant="Outline" />
          <span className="text-xs text-vsp-textSecondary">{t('loading')}</span>
        </div>
      ) : loadError ? (
        <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-8">
          <EmptyState
            isError={true}
            title="فشل تحميل البيانات"
            description={loadError}
            actionLabel="إعادة المحاولة"
            actionIcon={Refresh2}
            onAction={loadData}
          />
        </div>
      ) : filteredBanners.length === 0 ? (
        <div className="bg-vsp-surface border border-vsp-border rounded-2xl p-8">
          <EmptyState
            icon={Speaker}
            title={t('no_banners_found')}
            description={t('no_banners_sub')}
            actionLabel={t('add_new_banner')}
            onAction={openCreateModal}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredBanners.map((banner) => {
            const ctr =
              banner.views_count > 0
                ? ((banner.clicks_count / banner.views_count) * 100).toFixed(1)
                : '0.0';

            return (
              <div
                key={banner.id}
                className={`group bg-vsp-surface border rounded-2xl overflow-hidden shadow-lg transition-all duration-200 hover:border-zinc-700 flex flex-col justify-between ${
                  banner.is_active ? 'border-vsp-border' : 'border-zinc-800/80 opacity-75'
                }`}
              >
                {/* Banner Image Preview Container */}
                <div className="relative aspect-[16/9] w-full bg-zinc-950/80 overflow-hidden border-b border-vsp-border">
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/600x338/18181B/71717A?text=No+Image';
                    }}
                  />

                  {/* Top Badges Overlay */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                    <div className="pointer-events-auto">{getStatusBadge(banner)}</div>

                    <button
                      onClick={() => setPreviewImage(banner.image_url)}
                      className="pointer-events-auto p-1.5 rounded-lg bg-black/60 backdrop-blur-md text-zinc-300 hover:text-white hover:bg-black/80 border border-white/10 transition-all"
                      title="Preview Image"
                    >
                      <Eye className="w-3.5 h-3.5" variant="Outline" />
                    </button>
                  </div>

                  {/* Duration badge */}
                  <div className="absolute bottom-3 left-3 rtl:left-auto rtl:right-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-zinc-200 border border-white/10 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-vsp-accent" variant="Outline" />
                    <span>{banner.duration_seconds}s</span>
                  </div>

                  {/* Priority badge */}
                  <div className="absolute bottom-3 right-3 rtl:right-auto rtl:left-3 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-zinc-300 border border-white/10">
                    #{banner.priority_order}
                  </div>
                </div>

                {/* Banner Info */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-vsp-accent transition-colors">
                        {banner.title}
                      </h3>
                    </div>

                    {banner.description && (
                      <p className="text-xs text-vsp-textSecondary line-clamp-2">
                        {banner.description}
                      </p>
                    )}

                    <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-400">
                      <span className="px-2 py-0.5 rounded-md bg-vsp-card border border-vsp-border">
                        {getPlacementLabel(banner.placement)}
                      </span>

                      {banner.target_url && (
                        <a
                          href={banner.target_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded-md bg-vsp-card border border-vsp-border text-vsp-accent hover:underline flex items-center gap-1 max-w-[160px] truncate"
                        >
                          <ExportCurve className="w-3 h-3 flex-shrink-0" variant="Outline" />
                          <span className="truncate">{banner.target_url}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Timing & Metrics Bar */}
                  <div className="pt-3 border-t border-vsp-border/60 space-y-2">
                    {/* Dates */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" variant="Outline" />
                        <span>
                          {banner.start_date
                            ? new Date(banner.start_date).toLocaleDateString()
                            : 'Immediate'}
                        </span>
                      </div>
                      <span>→</span>
                      <div>
                        {banner.end_date
                          ? new Date(banner.end_date).toLocaleDateString()
                          : 'Indefinite'}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-1 py-1.5 px-2 rounded-xl bg-vsp-card/70 border border-vsp-border/50 text-center">
                      <div>
                        <span className="text-[10px] text-zinc-500 block">{t('total_banner_views')}</span>
                        <span className="text-xs font-bold text-white">
                          {(banner.views_count || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">{t('total_banner_clicks')}</span>
                        <span className="text-xs font-bold text-white">
                          {(banner.clicks_count || 0).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-500 block">CTR</span>
                        <span className="text-xs font-bold text-vsp-accent">{ctr}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="px-4 py-3 bg-vsp-card/40 border-t border-vsp-border flex items-center justify-between gap-2">
                  {/* Active Toggle Switch */}
                  <button
                    onClick={() => handleToggleStatus(banner)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      banner.is_active
                        ? 'bg-vsp-accent/10 text-vsp-accent border border-vsp-accent/20 hover:bg-vsp-accent/20'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    {banner.is_active ? (
                      <>
                        <TickCircle className="w-3.5 h-3.5" variant="Outline" />
                        <span>{t('banner_active_now')}</span>
                      </>
                    ) : (
                      <>
                        <Pause className="w-3.5 h-3.5" variant="Outline" />
                        <span>{t('banner_inactive')}</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(banner)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-vsp-card border border-transparent hover:border-vsp-border transition-all"
                      title={t('edit_banner')}
                    >
                      <Edit2 className="w-3.5 h-3.5" variant="Outline" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(banner.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                      title={t('delete')}
                    >
                      <Trash className="w-3.5 h-3.5" variant="Outline" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Banner Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !actionLoading && setIsModalOpen(false)}
        title={editingBanner ? t('edit_banner') : t('add_new_banner')}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveBanner} className="space-y-4">
          {/* Image Upload Area */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white block">
              {t('banner_image')} <span className="text-red-400">*</span>
            </label>

            <div
              onClick={() => {
                if (fileInputRef.current) {
                  fileInputRef.current.value = null;
                  fileInputRef.current.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  validateAndSetFile(file);
                }
              }}
              className={`relative border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                isDragging
                  ? 'border-vsp-accent bg-vsp-accent/10 scale-[1.01]'
                  : imagePreviewUrl
                  ? 'border-vsp-accent/50 bg-vsp-card/30'
                  : 'border-vsp-border hover:border-vsp-accent hover:bg-vsp-card/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*, .png, .jpg, .jpeg, .webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {imagePreviewUrl ? (
                <div className="relative w-full aspect-[16/7] rounded-xl overflow-hidden bg-black/60 border border-vsp-border group">
                  <img
                    src={imagePreviewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                    <DocumentUpload className="w-5 h-5 text-white" variant="Outline" />
                    <span className="text-xs font-bold text-white">{t('change_image')}</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-2xl bg-vsp-card border border-vsp-border flex items-center justify-center text-vsp-accent mb-2">
                    <ImageIcon className="w-6 h-6" variant="Outline" />
                  </div>
                  <span className="text-xs font-bold text-white">
                    {t('upload_image_note')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Banner Title */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-white">
              {t('banner_title')} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('banner_title_placeholder')}
              className="w-full px-3.5 py-2.5 bg-vsp-card border border-vsp-border rounded-xl text-xs text-white focus:outline-none focus:border-vsp-accent"
            />
          </div>

          {/* Target URL & Placement Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-white">{t('target_url')}</label>
              <input
                type="text"
                value={formData.target_url}
                onChange={(e) => setFormData({ ...formData, target_url: e.target.value })}
                placeholder={t('target_url_placeholder')}
                className="w-full px-3.5 py-2.5 bg-vsp-card border border-vsp-border rounded-xl text-xs text-white focus:outline-none focus:border-vsp-accent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-white">{t('placement')}</label>
              <select
                value={formData.placement}
                onChange={(e) => setFormData({ ...formData, placement: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-vsp-card border border-vsp-border rounded-xl text-xs text-white focus:outline-none focus:border-vsp-accent"
              >
                <option value="home_slider">{t('placement_home_slider')}</option>
                {editingBanner && formData.placement === 'popup' && (
                  <option value="popup">{t('placement_popup')} (أرشيف / غير نشط بالموبايل)</option>
                )}
                {editingBanner && formData.placement === 'tournaments_screen' && (
                  <option value="tournaments_screen">{t('placement_tournaments')} (أرشيف / غير نشط بالموبايل)</option>
                )}
              </select>
            </div>
          </div>

          {/* Duration & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>{t('duration_seconds')}</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  {formData.duration_seconds}s
                </span>
              </label>
              <input
                type="number"
                min="2"
                max="60"
                value={formData.duration_seconds}
                onChange={(e) =>
                  setFormData({ ...formData, duration_seconds: Number(e.target.value) || 5 })
                }
                className="w-full px-3.5 py-2.5 bg-vsp-card border border-vsp-border rounded-xl text-xs text-white focus:outline-none focus:border-vsp-accent"
              />
              <span className="text-[10px] text-zinc-500">{t('duration_seconds_hint')}</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-white flex items-center justify-between">
                <span>{t('priority_order')}</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  #{formData.priority_order}
                </span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.priority_order}
                onChange={(e) =>
                  setFormData({ ...formData, priority_order: Number(e.target.value) || 0 })
                }
                className="w-full px-3.5 py-2.5 bg-vsp-card border border-vsp-border rounded-xl text-xs text-white focus:outline-none focus:border-vsp-accent"
              />
              <span className="text-[10px] text-zinc-500">{t('priority_order_hint')}</span>
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-white">{t('start_date')}</label>
              <input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3.5 py-2 bg-vsp-card border border-vsp-border rounded-xl text-xs text-white focus:outline-none focus:border-vsp-accent"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-white">{t('end_date')}</label>
              <input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3.5 py-2 bg-vsp-card border border-vsp-border rounded-xl text-xs text-white focus:outline-none focus:border-vsp-accent"
              />
            </div>
          </div>

          {/* Is Active Switch */}
          <div className="pt-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active_toggle"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded text-vsp-accent focus:ring-vsp-accent bg-vsp-card border-vsp-border"
            />
            <label htmlFor="is_active_toggle" className="text-xs font-bold text-white cursor-pointer">
              {t('status_active')}
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-vsp-border flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-vsp-card hover:bg-vsp-border border border-vsp-border text-vsp-textSecondary hover:text-white text-xs font-bold transition-all"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2.5 rounded-xl bg-vsp-accent hover:bg-vsp-accentHover text-black text-xs font-black flex items-center gap-2 shadow-lg shadow-vsp-accent/20 transition-all"
            >
              {actionLoading && <RotateRight className="w-4 h-4 animate-spin" variant="Outline" />}
              <span>{t('save')}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => !actionLoading && setDeleteConfirmId(null)}
        title={t('confirm')}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
            <Trash className="w-6 h-6" variant="Outline" />
          </div>
          <p className="text-xs text-vsp-textSecondary leading-relaxed">
            {t('confirm_delete_banner')}
          </p>

          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2.5 rounded-xl bg-vsp-card hover:bg-vsp-border border border-vsp-border text-vsp-textSecondary hover:text-white text-xs font-bold transition-all"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={handleDeleteBanner}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all"
            >
              {actionLoading && <RotateRight className="w-4 h-4 animate-spin" variant="Outline" />}
              <span>{t('delete')}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImage}
        imageUrl={previewImage}
        title={t('banner_image')}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};
