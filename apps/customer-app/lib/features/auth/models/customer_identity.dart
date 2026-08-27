/// CUSTOMER IDENTITY MODEL — FLUTTER CUSTOMER APP
///
/// Encapsulates the multi-layered customer identity chain:
/// auth.users.id → public.profiles.id → public.customers.profile_id
class CustomerIdentity {
  final String authUserId;
  final String profileId;
  final String? customerId;
  final String? customerNumber;
  final String? fullName;
  final String? mobileNumber;
  final String? email;
  final String? status;
  final String? role;

  const CustomerIdentity({
    required this.authUserId,
    required this.profileId,
    this.customerId,
    this.customerNumber,
    this.fullName,
    this.mobileNumber,
    this.email,
    this.status,
    this.role,
  });

  /// Indicates whether the authenticated user has a fully resolved customer record in public.customers
  bool get isCustomerResolved => customerId != null && customerId!.isNotEmpty;

  /// Construct CustomerIdentity from Supabase public.profiles and optional public.customers map
  factory CustomerIdentity.fromProfileAndCustomer({
    required Map<String, dynamic> profile,
    Map<String, dynamic>? customer,
  }) {
    final profileId = profile['id'] as String? ?? '';
    final customerId = customer?['id'] as String?;

    return CustomerIdentity(
      authUserId: profileId,
      profileId: profileId,
      customerId: customerId,
      customerNumber: customer?['customer_number'] as String?,
      fullName: (customer?['full_name'] as String?) ?? (profile['full_name'] as String?),
      mobileNumber: (customer?['mobile_number'] as String?) ?? (profile['mobile_number'] as String?),
      email: (customer?['email'] as String?) ?? (profile['email'] as String?),
      status: customer?['status'] as String?,
      role: profile['role'] as String? ?? 'CUSTOMER',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'auth_user_id': authUserId,
      'profile_id': profileId,
      'customer_id': customerId,
      'customer_number': customerNumber,
      'full_name': fullName,
      'mobile_number': mobileNumber,
      'email': email,
      'status': status,
      'role': role,
    };
  }

  @override
  String toString() {
    return 'CustomerIdentity(authUserId: $authUserId, profileId: $profileId, customerId: $customerId, customerNumber: $customerNumber, fullName: $fullName, status: $status)';
  }
}
