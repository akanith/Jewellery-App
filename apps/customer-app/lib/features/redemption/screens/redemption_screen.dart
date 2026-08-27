import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme.dart';
import '../../../core/errors/app_exception.dart';
import '../models/customer_redemption_data.dart';
import '../services/customer_redemption_service.dart';

class RedemptionScreen extends ConsumerWidget {
  const RedemptionScreen({super.key});

  static String _formatCurrency(num? amount) {
    if (amount == null) return '₹0';
    final int val = amount.toInt();
    final String str = val.abs().toString();
    if (str.length <= 3) return '${amount < 0 ? "-" : ""}₹$str';

    final String last3 = str.substring(str.length - 3);
    final String remaining = str.substring(0, str.length - 3);

    final formattedRemaining = remaining.replaceAllMapped(
      RegExp(r'(\d+?)(?=(\d\d)+$)'),
      (Match m) => '${m[1]},',
    );

    return '${amount < 0 ? "-" : ""}₹$formattedRemaining,$last3';
  }

  static String _formatDate(DateTime? date) {
    if (date == null) return 'N/A';
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${date.day.toString().padLeft(2, '0')} ${months[date.month - 1]} ${date.year}';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final redemptionAsync = ref.watch(customerRedemptionDataProvider);

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
          'Scheme Redemption',
          style: TextStyle(
            color: AppTheme.maroonPrimary,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline, color: AppTheme.maroonPrimary),
            onPressed: () => context.push('/help'),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          color: AppTheme.maroonPrimary,
          onRefresh: () async {
            ref.invalidate(customerRedemptionDataProvider);
            await ref.read(customerRedemptionDataProvider.future);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20.0),
            child: redemptionAsync.when(
              loading: () => const SizedBox(
                height: 500,
                child: Center(
                  child: CircularProgressIndicator(color: AppTheme.maroonPrimary),
                ),
              ),
              error: (err, stack) {
                final message = err is AppException ? err.toUserMessage() : 'Unable to load scheme redemption status.';
                return SizedBox(
                  height: 500,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, color: Color(0xFFDC2626), size: 48),
                        const SizedBox(height: 12),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Text(
                            message,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 14, color: AppTheme.textDark),
                          ),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: () => ref.invalidate(customerRedemptionDataProvider),
                          icon: const Icon(Icons.refresh, color: Colors.white, size: 18),
                          label: const Text('Retry'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.maroonPrimary,
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
              data: (CustomerRedemptionData data) {
                // Section G: Empty State (No Enrolled Scheme)
                if (data.status == 'NO_SCHEME') {
                  return SizedBox(
                    height: 500,
                    child: Center(
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: const Color(0xFFF1E6EA)),
                        ),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppTheme.creamBackground,
                                shape: BoxShape.circle,
                                border: Border.all(color: const Color(0xFFF1E6EA)),
                              ),
                              child: const Icon(
                                Icons.savings_outlined,
                                color: AppTheme.maroonPrimary,
                                size: 40,
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'No Active Scheme',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.textDark,
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'You are not currently enrolled in an active savings scheme. Visit our shop to enroll and view redemption eligibility.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: 13,
                                color: AppTheme.textMuted,
                                height: 1.4,
                              ),
                            ),
                            const SizedBox(height: 20),
                            SizedBox(
                              width: double.infinity,
                              child: OutlinedButton.icon(
                                onPressed: () => context.push('/help'),
                                icon: const Icon(Icons.storefront, size: 18, color: AppTheme.maroonPrimary),
                                label: const Text(
                                  'Visit Shop / Contact Support',
                                  style: TextStyle(color: AppTheme.maroonPrimary, fontWeight: FontWeight.bold),
                                ),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 14),
                                  side: const BorderSide(color: AppTheme.maroonPrimary, width: 1.5),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }

                // Section F: Status UI Pill
                Widget statusPill;
                if (data.isCompleted) {
                  statusPill = Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDCFCE7),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.check_circle, color: Color(0xFF16A34A), size: 14),
                        SizedBox(width: 4),
                        Text('Completed', style: TextStyle(color: Color(0xFF16A34A), fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  );
                } else if (data.isApproved) {
                  statusPill = Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDBEAFE),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.verified, color: Color(0xFF2563EB), size: 14),
                        SizedBox(width: 4),
                        Text('Approved', style: TextStyle(color: Color(0xFF2563EB), fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  );
                } else if (data.isPending) {
                  statusPill = Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEFCE8),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.schedule, color: AppTheme.goldDark, size: 14),
                        SizedBox(width: 4),
                        Text('Pending Approval', style: TextStyle(color: AppTheme.goldDark, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  );
                } else if (data.isRejected) {
                  statusPill = Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEE2E2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.cancel, color: Color(0xFFDC2626), size: 14),
                        SizedBox(width: 4),
                        Text('Rejected', style: TextStyle(color: Color(0xFFDC2626), fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  );
                } else if (data.isEligible) {
                  statusPill = Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEFCE8),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.verified_outlined, color: AppTheme.goldDark, size: 14),
                        SizedBox(width: 4),
                        Text('Eligible for Redemption', style: TextStyle(color: AppTheme.goldDark, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  );
                } else {
                  statusPill = Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.hourglass_empty, color: AppTheme.textMuted, size: 14),
                        SizedBox(width: 4),
                        Text('In Progress', style: TextStyle(color: AppTheme.textMuted, fontSize: 12, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  );
                }

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Section A: Header Card
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppTheme.maroonPrimary,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: AppTheme.maroonPrimary.withValues(alpha: 0.25),
                            blurRadius: 12,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    data.schemeTitle ?? 'Diwali Savings Scheme',
                                    style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    data.schemeAccountNumber != null ? 'A/C: ${data.schemeAccountNumber}' : 'Scheme Account',
                                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                                  ),
                                  if (data.hasRedemption) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      'Ref: ${data.redemptionNumber ?? "N/A"}',
                                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                                    ),
                                  ],
                                ],
                              ),
                              statusPill,
                            ],
                          ),
                          const SizedBox(height: 16),
                          Container(height: 1, color: Colors.white30),
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('NET REDEEMED VALUE', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.1)),
                                  const SizedBox(height: 4),
                                  Text(
                                    _formatCurrency(data.finalRedeemedValue),
                                    style: const TextStyle(color: AppTheme.goldPrimary, fontSize: 28, fontWeight: FontWeight.bold),
                                  ),
                                ],
                              ),
                              if (data.redemptionDate != null)
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    const Text('REDEMPTION DATE', style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold)),
                                    const SizedBox(height: 2),
                                    Text(
                                      _formatDate(data.redemptionDate),
                                      style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section B: Customer Information Card
                    if (data.customerName != null || data.customerNumber != null) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFF1E6EA)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 42,
                              height: 42,
                              decoration: BoxDecoration(
                                color: AppTheme.creamBackground,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFF1E6EA)),
                              ),
                              child: const Icon(Icons.person_outline, color: AppTheme.maroonPrimary, size: 22),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    data.customerName ?? 'Customer Profile',
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                                  ),
                                  if (data.customerNumber != null) ...[
                                    const SizedBox(height: 2),
                                    Text(
                                      'Customer ID: ${data.customerNumber}',
                                      style: const TextStyle(fontSize: 12, color: AppTheme.textMuted, fontFamily: 'monospace'),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Section C: Scheme Progress Card
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFF1E6EA)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('SCHEME INSTALLMENT PROGRESS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.maroonPrimary, letterSpacing: 1.1)),
                              Text(
                                '${data.paidInstallmentsCount}/${data.totalInstallments} Months',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                              ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: LinearProgressIndicator(
                              value: data.progressPercentage,
                              minHeight: 8,
                              backgroundColor: const Color(0xFFF1F5F9),
                              valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.goldPrimary),
                            ),
                          ),
                          const SizedBox(height: 14),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Paid Amount', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                  const SizedBox(height: 2),
                                  Text(_formatCurrency(data.totalAmountPaid), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  const Text('Remaining', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                                  const SizedBox(height: 2),
                                  Text('${data.remainingInstallments} Installment(s)', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Section D: Eligibility Card
                    if (!data.isEligible && !data.hasRedemption) ...[
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEFCE8),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppTheme.goldPrimary.withValues(alpha: 0.5)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.hourglass_empty_rounded, color: AppTheme.goldDark, size: 32),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Redemption Not Yet Available',
                                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textDark),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Completed ${data.paidInstallmentsCount} of ${data.totalInstallments} installments. Pay remaining ${data.remainingInstallments} installment(s) to unlock scheme redemption and 1 month bonus.',
                                    style: const TextStyle(fontSize: 12, color: AppTheme.textMuted, height: 1.35),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ] else if (data.isEligible && !data.hasRedemption) ...[
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0FDF4),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFBBF7D0)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.verified_outlined, color: Color(0xFF16A34A), size: 32),
                            const SizedBox(width: 14),
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Eligible for Scheme Redemption!',
                                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    'Congratulations! You have completed all 12 installments. Visit Ramyas Jeweller store to finalize your scheme redemption.',
                                    style: TextStyle(fontSize: 12, color: Color(0xFF15803D), height: 1.35),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Section E: Redemption Value Breakdown Card
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFF1E6EA)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'REDEMPTION VALUE BREAKDOWN',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.maroonPrimary, letterSpacing: 1.1),
                          ),
                          const SizedBox(height: 14),
                          const Divider(height: 1, color: Color(0xFFF1E6EA)),
                          const SizedBox(height: 14),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Total Amount Paid', style: TextStyle(fontSize: 14, color: AppTheme.textDark)),
                              Text(_formatCurrency(data.totalAmountPaid), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Shop Bonus (1 Month Deposit)', style: TextStyle(fontSize: 14, color: AppTheme.textDark)),
                              Text('+ ${_formatCurrency(data.bonusAmount)}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF16A34A))),
                            ],
                          ),
                          if (data.discountAmount > 0) ...[
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                const Text('Special Discount', style: TextStyle(fontSize: 14, color: AppTheme.textDark)),
                                Text('- ${_formatCurrency(data.discountAmount)}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFFDC2626))),
                              ],
                            ),
                          ],
                          const SizedBox(height: 14),
                          const Divider(height: 1, color: Color(0xFFF1E6EA)),
                          const SizedBox(height: 14),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Net Eligible Redemption Value', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.maroonPrimary)),
                              Text(_formatCurrency(data.finalRedeemedValue), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.maroonPrimary)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    if (data.notes != null && data.notes!.isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFF1E6EA)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('REDEMPTION NOTES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.textMuted, letterSpacing: 1.1)),
                            const SizedBox(height: 6),
                            Text(
                              data.notes!,
                              style: const TextStyle(fontSize: 13, color: AppTheme.textDark),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Shop Contact Card
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFF1E6EA)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: AppTheme.maroonPrimary,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Center(
                              child: Text('RJ', style: TextStyle(color: AppTheme.goldPrimary, fontWeight: FontWeight.bold, fontSize: 18)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          const Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Ramyas Jeweller Store', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
                                SizedBox(height: 2),
                                Text('Visit our store to redeem your savings against jewellery.', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
