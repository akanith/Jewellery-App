/// CUSTOMER DASHBOARD DATA MODEL — FLUTTER CUSTOMER APP
///
/// Strongly typed domain model representing customer identity summary, active savings scheme,
/// installment progress metrics, and next due payment details.
class CustomerDashboardData {
  final String customerId;
  final String customerNumber;
  final String customerName;
  final String mobileNumber;

  final String? activeSchemeId;
  final String? schemeAccountNumber;
  final String? schemePlanId;
  final String? schemeTitle;
  final double? monthlyAmount;
  final int? totalInstallments;
  final int? paidInstallmentsCount;
  final double? totalAmountPaid;
  final double? remainingAmount;

  final String? nextInstallmentId;
  final int? nextInstallmentNumber;
  final double? nextInstallmentAmount;
  final DateTime? nextDueDate;

  final String? schemeStatus;
  final double? progressPercentage;

  const CustomerDashboardData({
    required this.customerId,
    required this.customerNumber,
    required this.customerName,
    required this.mobileNumber,
    this.activeSchemeId,
    this.schemeAccountNumber,
    this.schemePlanId,
    this.schemeTitle,
    this.monthlyAmount,
    this.totalInstallments,
    this.paidInstallmentsCount,
    this.totalAmountPaid,
    this.remainingAmount,
    this.nextInstallmentId,
    this.nextInstallmentNumber,
    this.nextInstallmentAmount,
    this.nextDueDate,
    this.schemeStatus,
    this.progressPercentage,
  });

  /// Indicates if customer currently has an active enrolled scheme
  bool get hasActiveScheme => activeSchemeId != null && activeSchemeId!.isNotEmpty;

  Map<String, dynamic> toJson() {
    return {
      'customer_id': customerId,
      'customer_number': customerNumber,
      'customer_name': customerName,
      'mobile_number': mobileNumber,
      'active_scheme_id': activeSchemeId,
      'scheme_account_number': schemeAccountNumber,
      'scheme_plan_id': schemePlanId,
      'scheme_title': schemeTitle,
      'monthly_amount': monthlyAmount,
      'total_installments': totalInstallments,
      'paid_installments_count': paidInstallmentsCount,
      'total_amount_paid': totalAmountPaid,
      'remaining_amount': remainingAmount,
      'next_installment_id': nextInstallmentId,
      'next_installment_number': nextInstallmentNumber,
      'next_installment_amount': nextInstallmentAmount,
      'next_due_date': nextDueDate?.toIso8601String(),
      'scheme_status': schemeStatus,
      'progress_percentage': progressPercentage,
    };
  }

  @override
  String toString() {
    return 'CustomerDashboardData(customerId: $customerId, customerName: $customerName, hasActiveScheme: $hasActiveScheme, schemeTitle: $schemeTitle, progressPercentage: $progressPercentage)';
  }
}
