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
    if (raw?.scheme) {
      raw.scheme.schemeName = OFFICIAL_SCHEME_NAME;
    }
    if (Array.isArray(raw?.schemes)) {
      raw.schemes.forEach((s: any) => {
        s.schemeName = OFFICIAL_SCHEME_NAME;
      });
    }
    return raw;
  }
  return null;
};

export const getCustomerPassbook = async (schemeId?: string): Promise<CustomerPassbookData | null> => {
  const path = schemeId
    ? `/customer-bff/passbook?schemeId=${encodeURIComponent(schemeId)}`
    : '/customer-bff/passbook';

  const response = await apiCall<{ success: boolean; data: CustomerPassbookData }>(path, {
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

export interface PassbookExportInstallment {
  installmentNumber: number;
  calendarMonth: string;
  dueDateFormatted: string;
  paidDateFormatted: string;
  installmentAmount: number;
  paidAmount: number;
  status: 'PAID';
  receiptNumber: string;
  paymentMethod: string;
  paymentReference: string;
}

export interface PassbookExportData {
  customer: {
    fullName: string;
    customerCode: string;
    phoneNumber: string;
    maskedPhoneNumber: string;
  };
  scheme: {
    schemeId: string;
    schemeCode: string;
    schemeName: string;
    slotNumber: number;
    monthlyInstallmentAmount: number;
    targetContribution: number;
    totalPaidAmount: number;
    bonusAmount: number;
    maturityAmount: number;
    startMonth: string;
    endMonth: string;
    status: string;
    totalInstallments: number;
    paidInstallments: number;
  };
  installments: PassbookExportInstallment[];
  generatedAt: string;
  generatedAtFormatted: string;
  disclaimer: string;
}

export interface PassbookExportResult {
  success: boolean;
  data?: PassbookExportData;
  error?: string;
  message?: string;
  paidInstallments?: number;
  totalInstallments?: number;
}

export const getPassbookExportData = async (schemeId?: string): Promise<PassbookExportResult> => {
  const path = schemeId
    ? `/customer-bff/passbook/export?schemeId=${encodeURIComponent(schemeId)}`
    : '/customer-bff/passbook/export';

  const response = await apiCall<{
    success: boolean;
    data?: PassbookExportData;
    error?: string;
    message?: string;
    paidInstallments?: number;
    totalInstallments?: number;
  }>(path, {
    method: 'GET',
    requiresAuth: true,
  });

  if (response.success && response.data) {
    const raw = (response.data as any).data ?? response.data;
    return {
      success: true,
      data: raw,
      paidInstallments: 12,
      totalInstallments: 12,
    };
  }

  const errPayload = (response.data as any) || {};
  return {
    success: false,
    error: errPayload.error || response.error || 'PASSBOOK_NOT_COMPLETE',
    message: errPayload.message || response.error,
    paidInstallments: errPayload.paidInstallments,
    totalInstallments: errPayload.totalInstallments || 12,
  };
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

export interface InitiatePaymentResult {
  paymentAttemptId: string;
  paymentLinkUrl: string;
  amount: number;
  amountPaise: number;
  currency: string;
  installmentNumber: number;
  calendarMonth: string;
  customerCode: string;
  reused?: boolean;
}

export interface PaymentStatusResult {
  paymentAttemptId: string;
  status: 'CREATED' | 'PAID' | 'EXPIRED' | 'FAILED' | 'RECONCILED';
  isPaid: boolean;
  receiptNumber?: string | null;
  paymentDate?: string | null;
  amount: number;
  installmentNumber: number;
}

export interface InitiatePaymentApiResponse {
  success: boolean;
  data?: InitiatePaymentResult;
  error?: string;
  code?: string;
}

export const initiateOnlinePayment = async (
  schemeId?: string,
  installmentNumber?: number
): Promise<InitiatePaymentApiResponse> => {
  const response = await apiCall<{
    success: boolean;
    paymentAttemptId?: string;
    paymentLinkUrl?: string;
    amount?: number;
    amountPaise?: number;
    currency?: string;
    installmentNumber?: number;
    calendarMonth?: string;
    customerCode?: string;
    reused?: boolean;
    error?: string;
    code?: string;
  }>('/customer-bff/payment/initiate', {
    method: 'POST',
    body: {
      schemeId,
      installmentNumber,
    },
    requiresAuth: true,
  });

  if (response.success && response.data) {
    const raw = (response.data as any).data ?? response.data;
    if (raw?.paymentLinkUrl && raw?.paymentAttemptId) {
      return { success: true, data: raw as InitiatePaymentResult };
    }
  }

  const rawErr = (response.data as any)?.error || response.error || 'Unable to initiate online payment.';
  const rawCode = (response.data as any)?.code || (response as any)?.code;

  return {
    success: false,
    error: rawErr,
    code: rawCode,
  };
};

export const checkOnlinePaymentStatus = async (
  attemptId?: string
): Promise<PaymentStatusResult | null> => {
  const url = attemptId
    ? `/customer-bff/payment/status?attemptId=${encodeURIComponent(attemptId)}`
    : '/customer-bff/payment/status';
  const response = await apiCall<{
    success: boolean;
    data: PaymentStatusResult;
    error?: string;
  }>(url, {
    method: 'GET',
    requiresAuth: true,
  });

  if (response.success && response.data) {
    const raw = (response.data as any).data ?? response.data;
    return raw as PaymentStatusResult;
  }
  return null;
};
