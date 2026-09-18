export interface PrivacyItem {
  id: string;
  title: string;
  description: string;
}

export interface PrivacySection {
  id: string;
  title: string;
  iconName: string;
  description?: string;
  items?: PrivacyItem[];
  highlightText?: string;
}

export interface PrivacyPolicyContent {
  title: string;
  commitmentText: string;
  lastUpdatedDate: string;
  sections: PrivacySection[];
  contactPhone: string;
  contactEmail: string;
}
