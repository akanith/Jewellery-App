export interface CustomerNominee {
  name: string;
  relationship: string;
}

export interface CustomerProfile {
  id: string;
  name: string;
  mobileNumber: string;
  avatarUrl?: string;
  schemeBadge: string;
  joinDate: string;
  address: string;
  nominee: CustomerNominee;
}

export interface CustomerCurrentScheme {
  schemeName: string;
  monthlyInstallment: number;
  totalMonths: number;
  paidInstallments: number;
  nextPaymentDue: string;
}

export interface CustomerProfileViewModel {
  profile: CustomerProfile;
  currentScheme: CustomerCurrentScheme;
}
