import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const BASE_WIDTH = 390;
export const MAX_CONTENT_WIDTH = 800;

export type DeviceCategory = 'compact' | 'standard' | 'large' | 'tablet';

export function getDeviceCategory(width: number): DeviceCategory {
  if (width < 360) return 'compact';
  if (width < 400) return 'standard';
  if (width < 480) return 'large';
  return 'tablet';
}

/**
 * Bounded responsive scale function.
 * Scales `size` based on reference width (390px), clamped to [min, max].
 */
export function responsiveSize(size: number, min?: number, max?: number, windowWidth: number = BASE_WIDTH): number {
  const scaleRatio = windowWidth / BASE_WIDTH;
  const scaled = size * scaleRatio;
  
  let result = scaled;
  if (min !== undefined) result = Math.max(result, min);
  if (max !== undefined) result = Math.min(result, max);
  
  return Math.round(result * 10) / 10;
}

export function useResponsiveMetrics() {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const aspectRatio = width / Math.max(height, 1);
  const deviceCategory = getDeviceCategory(width);

  const scale = (size: number, min?: number, max?: number) => responsiveSize(size, min, max, width);
  
  // Bounded typography scale
  const scaleFont = (size: number, min?: number, max?: number) => {
    const baseScale = responsiveSize(size, min, max, width);
    // Respect accessibility fontScale with a safe upper clamp (max 1.3x)
    return Math.round(baseScale * Math.min(fontScale, 1.3) * 10) / 10;
  };

  const pageHorizontalPadding = scale(18, 14, 24);
  const contentWidth = Math.min(width - pageHorizontalPadding * 2, MAX_CONTENT_WIDTH);
  const sectionGap = scale(16, 12, 22);
  const cardPadding = scale(18, 14, 22);

  const navHorizontalMargin = scale(18, 14, 22);
  const navHeight = scale(76, 70, 82);
  const navWidth = Math.min(width - navHorizontalMargin * 2, MAX_CONTENT_WIDTH);
  const slotWidth = navWidth / 5;

  const qrDiameter = scale(74, 68, 78);
  const cradleWidth = scale(156, 142, 168);
  const cradleDepth = scale(42, 36, 46);

  const activePillWidth = Math.min(slotWidth - scale(10, 6, 14), 74);
  const activePillHeight = scale(50, 44, 54);

  const bottomClearance = navHeight + Math.max(insets.bottom, 16) + scale(24, 18, 30);

  return {
    width,
    height,
    screenWidth: width,
    screenHeight: height,
    fontScale,
    aspectRatio,
    insets,
    deviceCategory,
    scale,
    scaleFont,
    contentWidth,
    pageHorizontalPadding,
    sectionGap,
    cardPadding,
    navHorizontalMargin,
    navHeight,
    navWidth,
    slotWidth,
    qrDiameter,
    cradleWidth,
    cradleDepth,
    activePillWidth,
    activePillHeight,
    bottomClearance,
  };
}
