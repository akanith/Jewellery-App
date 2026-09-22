import { apiCall } from './apiClient';
import { CustomerHomeData } from '@/types/dashboard';
import { CustomerPassbookData } from '@/types/passbook';
import { CustomerProfileViewModel } from '@/types/profile';
import { CustomerNotificationsData } from '@/types/notification';
import { CustomerReceiptData } from '@/types/receipt';

/**
 * Customer Data Service.
 * Interacts strictly with Customer BFF endpoints via apiClient.
 * Never supplies customer_id as an input parameter.
 */

import { OFFICIAL_SCHEME_NAME } from '@/constants/shopData';

export const getCustomerDashboard = async (): Promise<CustomerHomeData | null> => {
  const response = await apiCall<{ success: boolean; data: CustomerHomeData }>('/customer-bff/dashboard', {
    method: 'GET',
    requiresAuth: true,
  });

  if (response.success && response.data) {
    const raw = (response.data as any).data ?? response.data;
    if (raw?.activeScheme) {
      raw.activeScheme.schemeName = OFFICIAL_SCHEME_NAME;
      raw.activeScheme.schemeType = OFFICIAL_SCHEME_NAME;
    }
    return raw;
  }
  return null;
};

export const getCustomerPassbook = async (): Promise<CustomerPassbookData | null> => {
  const response = await apiCall<{ success: boolean; data: CustomerPassbookData }>('/customer-bff/passbook', {
    method: 'GET',
    requiresAuth: true,
  });

  if (response.success && response.data) {
    const raw = (response.data as any).data ?? response.data;
    if (raw?.passbook) {
      raw.passbook.schemeName = OFFICIAL_SCHEME_NAME;
    }
    return raw;
  }
  return null;
};

export const getCustomerProfile = async (): Promise<CustomerProfileViewModel | null> => {
  const response = await apiCall<{ success: boolean; data: CustomerProfileViewModel }>('/customer-bff/profile', {
    method: 'GET',
    requiresAuth: true,
  });

  if (response.success && response.data) {
    const raw = (response.data as any).data ?? response.data;
    const addressVal = raw?.profile?.address;
    const isShopFallbackAddress = addressVal && (addressVal.includes('Begambur') || addressVal.includes('624001'));
    
    const nomineeName = raw?.profile?.nominee?.name;
    const isFallbackNomineeName = !nomineeName || nomineeName === 'Family Nominee';

    const nomineeRel = raw?.profile?.nominee?.relationship;
    const isFallbackNomineeRel = !nomineeRel || nomineeRel === 'Nominee';

    return {
      profile: {
        ...raw.profile,
        schemeBadge: OFFICIAL_SCHEME_NAME,
        address: isShopFallbackAddress ? 'Not provided' : (addressVal || 'Not provided'),
        nominee: {
          name: isFallbackNomineeName ? 'Not provided' : nomineeName,
          relationship: isFallbackNomineeRel ? 'Not provided' : nomineeRel,
        },
      },
      currentScheme: {
        ...raw.currentScheme,
        schemeName: OFFICIAL_SCHEME_NAME,
      },
    };
  }
  return null;
};

export const getCustomerNotifications = async (): Promise<CustomerNotificationsData | null> => {
  const response = await apiCall<{ success: boolean; data: CustomerNotificationsData }>('/customer-bff/notifications', {
    method: 'GET',
    requiresAuth: true,
  });

  if (response.success && response.data) {
    const raw = (response.data as any).data ?? response.data;
    if (raw?.featuredBanner) {
      raw.featuredBanner.title = OFFICIAL_SCHEME_NAME;
    }
    return raw;
  }
  return null;
};

export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  const response = await apiCall<{ success: boolean }>('/customer-bff/notifications/read', {
    method: 'POST',
    body: { notificationId },
    requiresAuth: true,
  });
  return response.success;
};

export const getCustomerReceipt = async (receiptNumber: string): Promise<CustomerReceiptData | null> => {
  const response = await apiCall<{ success: boolean; data: CustomerReceiptData }>(
    `/customer-bff/receipt?receiptNumber=${encodeURIComponent(receiptNumber)}`,
    {
      method: 'GET',
      requiresAuth: true,
    }
  );

  if (response.success && response.data) {
    const raw = response.data as any;
    const result = raw.data ?? raw;
    if (result) {
      result.schemeName = OFFICIAL_SCHEME_NAME;
    }
    return result;
  }
  return null;
};
