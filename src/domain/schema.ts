/**
 * Equipment Commerce & Rental Platform (Israel)
 * Core Domain Schema & Types
 * Conforming to Technical Specification v1.0 (21.10.2026)
 */

export type Language = 'he' | 'en';

// ==========================================
// 1. ROLES & RBAC (Section 4 & 29)
// ==========================================
export type RoleCode =
  | 'company_admin'       // Owner / Co-founder (full privileges)
  | 'platform_admin'      // Technical / DevOps admin
  | 'sales_manager'       // Quotes, client onboarding, pricing override within limits
  | 'finance_manager'     // Ledger, refunds, bank reconciliation, tax invoices
  | 'warehouse_operator'  // Picking, packing, serial number scanning, asset intake
  | 'service_technician'  // Diagnostic, repair routing, parts replacement
  | 'dealer'              // Referral attribution, commission tracking
  | 'customer_admin'      // Client organization admin
  | 'customer_employee';  // Device assignee

export interface RolePermissions {
  canViewOwnerDashboard: boolean;
  canViewSupplierCosts: boolean;     // Section 29: permission to see acquisition cost & margin
  canOverridePricing: boolean;       // Section 29: discounts & manual prices
  canIssueRefunds: boolean;          // Section 29: money refunds & credits
  canManageWarehouseAssets: boolean; // intake, serial scanning, write-offs
  canManageContracts: boolean;       // contract generation, OTP trigger
  canManageLedger: boolean;          // financial entries & bank reconciliation
  canManageUsersAndRoles: boolean;   // RBAC role assignment
  canManageCMSAndContent: boolean;   // edit texts, pages, products, images
  canExportData: boolean;            // Section 29: CSV/ZIP export rights
}

export interface UserAccount {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: RoleCode;
  organizationId?: string;
  organizationName?: string;
  taxId?: string; // Israeli H.P. (ח.פ)
  isOwner?: boolean;
  status: 'active' | 'suspended';
  permissions: RolePermissions;
  avatarUrl?: string;
  lastLoginAt?: string;
}

export function isStaffOrAdmin(user: UserAccount | null): boolean {
  if (!user) return false;
  return (
    user.isOwner === true ||
    user.role === 'company_admin' ||
    user.role === 'platform_admin' ||
    user.role === 'sales_manager' ||
    user.role === 'finance_manager' ||
    user.role === 'warehouse_operator' ||
    user.role === 'service_technician'
  );
}

// ==========================================
// 2. PRODUCT MODEL vs PHYSICAL ASSET (Section 5, 9, 28)
// ==========================================
export type HardwareGrade = 'A+' | 'A' | 'B';
export type DeviceCategory = 'laptop' | 'mini_pc' | 'desktop' | 'monitor' | 'phone';

/** Catalog product template (commercial definition, no serial number) */
export interface ProductModel {
  id: string;
  sku: string;
  model: string;
  brand: 'Lenovo' | 'Dell' | 'HP' | 'Apple';
  category: DeviceCategory;
  title: { he: string; en: string };
  specs: {
    cpu: string;
    ramGB: number;
    storageGB: number;
    screenInches: number;
    os: string;
  };
  grade: HardwareGrade;
  basePurchasePriceILS: number;      // Wholesale / sale price (excl. VAT)
  baseMonthlyLeasePriceILS: number;  // Standard 36-month monthly lease (excl. VAT)
  shortRentalPriceDailyILS: number;  // Daily rental price for short term
  published: boolean;
  imagePath: string;
}

/** 
 * Physical Asset Instance (Section 9)
 * Unique tracked hardware with exact serial number, supplier cost, and physical status.
 */
export type AssetStatus =
  | 'received'    // Arrived at warehouse from supplier
  | 'QA'          // Under visual and diagnostic inspection
  | 'available'   // In stock, ready for reservation/allocation
  | 'reserved'    // Held for an active order awaiting picking
  | 'picking'     // Being packaged for delivery
  | 'in_transit'  // In courier transit with delivery note
  | 'rented'      // Active at customer site under contract
  | 'returned'    // Returned from customer, awaiting inspection
  | 'diagnostic'  // In service triage
  | 'repair'      // In repair (internal lab or supplier)
  | 'retired'     // Written off or recycled
  | 'sold';       // Sold outright to B2B/B2C client

export interface PhysicalAsset {
  id: string;
  serialNumber: string;               // Unique hardware SN (e.g. PF-3X92KL-IL)
  qrCodeUrl: string;                  // Direct URL to asset audit log
  productId: string;                  // Refers to catalog ProductModel
  modelName: string;
  grade: HardwareGrade;
  supplier: {
    name: string;
    purchaseOrderRef: string;
    purchaseCostILS: number;          // Actual acquisition cost (excl. VAT)
    purchaseDate: string;             // ISO date of hardware acquisition
    warrantyStartDate: string;        // Hardware warranty start date
    warrantyEndDate: string;          // Hardware warranty end date (CRITICAL for A06/A07)
  };
  warehouseLocation: string;          // e.g. "TLV-A-04-12"
  status: AssetStatus;
  currentAssignment?: {
    orderId: string;
    contractId?: string;
    customerOrganizationName: string;
    customerTaxId: string;
    assignedAt: string;
    deliveredAt?: string;
    handoverActSigned: boolean;
  };
  conditionNotes: string;
  maintenanceHistoryCount: number;
}

