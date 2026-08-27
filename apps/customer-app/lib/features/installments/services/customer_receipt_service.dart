import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/errors/error_handler.dart';
import '../../../core/network/supabase_client.dart';
import '../../auth/services/customer_auth_service.dart';
import '../models/payment_receipt_data.dart';

/// CUSTOMER PAYMENT RECEIPT SERVICE — FLUTTER CUSTOMER APP
///
/// Production-ready data service fetching dynamic receipt data for a specific paid installment.
/// Validates authenticated customer ownership via RLS and get_current_customer_id() RPC.
class CustomerReceiptService {
  final SupabaseClient _supabase;
  final CustomerAuthService _authService;

  CustomerReceiptService(this._supabase, this._authService);

  /// Fetch dynamic receipt details for a specific installment ID
  Future<PaymentReceiptData> fetchReceiptData(String installmentId) async {
    try {
      if (installmentId.isEmpty) {
        throw const AppException(
          message: 'Invalid installment selection.',
          type: AppExceptionType.validation,
        );
      }

      // 1. Resolve current customer ID from authenticated session RPC
      final customerId = await _authService.getCurrentCustomerId();
      if (customerId == null || customerId.isEmpty) {
        throw const AppException(
          message: 'Customer profile not found or unauthenticated session.',
          type: AppExceptionType.unauthorized,
        );
      }

      // 2. Fetch target installment from public.installments
      final installmentResponse = await _supabase
          .from('installments')
          .select()
          .eq('id', installmentId)
          .maybeSingle();

      if (installmentResponse == null) {
        throw const AppException(
          message: 'Installment record not found.',
          type: AppExceptionType.notFound,
        );
      }

      final instMap = Map<String, dynamic>.from(installmentResponse);
      final schemeId = instMap['customer_scheme_id'] as String;
      final status = (instMap['status'] as String? ?? 'PENDING').toUpperCase();

      if (status != 'PAID') {
        throw const AppException(
          message: 'Receipt is available after payment is completed.',
          type: AppExceptionType.validation,
        );
      }

      // 3. Verify scheme ownership & fetch customer_schemes record
      final schemeResponse = await _supabase
          .from('customer_schemes')
          .select()
          .eq('id', schemeId)
          .eq('customer_id', customerId)
          .maybeSingle();

      if (schemeResponse == null) {
        throw const AppException(
          message: 'You do not have permission to access this receipt.',
          type: AppExceptionType.forbidden,
        );
      }

      final schemeMap = Map<String, dynamic>.from(schemeResponse);
      final schemeAccountNumber = schemeMap['scheme_account_number'] as String?;
      final schemePlanId = schemeMap['scheme_plan_id'] as String?;
      final double monthlyAmount = (schemeMap['monthly_amount'] as num?)?.toDouble() ?? 0.0;
      final int totalInstallments = (schemeMap['total_installments'] as num?)?.toInt() ?? 12;

      // 4. Fetch customer details from public.customers
      final customerResponse = await _supabase
          .from('customers')
          .select()
          .eq('id', customerId)
          .maybeSingle();

      final customerMap = customerResponse != null
          ? Map<String, dynamic>.from(customerResponse)
          : <String, dynamic>{'customer_number': '', 'full_name': 'Customer', 'mobile_number': ''};

      final customerNumber = customerMap['customer_number'] as String? ?? '';
      final customerName = customerMap['full_name'] as String? ?? 'Customer';
      final mobileNumber = customerMap['mobile_number'] as String? ?? '';

      // 5. Fetch scheme plan title from public.scheme_plans
      String? schemeTitle;
      if (schemePlanId != null) {
        final planResponse = await _supabase
            .from('scheme_plans')
            .select()
            .eq('id', schemePlanId)
            .maybeSingle();

        if (planResponse != null) {
          schemeTitle = planResponse['title'] as String?;
        }
      }

      // 6. Fetch linked payment from public.payments
      final paymentResponse = await _supabase
          .from('payments')
          .select()
          .eq('installment_id', installmentId)
          .maybeSingle();

      Map<String, dynamic>? paymentMap;
      if (paymentResponse != null) {
        paymentMap = Map<String, dynamic>.from(paymentResponse);
      }

      // 7. Fetch all installments to compute total paid, remaining, and next due date
      final allInstallmentsResponse = await _supabase
          .from('installments')
          .select()
          .eq('customer_scheme_id', schemeId)
          .order('installment_number', ascending: true);

      final List<dynamic> allInstList = allInstallmentsResponse as List<dynamic>;

      double totalPaid = 0.0;
      Map<String, dynamic>? nextPendingInst;

      for (final item in allInstList) {
        final Map<String, dynamic> inst = Map<String, dynamic>.from(item as Map);
        final String s = (inst['status'] as String? ?? 'PENDING').toUpperCase();
        final double pAmount = (inst['paid_amount'] as num?)?.toDouble() ?? 0.0;

        if (s == 'PAID') {
          totalPaid += (pAmount > 0 ? pAmount : (inst['expected_amount'] as num?)?.toDouble() ?? monthlyAmount);
        } else if (nextPendingInst == null && (s == 'PENDING' || s == 'OVERDUE')) {
          nextPendingInst = inst;
        }
      }

      if (totalPaid == 0.0 && schemeMap['total_amount_paid'] != null) {
        totalPaid = (schemeMap['total_amount_paid'] as num).toDouble();
      }

      final double totalSchemeValue = monthlyAmount * totalInstallments;
      final double remainingAmount = (totalSchemeValue - totalPaid).clamp(0.0, totalSchemeValue);

      final double paidAmount = (instMap['paid_amount'] as num?)?.toDouble() ?? 0.0;
      final double expectedAmount = (instMap['expected_amount'] as num?)?.toDouble() ?? monthlyAmount;
      final double amount = (paymentMap != null && paymentMap['amount'] != null)
          ? (paymentMap['amount'] as num).toDouble()
          : (paidAmount > 0 ? paidAmount : expectedAmount);

      final String? paymentNumber = paymentMap?['payment_number'] as String?;
      final String? paymentMethod = (instMap['payment_method'] as String?) ?? (paymentMap?['payment_method'] as String?);
      final String? paymentReference = (instMap['payment_reference'] as String?) ?? (paymentMap?['payment_reference'] as String?);
      final String? notes = paymentMap?['notes'] as String?;

      DateTime? paymentDate;
      if (instMap['payment_date'] != null) {
        paymentDate = DateTime.tryParse(instMap['payment_date'].toString());
      } else if (paymentMap?['payment_date'] != null) {
        paymentDate = DateTime.tryParse(paymentMap!['payment_date'].toString());
      }

      double? nextInstAmount;
      DateTime? nextDueDate;
      if (nextPendingInst != null) {
        nextInstAmount = (nextPendingInst['expected_amount'] as num?)?.toDouble() ?? monthlyAmount;
        if (nextPendingInst['due_date'] != null) {
          nextDueDate = DateTime.tryParse(nextPendingInst['due_date'].toString());
        }
      }

      return PaymentReceiptData(
        customerId: customerId,
        customerNumber: customerNumber,
        customerName: customerName,
        mobileNumber: mobileNumber,
        schemeId: schemeId,
        schemeAccountNumber: schemeAccountNumber,
        schemePlanId: schemePlanId,
        schemeTitle: schemeTitle,
        installmentId: installmentId,
        installmentNumber: (instMap['installment_number'] as num).toInt(),
        totalInstallments: totalInstallments,
        amount: amount,
        expectedAmount: expectedAmount,
        paymentNumber: paymentNumber,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        paymentReference: paymentReference,
        paymentStatus: status,
        notes: notes,
        totalAmountPaid: totalPaid,
        remainingAmount: remainingAmount,
        nextInstallmentAmount: nextInstAmount,
        nextDueDate: nextDueDate,
      );
    } catch (e) {
      throw ErrorHandler.normalize(e);
    }
  }
}

// =============================================================================
// RIVERPOD PROVIDERS
// =============================================================================

/// Global Riverpod Provider for CustomerReceiptService
final customerReceiptServiceProvider = Provider<CustomerReceiptService>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  final authService = ref.watch(customerAuthServiceProvider);
  return CustomerReceiptService(supabase, authService);
});

/// Riverpod Family FutureProvider for fetching dynamic receipt data by installmentId
final customerReceiptDataProvider = FutureProvider.family<PaymentReceiptData, String>((ref, installmentId) async {
  final service = ref.watch(customerReceiptServiceProvider);
  return await service.fetchReceiptData(installmentId);
});
