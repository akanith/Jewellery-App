export interface ShopInfo {
  name: string;
  tagline: string;
  category: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string;
  whatsappPhone: string;
  email: string;
  openingTime: string; // e.g. "09:30"
  closingTime: string; // e.g. "22:00"
  workingDays: string; // e.g. "Monday - Sunday"
  googleMapsUrl: string;
  establishedYear?: number;
}
