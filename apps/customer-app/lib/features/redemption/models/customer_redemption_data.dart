/// CUSTOMER REDEMPTION DATA MODEL — FLUTTER CUSTOMER APP
///
/// Strongly typed domain model representing customer scheme redemption status,
/// customer identity metadata, installment progress, financial value breakdown,
/// shop bonus, and approval tracking.
class CustomerRedemptionData {
  final String? redemptionId;
  final String? redemptionNumber;
  final String customerSchemeId;
  final String customerId;
  final String? customerName;
  final String? customerNumber;
  final String? schemeTitle;
  final String? schemeAccountNumber;
  final int totalInstallments;
  final int paidInstallmentsCount;
  final double totalAmountPaid;
  final double bonusAmount;
  final double discountAmount;
  final double finalRedeemedValue;
  final DateTime? redemptionDate;
  final String status;
  final String schemeStatus;
  final DateTime? approvedAt;
  final String? notes;

  const CustomerRedemptionData({
    this.redemptionId,
    this.redemptionNumber,
    required this.customerSchemeId,
    required this.customerId,
    this.customerName,
    this.customerNumber,
    this.schemeTitle,
    this.schemeAccountNumber,
    this.totalInstallments = 12,
    this.paidInstallmentsCount = 0,
    required this.totalAmountPaid,
    required this.bonusAmount,
    this.discountAmount = 0.0,
    required this.finalRedeemedValue,
    this.redemptionDate,
    required this.status,
    this.schemeStatus = 'ACTIVE',
    this.approvedAt,
    this.notes,
  });

  bool get hasRedemption => redemptionId != null && redemptionId!.isNotEmpty;
  bool get isApproved => status.toUpperCase() == 'APPROVED';
  bool get isCompleted => status.toUpperCase() == 'COMPLETED';
  bool get isPending => status.toUpperCase() == 'PENDING_APPROVAL';
  bool get isRejected => status.toUpperCase() == 'REJECTED';
  
  bool get isEligible =>
      status.toUpperCase() == 'ELIGIBLE' ||
      schemeStatus.toUpperCase() == 'COMPLETED' ||
      (totalInstallments > 0 && paidInstallmentsCount >= totalInstallments);

  int get remainingInstallments =>
      totalInstallments > paidInstallmentsCount ? totalInstallments - paidInstallmentsCount : 0;

  double get progressPercentage =>
      totalInstallments > 0 ? (paidInstallmentsCount / totalInstallments).clamp(0.0, 1.0) : 0.0;

  String get redemptionStatus => status;

  Map<String, dynamic> toJson() {
    return {
      'redemption_id': redemptionId,
      'redemption_number': redemptionNumber,
      'customer_scheme_id': customerSchemeId,
      'customer_id': customerId,
      'customer_name': customerName,
      'customer_number': customerNumber,
      'scheme_title': schemeTitle,
      'scheme_account_number': schemeAccountNumber,
      'total_installments': totalInstallments,
      'paid_installments_count': paidInstallmentsCount,
      'total_amount_paid': totalAmountPaid,
      'bonus_amount': bonusAmount,
      'discount_amount': discountAmount,
      'final_redeemed_value': finalRedeemedValue,
      'redemption_date': redemptionDate?.toIso8601String(),
      'status': status,
      'scheme_status': schemeStatus,
      'approved_at': approvedAt?.toIso8601String(),
      'notes': notes,
    };
  }
}
