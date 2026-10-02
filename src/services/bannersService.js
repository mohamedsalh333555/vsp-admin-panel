import { supabase, supabaseAdmin } from '../lib/supabase';
import { classifyError } from './adminService';

class BannersService {
  get client() {
    return supabaseAdmin || supabase;
  }

  /**
   * Upload an image file to Supabase Storage in the 'banners' bucket
   * @param {File} file 
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async uploadBannerImage(file) {
    try {
      if (!file) throw new Error('No file provided');

      const mimeMap = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
      };

      const fileExt = file.name.split('.').pop().toLowerCase();
      const mappedContentType = mimeMap[fileExt];

      if (!mappedContentType) {
        return {
          success: false,
          error: 'صيغة الملف غير مدعومة. يرجى رفع صورة بصيغة JPG أو PNG أو WebP فقط.',
          errorType: 'VALIDATION_ERROR',
        };
      }

      const contentType = mappedContentType || file.type || 'image/jpeg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = `banner_images/${fileName}`;
      const { data, error } = await this.client.storage
        .from('banners')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType, // إضافة صريحة، تضمن قبول السيرفر وتفادي خطأ 400
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }

      const { data: publicUrlData } = this.client.storage
        .from('banners')
        .getPublicUrl(filePath);

      return {
        success: true,
        url: publicUrlData.publicUrl,
        filePath,
      };
    } catch (e) {
      console.error('Error uploading banner image:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  /**
   * Fetch all banners with optional placement/status filters
   */
  async fetchBanners({ placement = 'all', status = 'all' } = {}) {
    try {
      let query = this.client
        .from('banners')
        .select('*')
        .order('priority_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (placement && placement !== 'all') {
        query = query.eq('placement', placement);
      }

      if (status === 'active') {
        query = query.eq('is_active', true);
      } else if (status === 'inactive') {
        query = query.eq('is_active', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (e) {
      console.error('Error fetching banners:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type, data: [] };
    }
  }

  /**
   * Fetch aggregate statistics for banners KPI cards
   */
  async fetchBannerStats() {
    try {
      const { data, error } = await this.client
        .from('banners')
        .select('id, is_active, start_date, end_date, clicks_count, views_count');

      if (error) throw error;

      const now = new Date();
      let totalBanners = data?.length || 0;
      let activeBanners = 0;
      let totalClicks = 0;
      let totalViews = 0;

      data?.forEach((b) => {
        totalClicks += b.clicks_count || 0;
        totalViews += b.views_count || 0;

        const isCurrentlyValid =
          b.is_active &&
          (!b.start_date || new Date(b.start_date) <= now) &&
          (!b.end_date || new Date(b.end_date) >= now);

        if (isCurrentlyValid) {
          activeBanners++;
        }
      });

      return {
        success: true,
        stats: {
          totalBanners,
          activeBanners,
          totalClicks,
          totalViews,
          ctr: totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0',
        },
      };
    } catch (e) {
      console.error('Error in fetchBannerStats:', e);
      return {
        success: false,
        stats: { totalBanners: 0, activeBanners: 0, totalClicks: 0, totalViews: 0, ctr: '0.0' },
      };
    }
  }

  /**
   * Create a new banner record
   */
  async createBanner(bannerData) {
    try {
      const payload = {
        title: bannerData.title,
        description: bannerData.description || null,
        image_url: bannerData.image_url,
        target_url: bannerData.target_url || null,
        placement: bannerData.placement || 'home_slider',
        duration_seconds: Number(bannerData.duration_seconds) || 5,
        start_date: bannerData.start_date ? new Date(bannerData.start_date).toISOString() : new Date().toISOString(),
        end_date: bannerData.end_date ? new Date(bannerData.end_date).toISOString() : null,
        is_active: bannerData.is_active !== undefined ? bannerData.is_active : true,
        priority_order: Number(bannerData.priority_order) || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.client
        .from('banners')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('Error creating banner:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  /**
   * Update an existing banner record
   */
  async updateBanner(bannerId, updates) {
    try {
      const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      if (payload.duration_seconds !== undefined) {
        payload.duration_seconds = Number(payload.duration_seconds) || 5;
      }
      if (payload.priority_order !== undefined) {
        payload.priority_order = Number(payload.priority_order) || 0;
      }
      if (payload.start_date) {
        payload.start_date = new Date(payload.start_date).toISOString();
      }
      if (payload.end_date !== undefined) {
        payload.end_date = payload.end_date ? new Date(payload.end_date).toISOString() : null;
      }

      const { data, error } = await this.client
        .from('banners')
        .update(payload)
        .eq('id', bannerId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (e) {
      console.error('Error updating banner:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }

  /**
   * Toggle active state
   */
  async toggleBannerStatus(bannerId, currentStatus) {
    return this.updateBanner(bannerId, { is_active: !currentStatus });
  }

  /**
   * Delete a banner permanently and clean up its file from storage
   */
  async deleteBanner(bannerId) {
    try {
      // 1. Fetch banner to extract image_url before deletion
      const { data: banner } = await this.client
        .from('banners')
        .select('image_url')
        .eq('id', bannerId)
        .maybeSingle();

      // 2. Clean up storage if image is hosted in 'banners' bucket
      if (banner?.image_url) {
        try {
          const url = banner.image_url;
          const marker = '/banners/';
          const markerIndex = url.indexOf(marker);
          if (markerIndex !== -1) {
            const storagePath = decodeURIComponent(url.substring(markerIndex + marker.length).split('?')[0]);
            if (storagePath) {
              await this.client.storage.from('banners').remove([storagePath]);
            }
          }
        } catch (storageErr) {
          console.warn('Notice: Non-blocking error cleaning up banner storage object:', storageErr);
        }
      }

      // 3. Delete database record
      const { error } = await this.client
        .from('banners')
        .delete()
        .eq('id', bannerId);

      if (error) throw error;
      return { success: true };
    } catch (e) {
      console.error('Error deleting banner:', e);
      const err = classifyError(e);
      return { success: false, error: err.message, errorType: err.type };
    }
  }
}

export const bannersService = new BannersService();
