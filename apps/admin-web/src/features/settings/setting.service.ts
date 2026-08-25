import { createClient } from '@/lib/supabase/client';
import { AppError, ErrorCode } from '@/lib/errors/app-error';
import { normalizeError } from '@/lib/errors/error-handler';
import { ShopSettings } from '@ramyas-jeweller/shared-types';

export interface UpdateShopSettingsPayload {
  shopName?: string;
  address?: string;
  phone?: string;
  gstNumber?: string;
  termsAndConditions?: string;
  gracePeriodDays?: number;
}

export class SettingService {
  private static getSupabase() {
    return createClient();
  }

  /**
   * Helper to map database shop_settings row to ShopSettings interface
   */
  private static mapRowToShopSettings(row: Record<string, unknown>): ShopSettings {
    return {
      id: Number(row.id ?? 1),
      shopName: String(row.shop_name ?? 'Ramyas Jeweller'),
      address: row.address ? String(row.address) : null,
      phone: row.phone ? String(row.phone) : null,
      gstNumber: row.gst_number ? String(row.gst_number) : null,
      termsAndConditions: row.terms_and_conditions ? String(row.terms_and_conditions) : null,
      gracePeriodDays: Number(row.grace_period_days ?? 5),
      updatedAt: String(row.updated_at ?? new Date().toISOString()),
    };
  }

  /**
   * Fetch singleton shop settings record (id = 1) from public.shop_settings
   */
  static async getShopSettings(): Promise<ShopSettings> {
    const supabase = this.getSupabase();

    try {
      const { data, error } = await supabase
        .from('shop_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        throw normalizeError(error);
      }

      if (!data) {
        // Fallback default singleton object matching database table defaults
        return {
          id: 1,
          shopName: 'Ramyas Jeweller',
          address: '91 Main Road, Dindigul - 624001',
          phone: '+91 98421 43307',
          gstNumber: '33AAAAA0000A1Z5',
          termsAndConditions: 'Standard savings scheme terms apply.',
          gracePeriodDays: 5,
          updatedAt: new Date().toISOString(),
        };
      }

      return this.mapRowToShopSettings(data);
    } catch (error) {
      throw normalizeError(error);
    }
  }

  /**
   * Update singleton shop settings record (id = 1) in public.shop_settings
   */
  static async updateShopSettings(payload: UpdateShopSettingsPayload): Promise<ShopSettings> {
    const supabase = this.getSupabase();

    try {
      const updateData: Record<string, unknown> = {};

      if (payload.shopName !== undefined) updateData.shop_name = payload.shopName.trim();
      if (payload.address !== undefined) updateData.address = payload.address.trim();
      if (payload.phone !== undefined) updateData.phone = payload.phone.trim();
      if (payload.gstNumber !== undefined) updateData.gst_number = payload.gstNumber.trim();
      if (payload.termsAndConditions !== undefined) updateData.terms_and_conditions = payload.termsAndConditions.trim();
      if (payload.gracePeriodDays !== undefined) updateData.grace_period_days = payload.gracePeriodDays;

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('shop_settings')
        .update(updateData)
        .eq('id', 1)
        .select('*')
        .single();

      if (error) {
        const msg = error.message;
        if (msg.includes('row-level security') || msg.includes('violates row-level security')) {
          throw new AppError('Access denied. Owner or Admin role required to update shop settings.', ErrorCode.FORBIDDEN, 403);
        }
        throw normalizeError(error);
      }

      return this.mapRowToShopSettings(data);
    } catch (error) {
      throw normalizeError(error);
    }
  }
}
