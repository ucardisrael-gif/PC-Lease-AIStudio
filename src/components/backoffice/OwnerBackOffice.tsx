import './admin-style.css';
import { AccessRoles } from './AccessRoles';
import {OrderTerms, SavedProductTerms} from './OrderTerms';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  LayoutDashboard,
  Layers,
  Package,
  FileText,
  DollarSign,
  Wrench,
  Users,
  Database,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  QrCode,
  Tag,
  Search,
  Filter,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Check,
  X,
  FileCheck2,
  Lock,
  Globe,
  Sun,
  Moon,
  Image as ImageIcon,
  Edit3,
  Trash2,
  UserCheck,
  UserX,
  Sliders,
  Eye,
  EyeOff,
  Save,
  Upload,
  Building,
  Store,
} from 'lucide-react';
import {
  CustomerOrder,
  DealerAccount,
  HardwareGrade,
  LeaseContract,
  LedgerEntry,
  OrderState,
  PhysicalAsset,
  RoleCode,
  RolePermissions,
  ServiceTicket,
  UserAccount,
} from '../../domain/schema';
import {
  canTransitionOrder,
  ORDER_ALLOWED_TRANSITIONS,
  evaluateWarrantyRouting,
  calculateCustomerFinancialPosition,
} from '../../domain/stateMachines';
import {
  CURRENT_OWNER_USER,
  SEEDED_ASSETS,
  SEEDED_CONTRACTS,
  SEEDED_DEALERS,
  SEEDED_LEDGER_ENTRIES,
  SEEDED_ORDERS,
  SEEDED_QUOTES,
  SEEDED_TICKETS,
  SEEDED_USERS,
} from '../../data/mockDatabase';
import { Language, LaptopProduct, QuoteRequest, SiteContent, Theme } from '../../types';
import { ClientCrmView } from './ClientCrmView';
import { ProductManagement } from './ProductManagement';
import { UserManagement } from './UserManagement';
import { Organizations } from './Organizations';
import { RequestCompany } from './RequestCompany';
import { RequestCustomer } from './RequestCustomer';
import { RequestDealer } from './RequestDealer';
import { RequestNotes } from './RequestNotes';
import { RequestInventory } from './RequestInventory';
import { RequestContracts } from './RequestContracts';
import { RequestFinance } from './RequestFinance';
import { RequestService } from './RequestService';
import { ContactInquiries } from './ContactInquiries';
import { PendingNotes } from './PendingNotes';
import { RequestNotification } from './RequestNotification';
import { OrderNotificationSettings } from './OrderNotificationSettings';
import { TaxSettings } from './TaxSettings';
import { InventoryWorkspace } from './InventoryWorkspace';
import { ServiceManagement } from './ServiceManagement';
import { ContractDrafts } from './ContractDrafts';
import { DatabaseSchema } from './DatabaseSchema';
import { FinanceManagement } from './FinanceManagement';
import { LeaseSettings } from './LeaseSettings';
import { LiveDashboard } from './LiveDashboard';
import { OrdersBoard } from './OrdersBoard';
import { TrustManagement } from './TrustManagement';
import { TrustBlock } from '../TrustSection';
import { HeroBlock } from '../HeroSection';
import { HeroManagement } from './HeroManagement';
import { Dealers } from './Dealers';
import { SectionManagement } from './SectionManagement';
import { HomeLayoutManagement } from './HomeLayoutManagement';
import { RequestStatusHistory } from './RequestStatusHistory';
import { WorkspaceBlock } from '../WorkspaceSection';
import { FeaturedBlock } from '../DeviceSelector';
import { StoryBlock } from '../ProcessStory';
import { FAQBlock } from '../FAQSection';

type StoredRequest = { inventory_summary?:{reserved:number;issued:number;replacements:number}; notification_resolutions_has_more:boolean; notification_resolutions:{id:string;actor_email:string;created_at:string}[]; order_number:string; notification_attempts_has_more:boolean; notification_attempts:{id:string;result:string;actor_email:string;created_at:string}[]; customer_user_id:string|null;customer_email:string|null;customer_link_version:number;customer_history_has_more:boolean; customer_history:{old_email:string|null;new_email:string|null;actor_email:string;created_at:string}[]; id: string; created_at: string; quantity: number; status: string; status_revision:string; organization_id:string|null; organization_name:string|null; organization_link_version:number; organization_history_has_more:boolean; organization_history:{previous_organization_name:string|null;new_organization_name:string|null;actor_email:string;created_at:string}[]; status_history_has_more: boolean; status_history: { id: string; previous_status: string; new_status: string; actor_email: string; created_at: string }[]; notification_status: string; contact_json: { companyName: string; contactName: string; email: string; phone: string; city: string; notes: string }; product_snapshot_json: { model: string; quoteProducts?: ({ model: string; sku?: string } & SavedProductTerms)[] }; tariff_snapshot_json: { kind?: 'order'; language?: 'he'|'en'|null; source?: 'website'|null; mode: string; rentalDays: number | null; price?: { totalAmountMinor: number; period: string; excludesVat?: boolean } | null; quote?: { leasePlan?:{name:string};addons?:{id:string;nameHe:string;nameEn:string;quantity:number;totalMinor:number;billing:string}[];monthlyMinor?:number|null;oneTimeMinor?:number; totalMinor: number|null; items: { quantity: number; mode: string; rentalDays?: number|null; termMonths?: number|null; periodTotalMinor: number|null; period: string; contractTotalMinor: number|null }[] } } };

function validStoredOrderLines(r:StoredRequest):boolean {
  const items=r.tariff_snapshot_json.quote?.items, products=r.product_snapshot_json.quoteProducts;
  return Array.isArray(items)&&Array.isArray(products)&&items.length>0&&items.length===products.length&&items.every(item=>item!==null&&typeof item==='object'&&!Array.isArray(item))&&products.every(product=>product!==null&&typeof product==='object'&&!Array.isArray(product));
}

interface OwnerBackOfficeProps {
  initialOrderId?: string;
  adminEmail: string;
  fullAdmin: boolean;
  permissions: string[];
  onCatalogChanged: () => void;
  onTrustSaved: (block: TrustBlock) => void;
  onHeroSaved: (block: HeroBlock) => void;
  onWorkspaceSaved: (block: WorkspaceBlock) => void;
  onFeaturedSaved: (block: FeaturedBlock) => void;
  onStorySaved: (block: StoryBlock) => void;
  onFaqSaved: (block: FAQBlock) => void;
  onInfoChanged: () => void;
  lang: Language;
  theme: Theme;
  onToggleLang: () => void;
  onToggleTheme: () => void;
  content: SiteContent;
  products: LaptopProduct[];
  quotes?: QuoteRequest[];
  onUpdateQuotes?: (newQuotes: QuoteRequest[]) => void;
  onUpdateContentAndProducts: (newContent: SiteContent, newProducts: LaptopProduct[]) => void;
  onClose: () => void;
}

type BackOfficeTab =
  | 'dashboard'
  | 'crm'
  | 'schemas'
  | 'kanban'
  | 'inventory'
  | 'contracts'
  | 'ledger'
  | 'service'
  | 'users'
  | 'dealers'
  | 'cms';

