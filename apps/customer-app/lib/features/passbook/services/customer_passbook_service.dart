import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/errors/error_handler.dart';
import '../../../core/network/supabase_client.dart';
import '../../auth/services/customer_auth_service.dart';
import '../models/customer_passbook_data.dart';

/// CUSTOMER PASSBOOK SERVICE — FLUTTER CUSTOMER APP
///
/// Service layer executing RLS-compliant queries to fetch customer passbook ledger records,
/// payment receipts, and installment schedules for the authenticated customer.
class CustomerPassbookService {
  final SupabaseClient _supabase;
  final CustomerAuthService _authService;

  CustomerPassbookService(this._supabase, this._authService);

  /// Fetch full digital passbook data for the currently authenticated customer
  Future<CustomerPassbookData> fetchPassbookData() async {
    try {
      // 1. Resolve current customer ID from authenticated session RPC
      final customerId = await _authService.getCurrentCustomerId();
      if (customerId == null || customerId.isEmpty) {
        throw const AppException(
          message: 'Customer profile not found or unauthenticated session.',
          type: AppExceptionType.unauthorized,
        );
      }

      // 2. Fetch customer identity record from public.customers
      final customerResponse = await _supabase
          .from('customers')
          .select()
          .eq('id', customerId)
          .maybeSingle();

      if (customerResponse == null) {
        throw const AppException(
          message: 'Customer record does not exist.',
          type: AppExceptionType.notFound,
        );
      }

      final customerMap = Map<String, dynamic>.from(customerResponse);
      final customerNumber = customerMap['customer_number'] as String? ?? '';
      final customerName = customerMap['full_name'] as String? ?? 'Customer';
      final mobileNumber = customerMap['mobile_number'] as String? ?? '';

      // 3. Fetch active scheme from public.customer_schemes
      final schemeResponse = await _supabase
          .from('customer_schemes')
          .select()
          .eq('customer_id', customerId)
          .eq('status', 'ACTIVE')
          .order('created_at', ascending: false)
          .maybeSingle();

      // If customer has no active scheme, return empty passbook data
      if (schemeResponse == null) {
        return CustomerPassbookData(
          customerId: customerId,
          customerNumber: customerNumber,
          customerName: customerName,
          mobileNumber: mobileNumber,
          installments: const [],
        );
      }

      final schemeMap = Map<String, dynamic>.from(schemeResponse);
      final schemeId = schemeMap['id'] as String;
      final schemeAccountNumber = schemeMap['scheme_account_number'] as String?;
      final schemePlanId = schemeMap['scheme_plan_id'] as String?;
      final schemeStatus = schemeMap['status'] as String? ?? 'ACTIVE';

      // 4. Fetch scheme plan details from public.scheme_plans
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

      // 5. Fetch installments from public.installments
      final installmentsResponse = await _supabase
          .from('installments')
          .select()
          .eq('customer_scheme_id', schemeId)
          .order('installment_number', ascending: true);

      final List<dynamic> installmentsRaw = installmentsResponse as List<dynamic>;

      // 6. Fetch payments ledger from public.payments to link payment receipts
      final paymentsResponse = await _supabase
          .from('payments')
          .select()
          .eq('customer_scheme_id', schemeId)
          .order('payment_date', ascending: true);

      final List<dynamic> paymentsRaw = paymentsResponse as List<dynamic>;

      // Map payments by installment_id
      final Map<String, Map<String, dynamic>> paymentMapByInstallment = {};
      for (final item in paymentsRaw) {
        final p = Map<String, dynamic>.from(item as Map);
        final instId = p['installment_id'] as String?;
        if (instId != null && instId.isNotEmpty) {
          paymentMapByInstallment[instId] = p;
        }
      }

      // 7. Process installments and construct PassbookItemModel list
      final double monthlyAmount = (schemeMap['monthly_amount'] as num?)?.toDouble() ?? 0.0;
      final int totalInstallments = (schemeMap['total_installments'] as num?)?.toInt() ?? installmentsRaw.length;

      int paidCount = 0;
      double totalPaid = 0.0;
      final List<PassbookItemModel> passbookItems = [];
      bool firstPendingFound = false;
      final DateTime now = DateTime.now();

      for (final item in installmentsRaw) {
        final Map<String, dynamic> inst = Map<String, dynamic>.from(item as Map);
        final String instId = inst['id'] as String;
        final int instNumber = (inst['installment_number'] as num).toInt();
        final double expectedAmt = (inst['expected_amount'] as num?)?.toDouble() ?? monthlyAmount;
        final double paidAmt = (inst['paid_amount'] as num?)?.toDouble() ?? 0.0;
        final String rawStatus = (inst['status'] as String? ?? 'PENDING').toUpperCase();

        DateTime? dueDate;
        if (inst['due_date'] != null) {
          dueDate = DateTime.tryParse(inst['due_date'].toString());
        }

        DateTime? paymentDate;
        if (inst['payment_date'] != null) {
          paymentDate = DateTime.tryParse(inst['payment_date'].toString());
        }

        final paymentMethod = inst['payment_method'] as String?;
        final paymentReference = inst['payment_reference'] as String?;

        // Check matching payment record from public.payments
        final linkedPayment = paymentMapByInstallment[instId];
        final paymentId = linkedPayment?['id'] as String?;
        final paymentNumber = linkedPayment?['payment_number'] as String?;
        final notes = linkedPayment?['notes'] as String?;

        String effectiveStatus = rawStatus;
        if (rawStatus == 'PAID') {
          paidCount++;
          totalPaid += (paidAmt > 0 ? paidAmt : expectedAmt);
        } else if (rawStatus == 'PENDING') {
          if (!firstPendingFound) {
            firstPendingFound = true;
            // Next pending installment: check if overdue or pending
            if (dueDate != null && dueDate.isBefore(DateTime(now.year, now.month, now.day))) {
              effectiveStatus = 'OVERDUE';
            } else {
              effectiveStatus = 'PENDING';
            }
          } else {
            // Subsequent unpaid installments are marked as FUTURE
            effectiveStatus = 'FUTURE';
          }
        }

        passbookItems.add(
          PassbookItemModel(
            id: instId,
            installmentNumber: instNumber,
            dueDate: dueDate,
            expectedAmount: expectedAmt,
            paidAmount: paidAmt,
            paymentDate: paymentDate ?? (linkedPayment?['payment_date'] != null ? DateTime.tryParse(linkedPayment!['payment_date'].toString()) : null),
            paymentMethod: paymentMethod ?? linkedPayment?['payment_method'] as String?,
            paymentReference: paymentReference ?? linkedPayment?['payment_reference'] as String?,
            status: effectiveStatus,
            paymentId: paymentId,
            paymentNumber: paymentNumber,
            notes: notes,
          ),
        );
      }

      // Fallback: If totalPaid from installments is 0, check customer_schemes total_amount_paid
      if (totalPaid == 0.0 && schemeMap['total_amount_paid'] != null) {
        totalPaid = (schemeMap['total_amount_paid'] as num).toDouble();
      }
      if (paidCount == 0 && schemeMap['paid_installments_count'] != null) {
        paidCount = (schemeMap['paid_installments_count'] as num).toInt();
      }

      final double totalSchemeValue = monthlyAmount * totalInstallments;
      final double remainingAmount = (totalSchemeValue - totalPaid).clamp(0.0, totalSchemeValue);

      final double progressPercentage = totalInstallments > 0
          ? ((paidCount / totalInstallments) * 100.0).clamp(0.0, 100.0)
          : 0.0;

      return CustomerPassbookData(
        customerId: customerId,
        customerNumber: customerNumber,
        customerName: customerName,
        mobileNumber: mobileNumber,
        schemeId: schemeId,
        schemeAccountNumber: schemeAccountNumber,
        schemePlanId: schemePlanId,
        schemeTitle: schemeTitle,
        monthlyAmount: monthlyAmount,
        totalInstallments: totalInstallments,
        paidInstallmentsCount: paidCount,
        totalAmountPaid: totalPaid,
        remainingAmount: remainingAmount,
        progressPercentage: progressPercentage,
        schemeStatus: schemeStatus,
        installments: passbookItems,
      );
    } catch (e) {
      throw ErrorHandler.normalize(e);
    }
  }
}

// =============================================================================
// RIVERPOD PROVIDERS
// =============================================================================

/// Global Riverpod Provider for CustomerPassbookService
final customerPassbookServiceProvider = Provider<CustomerPassbookService>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  final authService = ref.watch(customerAuthServiceProvider);
  return CustomerPassbookService(supabase, authService);
});

/// Riverpod FutureProvider for fetching current customer's passbook data
final customerPassbookDataProvider = FutureProvider<CustomerPassbookData>((ref) async {
  final passbookService = ref.watch(customerPassbookServiceProvider);
  return await passbookService.fetchPassbookData();
});
