import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../app/theme.dart';
import '../../auth/services/customer_auth_service.dart';
import '../../auth/widgets/logout_dialog.dart';
import '../widgets/change_password_dialog.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final identityAsync = ref.watch(currentCustomerIdentityProvider);
    return Scaffold(
      backgroundColor: AppTheme.creamBackground,
      appBar: AppBar(
        title: const Text(
          'My Profile',
          style: TextStyle(
            color: AppTheme.maroonPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 22,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined, color: AppTheme.maroonPrimary),
            onPressed: () {},
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // User Overview Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFFF1E6EA)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // Circular Avatar with Verification Checkmark
                    Stack(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: AppTheme.maroonPrimary, width: 3),
                            color: AppTheme.maroonPrimary.withValues(alpha: 0.1),
                          ),
                          child: const ClipOval(
                            child: Icon(
                              Icons.person,
                              size: 50,
                              color: AppTheme.maroonPrimary,
                            ),
                          ),
                        ),
                        Positioned(
                          right: 0,
                          bottom: 0,
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: AppTheme.goldPrimary,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.check, size: 14, color: AppTheme.maroonPrimary),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    identityAsync.when(
                      loading: () => const SizedBox(
                        height: 60,
                        child: Center(child: CircularProgressIndicator(color: AppTheme.maroonPrimary, strokeWidth: 2)),
                      ),
                      error: (err, stack) => const Text(
                        'Valued Customer',
                        style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                      ),
                      data: (identity) => Column(
                        children: [
                          Text(
                            identity?.fullName ?? 'Valued Customer',
                            style: const TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.textDark,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            identity?.customerNumber != null ? 'ID: ${identity!.customerNumber}' : 'ID: Customer',
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppTheme.textMuted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            identity?.mobileNumber ?? '—',
                            style: const TextStyle(
                              fontSize: 14,
                              color: AppTheme.textDark,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Golden Scheme Badge Pill
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppTheme.goldPrimary,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.emoji_events_outlined, color: AppTheme.maroonPrimary, size: 18),
                          SizedBox(width: 6),
                          Text(
                            'DIWALI SAVINGS SCHEME',
                            style: TextStyle(
                              color: AppTheme.maroonPrimary,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Current Scheme Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFFF1E6EA)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'CURRENT SCHEME',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.maroonPrimary,
                            letterSpacing: 1.1,
                          ),
                        ),
                        Icon(Icons.savings_outlined, color: AppTheme.maroonPrimary, size: 22),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Gold Savings',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textDark,
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              '₹1,000 Monthly | 12 Months',
                              style: TextStyle(
                                fontSize: 13,
                                color: AppTheme.textMuted,
                              ),
                            ),
                          ],
                        ),
                        RichText(
                          text: const TextSpan(
                            children: [
                              TextSpan(
                                text: '8/12\n',
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.maroonPrimary,
                                  height: 1.0,
                                ),
                              ),
                              TextSpan(
                                text: 'Paid',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: AppTheme.textMuted,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                          textAlign: TextAlign.right,
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    // Progress Bar
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: const LinearProgressIndicator(
                        value: 8 / 12,
                        minHeight: 10,
                        backgroundColor: Color(0xFFE2E8F0),
                        valueColor: AlwaysStoppedAnimation<Color>(AppTheme.maroonPrimary),
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'Next payment due: 15 Oct 2024',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.textMuted,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Personal Details Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFFF1E6EA)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'PERSONAL DETAILS',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.maroonPrimary,
                        letterSpacing: 1.1,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Address Row
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.location_on_outlined, color: AppTheme.maroonPrimary, size: 20),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('ADDRESS', style: TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.bold)),
                              SizedBox(height: 2),
                              Text(
                                'No. 45, Gandhi Street, T. Nagar, Chennai - 600017',
                                style: TextStyle(fontSize: 13, color: AppTheme.textDark, height: 1.3),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Join Date & Nominee Row
                    Row(
                      children: [
                        Expanded(
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.calendar_today_outlined, color: AppTheme.maroonPrimary, size: 20),
                              ),
                              const SizedBox(width: 12),
                              const Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('JOIN DATE', style: TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.bold)),
                                  SizedBox(height: 2),
                                  Text('15 Jan 2024', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
                                ],
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: const Icon(Icons.person_add_alt_outlined, color: AppTheme.maroonPrimary, size: 20),
                              ),
                              const SizedBox(width: 12),
                              const Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('NOMINEE', style: TextStyle(fontSize: 10, color: AppTheme.textMuted, fontWeight: FontWeight.bold)),
                                  SizedBox(height: 2),
                                  Text('S. Meena (Wife)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // QUICK ACTIONS Header
              const Text(
                'QUICK ACTIONS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.maroonPrimary,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 12),

              // Action Buttons List Card
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFF1E6EA)),
                ),
                child: Column(
                  children: [
                    _buildActionTile(context, Icons.lock_outline, 'Change Password', () => ChangePasswordDialog.show(context)),
                    const Divider(height: 1, color: Color(0xFFF1E6EA)),
                    _buildActionTile(context, Icons.menu_book_outlined, 'View Passbook', () => context.push('/passbook')),
                    const Divider(height: 1, color: Color(0xFFF1E6EA)),
                    _buildActionTile(context, Icons.download_outlined, 'Download Passbook PDF', () {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Downloading Passbook PDF...')));
                    }),
                    const Divider(height: 1, color: Color(0xFFF1E6EA)),
                    _buildActionTile(context, Icons.storefront_outlined, 'Visit Our Shop', () => context.push('/visit-shop')),
                    const Divider(height: 1, color: Color(0xFFF1E6EA)),
                    _buildActionTile(context, Icons.help_outline, 'Help & Support', () => context.push('/help')),
                    const Divider(height: 1, color: Color(0xFFF1E6EA)),
                    _buildActionTile(context, Icons.info_outline, 'Privacy Policy', () => context.push('/privacy-policy')),
                    const Divider(height: 1, color: Color(0xFFF1E6EA)),
                    _buildActionTile(context, Icons.star_outline, 'Rate App', () {}),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Logout Soft Pink Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => LogoutConfirmationDialog.show(context),
                  icon: const Icon(Icons.exit_to_app, color: AppTheme.maroonPrimary, size: 20),
                  label: const Text(
                    'Logout',
                    style: TextStyle(
                      color: AppTheme.maroonPrimary,
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFCE7F3),
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // App Version Footer
              const Center(
                child: Text(
                  'App Version 2.4.1 • Made in India',
                  style: TextStyle(
                    fontSize: 12,
                    color: AppTheme.textMuted,
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionTile(BuildContext context, IconData icon, String title, VoidCallback onTap) {
    return Material(
      color: Colors.transparent,
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: AppTheme.maroonPrimary, size: 20),
        ),
        title: Text(
          title,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: AppTheme.textDark,
          ),
        ),
        trailing: const Icon(Icons.chevron_right, color: AppTheme.textMuted, size: 20),
        onTap: onTap,
      ),
    );
  }
}