export const OwnerBackOffice: React.FC<OwnerBackOfficeProps> = ({
  initialOrderId,
  lang,
  theme,
  adminEmail,
  fullAdmin,
  permissions,
  onCatalogChanged,
  onTrustSaved,
  onHeroSaved,
  onWorkspaceSaved,
  onFeaturedSaved,
  onStorySaved,
  onFaqSaved,
  onInfoChanged,
  onToggleLang,
  onToggleTheme,
  content,
  products,
  quotes,
  onUpdateQuotes,
  onUpdateContentAndProducts,
  onClose,
}) => {
  const isRtl = lang === 'he';
  const isDark = theme === 'dark';
  const canOrders = fullAdmin || permissions.includes('orders');
  const canCatalog = fullAdmin || permissions.includes('catalog');
  const canContent = fullAdmin || permissions.includes('content');
  const canInventory = fullAdmin || permissions.includes('inventory');
  const canPurchase = fullAdmin || permissions.includes('inventory_cost');
  const canService = fullAdmin || permissions.includes('service');
  const canContracts = fullAdmin || permissions.includes('contracts');
  const canFinance = fullAdmin || permissions.includes('finance');
  const [savedRequests, setSavedRequests] = useState<StoredRequest[]>([]);
  const [requestSearchInput, setRequestSearchInput] = useState(canOrders ? initialOrderId || '' : '');
  const [requestSearch, setRequestSearch] = useState(canOrders ? initialOrderId || '' : '');
  const [requestFilter, setRequestFilter] = useState('all');
  const [notificationFilter, setNotificationFilter] = useState('all');
  const [equipmentFilter,setEquipmentFilter]=useState('all');
  const [requestOffset, setRequestOffsetRaw] = useState(0);
  const [requestCursors,setRequestCursors]=useState<string[]>(['']);
  const setRequestOffset=(value:number)=>{setRequestOffsetRaw(value);if(value===0)setRequestCursors(['']);};
  const [requestTotal, setRequestTotal] = useState(0);
  const [requestHasMore, setRequestHasMore] = useState(false);
  const [requestState, setRequestState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [statusSaving, setStatusSaving] = useState<Set<string>>(() => new Set());
  const statusStorageKey = `pc-lease:status-warnings:${adminEmail.trim().toLowerCase()}`;
  const [statusErrors, setStatusErrors] = useState<Record<string,'conflict'|'unknown'>>(() => { try { const raw=JSON.parse(sessionStorage.getItem(statusStorageKey)||'{}'); if(!raw||typeof raw!=='object'||Array.isArray(raw))return {}; return Object.fromEntries(Object.entries(raw).filter(([id,kind])=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)&&(kind==='conflict'||kind==='unknown')).slice(0,100)) as Record<string,'conflict'|'unknown'>; } catch { return {}; } });
  const [statusStorageUnavailable,setStatusStorageUnavailable]=useState(false);
  const [statusNotSubmitted,setStatusNotSubmitted]=useState('');
  const statusErrorsRef=useRef(statusErrors);
  const setStatusProblem=(id:string,kind:'conflict'|'unknown'|null)=>{const next={...statusErrorsRef.current};if(kind)next[id]=kind;else delete next[id];try{if(Object.keys(next).length)sessionStorage.setItem(statusStorageKey,JSON.stringify(next));else sessionStorage.removeItem(statusStorageKey);statusErrorsRef.current=next;setStatusErrors(next);setStatusStorageUnavailable(false);return true;}catch{setStatusStorageUnavailable(true);return false;}};
  const changeStatus = async (request: StoredRequest, status: string) => {
    if (status === request.status || statusSaving.has(request.id) || statusErrorsRef.current[request.id]) return;
    if(!setStatusProblem(request.id,'unknown')){setStatusNotSubmitted(request.id);return;}setStatusNotSubmitted('');
    setStatusSaving(current => new Set(current).add(request.id));
    try {
      const response = await fetch('/api/admin/requests/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: request.id, expectedStatus: request.status, expectedRevision: request.status_revision, status }) });
      if (!response.ok) { if (response.status === 409) throw new Error('conflict'); throw new Error('unavailable'); }
      setStatusProblem(request.id,null);
      setReloadKey(n => n + 1);
    } catch (error) { const kind = error instanceof Error && error.message === 'conflict' ? 'conflict' : 'unknown'; setStatusProblem(request.id,kind); setReloadKey(n => n + 1); }
    finally { setStatusSaving(current => { const next = new Set(current); next.delete(request.id); return next; }); }
  };
  const statusLabel = (status: string) => ({ new: isRtl ? 'חדש' : 'New', reviewed: isRtl ? 'בטיפול' : 'In review', closed: isRtl ? 'סגור' : 'Closed' }[status] || status);
  useEffect(() => {
    const controller = new AbortController();
    setRequestState('loading');
    const params = new URLSearchParams({ search: requestSearch, status: requestFilter, notification: notificationFilter, equipment:canInventory?equipmentFilter:'all', before: requestCursors[requestOffset/25]||'' });
    fetch(`/api/admin/requests?${params}`, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('unavailable');
      return response.json();
    }).then(data => { if (controller.signal.aborted) return; setSavedRequests(data.requests); setRequestTotal(data.total); setRequestHasMore(data.hasMore); setRequestState('ready'); })
      .catch(() => { if (!controller.signal.aborted) setRequestState('error'); });
    return () => controller.abort();
  }, [reloadKey, requestSearch, requestFilter, notificationFilter, equipmentFilter, canInventory, requestOffset, requestCursors]);

  // Navigation state
  const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
  const [activeTab, setActiveTabState] = useState<BackOfficeTab>(canOrders ? 'crm' : canContent || canCatalog ? 'cms' : canInventory || canPurchase ? 'inventory' : canService ? 'service' : canContracts ? 'contracts' : 'ledger');
  const [unprotectedContract,setUnprotectedContract]=useState(false);
  const [unprotectedInventory,setUnprotectedInventory]=useState(false);
  const [unprotectedPurchase,setUnprotectedPurchase]=useState(false);
  const [unprotectedProfile,setUnprotectedProfile]=useState(false);
  const [unprotectedCompany,setUnprotectedCompany]=useState(false);
  const [unprotectedDealer,setUnprotectedDealer]=useState(false);
  const [unprotectedService,setUnprotectedService]=useState(false);
  const [unprotectedSections,setUnprotectedSections]=useState<Record<string,boolean>>({});
  const [productExitNotice,setProductExitNotice]=useState(false);
  const updateSectionDirty=useCallback((section:string,dirty:boolean)=>setUnprotectedSections(current=>current[section]===dirty?current:{...current,[section]:dirty}),[]);
  const allowSectionsExit=()=>{if(unprotectedSections.products){setProductExitNotice(true);return false;}setProductExitNotice(false);return !Object.values(unprotectedSections).some(Boolean)||window.confirm(isRtl?'יש שינויים בתוכן האתר שלא נשמרו או שלא אומתו. להמשיך?':'Site content has unsaved or unconfirmed changes. Continue?');};
  const [unprotectedTax,setUnprotectedTax]=useState(false);
  const [unprotectedNotification,setUnprotectedNotification]=useState(false);
  const [unprotectedFinance,setUnprotectedFinance]=useState(false);
  const [boardSaving,setBoardSaving]=useState(false);
  const allowBoardExit=()=>!boardSaving||window.confirm(isRtl?'עדכון סטטוס עדיין מתבצע. אם תצאו, בדקו את ההזמנה לפני ניסיון נוסף. להמשיך?':'A status update is still in progress. If you leave, check the order before retrying. Continue?');
  const allowContractExit=()=>!unprotectedContract || window.confirm(isRtl?'לא ניתן לשמור את טיוטת החוזה בדפדפן. יציאה תמחק את הטקסט שלא נשמר. להמשיך?':'The browser cannot retain this contract draft. Leaving will discard unsaved text. Continue?');
  const allowInventoryExit=()=>!unprotectedInventory || window.confirm(isRtl?'לא ניתן לשמור את טיוטת הפריט בדפדפן. יציאה תמחק את הנתונים שלא נשמרו. להמשיך?':'The browser cannot retain this inventory draft. Leaving will discard unsaved details. Continue?');
  const allowPurchaseExit=()=>!unprotectedPurchase || window.confirm(isRtl?'יש נתוני רכישה שלא נשמרו או שמירתם טרם אושרה. יציאה עלולה לאבד אותם. להמשיך?':'Purchase details are unsaved or saving is not confirmed. Leaving may lose them. Continue?');
  const allowProfileExit=()=>(!unprotectedProfile || window.confirm(isRtl?'יש פרטי משתמש או הרשאות שלא נשמרו או שמירתם טרם אושרה. יציאה עלולה לאבד אותם. להמשיך?':'Profile or permission changes are unsaved or saving is not confirmed. Leaving may lose them. Continue?')) && (!unprotectedCompany || window.confirm(isRtl?'יש פרטי חברה שלא נשמרו או ששמירתם לא אומתה. להמשיך?':'Company details are unsaved or saving is not confirmed. Continue?'));
  const allowServiceExit=()=>!unprotectedService || window.confirm(isRtl?'לא ניתן לשמור את טיוטת השירות בדפדפן. יציאה תמחק נתונים שלא נשמרו. להמשיך?':'The browser cannot retain this service draft. Leaving will discard unsaved details. Continue?');
  const allowTaxExit=()=>(!unprotectedTax || window.confirm(isRtl?'יש שינוי מס שלא נשמר או שמירתו לא אומתה. להמשיך?':'Tax settings are unsaved or saving is not confirmed. Continue?')) && (!unprotectedNotification || window.confirm(isRtl?'הגדרות ההתראות לא נשמרו או ששמירתן לא אומתה. להמשיך?':'Notification settings are unsaved or saving is not confirmed. Continue?'));
  const allowFinanceExit=()=>!unprotectedFinance || window.confirm(isRtl?'יש רישום כספי שלא נשמר. יציאה תמחק את הנתונים שהוזנו. להמשיך?':'A financial record has not been saved. Leaving will discard the entered details. Continue?');
  const allowDealerExit=()=>!unprotectedDealer||window.confirm(isRtl?'יש פרטי שותף שלא נשמרו או ששמירתם לא אומתה. להמשיך?':'Partner details are unsaved or saving is not confirmed. Continue?');
  const setActiveTab=(next:BackOfficeTab)=>{if(activeTab==='kanban'&&next!=='kanban'&&!allowBoardExit())return;if(activeTab==='dealers'&&next!=='dealers'&&!allowDealerExit())return;if(activeTab==='cms'&&next!=='cms'&&!allowSectionsExit())return;if(activeTab==='ledger'&&next!=='ledger'&&!allowFinanceExit())return;if(activeTab==='crm'&&next!=='crm'&&!allowTaxExit())return;if(activeTab==='contracts'&&next!=='contracts'&&!allowContractExit())return;if(activeTab==='inventory'&&next!=='inventory'&&(!allowInventoryExit()||!allowPurchaseExit()))return;if(activeTab==='users'&&next!=='users'&&!allowProfileExit())return;if(activeTab==='service'&&next!=='service'&&!allowServiceExit())return;setActiveTabState(next);setMobileMenuOpen(false);};
  const [financeOrderId,setFinanceOrderId]=useState(''),[financeUndated,setFinanceUndated]=useState(false);
  const [contractOrderId,setContractOrderId]=useState('');
  const [contractTargetId,setContractTargetId]=useState('');
  const [serviceSearch,setServiceSearch]=useState('');
  const [serviceReplacement,setServiceReplacement]=useState<'all'|'outstanding'>('all');
  const [serviceAssetId,setServiceAssetId]=useState('');
  const [inventoryAssetId,setInventoryAssetId]=useState('');
  const [serviceAssetSerial,setServiceAssetSerial]=useState('');
  const [crmGroup,setCrmGroup]=useState<'orders'|'inquiries'|'notifications'|'tax'>('orders');
  const [inquiryTargetId,setInquiryTargetId]=useState('');
  const [inquiryTargetSequence,setInquiryTargetSequence]=useState(0);
  const [peopleSearch,setPeopleSearch]=useState('');
  const [peopleGroup, setPeopleGroup] = useState<'users' | 'companies' | 'roles'>('users');
  const [cmsGroup, setCmsGroup] = useState<'home' | 'catalog' | 'about' | 'contact' | 'footer' | 'navigation'>(canContent ? 'home' : 'catalog');
  const [catalogSection,setCatalogSection]=useState<'products'|'plans'>('products');
  const [homeSection, setHomeSection] = useState<'hero' | 'trust' | 'featured' | 'calculator' | 'workspace' | 'story' | 'faq' | 'layout'>('hero');

  // Interactive Live Data State
  const [quotesList, setQuotesList] = useState<QuoteRequest[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>(SEEDED_ORDERS);
  const [assets, setAssets] = useState<PhysicalAsset[]>(SEEDED_ASSETS);
  const [contracts, setContracts] = useState<LeaseContract[]>(SEEDED_CONTRACTS);
  const [ledger, setLedger] = useState<LedgerEntry[]>(SEEDED_LEDGER_ENTRIES);
  const [tickets, setTickets] = useState<ServiceTicket[]>(SEEDED_TICKETS);
  const [usersList, setUsersList] = useState<UserAccount[]>(SEEDED_USERS);
  const [dealers, setDealers] = useState<DealerAccount[]>(SEEDED_DEALERS);
  const [selectedAssetForWarrantyCheck, setSelectedAssetForWarrantyCheck] =
    useState<PhysicalAsset | null>(SEEDED_ASSETS[0]);
  const [notification, setNotification] = useState<string | null>(null);

  const handleUpdateQuotes = (newQuotes: QuoteRequest[]) => {
    setQuotesList(newQuotes);
    if (onUpdateQuotes) {
      onUpdateQuotes(newQuotes);
    }
  };


  // User Management State
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserAccount | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<RoleCode>('sales_manager');

  // CMS Editor State
  const [cmsTab, setCmsTab] = useState<'pages' | 'products' | 'media'>('pages');
  const [draftContent, setDraftContent] = useState<SiteContent>(content);
  const [draftProducts, setDraftProducts] = useState<LaptopProduct[]>(products);
  const [editingProduct, setEditingProduct] = useState<LaptopProduct | null>(null);

  // New Asset Intake modal state
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);
  const [newAssetSerial, setNewAssetSerial] = useState('');
  const [newAssetModel, setNewAssetModel] = useState('Lenovo ThinkPad X1 Carbon Gen 9');
  const [newAssetCost, setNewAssetCost] = useState('1400');
  const [newAssetGrade, setNewAssetGrade] = useState<HardwareGrade>('A+');

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // State machine transition handler
  const handleAdvanceOrderStatus = (orderId: string, nextState: OrderState) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    if (!canTransitionOrder(order.state, nextState)) {
      showToast(
        isRtl
          ? `שגיאה: מעבר בלתי חוקי ממצב ${order.state} למצב ${nextState}!`
          : `Error: Illegal transition from ${order.state} to ${nextState}!`
      );
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, state: nextState } : o))
    );
    showToast(
      isRtl
        ? `סטטוס הזמנה ${order.orderNumber} עודכן ל-${nextState}`
        : `Order ${order.orderNumber} transitioned to ${nextState}`
    );
  };

  // OTP E-Signature Simulator
  const handleSimulateContractSignature = (contractId: string) => {
    setContracts((prev) =>
      prev.map((c) =>
        c.id === contractId
          ? {
              ...c,
              state: 'signed',
              signatureAudit: {
                signedAt: new Date().toISOString(),
                ipAddress: '84.110.12.89',
                otpVerified: true,
                documentSha256:
                  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                handoverActUrl: '/docs/handover-simulated.pdf',
              },
            }
          : c
      )
    );
    showToast(
      isRtl
        ? 'ההסכם נחתם דיגיטלית ב-OTP ואומת בהצלחה!'
        : 'Contract signed via OTP and cryptographically verified!'
    );
  };

  // Add Asset Intake
  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetSerial.trim()) return;

    const newAsset: PhysicalAsset = {
      id: `ast-${Date.now()}`,
      serialNumber: newAssetSerial.toUpperCase().trim(),
      qrCodeUrl: `https://pc-lease.co.il/qr/${newAssetSerial.trim()}`,
      productId: 'thinkpad-x1-carbon-gen9',
      modelName: newAssetModel,
      grade: newAssetGrade,
      supplier: {
        name: 'Official Partner Distributor IL',
        purchaseOrderRef: `PO-2026-${Math.floor(Math.random() * 900 + 100)}`,
        purchaseCostILS: Number(newAssetCost) || 1350,
        purchaseDate: new Date().toISOString().split('T')[0],
        warrantyStartDate: new Date().toISOString().split('T')[0],
        warrantyEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      },
      warehouseLocation: `TLV-WH-${String.fromCharCode(65 + Math.floor(Math.random() * 4))}-${Math.floor(Math.random() * 20 + 1)}`,
      status: 'available',
      conditionNotes: 'נקלט במחסן ועבר בדיקת QA ראשונית.',
      maintenanceHistoryCount: 0,
    };

    setAssets([newAsset, ...assets]);
    setIsNewAssetModalOpen(false);
    setNewAssetSerial('');
    showToast(
      isRtl
        ? `מכשיר חדש עם מספר סידורי ${newAsset.serialNumber} נקלט בהצלחה במחסן!`
        : `Asset with Serial Number ${newAsset.serialNumber} successfully checked into warehouse!`
    );
  };

  // User Management Handlers
  const handleToggleUserPermission = (
    userId: string,
    permissionKey: keyof RolePermissions
  ) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        return {
          ...u,
          permissions: {
            ...u.permissions,
            [permissionKey]: !u.permissions[permissionKey],
          },
        };
      })
    );
    showToast(
      isRtl
        ? 'הרשאת המשתמש עודכנה בהצלחה (Section 29 RBAC)'
        : 'User permission updated successfully (Section 29 RBAC)'
    );
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newStatus = u.status === 'active' ? 'suspended' : 'active';
        return { ...u, status: newStatus };
      })
    );
    showToast(isRtl ? 'סטטוס חשבון המשתמש שונה' : 'User account status toggled');
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    const newUser: UserAccount = {
      id: `usr_${Date.now()}`,
      email: newUserEmail.trim(),
      fullName: newUserFullName.trim() || newUserEmail.split('@')[0],
      phone: newUserPhone.trim() || '+972-50-0000000',
      role: newUserRole,
      status: 'active',
      permissions: {
        canViewOwnerDashboard: newUserRole === 'company_admin',
        canViewSupplierCosts: newUserRole === 'company_admin' || newUserRole === 'warehouse_operator',
        canOverridePricing: newUserRole === 'company_admin' || newUserRole === 'sales_manager',
        canIssueRefunds: newUserRole === 'company_admin' || newUserRole === 'finance_manager',
        canManageWarehouseAssets: newUserRole === 'company_admin' || newUserRole === 'warehouse_operator',
        canManageContracts: newUserRole === 'company_admin' || newUserRole === 'sales_manager',
        canManageLedger: newUserRole === 'company_admin' || newUserRole === 'finance_manager',
        canManageUsersAndRoles: newUserRole === 'company_admin',
        canManageCMSAndContent: newUserRole === 'company_admin',
        canExportData: newUserRole === 'company_admin',
      },
      lastLoginAt: 'Never logged in',
    };

    setUsersList([newUser, ...usersList]);
    setIsAddUserModalOpen(false);
    setNewUserEmail('');
    setNewUserFullName('');
    setNewUserPhone('');
    showToast(
      isRtl
        ? `המשתמש ${newUser.fullName} נוסף בהצלחה עם תפקיד ${newUser.role}!`
        : `User ${newUser.fullName} added successfully as ${newUser.role}!`
    );
  };

  // CMS Handlers
  const handleToggleSectionVisibility = (sectionKey: keyof SiteContent['sectionsVisibility']) => {
    setDraftContent((prev) => ({
      ...prev,
      sectionsVisibility: {
        ...prev.sectionsVisibility,
        [sectionKey]: !prev.sectionsVisibility[sectionKey],
      },
    }));
  };

  const handleToggleProductPublish = (slug: string) => {
    setDraftProducts((prev) =>
      prev.map((p) => (p.slug === slug ? { ...p, published: !p.published } : p))
    );
  };

  const handleSaveCMS = () => {
    onUpdateContentAndProducts(draftContent, draftProducts);
    showToast(
      isRtl
        ? 'כל השינויים בתוכן ובקטלוג נשמרו ופורסמו באתר החי!'
        : 'All CMS content and catalog changes published live to website!'
    );
  };

  // Financial calculations
  const financialSummary = calculateCustomerFinancialPosition(ledger);
  const totalAssetsCount = assets.length;
  const rentedAssetsCount = assets.filter((a) => a.status === 'rented').length;
  const utilizationRate = totalAssetsCount > 0 ? Math.round((rentedAssetsCount / totalAssetsCount) * 100) : 0;
  const totalMRR = contracts
    .filter((c) => c.state === 'active' || c.state === 'signed')
    .reduce((sum, c) => sum + (c.pricingSnapshot?.monthlyRateBeforeVatILS || 0), 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex flex-col font-sans overflow-hidden transition-colors duration-200 ${
        isDark ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* 1. TOP OWNER COMMAND BAR */}
      <header
        className={`h-16 shrink-0 border-b px-4 sm:px-6 flex items-center justify-between gap-3 transition-colors ${
          isDark
            ? 'bg-slate-950 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span className="hidden sm:inline">{isRtl ? 'Back Office · ניהול בעלים' : 'Back Office · Owner Control'}</span>
          </div>

          <div className="hidden lg:flex items-center text-xs text-slate-500 dark:text-slate-400 gap-2 border-s border-slate-200 dark:border-slate-800 ps-3">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {adminEmail}
            </span>
            <span className="text-slate-500"></span>
            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-mono">
              admin
            </span>
          </div>
        </div>

        {/* Toolbar: Language & Theme Switchers, Live Notification & Close */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={()=>setMobileMenuOpen(value=>!value)} aria-expanded={mobileMenuOpen} aria-label={isRtl?'תפריט ניהול':'Admin menu'} className="md:hidden rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-semibold dark:border-slate-700">☰</button>
          {notification && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>{notification}</span>
            </div>
          )}

          {/* Language Toggle in Back Office */}
          <button
            onClick={onToggleLang}
            title={isRtl ? 'החלף שפה לאנגלית' : 'Switch to Hebrew'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-sky-500" />
            <span>{lang === 'he' ? 'English' : 'עברית'}</span>
          </button>

          {/* Theme Toggle in Back Office */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
            }`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-sky-600" />
            )}
          </button>

          {/* Close / Return to Public site */}
          <button
            onClick={() => {if(allowBoardExit()&&allowDealerExit()&&allowSectionsExit()&&allowContractExit()&&allowInventoryExit()&&allowPurchaseExit()&&allowProfileExit()&&allowServiceExit()&&allowTaxExit()&&allowFinanceExit()) onClose();}}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <span>{isRtl ? 'חזרה לאתר' : 'Exit Admin'}</span>
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE WITH SIDEBAR */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside
          className={`${mobileMenuOpen ? 'flex' : 'hidden'} admin-sidebar md:flex absolute md:relative z-20 h-full w-80 md:w-72 lg:w-80 max-w-[90vw] shrink-0 border-e p-3 flex-col gap-1 overflow-y-auto transition-colors ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
            {isRtl ? 'מודולי ניהול ובקרה' : 'Control Modules'}
          </div>

          <a href="/" target="_blank" rel="noopener noreferrer" title={isRtl?'פתיחת האתר בלשונית חדשה':'Open the site in a new tab'} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-semibold transition-colors text-start ${isDark?'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60':'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
            <Store aria-hidden="true" className="w-5 h-5 text-sky-500 shrink-0"/>
            <span>StoreFront</span>
            <ExternalLink aria-hidden="true" className="w-4 h-4 ms-auto opacity-60"/>
            <span className="sr-only">{isRtl?'נפתח בלשונית חדשה':'opens in a new tab'}</span>
          </a>

          <button
            style={{display: fullAdmin ? undefined : 'none'}}
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-start ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>{isRtl ? 'לוח מחוונים ראשי' : 'Executive Dashboard'}</span>
          </button>

          {/* Client CRM & Inbound Quotes */}
          <button
            style={{display: canOrders ? undefined : 'none'}}
            onClick={() => setActiveTab('crm')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-start ${
              activeTab === 'crm'
                ? 'bg-blue-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="flex items-center justify-between w-full">
              <span>{isRtl ? 'ניהול לידים ו-CRM' : 'Client CRM & Quotes'}</span>
            </div>
          </button>

          {/* CMS & Content Management */}
          <button
            style={{display: canContent || canCatalog ? undefined : 'none'}}
            onClick={() => setActiveTab('cms')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-start ${
              activeTab === 'cms'
                ? 'bg-blue-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Edit3 className="w-4 h-4 text-pink-400 shrink-0" />
            <div className="flex items-center justify-between w-full">
              <span>{isRtl ? 'ניהול תוכן ועיצוב (CMS)' : 'Site CMS & Media'}</span>
              <span className="text-[10px] bg-pink-500/20 text-pink-400 dark:text-pink-300 px-1.5 py-0.2 rounded font-mono">
                Products
              </span>
            </div>
          </button>

          {activeTab === 'cms' && <nav aria-label={isRtl ? 'תפריט ניהול האתר' : 'Site management menu'} className="flex flex-col gap-1 ms-4 mb-2 border-s border-slate-300 dark:border-slate-700 ps-2">
            {productExitNotice&&unprotectedSections.products&&<p role="status" className="rounded-xl bg-amber-50 dark:bg-amber-950 p-2 text-xs text-amber-800 dark:text-amber-200">{isRtl?'יש לשמור או לסגור את כרטיס המוצר לפני מעבר.':'Save or close the product card before navigating.'}</p>}
            {([['home','עמוד הבית','Home page'],['catalog','קטלוג ומוצרים','Catalog & products'],['about','אודות','About page'],['contact','יצירת קשר','Contact page'],['footer','תחתית האתר','Footer'],['navigation','תפריט האתר','Navigation']] as const).filter(([id]) => id === 'catalog' ? canCatalog : canContent).map(([id, he, en]) => <button key={id} type="button" onClick={() => {if(allowSectionsExit())setCmsGroup(id);}} aria-current={cmsGroup === id ? 'page' : undefined} className={`px-3 py-2 rounded-lg text-xs font-semibold text-start ${cmsGroup === id ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{isRtl ? he : en}</button>)}
          </nav>}

          {/* Users & RBAC */}
          <button
            style={{display: fullAdmin ? undefined : 'none'}}
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-start ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="flex items-center justify-between w-full">
              <span>{isRtl ? 'משתמשים והרשאות' : 'User Access'}</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 dark:text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                —
              </span>
            </div>
          </button>

          <button
            style={{display: fullAdmin ? undefined : 'none'}}
            onClick={() => setActiveTab('schemas')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-start ${
              activeTab === 'schemas'
                ? 'bg-blue-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="flex items-center justify-between w-full">
              <span>{isRtl ? 'סכמות נתונים ו-ERD' : 'Data Schemas & ERD'}</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 dark:text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                ТЗ v1.0
              </span>
            </div>
          </button>

          <button
            style={{display: canOrders ? undefined : 'none'}}
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-start ${
              activeTab === 'kanban'
                ? 'bg-blue-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="flex items-center justify-between w-full">
              <span>{isRtl ? 'לוח בקשות והזמנות' : 'Requests & Orders Board'}</span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-400 dark:text-cyan-300 px-1.5 py-0.2 rounded font-mono">
                —
              </span>
            </div>
          </button>

          <button
            style={{display: canInventory || canPurchase ? undefined : 'none'}}
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-start ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex items-center justify-between w-full">
              <span>{isRtl ? 'מחסן ומספרים סידוריים' : 'Serial Inventory (Asset)'}</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 dark:text-amber-300 px-1.5 py-0.2 rounded font-mono">
                —
              </span>
            </div>
          </button>

          <button
            style={{display: canContracts ? undefined : 'none'}}
            onClick={() => {if(activeTab==='contracts' && contractOrderId && !allowContractExit())return;setContractOrderId('');setContractTargetId('');setActiveTab('contracts');}}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-start ${
              activeTab === 'contracts'
                ? 'bg-blue-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-violet-400 shrink-0" />
            <div className="flex items-center justify-between w-full">
              <span>{isRtl ? 'חוזים' : 'Contracts'}</span>
              <span className="text-[10px] bg-violet-500/20 text-violet-400 dark:text-violet-300 px-1.5 py-0.2 rounded font-mono">
                —
              </span>
            </div>
          </button>

          <button
            style={{display: canFinance ? undefined : 'none'}}
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-start ${
              activeTab === 'ledger'
                ? 'bg-blue-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-4 h-4 text-green-400 shrink-0" />
            <div className="flex items-center justify-between w-full">
              <span>{isRtl ? 'בילינג ולדג׳ר כספי' : 'Financial Ledger'}</span>
              <span className="text-[10px] bg-green-500/20 text-green-400 dark:text-green-300 px-1.5 py-0.2 rounded font-mono">
                —
              </span>
            </div>
          </button>

          <button
            style={{display: canService ? undefined : 'none'}}
            onClick={() => {if(activeTab==='service'&&(serviceSearch||serviceAssetId||serviceReplacement!=='all')&&!allowServiceExit())return;setServiceSearch('');setServiceAssetId('');setServiceReplacement('all');setActiveTab('service');}}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-start ${
              activeTab === 'service'
                ? 'bg-blue-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Wrench className="w-4 h-4 text-rose-400 shrink-0" />
            <div className="flex items-center justify-between w-full">
              <span>{isRtl ? 'קריאות שירות (A06/A07)' : 'Service & Warranty Routing'}</span>
              <span className="text-[10px] bg-rose-500/20 text-rose-400 dark:text-rose-300 px-1.5 py-0.2 rounded font-mono">
                —
              </span>
            </div>
          </button>



          <button
            style={{display: fullAdmin ? undefined : 'none'}}
            onClick={() => setActiveTab('dealers')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-start ${
              activeTab === 'dealers'
                ? 'bg-blue-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex items-center justify-between w-full">
              <span>{isRtl ? 'רשת דילרים ועמלות (A10)' : 'Dealers & Commission (A10)'}</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-400 dark:text-amber-300 px-1.5 py-0.2 rounded font-mono">
                —
              </span>
            </div>
          </button>
        </aside>

        {/* Content Pane */}
        <main
          className={`admin-surface min-w-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-colors ${
            isDark ? 'bg-slate-900/90' : 'bg-slate-50/90'
          }`}
        >
          {activeTab === 'crm' ? (
            <section className="space-y-5">
              <nav className="flex gap-2" aria-label={isRtl?'בקשות ופניות':'Requests and inquiries'}><button type="button" aria-current={crmGroup==='orders'?'page':undefined} className={`rounded border px-4 py-2 ${crmGroup==='orders'?'bg-blue-600 text-white':''}`} onClick={()=>{if(allowTaxExit())setCrmGroup('orders');}}>{isRtl?'הזמנות ובקשות':'Orders and requests'}</button><button type="button" aria-current={crmGroup==='inquiries'?'page':undefined} className={`rounded border px-4 py-2 ${crmGroup==='inquiries'?'bg-blue-600 text-white':''}`} onClick={()=>{if(allowTaxExit())setCrmGroup('inquiries');}}>{isRtl?'פניות מהאתר':'Website inquiries'}</button>{fullAdmin&&<button type="button" aria-current={crmGroup==='notifications'?'page':undefined} className={crmGroup==='notifications'?'rounded border px-4 py-2 bg-blue-600 text-white':'rounded border px-4 py-2'} onClick={()=>{if(allowTaxExit())setCrmGroup('notifications');}}>{isRtl?'הגדרות התראות':'Notification settings'}</button>}{fullAdmin&&<button type="button" aria-current={crmGroup==='tax'?'page':undefined} className={crmGroup==='tax'?'rounded border px-4 py-2 bg-blue-600 text-white':'rounded border px-4 py-2'} onClick={()=>{if(allowTaxExit())setCrmGroup('tax');}}>{isRtl?'הגדרות מע״מ':'VAT settings'}</button>}</nav>
              <PendingNotes lang={lang} account={adminEmail} onOpen={(kind,id)=>{if(!allowTaxExit())return;if(kind==='request'){setRequestSearchInput(id);setRequestSearch(id);setRequestFilter('all');setNotificationFilter('all');setEquipmentFilter('all');setRequestOffset(0);setCrmGroup('orders');}else{setInquiryTargetId(id);setInquiryTargetSequence(n=>n+1);setCrmGroup('inquiries');}}}/>
              {crmGroup==='tax'?<TaxSettings lang={lang} onUnprotectedChange={setUnprotectedTax}/>:crmGroup==='notifications'?<OrderNotificationSettings lang={lang} onUnprotectedChange={setUnprotectedNotification}/>:crmGroup==='inquiries'?<ContactInquiries key={`${inquiryTargetId}:${inquiryTargetSequence}`} lang={lang} account={adminEmail} initialSearch={inquiryTargetId}/>:<>
              <div><h1 className="text-xl sm:text-2xl font-bold">{isRtl ? 'ניהול לידים ו-CRM' : 'Client CRM & Quotes'}</h1><p className="text-sm text-slate-500 mt-1">{isRtl ? 'בקשות שמורות במערכת' : 'Requests saved in the database'}</p></div>
              <form className="flex flex-wrap gap-3 items-end" onSubmit={e => { e.preventDefault(); setRequestOffset(0); setRequestSearch(requestSearchInput.trim()); }}>
                <label className="flex flex-col gap-1 text-sm font-semibold">{isRtl ? 'חיפוש לפי לקוח, חברה, דוא״ל או דגם' : 'Search customer, company, email or model'}<input maxLength={200} className="rounded border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2" value={requestSearchInput} onChange={e => setRequestSearchInput(e.target.value)} /></label>
                <label className="flex flex-col gap-1 text-sm font-semibold">{isRtl ? 'סינון לפי סטטוס' : 'Filter by status'}<select className="rounded border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2" value={requestFilter} onChange={e => { setRequestOffset(0); setRequestFilter(e.target.value); }}><option value="all">{isRtl ? 'הכול' : 'All'}</option><option value="new">{statusLabel('new')}</option><option value="reviewed">{statusLabel('reviewed')}</option><option value="closed">{statusLabel('closed')}</option></select></label>
                <label className="flex flex-col gap-1 text-sm font-semibold">{isRtl ? 'סינון לפי התראת דוא״ל' : 'Filter by email notification'}<select className="rounded border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2" value={notificationFilter} onChange={e => { setRequestOffset(0); setNotificationFilter(e.target.value); }}><option value="all">{isRtl ? 'הכול' : 'All'}</option><option value="pending">{isRtl ? 'ממתינה לאישור' : 'Pending confirmation'}</option><option value="failed">{isRtl ? 'שליחה נכשלה' : 'Failed'}</option><option value="sent">{isRtl ? 'התקבלה בשרת הדוא״ל' : 'Accepted by mail server'}</option></select></label>
                {canInventory&&<label className="flex flex-col gap-1 text-sm font-semibold">{isRtl?'סינון לפי ציוד':'Filter by equipment'}<select className="rounded border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2" value={equipmentFilter} onChange={e=>{setRequestOffset(0);setEquipmentFilter(e.target.value);}}><option value="all">{isRtl?'כל ההזמנות':'All orders'}</option><option value="any">{isRtl?'ציוד משויך או חלופי':'Any active equipment'}</option><option value="reserved">{isRtl?'ציוד משוריין':'Reserved equipment'}</option><option value="issued">{isRtl?'ציוד שנמסר':'Issued equipment'}</option><option value="replacements">{isRtl?'חלופיים שטרם הוחזרו':'Replacements outstanding'}</option></select></label>}
                <button className="rounded bg-blue-600 text-white font-semibold px-4 py-2" type="submit">{isRtl ? 'חיפוש' : 'Search'}</button>
              </form>
              {requestState === 'loading' && <p role="status">{isRtl ? 'טוען בקשות...' : 'Loading requests...'}</p>}
              {requestState === 'error' && <div role="alert"><span>{isRtl ? 'לא ניתן לטעון בקשות.' : 'Unable to load requests.'}</span> <button className="underline" onClick={() => setReloadKey(n => n + 1)}>{isRtl ? 'נסה שוב' : 'Retry'}</button></div>}
              {requestState === 'ready' && <p className="text-sm text-slate-500">{isRtl ? 'תוצאות' : 'Results'}: {requestTotal}</p>}
              {requestState === 'ready' && savedRequests.length === 0 && <p>{isRtl ? 'לא נמצאו בקשות.' : 'No requests found.'}</p>}
              {statusNotSubmitted && <p role="alert" className="text-red-600"><bdi>{statusNotSubmitted}</bdi> · {isRtl?'לא ניתן לשמור אזהרה בדפדפן. העדכון לא נשלח.':'Could not retain a warning in this browser. The update was not submitted.'}</p>}{statusStorageUnavailable && <p role="alert" className="text-red-600">{isRtl ? 'לא ניתן לשמור את האזהרות בכרטיסייה. בדקו את ההזמנות לפני רענון או יציאה.' : 'Warnings could not be retained in this tab. Check the orders before refreshing or leaving.'}</p>}{Object.entries(statusErrors).map(([id,kind]) => <p key={id} role="alert" className="text-red-600"><bdi>{id}</bdi> · {kind==='conflict' ? (isRtl ? 'הסטטוס השתנה במקום אחר. הרשימה מתרעננת.' : 'Status changed elsewhere. The list is refreshing.') : (isRtl ? 'השמירה לא אומתה. הרשימה מתרעננת; בדקו את המצב לפני ניסיון נוסף.' : 'Save not confirmed. The list is refreshing; check the status before retrying.')} <button className="underline" onClick={() => setReloadKey(n => n + 1)}>{isRtl ? 'רענון' : 'Refresh'}</button> <button className="underline ms-2" disabled={statusSaving.has(id)||boardSaving} onClick={() => setStatusProblem(id,null)}>{isRtl ? 'סגירה' : 'Dismiss'}</button></p>)}
              {requestState === 'ready' && savedRequests.map(r => <article key={r.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-2 text-sm">
                <div className="flex justify-between gap-3 flex-wrap"><strong>{r.tariff_snapshot_json.kind === 'order' ? (isRtl ? 'הזמנה · ' : 'Order · ') : (isRtl ? 'בקשה קודמת · ' : 'Earlier request · ')}{r.tariff_snapshot_json.quote&&!validStoredOrderLines(r) ? (isRtl?'פרטי ההזמנה אינם תקינים':'Order item data is inconsistent') : Array.isArray(r.tariff_snapshot_json.quote?.items) && r.tariff_snapshot_json.quote.items.length > 1 ? <>{r.tariff_snapshot_json.quote.items.length} {isRtl ? 'פריטי הזמנה' : 'order items'}</> : <><bdi>{r.product_snapshot_json.model}</bdi> · {r.quantity} · {r.tariff_snapshot_json.mode}</>}</strong><span className="text-xs text-slate-500">{new Date(r.created_at).toLocaleString()}</span></div>
                <p>{r.contact_json.companyName} · {r.contact_json.contactName}</p><p><bdi>{r.contact_json.email} · {r.contact_json.phone}</bdi></p>{r.inventory_summary&&(r.inventory_summary.reserved+r.inventory_summary.issued+r.inventory_summary.replacements>0)&&<p className="text-sm">{isRtl?'ציוד בהזמנה':'Order equipment'}: {isRtl?'משוריין':'Reserved'} {r.inventory_summary.reserved} · {isRtl?'נמסר':'Issued'} {r.inventory_summary.issued} · {isRtl?'חלופי שטרם הוחזר':'Replacements outstanding'} {r.inventory_summary.replacements}</p>}
                <label className="flex items-center gap-2 font-semibold">{isRtl ? 'סטטוס' : 'Status'} <select className="rounded border border-slate-300 bg-white dark:bg-slate-900 px-3 py-2" value={r.status} disabled={statusSaving.has(r.id)||!!statusErrors[r.id]} onChange={e => changeStatus(r, e.target.value)}><option value="new">{statusLabel('new')}</option><option value="reviewed">{statusLabel('reviewed')}</option><option value="closed">{statusLabel('closed')}</option></select></label>
                <RequestStatusHistory requestId={r.id} lang={lang} initial={r.status_history} hasMore={r.status_history_has_more} statusLabel={statusLabel} />
                <RequestCompany lang={lang} requestId={r.id} organizationId={r.organization_id} organizationName={r.organization_name} version={r.organization_link_version} history={r.organization_history} historyHasMore={r.organization_history_has_more} onChanged={()=>setReloadKey(n=>n+1)}/>
                <RequestCustomer lang={lang} id={r.id} userId={r.customer_user_id} email={r.customer_email} version={r.customer_link_version} history={r.customer_history} historyHasMore={r.customer_history_has_more} onChanged={()=>setReloadKey(n=>n+1)}/>
                {fullAdmin&&<RequestDealer id={r.id} lang={lang}/>}
                <RequestNotes lang={lang} account={adminEmail} requestId={r.id}/>
                <RequestNotification lang={lang} id={r.id} status={r.notification_status} attempts={r.notification_attempts} resolutions={r.notification_resolutions} attemptsHasMore={r.notification_attempts_has_more} resolutionsHasMore={r.notification_resolutions_has_more} onChanged={()=>setReloadKey(n=>n+1)}/>
                {canContracts && <RequestContracts lang={lang} account={adminEmail} requestId={r.id} onManage={()=>{setContractTargetId('');setContractOrderId(r.id);setActiveTab('contracts');}} onOpen={id=>{setContractTargetId(id);setContractOrderId(r.id);setActiveTab('contracts');}}/>}
                {canFinance && <RequestFinance lang={lang} requestId={r.id} onShowRecords={id=>{setFinanceUndated(false);setFinanceOrderId(id);setActiveTab('ledger');}}/>}
                {canService && <RequestService lang={lang} requestId={r.id} onOpen={id=>{setServiceAssetId('');setServiceSearch(id);setServiceReplacement('all');setActiveTab('service');}}/>}
                {canInventory && <RequestInventory lang={lang} requestId={r.id} account={adminEmail}/>}
                {r.contact_json.city && <p>{r.contact_json.city}</p>}{r.contact_json.notes && <p>{r.contact_json.notes}</p>}
                {r.tariff_snapshot_json.quote && (validStoredOrderLines(r) ? <div className="space-y-1">{r.tariff_snapshot_json.quote.items.map((item, i) => <div key={i}><p><bdi>{r.product_snapshot_json.quoteProducts?.[i]?.model}</bdi>{r.product_snapshot_json.quoteProducts?.[i]?.sku&&<> · {isRtl?'מק״ט':'SKU'}: <bdi>{r.product_snapshot_json.quoteProducts[i].sku}</bdi></>} · {isRtl?'כמות':'Quantity'}: {item.quantity} · {item.mode}{item.mode==='short_rental'&&item.rentalDays!=null&&<> · {item.rentalDays} {isRtl?'ימים':'days'}</>}{item.mode==='lease'&&item.termMonths!=null&&<> · {item.termMonths} {isRtl?'חודשים':'months'}</>} · {typeof item.periodTotalMinor!=='number'||!Number.isFinite(item.periodTotalMinor)?(isRtl?'מחיר לפי בקשה':'Price on request'):`₪${(item.periodTotalMinor / 100).toLocaleString()} / ${item.period}`}</p><OrderTerms product={r.product_snapshot_json.quoteProducts?.[i]} lang={lang}/></div>)}{r.tariff_snapshot_json.quote.leasePlan&&<div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3 space-y-1"><p>{isRtl?'מסלול':'Plan'}: <bdi>{r.tariff_snapshot_json.quote.leasePlan.name}</bdi></p>{r.tariff_snapshot_json.quote.addons?.map(a=><p key={a.id}>{isRtl?a.nameHe:a.nameEn} · {a.quantity} · ₪{(a.totalMinor/100).toLocaleString()} / {a.billing}</p>)}<p>{isRtl?'סה״כ חודשי':'Monthly total'}: {r.tariff_snapshot_json.quote.monthlyMinor==null?(isRtl?'לפי בקשה':'On request'):<>₪{(r.tariff_snapshot_json.quote.monthlyMinor/100).toLocaleString()}</>}</p>{!!r.tariff_snapshot_json.quote.oneTimeMinor&&<p>{isRtl?'חד פעמי':'One time'}: ₪{(r.tariff_snapshot_json.quote.oneTimeMinor/100).toLocaleString()}</p>}</div>}<a className="underline text-sky-600" href={`/api/admin/requests/${r.id}/pdf?lang=${lang}`}>{isRtl ? 'הורדת PDF' : 'Download PDF'}</a></div> : <p role="alert" className="text-red-600">{isRtl?'נתוני פריטי ההזמנה אינם תואמים. בדקו את הרשומה לפני המשך.':'Order item data is inconsistent. Check the record before continuing.'}</p>)}
                <p className="text-xs text-slate-500">{isRtl ? 'שפת ההזמנה' : 'Order language'}: {r.tariff_snapshot_json.language === 'he' ? (isRtl ? 'עברית' : 'Hebrew') : r.tariff_snapshot_json.language === 'en' ? (isRtl ? 'אנגלית' : 'English') : (isRtl ? 'לא ידוע' : 'Unknown')} · {isRtl ? 'מקור' : 'Source'}: {r.tariff_snapshot_json.source === 'website' ? (isRtl ? 'אתר' : 'Website') : (isRtl ? 'לא ידוע' : 'Unknown')}</p><p className="text-xs text-slate-500">{isRtl?'מספר הזמנה':'Order number'}: <bdi>{r.order_number}</bdi> · <bdi>{r.id}</bdi> · {isRtl ? 'הודעת דוא״ל' : 'Email notification'}: {r.notification_status}{r.tariff_snapshot_json.quote ? null : <> · {typeof r.tariff_snapshot_json.price?.totalAmountMinor === 'number' && Number.isFinite(r.tariff_snapshot_json.price.totalAmountMinor) ? `₪${(r.tariff_snapshot_json.price.totalAmountMinor / 100).toLocaleString()} · ${r.tariff_snapshot_json.price.period}${r.tariff_snapshot_json.price.excludesVat === true ? (isRtl ? ' · בעבר לפני מע״מ' : ' · historical price excl. VAT') : ''}` : (isRtl ? 'מחיר לא אושר' : 'Price not confirmed')}</>}</p>
              </article>)}
              {requestState === 'ready' && (requestOffset > 0 || requestHasMore) && <nav className="flex gap-3" aria-label={isRtl ? 'עמודי בקשות' : 'Request pages'}><button type="button" disabled={requestOffset === 0} className="rounded border px-4 py-2 disabled:opacity-40" onClick={() => setRequestOffsetRaw(n => Math.max(0, n - 25))}>{isRtl ? 'הקודם' : 'Previous'}</button><span className="py-2">{Math.floor(requestOffset / 25) + 1}</span><button type="button" disabled={!requestHasMore} className="rounded border px-4 py-2 disabled:opacity-40" onClick={() => (()=>{const last=savedRequests.at(-1);if(last){setRequestCursors(old=>[...old.slice(0,requestOffset/25+1),last.id]);setRequestOffsetRaw(n=>n+25);}})()}>{isRtl ? 'הבא' : 'Next'}</button></nav>}
              </>}
            </section>
          ) : activeTab === 'kanban' ? <OrdersBoard lang={lang} statusErrors={statusErrors} storageUnavailable={statusStorageUnavailable} onSavingChange={setBoardSaving} onStatusProblem={setStatusProblem} onOpen={id=>{setCrmGroup('orders');setRequestSearchInput(id);setRequestSearch(id);setRequestFilter('all');setNotificationFilter('all');setEquipmentFilter('all');setRequestOffset(0);setActiveTab('crm');}}/> : activeTab === 'dashboard' ? <LiveDashboard lang={lang} onOpen={target=>{if(target==='inquiries'){setCrmGroup('inquiries');setActiveTab('crm');}else if(target==='catalog'){setCmsGroup('catalog');setActiveTab('cms');}else if(target==='service_replacements'){setServiceSearch('');setServiceAssetId('');setServiceReplacement('outstanding');setActiveTab('service');}else if(target==='service'){setServiceSearch('');setServiceAssetId('');setServiceReplacement('all');setActiveTab('service');}else if(target==='finance_undated'){setFinanceOrderId('');setFinanceUndated(true);setActiveTab('ledger');}else setActiveTab(target);}}/> : activeTab === 'ledger' ? <FinanceManagement key={financeOrderId+':'+financeUndated} onOpenOrder={canOrders ? id=>{if(!allowFinanceExit())return;setCrmGroup('orders');setRequestSearchInput(id);setRequestSearch(id);setRequestFilter('all');setNotificationFilter('all');setEquipmentFilter('all');setRequestOffset(0);setActiveTabState('crm');}:undefined} lang={lang} account={adminEmail} initialOrderId={financeOrderId} initialMissingDate={financeUndated} onUnprotectedChange={setUnprotectedFinance}/> : activeTab === 'contracts' ? <ContractDrafts key={contractOrderId+contractTargetId} initialContractId={contractTargetId} lang={lang} account={adminEmail} initialRequestId={contractOrderId} onUnprotectedChange={setUnprotectedContract} onOpenOrder={canOrders ? id=>{if(!allowContractExit())return;setCrmGroup('orders');setRequestSearchInput(id);setRequestSearch(id);setRequestFilter('all');setNotificationFilter('all');setEquipmentFilter('all');setRequestOffset(0);setActiveTabState('crm');} : undefined}/> : activeTab === 'service' ? <ServiceManagement key={serviceSearch+serviceAssetId+serviceReplacement} initialReplacement={serviceReplacement} lang={lang} onUnprotectedChange={setUnprotectedService} account={adminEmail} canReplace={canInventory} initialSearch={serviceSearch} assetId={serviceAssetId} initialAssetSerial={serviceAssetSerial} onOpenAsset={canInventory ? id=>{if(!allowServiceExit())return;setInventoryAssetId(id);setActiveTabState('inventory');}:undefined} onClearAsset={()=>{if(allowServiceExit())setServiceAssetId('');}} onOpenOrder={canOrders ? id=>{setCrmGroup('orders');setRequestSearchInput(id);setRequestSearch(id);setRequestFilter('all');setNotificationFilter('all');setEquipmentFilter('all');setRequestOffset(0);setActiveTab('crm');} : undefined}/> : activeTab === 'inventory' ? <InventoryWorkspace key={inventoryAssetId} initialAssetId={inventoryAssetId} onClearAsset={()=>{if(allowInventoryExit()&&allowPurchaseExit())setInventoryAssetId('');}} lang={lang} account={adminEmail} inventory={canInventory} purchase={canPurchase} onUnprotectedChange={setUnprotectedInventory} onPurchaseUnprotectedChange={setUnprotectedPurchase} onOpenOrder={canOrders ? id=>{setCrmGroup('orders');setRequestSearchInput(id);setRequestSearch(id);setRequestFilter('all');setNotificationFilter('all');setEquipmentFilter('all');setRequestOffset(0);setActiveTab('crm');} : undefined} onService={canService ? (id,serial)=>{setServiceSearch('');setServiceAssetSerial(serial);setServiceAssetId(id);setServiceReplacement('all');setActiveTab('service');} : undefined}/> : activeTab === 'users' ? <section className="space-y-5"><nav className="flex gap-2" aria-label={isRtl?'לקוחות ומשתמשים':'Customers and users'}><button type="button" onClick={()=>{if(allowProfileExit())setPeopleGroup('users');}} aria-current={peopleGroup==='users'?'page':undefined} className={`rounded-xl border px-4 py-2 font-semibold ${peopleGroup==='users'?'bg-blue-600 text-white':''}`}>{isRtl?'משתמשים':'Users'}</button><button type="button" onClick={()=>{if(allowProfileExit())setPeopleGroup('companies');}} aria-current={peopleGroup==='companies'?'page':undefined} className={`rounded-xl border px-4 py-2 font-semibold ${peopleGroup==='companies'?'bg-blue-600 text-white':''}`}>{isRtl?'חברות':'Companies'}</button><button type="button" onClick={()=>{if(allowProfileExit())setPeopleGroup('roles');}} aria-current={peopleGroup==='roles'?'page':undefined} className={`rounded-xl border px-4 py-2 font-semibold ${peopleGroup==='roles'?'bg-blue-600 text-white':'bg-white dark:bg-slate-800'}`}>{isRtl?'תפקידים':'Roles'}</button></nav>{peopleGroup==='roles'&&<AccessRoles lang={lang} onUnprotectedChange={setUnprotectedProfile}/>}<div hidden={peopleGroup!=='users'}><UserManagement key={peopleSearch} lang={lang} initialSearch={peopleSearch} onUnprotectedChange={setUnprotectedProfile}/></div><div hidden={peopleGroup!=='companies'}><Organizations onUnprotectedChange={setUnprotectedCompany} lang={lang} account={adminEmail} onOpenUser={id=>{if(id!==peopleSearch&&!allowProfileExit())return;setPeopleSearch(id);setPeopleGroup('users');}} onOpenOrder={id=>{setCrmGroup('orders');setRequestSearchInput(id);setRequestSearch(id);setRequestFilter('all');setNotificationFilter('all');setEquipmentFilter('all');setRequestOffset(0);setActiveTab('crm');}}/></div></section> : activeTab === 'cms' ? <section>
            <h1 className="text-xl sm:text-2xl font-bold mb-2">{cmsGroup === 'home' ? (isRtl ? 'עמוד הבית' : 'Home page') : cmsGroup === 'catalog' ? (isRtl ? 'קטלוג ומוצרים' : 'Catalog & products') : cmsGroup === 'about' ? (isRtl ? 'עמוד אודות' : 'About page') : cmsGroup === 'footer' ? (isRtl ? 'תחתית האתר' : 'Footer') : cmsGroup === 'navigation' ? (isRtl ? 'תפריט האתר' : 'Navigation') : (isRtl ? 'יצירת קשר' : 'Contact page')}</h1>
            {cmsGroup === 'home' && <nav aria-label={isRtl ? 'אזורי עמוד הבית' : 'Home page sections'} className="flex flex-wrap gap-2 my-5">
              {([['layout','סדר האזורים','Section order'],['hero','תמונה ראשית','Main banner'],['trust','מה כלול בליסינג','Lease benefits'],['featured','נבחרת דגמים','Featured models'],['calculator','מחשבון','Calculator'],['workspace','סביבת עבודה','Workspace'],['story','איך זה עובד','How it works'],['faq','שאלות נפוצות','FAQ']] as const).map(([id, he, en]) => <button key={id} type="button" onClick={() => setHomeSection(id)} aria-current={homeSection === id ? 'page' : undefined} className={`px-3 py-2 rounded-lg text-sm font-semibold border ${homeSection === id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-[var(--bg-surface)] border-[var(--border-line)] text-[var(--text-primary)]'}`}>{isRtl ? he : en}</button>)}
            </nav>}
            <div hidden={cmsGroup !== 'home' || homeSection !== 'layout'}><HomeLayoutManagement lang={lang} onSaved={onInfoChanged} onDirtyChange={updateSectionDirty} /></div>
            <div className="mt-4" hidden={!canContent || cmsGroup !== 'home' || homeSection !== 'hero'}><HeroManagement onDirtyChange={updateSectionDirty} lang={lang} onSaved={onHeroSaved} /></div>
            <div hidden={cmsGroup !== 'home' || homeSection !== 'trust'}><TrustManagement onDirtyChange={updateSectionDirty} lang={lang} onSaved={onTrustSaved} /></div>
            <div hidden={cmsGroup !== 'home' || homeSection !== 'featured'}><SectionManagement onDirtyChange={updateSectionDirty} section="featured" lang={lang} onSaved={block => onFeaturedSaved(block as unknown as FeaturedBlock)} /></div>
            <div hidden={cmsGroup !== 'home' || homeSection !== 'calculator'}><SectionManagement onDirtyChange={updateSectionDirty} section="calculator" lang={lang} onSaved={onInfoChanged} /></div>
            <div hidden={cmsGroup !== 'home' || homeSection !== 'workspace'}><SectionManagement onDirtyChange={updateSectionDirty} section="workspace" lang={lang} onSaved={block => onWorkspaceSaved(block as unknown as WorkspaceBlock)} /></div>
            <div hidden={cmsGroup !== 'home' || homeSection !== 'story'}><SectionManagement onDirtyChange={updateSectionDirty} section="story" lang={lang} onSaved={block => onStorySaved(block as unknown as StoryBlock)} /></div>
            <div hidden={cmsGroup !== 'home' || homeSection !== 'faq'}><SectionManagement onDirtyChange={updateSectionDirty} section="faq" lang={lang} onSaved={block => onFaqSaved(block as unknown as FAQBlock)} /></div>
            <div hidden={cmsGroup !== 'catalog'}>{canCatalog && <><nav className="flex gap-2 my-5"><button type="button" className="rounded-xl border px-4 py-2" onClick={()=>{if(allowSectionsExit())setCatalogSection('products');}}>{isRtl?'מחשבים':'Computers'}</button><button type="button" className="rounded-xl border px-4 py-2" onClick={()=>{if(allowSectionsExit())setCatalogSection('plans');}}>{isRtl?'מסלולים ושירותים':'Plans & services'}</button></nav><div hidden={catalogSection!=='products'}><ProductManagement onDirtyChange={updateSectionDirty} lang={lang} onSaved={onCatalogChanged} /></div>{catalogSection==='plans'&&<LeaseSettings lang={lang} onDirtyChange={updateSectionDirty} onCatalogChanged={onCatalogChanged}/>}</>}</div>
            <div hidden={cmsGroup !== 'about'}><SectionManagement onDirtyChange={updateSectionDirty} section="about" lang={lang} onSaved={onInfoChanged} /></div>
            <div hidden={cmsGroup !== 'contact'}><SectionManagement onDirtyChange={updateSectionDirty} section="contact" lang={lang} onSaved={onInfoChanged} /></div>
            <div hidden={cmsGroup !== 'footer'}><SectionManagement onDirtyChange={updateSectionDirty} section="footer" lang={lang} onSaved={onInfoChanged} /></div>
            <div hidden={cmsGroup !== 'navigation'}><SectionManagement onDirtyChange={updateSectionDirty} section="navigation" lang={lang} onSaved={onInfoChanged} /></div>
          </section> : activeTab === 'schemas' ? <DatabaseSchema lang={lang}/> : activeTab === 'dealers' && fullAdmin ? <Dealers onUnprotectedChange={setUnprotectedDealer} lang={lang} account={adminEmail} onOpenOrder={id=>{setCrmGroup('orders');setRequestSearchInput(id);setRequestSearch(id);setRequestFilter('all');setNotificationFilter('all');setEquipmentFilter('all');setRequestOffset(0);setActiveTab('crm');}}/> : <>
            <div role="status" className="mb-5 rounded-lg border border-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 text-sm text-amber-900 dark:text-amber-200">{isRtl ? 'תצוגת הדגמה בלבד — נתונים ופעולות עדיין לא מחוברים.' : 'Demo preview only — data and actions are not connected yet.'}</div>
            <div inert aria-label={isRtl ? 'תצוגת הדגמה' : 'Demo preview'}>
          {/* TAB: PHYSICAL INVENTORY */}
          {String(activeTab) === 'inventory' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider font-mono">
                    <Package className="w-4 h-4" />
                    <span>Physical Serial Number Tracking (ТЗ Section 9 & 28)</span>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {isRtl ? 'מחסן ומספרים סידוריים (Assets)' : 'Physical Inventory Fleet'}
                  </h1>
                </div>

                <button
                  onClick={() => setIsNewAssetModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRtl ? 'קליטת סריאל חדש למחסן' : 'Intake New Serial Number'}</span>
                </button>
              </div>

              {/* Hardware List Table */}
              <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px] uppercase">
                    <tr>
                      <th className="p-3 text-start">Serial Number</th>
                      <th className="p-3 text-start">Model & Grade</th>
                      <th className="p-3 text-start">Status</th>
                      <th className="p-3 text-start">Supplier Cost</th>
                      <th className="p-3 text-start">Supplier Warranty End</th>
                      <th className="p-3 text-end">A06/A07 Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                    {assets.map((asset) => {
                      const warrantyEval = evaluateWarrantyRouting(asset.supplier.warrantyEndDate);
                      return (
                        <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <QrCode className="w-3.5 h-3.5 text-slate-400" />
                              <span>{asset.serialNumber}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-normal">
                              Loc: {asset.warehouseLocation}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{asset.modelName}</div>
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-300 font-mono">
                              Grade {asset.grade}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                asset.status === 'rented'
                                  ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                                  : asset.status === 'available'
                                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {asset.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                            ₪{asset.supplier.purchaseCostILS}
                          </td>
                          <td className="p-3 font-mono">
                            <div
                              className={`font-semibold ${
                                warrantyEval.isSupplierWarrantyActive
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {asset.supplier.warrantyEndDate}
                            </div>
                          </td>
                          <td className="p-3 text-end">
                            <button
                              onClick={() => setSelectedAssetForWarrantyCheck(asset)}
                              className="px-2.5 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium transition-colors cursor-pointer"
                            >
                              {isRtl ? 'בדוק כיסוי' : 'Inspect'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: CONTRACTS */}
          {String(activeTab) === 'contracts' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider font-mono">
                  <FileText className="w-4 h-4" />
                  <span>Immutable Contracts & E-Signatures (ТЗ Section 10 & 11)</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {isRtl ? 'מאגר חוזים וחתימות דיגיטליות' : 'Contract Lifecycle & OTP Verification'}
                </h1>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {contracts.map((cnt) => (
                  <div
                    key={cnt.id}
                    className="p-5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-bold text-violet-600 dark:text-violet-400">
                            {cnt.contractNumber}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-mono font-bold">
                            {cnt.state.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                          {cnt.organizationName} (ח.פ {cnt.taxId})
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {cnt.state === 'awaiting_signature' && (
                          <button
                            onClick={() => handleSimulateContractSignature(cnt.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <FileCheck2 className="w-3.5 h-3.5" />
                            <span>{isRtl ? 'הדמיית חתימת OTP של הלקוח' : 'Simulate OTP E-Sign'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Contract Details Body */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="text-slate-500 dark:text-slate-400">מורשה חתימה:</div>
                        <div className="font-semibold text-slate-900 dark:text-white">{cnt.signatoryName}</div>
                        <div className="text-slate-500">{cnt.signatoryPhone}</div>
                      </div>

                      <div>
                        <div className="text-slate-500 dark:text-slate-400">תקופה ותאריכים:</div>
                        <div className="font-semibold text-slate-900 dark:text-white">{cnt.termMonths} חודשי שכירות</div>
                        <div className="font-mono text-slate-500">{cnt.startDate} עד {cnt.endDate}</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="text-slate-500 dark:text-slate-400">Pricing Snapshot (נעול):</div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          ₪{cnt.pricingSnapshot.monthlyRateBeforeVatILS} + מע״מ = ₪{cnt.pricingSnapshot.monthlyRateTotalILS}/חודש
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          אופציית выкуп: ₪{cnt.pricingSnapshot.buyoutOptionPriceILS}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: SERVICE */}
          {String(activeTab) === 'service' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-500 dark:text-rose-400 uppercase tracking-wider font-mono">
                  <Wrench className="w-4 h-4" />
                  <span>Service Routing & SLA Protection (ТЗ Section 15 & 30)</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {isRtl ? 'קריאות שירות וניתוב תיקונים' : 'Service Tickets & SLA Engine'}
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tickets.map((tck) => (
                  <div
                    key={tck.id}
                    className="p-5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-rose-500 dark:text-rose-400">
                        {tck.ticketNumber}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                        {tck.status}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm">{tck.organizationName}</div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      Serial: <span className="font-mono text-slate-900 dark:text-white font-bold">{tck.assetSerialNumber}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: USERS & RBAC (§ 4 & § 29) */}
          {String(activeTab) === 'users' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider font-mono">
                    <Users className="w-4 h-4" />
                    <span>Role-Based Access Control (§ 4 & § 29 ТЗ)</span>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {isRtl ? 'ניהול משתמשים והרשאות מערכת' : 'Users & Access Control'}
                  </h1>
                </div>

                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRtl ? 'הוספת משתמש חדש' : 'Add New User'}</span>
                </button>
              </div>

              <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-mono">
                    <tr>
                      <th className="p-3 text-start">{isRtl ? 'שם ומשתמש' : 'User'}</th>
                      <th className="p-3 text-start">{isRtl ? 'תפקיד' : 'Role'}</th>
                      <th className="p-3 text-start">{isRtl ? 'הרשאות רגישות' : 'Key Permissions'}</th>
                      <th className="p-3 text-start">{isRtl ? 'סטטוס' : 'Status'}</th>
                      <th className="p-3 text-end">{isRtl ? 'פעולות' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">{u.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {u.permissions.canViewSupplierCosts && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                                עלויות רכש
                              </span>
                            )}
                            {u.permissions.canOverridePricing && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                שינוי מחיר
                              </span>
                            )}
                            {u.permissions.canIssueRefunds && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                                זיכויים
                              </span>
                            )}
                            {u.permissions.canExportData && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                ייצוא
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-500/15 text-red-600 dark:text-red-400'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3 text-end">
                          <button
                            onClick={() => handleToggleUserStatus(u.id)}
                            className="px-2 py-1 rounded text-[11px] font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-300"
                          >
                            {u.status === 'active' ? (isRtl ? 'השעה' : 'Suspend') : (isRtl ? 'הפעל' : 'Activate')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'dealers' && fullAdmin && <Dealers lang={lang} account={adminEmail} onOpenOrder={id=>{setCrmGroup('orders');setRequestSearchInput(id);setRequestSearch(id);setRequestFilter('all');setNotificationFilter('all');setEquipmentFilter('all');setRequestOffset(0);setActiveTab('crm');}}/>}
            </div>
          </>}
        </main>
      </div>

      {/* MODAL: ADD USER */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isRtl ? 'הוספת משתמש / עובד חדש' : 'Add New User'}
              </h3>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">
                  {isRtl ? 'שם מלא' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="ישראל ישראלי"
                  value={newUserFullName}
                  onChange={(e) => setNewUserFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Email:</label>
                <input
                  type="email"
                  required
                  placeholder="name@pc-lease.co.il"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Phone:</label>
                <input
                  type="tel"
                  placeholder="+972-50-XXXXXXX"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">
                  {isRtl ? 'תפקיד במערכת (Role)' : 'Role'}
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as RoleCode)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="sales_manager">Sales Manager (מנהל מכירות)</option>
                  <option value="warehouse_operator">Warehouse Operator (מחסנאי)</option>

                  <option value="finance_manager">Finance Manager (כספים ובילינג)</option>
                  <option value="service_technician">Service Technician (טכנאי מעבדה)</option>
                  <option value="dealer">Dealer (דילר שותף)</option>
                  <option value="company_admin">Company Admin (שותף / מנהל חברה)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-medium"
                >
                  {isRtl ? 'ביטול' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  {isRtl ? 'צור משתמש' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW ASSET INTAKE */}
      {isNewAssetModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isRtl ? 'קליטת מספר סידורי חדש למחסן' : 'Intake New Serial Number'}
              </h3>
              <button
                onClick={() => setIsNewAssetModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAsset} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-mono">
                  {isRtl ? 'מספר סידורי של המכשיר (Serial Number)' : 'Hardware Serial Number'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PF-99AX12-IL"
                  value={newAssetSerial}
                  onChange={(e) => setNewAssetSerial(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">
                  {isRtl ? 'דגם המכשיר' : 'Hardware Model'}
                </label>
                <select
                  value={newAssetModel}
                  onChange={(e) => setNewAssetModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Lenovo ThinkPad X1 Carbon Gen 9">
                    Lenovo ThinkPad X1 Carbon Gen 9 (i7/16GB/512GB)
                  </option>
                  <option value="Dell Latitude 7420">
                    Dell Latitude 7420 (i7/16GB/512GB)
                  </option>
                  <option value="HP EliteBook 840 G8">
                    HP EliteBook 840 G8 (i5/16GB/256GB)
                  </option>
                  <option value="HP ProDesk Mini 400 G6">
                    HP ProDesk Mini 400 G6 (i5/16GB/512GB)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">
                    {isRtl ? 'עלות רכש ספק (₪)' : 'Supplier Cost (ILS)'}
                  </label>
                  <input
                    type="number"
                    value={newAssetCost}
                    onChange={(e) => setNewAssetCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Grade</label>
                  <select
                    value={newAssetGrade}
                    onChange={(e) => setNewAssetGrade(e.target.value as HardwareGrade)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="A+">Grade A+ (כחדש)</option>
                    <option value="A">Grade A (מצוין)</option>
                    <option value="B">Grade B (סימני שימוש קלים)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewAssetModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                >
                  {isRtl ? 'ביטול' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-xs cursor-pointer"
                >
                  {isRtl ? 'קלוט למלאי' : 'Check Into Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
