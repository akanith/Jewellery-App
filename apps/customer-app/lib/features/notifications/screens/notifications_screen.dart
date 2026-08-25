import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme.dart';
import '../services/notification_service.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<CustomerNotificationModel> _notifications = [];
  int _unreadCount = 0;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await CustomerNotificationService.getNotifications();
      final unread = await CustomerNotificationService.getUnreadCount();

      setState(() {
        _notifications = list;
        _unreadCount = unread;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Unable to load notifications. Please try again.';
        _isLoading = false;
      });
    }
  }

  Future<void> _markAsRead(CustomerNotificationModel item) async {
    if (item.isRead) return;

    await CustomerNotificationService.markAsRead(item.id);
    _loadNotifications();
  }

  Future<void> _markAllAsRead() async {
    await CustomerNotificationService.markAllAsRead();
    _loadNotifications();
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();

    // Grouping logic based on real createdAt timestamps
    final todayList = _notifications.where((n) {
      final diff = now.difference(n.createdAt);
      return diff.inDays == 0 && n.createdAt.day == now.day;
    }).toList();

    final thisWeekList = _notifications.where((n) {
      final diff = now.difference(n.createdAt);
      return (diff.inDays > 0 || n.createdAt.day != now.day) && diff.inDays <= 7;
    }).toList();

    final earlierList = _notifications.where((n) {
      final diff = now.difference(n.createdAt);
      return diff.inDays > 7;
    }).toList();

    return Scaffold(
      backgroundColor: AppTheme.creamBackground,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppTheme.maroonPrimary),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/');
            }
          },
        ),
        title: const Text(
          'Notifications',
          style: TextStyle(
            color: AppTheme.maroonPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        actions: [
          if (_unreadCount > 0)
            TextButton.icon(
              onPressed: _markAllAsRead,
              icon: const Icon(Icons.done_all, color: AppTheme.maroonPrimary, size: 18),
              label: const Text(
                'Mark Read',
                style: TextStyle(color: AppTheme.maroonPrimary, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Stack(
              alignment: Alignment.center,
              children: [
                const Icon(Icons.notifications_none, color: AppTheme.maroonPrimary, size: 26),
                if (_unreadCount > 0)
                  Positioned(
                    right: 0,
                    top: 12,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: AppTheme.maroonPrimary,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '$_unreadCount',
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadNotifications,
          color: AppTheme.maroonPrimary,
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: AppTheme.maroonPrimary))
              : _errorMessage != null
                  ? _buildErrorView()
                  : _notifications.isEmpty
                      ? _buildEmptyView()
                      : SingleChildScrollView(
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.all(20.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Featured Banner Card
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF801435), Color(0xFF4A0E23)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(24),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppTheme.maroonPrimary.withValues(alpha: 0.25),
                                      blurRadius: 12,
                                      offset: const Offset(0, 6),
                                    ),
                                  ],
                                ),
                                child: const Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Ramyas Jeweller Updates',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    SizedBox(height: 6),
                                    Text(
                                      'Track your payment receipts, scheme completions & store alerts.',
                                      style: TextStyle(
                                        color: Colors.white70,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(height: 24),

                              // TODAY SECTION
                              if (todayList.isNotEmpty) ...[
                                _buildSectionHeader('TODAY'),
                                const SizedBox(height: 10),
                                _buildNotificationCard(todayList),
                                const SizedBox(height: 20),
                              ],

                              // THIS WEEK SECTION
                              if (thisWeekList.isNotEmpty) ...[
                                _buildSectionHeader('THIS WEEK'),
                                const SizedBox(height: 10),
                                _buildNotificationCard(thisWeekList),
                                const SizedBox(height: 20),
                              ],

                              // EARLIER SECTION
                              if (earlierList.isNotEmpty) ...[
                                _buildSectionHeader('EARLIER'),
                                const SizedBox(height: 10),
                                _buildNotificationCard(earlierList),
                                const SizedBox(height: 20),
                              ],
                            ],
                          ),
                        ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.bold,
        color: AppTheme.textMuted,
        letterSpacing: 1.1,
      ),
    );
  }

  Widget _buildNotificationCard(List<CustomerNotificationModel> items) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFF1E6EA)),
      ),
      child: Column(
        children: items.asMap().entries.map((entry) {
          final idx = entry.key;
          final item = entry.value;
          final isLast = idx == items.length - 1;

          return Column(
            children: [
              InkWell(
                onTap: () => _markAsRead(item),
                child: _buildNotificationItem(item),
              ),
              if (!isLast) const Divider(height: 1, color: Color(0xFFF1E6EA)),
            ],
          );
        }).toList(),
      ),
    );
  }

  Widget _buildNotificationItem(CustomerNotificationModel item) {
    IconData icon;
    Color iconBgColor;
    Color iconColor;

    switch (item.type) {
      case 'PAYMENT':
        icon = Icons.check_circle_outline;
        iconBgColor = const Color(0xFFDCFCE7);
        iconColor = const Color(0xFF16A34A);
        break;
      case 'SCHEME':
        icon = Icons.workspace_premium;
        iconBgColor = const Color(0xFFFEF08A);
        iconColor = AppTheme.goldDark;
        break;
      case 'REDEMPTION':
        icon = Icons.card_giftcard;
        iconBgColor = const Color(0xFFFCE7F3);
        iconColor = const Color(0xFFDB2777);
        break;
      default:
        icon = Icons.notifications_active_outlined;
        iconBgColor = const Color(0xFFF1F5F9);
        iconColor = AppTheme.maroonPrimary;
    }

    final timeStr = "${item.createdAt.hour.toString().padLeft(2, '0')}:${item.createdAt.minute.toString().padLeft(2, '0')}";

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: iconBgColor,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: iconColor, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        item.title,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: item.isRead ? FontWeight.w600 : FontWeight.w800,
                          color: AppTheme.textDark,
                        ),
                      ),
                    ),
                    Text(
                      timeStr,
                      style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  item.message,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppTheme.textMuted,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          if (!item.isRead) ...[
            const SizedBox(width: 8),
            Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: AppTheme.maroonPrimary,
                shape: BoxShape.circle,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEmptyView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.notifications_off_outlined, size: 64, color: AppTheme.textMuted),
            const SizedBox(height: 16),
            const Text(
              'No notifications yet',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.textDark),
            ),
            const SizedBox(height: 6),
            const Text(
              "You're all caught up! System alerts and payment receipts will appear here.",
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: AppTheme.textMuted),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _loadNotifications,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.maroonPrimary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.refresh, color: Colors.white, size: 18),
              label: const Text('Refresh', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: Colors.red),
            const SizedBox(height: 16),
            Text(
              _errorMessage ?? 'An error occurred.',
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textDark),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _loadNotifications,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.maroonPrimary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              icon: const Icon(Icons.refresh, color: Colors.white, size: 18),
              label: const Text('Retry', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
