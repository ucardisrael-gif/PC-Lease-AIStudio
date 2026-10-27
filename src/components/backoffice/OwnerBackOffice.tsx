import React, { useState } from 'react';
import {
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

interface OwnerBackOfficeProps {
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
  lang,
  theme,
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

  // Navigation state
  const [activeTab, setActiveTab] = useState<BackOfficeTab>('dashboard');

  // Interactive Live Data State
  const [quotesList, setQuotesList] = useState<QuoteRequest[]>(quotes || SEEDED_QUOTES);
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
  const pendingQuotesCount = quotesList.filter(
    (q) => q.status === 'pending' || q.status === 'pending_review'
  ).length;

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
            <span>{isRtl ? 'Back Office · ניהול בעלים' : 'Back Office · Owner Control'}</span>
          </div>

          <div className="hidden lg:flex items-center text-xs text-slate-500 dark:text-slate-400 gap-2 border-s border-slate-200 dark:border-slate-800 ps-3">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {CURRENT_OWNER_USER.fullName}
            </span>
            <span className="text-slate-500">({CURRENT_OWNER_USER.email})</span>
            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-mono">
              company_admin · Phase 1
            </span>
          </div>
        </div>

        {/* Toolbar: Language & Theme Switchers, Live Notification & Close */}
        <div className="flex items-center gap-2 sm:gap-3">
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
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <span>{isRtl ? 'חזרה לאתר' : 'Exit Admin'}</span>
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE WITH SIDEBAR */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <aside
          className={`w-64 shrink-0 border-e p-3 flex flex-col gap-1 overflow-y-auto transition-colors ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
            {isRtl ? 'מודולי ניהול ובקרה' : 'Control Modules'}
          </div>

          <button
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
              {pendingQuotesCount > 0 ? (
                <span className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded font-mono animate-pulse">
                  {pendingQuotesCount} {isRtl ? 'ממתין' : 'pending'}
                </span>
              ) : (
                <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-300 px-1.5 py-0.2 rounded font-mono">
                  {quotesList.length}
                </span>
              )}
            </div>
          </button>

          {/* CMS & Content Management */}
          <button
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
                Live
              </span>
            </div>
          </button>

          {/* Users & RBAC */}
          <button
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
              <span>{isRtl ? 'משתמשים והרשאות RBAC' : 'Users & RBAC'}</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 dark:text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                {usersList.length}
              </span>
            </div>
          </button>

          <button
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
              <span>{isRtl ? 'קנבן הזמנות ומצבים' : 'Orders & State Machines'}</span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-400 dark:text-cyan-300 px-1.5 py-0.2 rounded font-mono">
                {orders.length}
              </span>
            </div>
          </button>

          <button
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
                {assets.length}
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('contracts')}
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
              <span>{isRtl ? 'חוזים וחתימת OTP' : 'Contracts & E-Sign'}</span>
              <span className="text-[10px] bg-violet-500/20 text-violet-400 dark:text-violet-300 px-1.5 py-0.2 rounded font-mono">
                {contracts.length}
              </span>
            </div>
          </button>

          <button
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
                {ledger.length}
              </span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('service')}
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
                {tickets.length}
              </span>
            </div>
          </button>

          <button
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
              <span>{isRtl ? 'משתמשים והרשאות RBAC' : 'Users & Access Control'}</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 dark:text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                {usersList.length}
              </span>
            </div>
          </button>

          <button
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
                {dealers.length}
              </span>
            </div>
          </button>
        </aside>

        {/* Content Pane */}
        <main
          className={`flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 transition-colors ${
            isDark ? 'bg-slate-900/90' : 'bg-slate-50/90'
          }`}
        >
          {/* TAB: CLIENT CRM */}
          {activeTab === 'crm' && (
            <ClientCrmView
              lang={lang}
              theme={theme}
              quotes={quotesList}
              products={draftProducts}
              assets={assets}
              contracts={contracts}
              onUpdateQuotes={handleUpdateQuotes}
              onUpdateContracts={setContracts}
              onUpdateAssets={setAssets}
              onNavigateToContractsTab={() => setActiveTab('contracts')}
              onShowToast={showToast}
            />
          )}

          {/* TAB: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isRtl ? 'פאנל שותפים ובעלי החברה' : 'Executive Owner Cockpit'}</span>
                </div>
                <h1 className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                  {isRtl ? 'תמונת מצב עסקית ותפעולית' : 'Operational & Business Health Overview'}
                </h1>
                <p className="text-sm mt-0.5 text-slate-600 dark:text-slate-400">
                  {isRtl
                    ? 'נתונים חיים על פי מודל ТЗ v1.0: הפרדת נכסים פיזיים, מחזור חודשי, מצב אחריות ספקים וחשבונות פתוחים.'
                    : 'Live metrics per ТЗ v1.0: Physical asset utilization, leasing MRR, supplier warranty exposure, and audited ledger balance.'}
                </p>
              </div>

              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {isRtl ? 'הכנסה חודשית מליסינג (MRR)' : 'Active Monthly Lease MRR'}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
                    ₪{totalMRR.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>{isRtl ? 'לפני מע״מ 17%' : 'Excl. 17% Israel VAT'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {isRtl ? 'ניצולת חומרה במחסן' : 'Hardware Fleet Utilization'}
                  </div>
                  <div className="text-2xl font-bold text-amber-500 dark:text-amber-400 font-mono">
                    {utilizationRate}%
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isRtl
                      ? `${rentedAssetsCount} מושכרים מתוך ${totalAssetsCount} סריאלים רשומים`
                      : `${rentedAssetsCount} rented of ${totalAssetsCount} serialized assets`}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {isRtl ? 'חוב בפיגור אמיתי (Overdue Debt)' : 'Audited Overdue Debt'}
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    ₪{financialSummary.overdueDebtILS.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isRtl
                      ? 'לפי סעיף 12: חוב על חיובים שהגיע מועדם בלבד'
                      : 'Per Sec 12: Overdue installments only, not future 36m'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {isRtl ? 'חשיפת אחריות ספק (A06/A07)' : 'Supplier Warranty Exposure'}
                  </div>
                  <div className="text-2xl font-bold font-mono text-rose-500 dark:text-rose-400">
                    {assets.filter((a) => new Date(a.supplier.warrantyEndDate) < new Date()).length}
                  </div>
                  <div className="text-[11px] text-rose-600/80 dark:text-rose-300/80">
                    {isRtl
                      ? 'מכשירים בהם תוקף הספק פג (עלות שירות ע״ח החברה)'
                      : 'Assets with expired supplier warranty (covered by Company SLA)'}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* TAB: CMS & SITE CONTENT MANAGEMENT */}

          {activeTab === 'cms' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-pink-500 dark:text-pink-400 uppercase tracking-wider font-mono">
                    <Edit3 className="w-4 h-4" />
                    <span>Full Site Content & Media CMS (ТЗ Section 5, 18, 20)</span>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {isRtl ? 'ניהול תוכן האתר, עמודים, בלוקים וגרפיקה' : 'Content Management System & Media'}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    {isRtl
                      ? 'שליטה מלאה בכותרות, תמונות מוצרים, נראות אזורים ופרסום מיידי לאתר החי.'
                      : 'Live editing of copy, hero texts, hardware images, section visibility and instant publish.'}
                  </p>
                </div>

                <button
                  onClick={handleSaveCMS}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isRtl ? 'פרסם שינויים באתר החי' : 'Publish Live to Website'}</span>
                </button>
              </div>

              {/* CMS Sub-tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                  onClick={() => setCmsTab('pages')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    cmsTab === 'pages'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isRtl ? 'טקסטים ובלוקים (Hero / Workspace)' : 'Pages & Section Blocks'}
                </button>
                <button
                  onClick={() => setCmsTab('products')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    cmsTab === 'products'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isRtl ? 'קטלוג מוצרים ומחירים' : 'Products & Pricing'}
                </button>
                <button
                  onClick={() => setCmsTab('media')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                    cmsTab === 'media'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isRtl ? 'ספריית תמונות ומדיה' : 'Hardware Media & Images'}
                </button>
              </div>

              {/* Sub-tab 1: Pages & Sections */}
              {cmsTab === 'pages' && (
                <div className="space-y-5">
                  {/* Section Visibility Toggles */}
                  <div className="p-5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">
                      {isRtl ? 'נראות בלוקים באתר הראשי' : 'Main Page Section Visibility'}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(draftContent.sectionsVisibility).map(([key, isVisible]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            handleToggleSectionVisibility(
                              key as keyof SiteContent['sectionsVisibility']
                            )
                          }
                          className={`p-3 rounded-lg border flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer ${
                            isVisible
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          <span className="capitalize">{key}</span>
                          {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hero Copy Editor */}
                  <div className="p-5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-mono">

                      {isRtl ? 'עריכת כותרות Hero (עברית ואנגלית)' : 'Hero Section Copy (HE & EN)'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-3">
                        <span className="text-blue-400 font-bold block">עברית (RTL Primary)</span>
                        <div>
                          <label className="block text-slate-400 mb-1">כותרת ראשית (עברית):</label>
                          <input
                            type="text"
                            value={draftContent.hero.titleHe}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                hero: { ...draftContent.hero, titleHe: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">כותרת מודגשת (עברית):</label>
                          <input
                            type="text"
                            value={draftContent.hero.titleAccentHe}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                hero: { ...draftContent.hero, titleAccentHe: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-amber-400 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">פסקת משנה (עברית):</label>
                          <textarea
                            rows={3}
                            value={draftContent.hero.subtitleHe}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                hero: { ...draftContent.hero, subtitleHe: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <span className="text-blue-400 font-bold block">English (LTR)</span>
                        <div>
                          <label className="block text-slate-400 mb-1">Main Title (EN):</label>
                          <input
                            type="text"
                            value={draftContent.hero.titleEn}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                hero: { ...draftContent.hero, titleEn: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Accent Title (EN):</label>
                          <input
                            type="text"
                            value={draftContent.hero.titleAccentEn}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                hero: { ...draftContent.hero, titleAccentEn: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-amber-400 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 mb-1">Subtitle (EN):</label>
                          <textarea
                            rows={3}
                            value={draftContent.hero.subtitleEn}
                            onChange={(e) =>
                              setDraftContent({
                                ...draftContent,
                                hero: { ...draftContent.hero, subtitleEn: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-tab 2: Products & Pricing */}
              {cmsTab === 'products' && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                    <table className="w-full text-start text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                        <tr>
                          <th className="p-3 text-start">Model</th>
                          <th className="p-3 text-start">Grade & Specs</th>
                          <th className="p-3 text-start">Monthly Lease (₪)</th>
                          <th className="p-3 text-start">Purchase Price (₪)</th>
                          <th className="p-3 text-start">Status</th>
                          <th className="p-3 text-end">Published</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {draftProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                            <td className="p-3 font-semibold text-white">
                              {p.title.he}
                              <span className="block text-[11px] text-slate-400 font-normal">
                                {p.title.en}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-slate-300">
                              {p.grade || 'A+'} · {p.ramGB}GB RAM · {p.storage.capacityGB}GB SSD
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-400">
                              <input
                                type="number"
                                value={p.leasePriceMonthly}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setDraftProducts(
                                    draftProducts.map((item) =>
                                      item.id === p.id ? { ...item, leasePriceMonthly: val } : item
                                    )
                                  );
                                }}
                                className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                              />
                            </td>
                            <td className="p-3 font-mono font-bold text-white">
                              <input
                                type="number"
                                value={p.purchasePrice}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setDraftProducts(
                                    draftProducts.map((item) =>
                                      item.id === p.id ? { ...item, purchasePrice: val } : item
                                    )
                                  );
                                }}
                                className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono"
                              />
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono">
                                {p.availability}
                              </span>
                            </td>
                            <td className="p-3 text-end">
                              <button
                                type="button"
                                onClick={() => handleToggleProductPublish(p.slug)}
                                className={`px-2.5 py-1 text-[11px] rounded font-bold transition-colors cursor-pointer ${
                                  p.published
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {p.published ? (isRtl ? 'פעיל' : 'Published') : (isRtl ? 'טיוטה' : 'Draft')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Media & Images */}
              {cmsTab === 'media' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {draftProducts.map((product) => (
                      <div
                        key={product.id}
                        className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                      >
                        <div className="h-40 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center p-3 overflow-hidden">
                          <img
                            src={product.imagePath}
                            alt={product.title.en}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>

                        <div>
                          <div className="text-xs font-bold text-white truncate">{product.title.he}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">{product.imagePath}</div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">
                              Image File Path:
                            </label>
                            <input
                              type="text"
                              value={product.imagePath}
                              onChange={(e) => {
                                const newPath = e.target.value;
                                setDraftProducts(
                                  draftProducts.map((p) =>
                                    p.id === product.id ? { ...p, imagePath: newPath } : p
                                  )
                                );
                              }}
                              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-[11px]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: USERS & RBAC PERMISSIONS MATRIX (ТЗ SECTION 4 & 29) */}
          {activeTab === 'users' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider font-mono">
                    <Users className="w-4 h-4" />
                    <span>Granular RBAC & User Administration (ТЗ Section 4 & 29)</span>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {isRtl ? 'ניהול משתמשים, תפקידים והרשאות' : 'User Accounts & RBAC Permissions Matrix'}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    {isRtl
                      ? 'הגדרת הרשאות פרטניות (חשיפת רווחיות, הנחות, החזר כספי, ניהול מחסן, חתימת חוזים) ומניעת חריגת סמכויות.'
                      : 'Granular permissions per user: view supplier margin, pricing override, refunds, warehouse, and export rights.'}
                  </p>
                </div>

                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isRtl ? 'הוספת משתמש / עובד חדש' : 'Add New User'}</span>
                </button>
              </div>

              {/* Users Table */}
              <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px] uppercase">
                    <tr>
                      <th className="p-3 text-start">User / Name</th>
                      <th className="p-3 text-start">Email & Phone</th>
                      <th className="p-3 text-start">Role</th>
                      <th className="p-3 text-start">Status</th>
                      <th className="p-3 text-start">Permissions Summary</th>
                      <th className="p-3 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                    {usersList.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {user.isOwner && <span>👑</span>}
                            <span>{user.fullName}</span>
                          </div>
                          {user.organizationName && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                              {user.organizationName}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                          <div>{user.email}</div>
                          <span className="text-[10px] text-slate-500">{user.phone}</span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              user.role === 'company_admin'
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                : user.role === 'sales_manager'
                                ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300'
                                : user.role === 'warehouse_operator'
                                ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                                : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(user.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                              user.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                : 'bg-rose-500/20 text-rose-700 dark:text-rose-400'
                            }`}
                          >
                            {user.status.toUpperCase()}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1 text-[9px] font-mono">
                            {user.permissions.canViewSupplierCosts && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">Costs</span>
                            )}
                            {user.permissions.canOverridePricing && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Discounts</span>
                            )}
                            {user.permissions.canIssueRefunds && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">Refunds</span>
                            )}
                            {user.permissions.canManageWarehouseAssets && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Warehouse</span>
                            )}
                            {user.permissions.canManageUsersAndRoles && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">RBAC</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-end">
                          <button
                            onClick={() => setSelectedUserForEdit(user)}
                            className="px-2.5 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-medium transition-colors cursor-pointer"
                          >
                            {isRtl ? 'הגדר הרשאות' : 'Edit RBAC'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Granular Permission Editor Modal */}
              {selectedUserForEdit && (
                <div className="p-5 rounded-xl bg-white dark:bg-slate-950 border border-indigo-500/40 shadow-lg space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-bold uppercase">
                        Section 29: Permission Matrix Configuration
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {isRtl ? `עריכת הרשאות עבור: ${selectedUserForEdit.fullName}` : `Edit Permissions for: ${selectedUserForEdit.fullName}`}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {selectedUserForEdit.email} ({selectedUserForEdit.role})
                      </span>
                    </div>

                    <button

                      onClick={() => setSelectedUserForEdit(null)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    {(Object.keys(selectedUserForEdit.permissions) as Array<keyof RolePermissions>).map(
                      (permKey) => {
                        const isGranted = selectedUserForEdit.permissions[permKey];
                        return (
                          <div
                            key={permKey}
                            className={`p-3 rounded-lg border flex items-center justify-between transition-colors ${
                              isGranted
                                ? 'bg-indigo-500/10 border-indigo-500/40 text-white'
                                : 'bg-slate-900 border-slate-800 text-slate-500'
                            }`}
                          >
                            <div>
                              <div className="font-semibold text-slate-200 text-[11px] font-mono">
                                {permKey}
                              </div>
                              <span className="text-[10px] text-slate-400 block">
                                {isGranted ? 'מותר (Granted)' : 'חסום (Denied by default)'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                handleToggleUserPermission(selectedUserForEdit.id, permKey);
                                setSelectedUserForEdit({
                                  ...selectedUserForEdit,
                                  permissions: {
                                    ...selectedUserForEdit.permissions,
                                    [permKey]: !isGranted,
                                  },
                                });
                              }}
                              className={`px-2.5 py-1 text-[10px] rounded font-bold transition-colors cursor-pointer ${
                                isGranted
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {isGranted ? 'ON' : 'OFF'}
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: SCHEMAS & ARCHITECTURE (ERD) */}
          {activeTab === 'schemas' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider font-mono">
                  <Database className="w-4 h-4" />
                  <span>PostgreSQL Modular Domain Schemas (ТЗ Sections 2, 5, 8, 9, 11, 12, 30)</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {isRtl ? 'סכמות הנתונים וגבולות המודולים' : 'Data Schemas, Entity Boundaries & ERD'}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  {isRtl
                    ? 'מבנה הטבלאות והחוקים הבלתי משתנים שהוגדרו ב-ТЗ. כל מודול בעל בעלות עצמאית על הנתונים.'
                    : 'Formal relational architecture and domain contracts. Each module owns its tables with strict foreign boundary rules.'}
                </p>
              </div>

              {/* Schema Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. Product vs Asset Decoupling */}
                <div className="p-5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                      DOMAIN: CATALOG vs ASSET INVENTORY
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 font-mono font-bold">
                      CONFIRMED (Sec 5 & 9)
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isRtl ? 'הפרדת דגם מסחרי מפריט פיזי' : 'ProductModel vs PhysicalAsset'}
                  </h3>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 space-y-1">
                    <div className="text-slate-500 dark:text-slate-400">// products table (Commercial catalog template)</div>
                    <div>id: UUID (PK)</div>
                    <div>sku: VARCHAR UNIQUE (e.g. "TP-X1-G9-A")</div>
                    <div>title_he, title_en: TEXT</div>
                    <div>base_lease_monthly_ils: NUMERIC(10,2)</div>
                    <div>base_sale_price_ils: NUMERIC(10,2)</div>
                    <div className="mt-2 text-slate-500 dark:text-slate-400">// physical_assets table (Specific hardware unit)</div>
                    <div>id: UUID (PK)</div>
                    <div>product_id: UUID (FK -&gt; products.id)</div>
                    <div className="text-amber-600 dark:text-amber-400 font-bold">serial_number: VARCHAR UNIQUE (Hardware SN)</div>
                    <div>supplier_purchase_cost_ils: NUMERIC(10,2)</div>
                    <div className="text-rose-600 dark:text-rose-400 font-bold">supplier_warranty_end_date: DATE (Hardware validity)</div>
                    <div>status: ENUM (received, QA, available, reserved, rented...)</div>
                    <div>warehouse_location: VARCHAR (e.g. "TLV-A-04")</div>
                  </div>
                </div>

                {/* 2. Decoupled State Machines */}
                <div className="p-5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
                      DOMAIN: WORKFLOW & STATE MACHINES
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-mono font-bold">
                      CONFIRMED (Sec 8)
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isRtl ? '4 מכונות מצבים בלתי תלויות' : '4 Fully Decoupled State Machines'}
                  </h3>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 space-y-1">
                    <div><span className="text-blue-600 dark:text-blue-400 font-bold">Order:</span> draft &rarr; confirmed &rarr; picking &rarr; QA &rarr; shipped &rarr; delivered</div>
                    <div><span className="text-violet-600 dark:text-violet-400 font-bold">Contract:</span> draft &rarr; awaiting_signature &rarr; signed &rarr; active &rarr; ended</div>
                    <div><span className="text-amber-600 dark:text-amber-400 font-bold">Asset:</span> available &rarr; reserved &rarr; picking &rarr; in_transit &rarr; rented</div>
                    <div><span className="text-emerald-600 dark:text-emerald-400 font-bold">Payment:</span> unbilled &rarr; paid_in_advance &rarr; current_ok &rarr; overdue</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: KANBAN ORDERS */}
          {activeTab === 'kanban' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider font-mono">
                    <Layers className="w-4 h-4" />
                    <span>Independent State Machines (ТЗ Section 8)</span>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {isRtl ? 'קנבן הזמנות ומצבי ביצוע' : 'Orders Kanban & Multi-State Engine'}
                  </h1>
                </div>
              </div>

              {/* Kanban Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {(['confirmed', 'procurement', 'picking', 'QA', 'delivered'] as OrderState[]).map(
                  (colState) => {
                    const colOrders = orders.filter((o) => o.state === colState);
                    return (
                      <div
                        key={colState}
                        className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs p-3 flex flex-col min-h-[480px]"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">
                            {colState}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold">
                            {colOrders.length}
                          </span>
                        </div>

                        <div className="space-y-3 flex-1">
                          {colOrders.map((order) => (
                            <div
                              key={order.id}
                              className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2 hover:border-slate-400 dark:hover:border-slate-700 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                                  {order.orderNumber}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                                  {order.type === 'b2b_lease' ? '36m Lease' : 'Purchase'}
                                </span>
                              </div>

                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {order.organizationName}
                              </div>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                                {order.customerName} · {order.items[0]?.quantity} יחידות
                              </div>

                              {/* 4 INDEPENDENT STATE CHIPS */}
                              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-2 gap-1 text-[10px] font-mono">
                                <div className="p-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                  <span className="text-slate-500 block text-[9px]">CONTRACT</span>
                                  <span className="text-violet-600 dark:text-violet-300 font-semibold">{order.contractState}</span>
                                </div>
                                <div className="p-1 rounded bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                  <span className="text-slate-500 block text-[9px]">PAYMENT</span>
                                  <span className="text-emerald-600 dark:text-emerald-300 font-semibold">{order.paymentState}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                  ₪{order.totalMonthlyILS}/חודש
                                </span>

                                <div className="flex items-center gap-1">
                                  {ORDER_ALLOWED_TRANSITIONS[order.state]?.map((target) => (
                                    <button
                                      key={target}
                                      onClick={() => handleAdvanceOrderStatus(order.id, target)}
                                      className="px-2 py-0.5 text-[10px] rounded bg-blue-50 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                                    >
                                      &rarr; {target}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}


          {/* TAB: PHYSICAL INVENTORY */}
          {activeTab === 'inventory' && (
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
          {activeTab === 'contracts' && (
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

          {/* TAB: LEDGER */}
          {activeTab === 'ledger' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono">
                  <DollarSign className="w-4 h-4" />
                  <span>Immutable Financial Ledger (ТЗ Section 12, 13, 30)</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {isRtl ? 'ספר פקודות יומן פיננסי בלתי ניתן לשינוי' : 'Append-Only Financial Ledger'}
                </h1>
              </div>

              <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px] uppercase">
                    <tr>
                      <th className="p-3 text-start">Timestamp</th>
                      <th className="p-3 text-start">Type</th>
                      <th className="p-3 text-start">Organization</th>
                      <th className="p-3 text-start">Reference / Invoice</th>
                      <th className="p-3 text-end">Amount (ILS)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                    {ledger.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{entry.timestamp.split('T')[0]}</td>
                        <td className="p-3 font-mono font-semibold">{entry.type}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">{entry.organizationName}</td>
                        <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{entry.reference}</td>
                        <td className="p-3 text-end font-mono font-bold text-slate-900 dark:text-white">
                          ₪{Math.abs(entry.amountILS).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: SERVICE */}
          {activeTab === 'service' && (
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
          {activeTab === 'users' && (
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

          {/* TAB: DEALERS NETWORK (§ 4, § 14, Acceptance Test A10) */}
          {activeTab === 'dealers' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider font-mono">
                    <TrendingUp className="w-4 h-4" />
                    <span>Dealer Network & Commissions (§ 14 & Test A10)</span>
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {isRtl ? 'רשת שותפים מורשים ועמלות' : 'Dealer Accounts & Commission Ledger'}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      showToast(isRtl ? 'בדיקת קבלה A10: בוצע קיזוז עמלה אוטומטי (Reversal) בעקבות החזר ללקוח!' : 'Test A10 simulated: Commission reversed upon customer refund!');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isRtl ? 'הדמיית בדיקת קבלה A10 (Reversal)' : 'Simulate Test A10 Reversal'}</span>
                  </button>
                </div>
              </div>

              {/* Dealers Table */}
              <div className="rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <table className="w-full text-start text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-mono">
                    <tr>
                      <th className="p-3 text-start">קוד שותף</th>
                      <th className="p-3 text-start">חברה ואיש קשר</th>
                      <th className="p-3 text-start">שיעור עמלה (§ 14)</th>
                      <th className="p-3 text-start">לקוחות משויכים</th>
                      <th className="p-3 text-start">עמלות שנצברו</th>
                      <th className="p-3 text-start">ממתין לתשלום</th>
                      <th className="p-3 text-end">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                    {dealers.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {d.dealerCode}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">{d.companyName}</div>
                          <div className="text-[11px] text-slate-500">{d.contactName} ({d.phone})</div>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                          {d.commissionRatePercent}%
                        </td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                          {d.attributedOrganizationsCount} ארגונים
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₪{d.totalEarnedILS.toLocaleString()}
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">
                          ₪{d.pendingPayoutILS.toLocaleString()}
                        </td>
                        <td className="p-3 text-end">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
