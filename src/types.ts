export type Language = 'he' | 'en';
export type Theme = 'light' | 'dark';
export type AcquisitionMode = 'lease' | 'short_rental' | 'purchase';

export interface LaptopProduct {
  id: string;
  slug: string;
  category?: 'laptop' | 'desktop';
  manufacturer: 'Dell' | 'HP' | 'Lenovo';
  model: string;
  sku?: string;
  title: {
    he: string;
    en: string;
  };
  description: {
    he: string;
    en: string;
  };
  cpu: {
    family: string;
    generation: number;
    exactModel?: string;
  };
  ramGB: number;
  storage: {
    capacityGB: number;
    type?: string;
  };
  screen: {
    diagonalInches: number;
    touch?: boolean;
  };
  operatingSystem: string;
  grade?: string;
  availability: 'unconfirmed' | 'available' | 'onRequest';
  displayOrder?: number | null;
  featured?: boolean;
  imagePath: string;
  imageAlt?: { he: string; en: string };
  imageVerified?: boolean;
  detailsConfirmed?: boolean;
  purchasePrice: number;
  leasePriceMonthly: number;
  leaseTermMonths: number; // 36 months
  rentalRates?: { dailyShort: number; dailyWeek: number; monthly: number; shortMaxDays?: number; weekMaxDays?: number };
  editVersion?: number;
  published: boolean;
}

export interface SiteContent {
  hero: {
    titleHe: string;
    titleAccentHe: string;
    titleEn: string;
    titleAccentEn: string;
    subtitleHe: string;
    subtitleEn: string;
    ctaPrimaryHe: string;
    ctaPrimaryEn: string;
    ctaSecondaryHe: string;
    ctaSecondaryEn: string;
  };
  workspace: {
    titleHe: string;
    titleEn: string;
    bodyHe: string;
    bodyEn: string;
  };
  sectionsVisibility: {
    hero: boolean;
    devices: boolean;
    workspace: boolean;
    calculator: boolean;
    story: boolean;
    catalog: boolean;
    faq: boolean;
    cta: boolean;
  };
}

export type QuoteStatus = 'pending' | 'approved' | 'rejected' | 'pending_review' | 'quote_prepared';

export interface QuoteRequest {
  id: string;
  createdAt: string;
  productSlug: string;
  productTitle: string;
  mode: AcquisitionMode;
  quantity: number;
  rentalDays?: number;
  monthlyPerUnit: number;
  totalMonthly: number;
  oneTimePerUnit: number;
  totalOneTime: number;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  taxId?: string;
  city?: string;
  notes?: string;
  status: QuoteStatus;
  contractId?: string;
  orderId?: string;
  assignedManager?: string;
  rejectionReason?: string;
  approvedDiscountPercent?: number;
  customMonthlyRateILS?: number;
  assignedSerialNumbers?: string[];
  otpSentAt?: string;
  otpCode?: string;
}
