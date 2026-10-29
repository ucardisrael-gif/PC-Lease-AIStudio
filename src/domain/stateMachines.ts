/**
 * Domain State Machines & Business Logic Validators
 * Conforming to Section 8, 9, 10, 12, 15, 30 of the Technical Specification
 */

import {
  AssetStatus,
  ContractState,
  OrderState,
  PhysicalAsset,
  ServiceTicket,
  WarrantyCoverageRouting,
  LedgerEntry,
} from './schema';

// ========================================================
// 1. ORDER STATE MACHINE RULES (Section 8)
// ========================================================
export const ORDER_ALLOWED_TRANSITIONS: Record<OrderState, OrderState[]> = {
  draft: ['confirmed', 'cancelled'],
  confirmed: ['procurement', 'picking', 'cancelled'],
  procurement: ['picking', 'cancelled'],
  picking: ['QA', 'cancelled'],
  QA: ['ready', 'picking'], // can reject back to picking if device fails QA
  ready: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};

export function canTransitionOrder(current: OrderState, target: OrderState): boolean {
  return ORDER_ALLOWED_TRANSITIONS[current]?.includes(target) ?? false;
}

// ========================================================
// 2. CONTRACT STATE MACHINE RULES (Section 10, 11)
// ========================================================
export const CONTRACT_ALLOWED_TRANSITIONS: Record<ContractState, ContractState[]> = {
  draft: ['awaiting_signature'],
  awaiting_signature: ['signed', 'draft'],
  signed: ['active', 'terminated'], // becomes active when physical assets are handed over with signed act
  active: ['ended', 'terminated'],
  ended: [],
  terminated: [],
};

export function canTransitionContract(current: ContractState, target: ContractState): boolean {
  return CONTRACT_ALLOWED_TRANSITIONS[current]?.includes(target) ?? false;
}

// ========================================================
// 3. ASSET PHYSICAL STATE MACHINE RULES (Section 9)
// ========================================================
export const ASSET_ALLOWED_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  received: ['QA'],
  QA: ['available', 'diagnostic', 'repair'],
  available: ['reserved', 'sold'],
  reserved: ['picking', 'available'], // unreserved if order cancelled
  picking: ['in_transit', 'available'],
  in_transit: ['rented', 'returned'],
  rented: ['returned', 'diagnostic'],
  returned: ['QA', 'diagnostic'],
  diagnostic: ['repair', 'available', 'retired'],
  repair: ['QA', 'retired'],
  retired: [],
  sold: [],
};

export function canTransitionAsset(current: AssetStatus, target: AssetStatus): boolean {
  return ASSET_ALLOWED_TRANSITIONS[current]?.includes(target) ?? false;
}

// ========================================================
// 4. WARRANTY ROUTING ENGINE (Section 15, 23 A06/A07, Section 30)
//
// Rule: Supplier warranty is tied strictly to the physical hardware purchase dates,
// NOT to the customer rental month (e.g., month 8 of rental does not imply supplier coverage).
// The company SLA covers the client regardless, but repair is routed to supplier ONLY if
// the supplier warranty is currently valid.
// ========================================================
export function evaluateWarrantyRouting(
  supplierWarrantyEndDateISO: string,
  incidentDateISO: string = new Date().toISOString()
): {
  routing: WarrantyCoverageRouting;
  isSupplierWarrantyActive: boolean;
  daysRemainingOnSupplierWarranty: number;
  explanation: { he: string; en: string };
} {
  const endDate = new Date(supplierWarrantyEndDateISO).getTime();
  const incidentDate = new Date(incidentDateISO).getTime();
  const diffDays = Math.ceil((endDate - incidentDate) / (1000 * 60 * 60 * 24));

  const isSupplierWarrantyActive = diffDays > 0;
  const routing: WarrantyCoverageRouting = isSupplierWarrantyActive
    ? 'supplier_covered'
    : 'company_sla_direct';

  const explanation = isSupplierWarrantyActive
    ? {
        he: `אחריות ספק בתוקף (נותרו ${diffDays} ימים). המכשיר יישלח למעבדת הספק לתיקון באחריות ללא עלות לחברה.`,
        en: `Supplier warranty is active (${diffDays} days remaining). Hardware will be routed to official supplier lab at zero company parts cost.`,
      }
    : {
        he: `אחריות ספק פגה לפני ${Math.abs(diffDays)} ימים! בהתאם לסעיף 30 ו-A07, החברה מחויבת ב-SLA מול הלקוח אך סופגת את עלות החלפים/המעבדה בעצמה.`,
        en: `Supplier warranty expired ${Math.abs(diffDays)} days ago! Per ТЗ Section 30 & A07, customer SLA is honored by Company, but repair/swap cost is absorbed by Company.`,
      };

  return {
    routing,
    isSupplierWarrantyActive,
    daysRemainingOnSupplierWarranty: Math.max(0, diffDays),
    explanation,
  };
}

// ========================================================
// 5. FINANCIAL DEBT vs FUTURE BALANCE CALCULATOR (Section 12, 30)
//
// Rule: Debt is strictly OVERDUE accrued amounts, NOT the 36-month future contract commitments.
// ========================================================
export function calculateCustomerFinancialPosition(entries: LedgerEntry[]): {
  totalInvoicedILS: number;
  totalPaidILS: number;
  overdueDebtILS: number;
  securityDepositsHeldILS: number;
  totalDealerCommissionsILS: number;
  status: 'clean' | 'has_overdue' | 'in_credit';
} {
  let totalInvoiced = 0;
  let totalPaid = 0;
  let securityDepositsHeld = 0;
  let totalDealerCommissions = 0;

  for (const entry of entries) {
    if (entry.type === 'invoice_accrual') {
      totalInvoiced += entry.amountILS;
    } else if (entry.type === 'payment_received') {
      totalPaid += Math.abs(entry.amountILS);
    } else if (entry.type === 'credit_adjustment') {
      totalInvoiced -= Math.abs(entry.amountILS);
    } else if (entry.type === 'refund') {
      totalPaid -= Math.abs(entry.amountILS);
    } else if (entry.type === 'security_deposit') {
      securityDepositsHeld += Math.abs(entry.amountILS);
    } else if (entry.type === 'dealer_commission') {
      totalDealerCommissions += entry.amountILS;
    } else if (entry.type === 'commission_reversal') {
      totalDealerCommissions -= Math.abs(entry.amountILS);
    }
  }

  const netBalance = totalInvoiced - totalPaid;
  const overdueDebtILS = Math.max(0, netBalance);

  let status: 'clean' | 'has_overdue' | 'in_credit' = 'clean';
  if (overdueDebtILS > 0) {
    status = 'has_overdue';
  } else if (netBalance < 0) {
    status = 'in_credit';
  }

  return {
    totalInvoicedILS: totalInvoiced,
    totalPaidILS: totalPaid,
    overdueDebtILS,
    securityDepositsHeldILS: securityDepositsHeld,
    totalDealerCommissionsILS: totalDealerCommissions,
    status,
  };
}
