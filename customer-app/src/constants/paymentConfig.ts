/**
 * RAMYAS JEWELLER — Central Payment Configuration
 *
 * Centrally configured payment metadata and official payment URLs.
 *
 * IMPORTANT:
 * The official Razorpay hosted link below contains an encoded query parameter
 * representing exactly 100000 paise (₹1,000.00 INR).
 * Do NOT alter, reconstruct, or remove the query parameter.
 */

export const RAZORPAY_CONFIG = {
  /**
   * Exact official payment URL provided for Ramyas Jeweller.
   */
  paymentUrl: 'https://razorpay.me/@ramyasjeweller?amount=LaORF0cOqXzXsYKdgu1fsg%3D%3D',

  /**
   * The fixed installment amount (in INR) encoded in the payment URL.
   * If a customer installment has a different due amount (e.g. ₹2,000, ₹5,000),
   * the application must prevent mismatched checkout and advise the customer.
   */
  encodedAmountInr: 1000,

  /**
   * Merchant name and branding details verified from Razorpay metadata.
   */
  merchantName: 'RAMYAS JEWELLER',
  supportMobile: '8778173681',
  supportEmail: 'ramyasjeweller@gmail.com',
  upiDisclaimers: 'UPI payment methods available at checkout',
  secureCaption: 'Secure checkout by Razorpay',
} as const;
