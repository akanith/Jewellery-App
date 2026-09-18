// Common validation helper placeholders
// Schema validations will be integrated when forms and APIs are developed.

export const isValidIndianMobileNumber = (mobile: string): boolean => {
  return /^[6-9]\d{9}$/.test(mobile.trim());
};
