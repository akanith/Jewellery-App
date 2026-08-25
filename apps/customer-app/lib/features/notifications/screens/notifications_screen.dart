import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Stack(
              alignment: Alignment.center,
              children: [
                const Icon(Icons.notifications_none, color: AppTheme.maroonPrimary, size: 26),
                Positioned(
                  right: 0,
                  top: 12,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: AppTheme.maroonPrimary,
                      shape: BoxShape.circle,
                    ),
                    child: const Text(
                      '3',
                      style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Featured Banner Card (Maroon Gradient)
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
                      'New Arrivals',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: 6),
                    Text(
                      'Check out our latest 22K Gold Temple Collection.',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // TODAY Section Header
              const Text(
                'TODAY',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textMuted,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 10),

              // Today Items Container
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFF1E6EA)),
                ),
                child: Column(
                  children: [
                    _buildNotificationItem(
                      icon: Icons.check_circle_outline,
                      iconBgColor: const Color(0xFFDCFCE7),
                      iconColor: const Color(0xFF16A34A),
                      title: 'Installment Recorded',
                      time: '10:30 AM',
                      subtitle: '₹1000 received for Sept installment.',
                      hasUnreadDot: false,
                    ),
                    const Divider(height: 1, color: Color(0xFFF1E6EA)),
                    _buildNotificationItem(
                      icon: Icons.trending_up,
                      iconBgColor: const Color(0xFFFEF08A),
                      iconColor: AppTheme.goldDark,
                      title: 'Gold Rate Update',
                      time: '09:15 AM',
                      subtitle: "Today's 22K Gold Rate: ₹6,850/gm",
                      hasUnreadDot: true,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // THIS WEEK Section Header
              const Text(
                'THIS WEEK',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textMuted,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 10),

              // This Week Items Container
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFF1E6EA)),
                ),
                child: Column(
                  children: [
                    _buildNotificationItem(
                      icon: Icons.access_time,
                      iconBgColor: const Color(0xFFFFEDD5),
                      iconColor: const Color(0xFFEA580C),
                      title: 'Installment Reminder',
                      time: 'Yesterday',
                      subtitle: 'Oct installment due in 5 days.',
                      hasUnreadDot: true,
                    ),
                    const Divider(height: 1, color: Color(0xFFF1E6EA)),
                    _buildNotificationItem(
                      icon: Icons.celebration,
                      iconBgColor: const Color(0xFFFCE7F3),
                      iconColor: const Color(0xFFDB2777),
                      title: 'Festival Offer',
                      time: '2 days ago',
                      subtitle: 'Diwali Special: No making charges! Visit our store today to explore...',
                      hasUnreadDot: false,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // EARLIER Section Header
              const Text(
                'EARLIER',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.textMuted,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 10),

              // Earlier Items Container
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFF1E6EA)),
                ),
                child: _buildNotificationItem(
                  icon: Icons.storefront_outlined,
                  iconBgColor: const Color(0xFFF1F5F9),
                  iconColor: AppTheme.textMuted,
                  title: 'Shop Holiday',
                  time: 'Last Week',
                  subtitle: 'Shop closed on Ganesh Chaturthi.',
                  hasUnreadDot: false,
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationItem({
    required IconData icon,
    required Color iconBgColor,
    required Color iconColor,
    required String title,
    required String time,
    required String subtitle,
    required bool hasUnreadDot,
  }) {
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
            child: Icon(icon, color: iconColor, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textDark,
                      ),
                    ),
                    Row(
                      children: [
                        Text(
                          time,
                          style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                        ),
                        if (hasUnreadDot) ...[
                          const SizedBox(width: 6),
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Colors.blue,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    color: AppTheme.textMuted,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
