import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/errors/error_handler.dart';
import '../../../core/network/supabase_client.dart';
import '../../auth/services/customer_auth_service.dart';
import '../models/customer_dashboard_data.dart';

/// CUSTOMER DASHBOARD DATA SERVICE — FLUTTER CUSTOMER APP
///
/// Production-ready data service fetching real database records for the currently authenticated customer.
/// Uses authenticated Supabase session, existing RLS policies, and get_current_customer_id() RPC.
class CustomerDashboardService {
  final SupabaseClient _supabase;
  final CustomerAuthService _authService;

  CustomerDashboardService(this._supabase, this._authService);

  /// Fetch dashboard data for currently authenticated customer
  Future<CustomerDashboardData> fetchDashboardData() async {
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

      // If customer has no active scheme, return dashboard model without scheme data
      if (schemeResponse == null) {
        return CustomerDashboardData(
          customerId: customerId,
          customerNumber: customerNumber,
          customerName: customerName,
          mobileNumber: mobileNumber,
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

      // 5. Fetch installment schedule from public.installments
      final installmentsResponse = await _supabase
          .from('installments')
          .select()
          .eq('customer_scheme_id', schemeId)
          .order('installment_number', ascending: true);

      final List<dynamic> installmentsList = installmentsResponse as List<dynamic>;

      // 6. Perform calculations from actual installment records & scheme plan
      final double monthlyAmount = (schemeMap['monthly_amount'] as num?)?.toDouble() ?? 0.0;
      final int totalInstallments = (schemeMap['total_installments'] as num?)?.toInt() ?? installmentsList.length;

      int paidCount = 0;
      double totalPaid = 0.0;
      Map<String, dynamic>? nextPendingInstallment;

      for (final item in installmentsList) {
        final Map<String, dynamic> inst = Map<String, dynamic>.from(item as Map);
        final String status = inst['status'] as String? ?? 'PENDING';
        final double paid = (inst['paid_amount'] as num?)?.toDouble() ?? 0.0;

        if (status == 'PAID') {
          paidCount++;
          totalPaid += paid;
        } else if (nextPendingInstallment == null && (status == 'PENDING' || status == 'OVERDUE')) {
          nextPendingInstallment = inst;
        }
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

      String? nextInstId;
      int? nextInstNumber;
      double? nextInstAmount;
      DateTime? nextDueDate;

      if (nextPendingInstallment != null) {
        nextInstId = nextPendingInstallment['id'] as String?;
        nextInstNumber = (nextPendingInstallment['installment_number'] as num?)?.toInt();
        nextInstAmount = (nextPendingInstallment['expected_amount'] as num?)?.toDouble();
        if (nextPendingInstallment['due_date'] != null) {
          nextDueDate = DateTime.tryParse(nextPendingInstallment['due_date'].toString());
        }
      }

      return CustomerDashboardData(
        customerId: customerId,
        customerNumber: customerNumber,
        customerName: customerName,
        mobileNumber: mobileNumber,
        activeSchemeId: schemeId,
        schemeAccountNumber: schemeAccountNumber,
        schemePlanId: schemePlanId,
        schemeTitle: schemeTitle,
        monthlyAmount: monthlyAmount,
        totalInstallments: totalInstallments,
        paidInstallmentsCount: paidCount,
        totalAmountPaid: totalPaid,
        remainingAmount: remainingAmount,
        nextInstallmentId: nextInstId,
        nextInstallmentNumber: nextInstNumber,
        nextInstallmentAmount: nextInstAmount,
        nextDueDate: nextDueDate,
        schemeStatus: schemeStatus,
        progressPercentage: progressPercentage,
      );
    } catch (e) {
      throw ErrorHandler.normalize(e);
    }
  }
}

// =============================================================================
// RIVERPOD PROVIDERS
// =============================================================================

/// Global Riverpod Provider for CustomerDashboardService
final customerDashboardServiceProvider = Provider<CustomerDashboardService>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  final authService = ref.watch(customerAuthServiceProvider);
  return CustomerDashboardService(supabase, authService);
});

/// Riverpod FutureProvider for fetching current customer's dashboard data
final customerDashboardDataProvider = FutureProvider<CustomerDashboardData>((ref) async {
  final dashboardService = ref.watch(customerDashboardServiceProvider);
  return await dashboardService.fetchDashboardData();
});
