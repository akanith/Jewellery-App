export type NotificationCategory =
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_REMINDER'
  | 'GOLD_RATE_UPDATE'
  | 'FESTIVAL_OFFER'
  | 'SHOP_ANNOUNCEMENT'
  | 'BONUS_CREDITED'
  | 'SCHEME_MATURED'
  | 'GENERAL';

export interface CustomerNotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: string;
  section: 'TODAY' | 'THIS_WEEK' | 'EARLIER';
  isRead: boolean;
}

export interface FeaturedAnnouncementBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUri?: string;
}

export interface CustomerNotificationsData {
  unreadCount: number;
  featuredBanner?: FeaturedAnnouncementBanner;
  notifications: CustomerNotificationItem[];
}
