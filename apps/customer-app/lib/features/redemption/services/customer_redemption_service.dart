import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/errors/app_exception.dart';
import '../../../core/errors/error_handler.dart';
import '../../../core/network/supabase_client.dart';
import '../../auth/services/customer_auth_service.dart';
import '../models/customer_redemption_data.dart';

/// CUSTOMER REDEMPTION SERVICE — FLUTTER CUSTOMER APP
///
/// Service layer executing RLS-compliant queries to fetch customer scheme redemption details,
/// eligibility value breakdown, and approval status for the authenticated customer.
class CustomerRedemptionService {
  final SupabaseClient _supabase;
  final CustomerAuthService _authService;

  CustomerRedemptionService(this._supabase, this._authService);

  /// Fetch redemption status & value details for the currently authenticated customer
  Future<CustomerRedemptionData> fetchCustomerRedemption() async {
    try {
      // 1. Resolve current customer ID from authenticated session RPC
      final customerId = await _authService.getCurrentCustomerId();
      if (customerId == null || customerId.isEmpty) {
        throw const AppException(
          message: 'Customer profile not found or unauthenticated session.',
          type: AppExceptionType.unauthorized,
        );
      }

      // 2. Fetch customer name & customer number from public.customers
      String? customerName;
      String? customerNumber;
      final custResponse = await _supabase
          .from('customers')
          .select('full_name, customer_number')
          .eq('id', customerId)
          .maybeSingle();

      if (custResponse != null) {
        customerName = custResponse['full_name'] as String?;
        customerNumber = custResponse['customer_number'] as String?;
      }

      // 3. Query public.redemptions for existing redemption record
      final redemptionResponse = await _supabase
          .from('redemptions')
          .select()
          .eq('customer_id', customerId)
          .order('created_at', ascending: false)
          .maybeSingle();

      if (redemptionResponse != null) {
        final redMap = Map<String, dynamic>.from(redemptionResponse);
        final String customerSchemeId = redMap['customer_scheme_id'] as String;

        // Fetch joined customer scheme & plan info
        String? schemeTitle;
        String? schemeAccountNumber;
        int totalInstallments = 12;
        int paidInstallmentsCount = 12;
        String schemeStatus = 'COMPLETED';

        final schemeResponse = await _supabase
            .from('customer_schemes')
            .select()
            .eq('id', customerSchemeId)
            .maybeSingle();

        if (schemeResponse != null) {
          final schemeMap = Map<String, dynamic>.from(schemeResponse);
          schemeAccountNumber = schemeMap['scheme_account_number'] as String?;
          totalInstallments = (schemeMap['total_installments'] as num?)?.toInt() ?? 12;
          paidInstallmentsCount = (schemeMap['paid_installments_count'] as num?)?.toInt() ?? totalInstallments;
          schemeStatus = (schemeMap['status'] as String? ?? 'COMPLETED').toUpperCase();

          final planId = schemeMap['scheme_plan_id'] as String?;
          if (planId != null) {
            final planResponse = await _supabase
                .from('scheme_plans')
                .select('title')
                .eq('id', planId)
                .maybeSingle();
            if (planResponse != null) {
              schemeTitle = planResponse['title'] as String?;
            }
          }
        }

        DateTime? redemptionDate;
        if (redMap['redemption_date'] != null) {
          redemptionDate = DateTime.tryParse(redMap['redemption_date'].toString());
        }

        DateTime? approvedAt;
        if (redMap['approved_at'] != null) {
          approvedAt = DateTime.tryParse(redMap['approved_at'].toString());
        }

        return CustomerRedemptionData(
          redemptionId: redMap['id'] as String?,
          redemptionNumber: redMap['redemption_number'] as String?,
          customerSchemeId: customerSchemeId,
          customerId: customerId,
          customerName: customerName,
          customerNumber: customerNumber,
          schemeTitle: schemeTitle,
          schemeAccountNumber: schemeAccountNumber,
          totalInstallments: totalInstallments,
          paidInstallmentsCount: paidInstallmentsCount,
          totalAmountPaid: (redMap['total_paid_amount'] as num?)?.toDouble() ?? 0.0,
          bonusAmount: (redMap['bonus_amount'] as num?)?.toDouble() ?? 0.0,
          discountAmount: (redMap['discount_amount'] as num?)?.toDouble() ?? 0.0,
          finalRedeemedValue: (redMap['final_redeemed_value'] as num?)?.toDouble() ?? 0.0,
          redemptionDate: redemptionDate,
          status: (redMap['status'] as String? ?? 'PENDING_APPROVAL').toUpperCase(),
          schemeStatus: schemeStatus,
          approvedAt: approvedAt,
          notes: redMap['notes'] as String?,
        );
      }

      // 4. No redemption record created yet: check customer's scheme for candidate status
      final activeSchemeResponse = await _supabase
          .from('customer_schemes')
          .select()
          .eq('customer_id', customerId)
          .order('created_at', ascending: false)
          .maybeSingle();

      if (activeSchemeResponse == null) {
        return CustomerRedemptionData(
          customerSchemeId: '',
          customerId: customerId,
          customerName: customerName,
          customerNumber: customerNumber,
          totalAmountPaid: 0.0,
          bonusAmount: 0.0,
          discountAmount: 0.0,
          finalRedeemedValue: 0.0,
          status: 'NO_SCHEME',
          schemeStatus: 'NO_SCHEME',
        );
      }

      final schemeMap = Map<String, dynamic>.from(activeSchemeResponse);
      final String schemeId = schemeMap['id'] as String;
      final String? schemeAccountNumber = schemeMap['scheme_account_number'] as String?;
      final String? planId = schemeMap['scheme_plan_id'] as String?;
      final String schemeStatus = (schemeMap['status'] as String? ?? 'ACTIVE').toUpperCase();
      final double totalPaid = (schemeMap['total_amount_paid'] as num?)?.toDouble() ?? 0.0;
      final double monthlyAmount = (schemeMap['monthly_amount'] as num?)?.toDouble() ?? 0.0;
      final int paidCount = (schemeMap['paid_installments_count'] as num?)?.toInt() ?? 0;
      final int totalInstallments = (schemeMap['total_installments'] as num?)?.toInt() ?? 12;

      String? schemeTitle;
      if (planId != null) {
        final planResponse = await _supabase
            .from('scheme_plans')
            .select('title')
            .eq('id', planId)
            .maybeSingle();
        if (planResponse != null) {
          schemeTitle = planResponse['title'] as String?;
        }
      }

      final bool isCompleted = schemeStatus == 'COMPLETED' || paidCount >= totalInstallments;
      final double bonusAmount = isCompleted ? monthlyAmount : 0.0;
      final double finalValue = totalPaid + bonusAmount;

      return CustomerRedemptionData(
        customerSchemeId: schemeId,
        customerId: customerId,
        customerName: customerName,
        customerNumber: customerNumber,
        schemeTitle: schemeTitle,
        schemeAccountNumber: schemeAccountNumber,
        totalInstallments: totalInstallments,
        paidInstallmentsCount: paidCount,
        totalAmountPaid: totalPaid,
        bonusAmount: bonusAmount,
        discountAmount: 0.0,
        finalRedeemedValue: finalValue,
        status: isCompleted ? 'ELIGIBLE' : 'NOT_REDEEMED',
        schemeStatus: schemeStatus,
      );
    } catch (e) {
      throw ErrorHandler.normalize(e);
    }
  }
}

// =============================================================================
// RIVERPOD PROVIDERS
// =============================================================================

/// Global Riverpod Provider for CustomerRedemptionService
final customerRedemptionServiceProvider = Provider<CustomerRedemptionService>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  final authService = ref.watch(customerAuthServiceProvider);
  return CustomerRedemptionService(supabase, authService);
});

/// Riverpod FutureProvider for fetching authenticated customer's redemption data
final customerRedemptionDataProvider = FutureProvider<CustomerRedemptionData>((ref) async {
  final service = ref.watch(customerRedemptionServiceProvider);
  return await service.fetchCustomerRedemption();
});
