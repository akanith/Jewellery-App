/**
 * RAMYAS JEWELLER - Admin Web Maintenance Mode Module
 *
 * Provides application-level write guards, maintenance state detection,
 * runtime overrides, and UI notification utilities.
 *
 * Prevents administrator write operations during database maintenance or resets.
 */

export const MAINTENANCE_ERROR_CODE = 'MAINTENANCE_MODE_ACTIVE';

export const DEFAULT_MAINTENANCE_MESSAGE =
  'System is currently undergoing scheduled database maintenance. All administrator modifications, customer enrollments, and payment recordings are strictly disabled.';

export interface MaintenanceStatus {
  isActive: boolean;
  source: 'env' | 'storage' | 'runtime' | 'default';
  message: string;
  timestamp?: string;
}

interface CustomWindow extends Window {
  __RAMYAS_MAINTENANCE_MODE__?: boolean;
}

// In-memory runtime override (useful for tests and emergency UI lockouts)
let runtimeMaintenanceOverride: boolean | null = null;

/**
 * Checks whether maintenance mode is active from env, runtime override, or local storage.
 * Enforces that environment-level maintenance CANNOT be bypassed by browser localStorage tampering.
 */
export function isMaintenanceModeActive(): boolean {
  // 1. Authoritative environment variable: If active in env, it CANNOT be bypassed by client storage
  const envVal = (
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE ||
    process.env.NEXT_PUBLIC_APP_MAINTENANCE_MODE ||
    process.env.NEXT_PUBLIC_RAMYAS_MAINTENANCE_MODE ||
    ''
  )
    .trim()
    .toLowerCase();

  const isEnvActive = envVal === 'true' || envVal === '1' || envVal === 'yes' || envVal === 'enabled';
  if (isEnvActive) {
    return true; // Authoritative: cannot be disabled by localStorage or window manipulation
  }

  // 2. In-memory runtime override (useful for isolated tests and emergency UI lockouts)
  if (runtimeMaintenanceOverride !== null) {
    return runtimeMaintenanceOverride;
  }

  // 3. Client-side emergency lockout: Can only ACTIVATE maintenance mode, never disable it
  if (typeof window !== 'undefined') {
    const customWin = window as unknown as CustomWindow;
    const winOverride = customWin.__RAMYAS_MAINTENANCE_MODE__;
    if (typeof winOverride === 'boolean') {
      return winOverride;
    }

    try {
      const stored = window.localStorage.getItem('RAMYAS_MAINTENANCE_MODE');
      if (stored === 'true' || stored === '1') {
        return true;
      }
    } catch {
      // Ignore localStorage access restrictions
    }
  }

  return false;
}

/**
 * Sets an explicit runtime override for maintenance mode.
 * Pass true to force maintenance mode, false to force disabled, or null to revert to env/storage.
 */
export function setMaintenanceModeOverride(enabled: boolean | null): void {
  runtimeMaintenanceOverride = enabled;

  if (typeof window !== 'undefined') {
    const customWin = window as unknown as CustomWindow;
    try {
      if (enabled === null) {
        window.localStorage.removeItem('RAMYAS_MAINTENANCE_MODE');
        delete customWin.__RAMYAS_MAINTENANCE_MODE__;
      } else {
        window.localStorage.setItem('RAMYAS_MAINTENANCE_MODE', String(enabled));
        customWin.__RAMYAS_MAINTENANCE_MODE__ = enabled;
      }
      // Dispatch custom event so reactive UI components update immediately
      window.dispatchEvent(new CustomEvent('ramyas:maintenance-change', { detail: { enabled } }));
    } catch {
      // Ignore localStorage access restrictions
    }
  }
}

/**
 * Returns user-facing maintenance message.
 */
export function getMaintenanceNotice(): string {
  return DEFAULT_MAINTENANCE_MESSAGE;
}

/**
 * Retrieves comprehensive maintenance status metadata.
 */
export function getMaintenanceStatus(): MaintenanceStatus {
  const envVal = (
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE ||
    process.env.NEXT_PUBLIC_APP_MAINTENANCE_MODE ||
    process.env.NEXT_PUBLIC_RAMYAS_MAINTENANCE_MODE ||
    ''
  )
    .trim()
    .toLowerCase();

  const isEnvActive = envVal === 'true' || envVal === '1' || envVal === 'yes' || envVal === 'enabled';
  if (isEnvActive) {
    return {
      isActive: true,
      source: 'env',
      message: DEFAULT_MAINTENANCE_MESSAGE,
    };
  }

  if (runtimeMaintenanceOverride !== null) {
    return {
      isActive: runtimeMaintenanceOverride,
      source: 'runtime',
      message: DEFAULT_MAINTENANCE_MESSAGE,
    };
  }

  if (typeof window !== 'undefined') {
    const customWin = window as unknown as CustomWindow;
    const winOverride = customWin.__RAMYAS_MAINTENANCE_MODE__;
    if (typeof winOverride === 'boolean') {
      return {
        isActive: winOverride,
        source: 'runtime',
        message: DEFAULT_MAINTENANCE_MESSAGE,
      };
    }

    try {
      const stored = window.localStorage.getItem('RAMYAS_MAINTENANCE_MODE');
      if (stored === 'true' || stored === '1') {
        return {
          isActive: true,
          source: 'storage',
          message: DEFAULT_MAINTENANCE_MESSAGE,
        };
      }
    } catch {
      // Fallback
    }
  }

  return {
    isActive: false,
    source: 'default',
    message: DEFAULT_MAINTENANCE_MESSAGE,
  };
}

/**
 * Application-level write guard assertion.
 * Throws a typed Error if maintenance mode is active.
 */
export function assertMaintenanceModeDisabled(operationName?: string): void {
  if (isMaintenanceModeActive()) {
    const op = operationName ? ` (${operationName})` : '';
    throw new Error(`${MAINTENANCE_ERROR_CODE}: Database write operation${op} is blocked during maintenance.`);
  }
}
