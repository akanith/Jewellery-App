import 'package:supabase_flutter/supabase_flutter.dart';

class CustomerNotificationModel {
  final String id;
  final String? customerId;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;

  CustomerNotificationModel({
    required this.id,
    this.customerId,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    this.metadata,
    required this.createdAt,
  });

  factory CustomerNotificationModel.fromJson(Map<String, dynamic> json) {
    return CustomerNotificationModel(
      id: json['id'] as String,
      customerId: json['customer_id'] as String?,
      title: json['title'] as String? ?? 'Notification',
      message: json['message'] as String? ?? '',
      type: json['type'] as String? ?? 'ANNOUNCEMENT',
      isRead: json['is_read'] as bool? ?? false,
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
    );
  }
}

class CustomerNotificationService {
  static SupabaseClient get _supabase => Supabase.instance.client;

  /// Fetch notifications from public.notifications for current customer
  static Future<List<CustomerNotificationModel>> getNotifications() async {
    try {
      final response = await _supabase
          .from('notifications')
          .select()
          .order('created_at', ascending: false);

      final List<dynamic> data = response as List<dynamic>;
      return data.map((json) => CustomerNotificationModel.fromJson(json as Map<String, dynamic>)).toList();
    } catch (e) {
      return [];
    }
  }

  /// Get unread notification count
  static Future<int> getUnreadCount() async {
    try {
      final response = await _supabase
          .from('notifications')
          .select('id')
          .eq('is_read', false);

      final List<dynamic> data = response as List<dynamic>;
      return data.length;
    } catch (e) {
      return 0;
    }
  }

  /// Mark single notification as read
  static Future<void> markAsRead(String id) async {
    try {
      await _supabase
          .from('notifications')
          .update({'is_read': true})
          .eq('id', id);
    } catch (e) {
      // Handle error cleanly
    }
  }

  /// Mark all notifications as read
  static Future<void> markAllAsRead() async {
    try {
      await _supabase
          .from('notifications')
          .update({'is_read': true})
          .eq('is_read', false);
    } catch (e) {
      // Handle error cleanly
    }
  }
}
