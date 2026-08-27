/// PAYMENT RECEIPT DATA MODEL — FLUTTER CUSTOMER APP
///
/// Strongly typed domain model representing an official installment payment receipt,
/// financial breakdown, and next due payment details.
class PaymentReceiptData {
  final String customerId;
  final String customerNumber;
  final String customerName;
  final String mobileNumber;

  final String schemeId;
  final String? schemeAccountNumber;
  final String? schemePlanId;
  final String? schemeTitle;

  final String installmentId;
  final int installmentNumber;
  final int totalInstallments;
  final double amount;
  final double expectedAmount;

  final String? paymentNumber;
  final DateTime? paymentDate;
  final String? paymentMethod;
  final String? paymentReference;
  final String paymentStatus;
  final String? notes;

  final double totalAmountPaid;
  final double remainingAmount;

  final double? nextInstallmentAmount;
  final DateTime? nextDueDate;

  const PaymentReceiptData({
    required this.customerId,
    required this.customerNumber,
    required this.customerName,
    required this.mobileNumber,
    required this.schemeId,
    this.schemeAccountNumber,
    this.schemePlanId,
    this.schemeTitle,
    required this.installmentId,
    required this.installmentNumber,
    required this.totalInstallments,
    required this.amount,
    required this.expectedAmount,
    this.paymentNumber,
    this.paymentDate,
    this.paymentMethod,
    this.paymentReference,
    required this.paymentStatus,
    this.notes,
    required this.totalAmountPaid,
    required this.remainingAmount,
    this.nextInstallmentAmount,
    this.nextDueDate,
  });

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
      'installment_id': installmentId,
      'installment_number': installmentNumber,
      'total_installments': totalInstallments,
      'amount': amount,
      'expected_amount': expectedAmount,
      'payment_number': paymentNumber,
      'payment_date': paymentDate?.toIso8601String(),
      'payment_method': paymentMethod,
      'payment_reference': paymentReference,
      'payment_status': paymentStatus,
      'notes': notes,
      'total_amount_paid': totalAmountPaid,
      'remaining_amount': remainingAmount,
      'next_installment_amount': nextInstallmentAmount,
      'next_due_date': nextDueDate?.toIso8601String(),
    };
  }
}
