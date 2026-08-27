/// CUSTOMER PASSBOOK MODELS — FLUTTER CUSTOMER APP
///
/// Strongly typed domain models representing customer passbook ledger items, payment receipts,
/// and scheme completion progress.

class PassbookItemModel {
  final String id;
  final int installmentNumber;
  final DateTime? dueDate;
  final double expectedAmount;
  final double paidAmount;
  final DateTime? paymentDate;
  final String? paymentMethod;
  final String? paymentReference;
  final String status;
  final String? paymentId;
  final String? paymentNumber;
  final String? notes;

  const PassbookItemModel({
    required this.id,
    required this.installmentNumber,
    this.dueDate,
    required this.expectedAmount,
    required this.paidAmount,
    this.paymentDate,
    this.paymentMethod,
    this.paymentReference,
    required this.status,
    this.paymentId,
    this.paymentNumber,
    this.notes,
  });

  bool get isPaid => status.toUpperCase() == 'PAID';
  bool get isPending => status.toUpperCase() == 'PENDING';
  bool get isOverdue => status.toUpperCase() == 'OVERDUE';
  bool get isFuture => status.toUpperCase() == 'FUTURE';

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'installment_number': installmentNumber,
      'due_date': dueDate?.toIso8601String(),
      'expected_amount': expectedAmount,
      'paid_amount': paidAmount,
      'payment_date': paymentDate?.toIso8601String(),
      'payment_method': paymentMethod,
      'payment_reference': paymentReference,
      'status': status,
      'payment_id': paymentId,
      'payment_number': paymentNumber,
      'notes': notes,
    };
  }
}

class CustomerPassbookData {
  final String customerId;
  final String customerNumber;
  final String customerName;
  final String mobileNumber;

  final String? schemeId;
  final String? schemeAccountNumber;
  final String? schemePlanId;
  final String? schemeTitle;
  final double? monthlyAmount;
  final int? totalInstallments;
  final int? paidInstallmentsCount;
  final double? totalAmountPaid;
  final double? remainingAmount;
  final double? progressPercentage;
  final String? schemeStatus;

  final List<PassbookItemModel> installments;

  const CustomerPassbookData({
    required this.customerId,
    required this.customerNumber,
    required this.customerName,
    required this.mobileNumber,
    this.schemeId,
    this.schemeAccountNumber,
    this.schemePlanId,
    this.schemeTitle,
    this.monthlyAmount,
    this.totalInstallments,
    this.paidInstallmentsCount,
    this.totalAmountPaid,
    this.remainingAmount,
    this.progressPercentage,
    this.schemeStatus,
    this.installments = const [],
  });

  /// Indicates if customer currently has an active enrolled scheme
  bool get hasActiveScheme => schemeId != null && schemeId!.isNotEmpty;

  Map<String, dynamic> toJson() {
    return {
      'customer_id': customerId,
      'customer_number': customerNumber,
      'customer_name': customerName,
      'mobile_number': mobileNumber,
      'scheme_id': schemeId,
      'scheme_account_number': schemeAccountNumber,
      'scheme_plan_id': schemePlanId,
      'scheme_title': schemeTitle,
      'monthly_amount': monthlyAmount,
      'total_installments': totalInstallments,
      'paid_installments_count': paidInstallmentsCount,
      'total_amount_paid': totalAmountPaid,
      'remaining_amount': remainingAmount,
      'progress_percentage': progressPercentage,
      'scheme_status': schemeStatus,
      'installments': installments.map((i) => i.toJson()).toList(),
    };
  }

  @override
  String toString() {
    return 'CustomerPassbookData(customerId: $customerId, customerName: $customerName, hasActiveScheme: $hasActiveScheme, installmentsCount: ${installments.length})';
  }
}
