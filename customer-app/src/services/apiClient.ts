import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerSession, logoutCustomer } from './customerAuthService';

const BFF_BASE_URL =
  process.env.EXPO_PUBLIC_BFF_BASE_URL ||
  'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  requiresAuth?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

/**
 * Universal API Client for Customer App.
 * Routes all API calls to Customer BFF (/customer-bff/...).
 * Never accepts customer_id as an authentication parameter.
 */
export async function apiCall<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', headers = {}, body, requiresAuth = true } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (requiresAuth) {
    try {
      const sessionStr = await AsyncStorage.getItem('@ramyas_customer_session');
      if (sessionStr) {
        const session: CustomerSession = JSON.parse(sessionStr);
        if (session?.token) {
          requestHeaders['Authorization'] = `Bearer ${session.token}`;
        }
      }
    } catch {
      // Ignore session read error
    }
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BFF_BASE_URL}${cleanEndpoint}`;

  try {
    const res = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const status = res.status;
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (status === 401) {
      // Clear local customer session on 401 Unauthorized while preserving language preference
      await logoutCustomer(false);
      return {
        success: false,
        error: json?.error || 'Session expired or unauthorized.',
        status: 401,
      };
    }

    if (!res.ok) {
      return {
        success: false,
        error: json?.error || `Request failed with status ${status}`,
        status,
      };
    }

    return {
      success: true,
      data: json as T,
      status,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Network request failed.';
    return {
      success: false,
      error: errorMsg,
      status: 0,
    };
  }
}