// ==========================================
// 3. ORDER STATE MACHINE (Section 8)
// ==========================================
export type OrderState =
  | 'draft'         // Manager or client preparing configuration
  | 'confirmed'     // Approved and accepted by customer
  | 'procurement'   // Back-order items waiting for supplier delivery
  | 'picking'       // Warehouse operator assigning specific serial numbers
  | 'QA'            // Final hardware check before dispatch
  | 'ready'         // Packaged with delivery documents
  | 'shipped'       // Handed to courier
  | 'delivered'     // Customer signed delivery / handover act
  | 'completed'     // Order fulfilled
  | 'cancelled';    // Terminated before fulfillment

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  monthlyLeaseRateILS: number;
  buyoutDepositILS: number;
  assignedAssetIds: string[]; // List of specific PhysicalAsset.id reserved/picked
}

export interface CustomerOrder {
  id: string;
  orderNumber: string; // e.g. "ORD-2026-1042"
  createdAt: string;
  customerName: string;
  organizationName: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  type: 'b2b_lease' | 'b2b_purchase' | 'b2c_purchase' | 'short_rental';
  state: OrderState; // State Machine 1
  contractState: ContractState; // State Machine 2
  paymentState: PaymentCalculationState; // State Machine 3
  items: OrderItem[];
  totalMonthlyILS: number;
  totalOneTimeILS: number;
  currency: 'ILS';
  dealerCode?: string;
  notes?: string;
}

// ==========================================
// 4. CONTRACT STATE MACHINE (Section 10, 11)
// ==========================================
export type ContractState =
  | 'draft'               // Contract template generated with pricing snapshot
  | 'awaiting_signature'  // Sent to customer authorized signatory (SMS/Email OTP)
  | 'signed'              // Electronically signed with timestamp & audit hash
  | 'active'              // Activated upon signed handover act of physical assets
  | 'ended'               // 36-month term completed naturally
  | 'terminated';         // Early termination / cancellation with settlement

export interface LeaseContract {
  id: string;
  contractNumber: string; // e.g. "CNT-2026-081"
  orderId: string;
  organizationName: string;
  taxId: string;
  signatoryName: string;
  signatoryEmail: string;
  signatoryPhone: string;
  state: ContractState;
  termMonths: number; // typically 36
  startDate?: string;
  endDate?: string;
  pricingSnapshot: {
    monthlyRateBeforeVatILS: number;
    vatRatePercent: number; // 17% in Israel
    monthlyRateTotalILS: number;
    buyoutOptionPriceILS: number; // Residual value option
    earlyTerminationTerms: string;
  };
  assignedSerialNumbers: string[];
  signatureAudit?: {
    signedAt: string;
    ipAddress: string;
    otpVerified: boolean;
    documentSha256: string;
    handoverActUrl?: string;
  };
  slaPackage: 'business_standard' | 'business_vip_replacement_4h';
}

// ==========================================
// 5. FINANCIAL LEDGER & BILLING (Section 12, 13, 30)
// ==========================================
export type PaymentCalculationState =
  | 'unbilled'
  | 'paid_in_advance'
  | 'current_ok'
  | 'overdue'       // Overdue on accrued installments (NOT total 36-month value)
  | 'disputed';

export type LedgerEntryType =
  | 'invoice_accrual'     // Monthly lease installment due
  | 'payment_received'    // Bank transfer / Credit card confirmed
  | 'security_deposit'    // Held deposit
  | 'credit_adjustment'   // Legitimate correction credit
  | 'refund'              // Cash returned to client
  | 'dealer_commission'   // 5-10% earned by dealer on confirmed payment
  | 'commission_reversal';// Clawback on refunded amount

export interface LedgerEntry {
  id: string;
  timestamp: string;
  contractId?: string;
  orderId?: string;
  organizationName: string;
  type: LedgerEntryType;
  amountILS: number;        // Positive for dues/charges, negative for payments/credits
  vatAmountILS: number;     // Israeli VAT component
  reference: string;        // e.g. "INV-1093", "BANK-TX-99812", "COMM-DL-04"
  notes: string;
  authorUserEmail: string;  // Audit: who recorded this entry
  isImmutable: true;        // Must NEVER be edited or deleted
}

// ==========================================
// 6. SERVICE TICKETS & REPAIR ROUTING (Section 15, 23 A06/A07, 30)
// ==========================================
export type TicketStatus =
  | 'new'
  | 'triage'
  | 'awaiting_customer'
  | 'scheduled_pickup'
  | 'in_diagnosis'
  | 'repairing'
  | 'replacing'
  | 'resolved'
  | 'closed';

export type WarrantyCoverageRouting =
  | 'supplier_covered'   // Supplier warranty is ACTIVE on this serial number -> route to supplier lab
  | 'company_sla_direct';// Supplier warranty EXPIRED, but customer is under Company SLA -> repaired/swapped at company cost

export interface ServiceTicket {
  id: string;
  ticketNumber: string; // e.g. "TCK-4089"
  createdAt: string;
  organizationName: string;
  contactName: string;
  contactPhone: string;
  assetSerialNumber: string;
  deviceModel: string;
  rentalMonthNumber: number; // e.g. month 8 of 36
  supplierWarrantyEndDate: string; // Hardware end date
  routing: WarrantyCoverageRouting; // A06 / A07 evaluation result
  issueCategory: 'hardware_failure' | 'screen_damage' | 'battery_performance' | 'upgrade_request';
  description: string;
  status: TicketStatus;
  replacementAssetSerialNumber?: string; // If swapped with buffer pool
  resolvedAt?: string;
}

// ==========================================
// 7. DEALER ENTITY & COMMISSIONS (Section 14)
// ==========================================
export interface DealerAccount {
  id: string;
  dealerCode: string; // e.g. "DLR-TLV-09"
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  commissionRatePercent: number; // 5% to 10%
  attributedOrganizationsCount: number;
  totalEarnedILS: number;
  pendingPayoutILS: number;
  status: 'active' | 'suspended';
}
