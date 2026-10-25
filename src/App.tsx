import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { DeviceSelector } from './components/DeviceSelector';
import { WorkspaceSection } from './components/WorkspaceSection';
import { PricingCalculator } from './components/PricingCalculator';
import { ProcessStory } from './components/ProcessStory';
import { CatalogSection } from './components/CatalogSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { ProductModal } from './components/ProductModal';
import { CheckoutModal } from './components/CheckoutModal';
import { ClientLoginModal } from './components/ClientLoginModal';
import { SiteEditor } from './components/SiteEditor';
import { ExportModal } from './components/ExportModal';

import { AcquisitionMode, Language, LaptopProduct, QuoteRequest, SiteContent, Theme } from './types';
import { INITIAL_PRODUCTS } from './data/initialProducts';

const INITIAL_SITE_CONTENT: SiteContent = {
  hero: {
    titleHe: 'מחשבים לעסק.',
    titleAccentHe: 'בתשלום חודשי קבוע.',
    titleEn: 'Business Laptops.',
    titleAccentEn: 'Fixed Monthly Lease.',
    subtitleHe:
      'מחשבים ניידים עסקיים מחודשים מדרג פרימיום (Dell, HP, Lenovo). גמישות תפעולית, שימור תזרים מזומנים ותנאי ליסינג ברורים.',
    subtitleEn:
      'Refurbished Grade-A business laptops from Dell, HP and Lenovo. Preserve working capital with predictable 36-month lease terms and verified hardware.',
    ctaPrimaryHe: 'לבחירת מחשב ומסלול',
    ctaPrimaryEn: 'Choose Model & Plan',
    ctaSecondaryHe: 'איך עובד התהליך',
    ctaSecondaryEn: 'How It Works',
  },
  workspace: {
    titleHe: 'מחשוב אמין בלי לפגוע בתזרים המזומנים של החברה',
    titleEn: 'Reliable Hardware Without Compromising Company Cash Flow',
    bodyHe:
      'צוותים עסקיים זקוקים למחשבים עמידים, מאובטחים ומהירים. מודל הליסינג של PC-LEASE מעניק לחברות טכנולוגיה, משרדי עורכי דין ועסקים צומחים שקט נפשי מלא.',
    bodyEn:
      'Fast-moving teams need dependable, secure and durable machines. PC-LEASE gives tech companies, law practices and growing businesses full operational peace of mind.',
  },
  sectionsVisibility: {
    hero: true,
    devices: true,
    workspace: true,
    calculator: true,
    story: true,
    catalog: true,
    faq: true,
    cta: true,
  },
};

export default function App() {
  // 1. Language state (Hebrew RTL by default, English LTR secondary)
  const [lang, setLang] = useState<Language>('he');

  // 2. Theme state (Light / Dark with local persistence under pc-lease-theme)
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pc-lease-theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Apply language direction to document
  useEffect(() => {
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Apply theme class to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('pc-lease-theme', theme);
  }, [theme]);

  // Products and content states
  const [products, setProducts] = useState<LaptopProduct[]>(INITIAL_PRODUCTS);
  const [content, setContent] = useState<SiteContent>(INITIAL_SITE_CONTENT);
  const [selectedProduct, setSelectedProduct] = useState<LaptopProduct>(INITIAL_PRODUCTS[0]);

  // Modals state
  const [productDetailsItem, setProductDetailsItem] = useState<LaptopProduct | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isClientLoginOpen, setIsClientLoginOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<LaptopProduct>(INITIAL_PRODUCTS[0]);
  const [checkoutMode, setCheckoutMode] = useState<AcquisitionMode>('lease');
  const [checkoutQuantity, setCheckoutQuantity] = useState<number>(3);
  const [checkoutRentalDays, setCheckoutRentalDays] = useState<number>(30);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Handlers
  const handleToggleLang = () => {
    setLang((prev) => (prev === 'he' ? 'en' : 'he'));
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleOpenCheckoutWithPreset = (
    product: LaptopProduct,
    mode: AcquisitionMode,
    quantity: number,
    rentalDays?: number
  ) => {
    setCheckoutProduct(product);
    setCheckoutMode(mode);
    setCheckoutQuantity(quantity);
    if (rentalDays) setCheckoutRentalDays(rentalDays);
    setIsCheckoutOpen(true);
  };

  const handleScrollTo = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors duration-200">
      {/* 1. Header (Top Bar Contract) */}
      <Header
        lang={lang}
        theme={theme}
        onToggleLang={handleToggleLang}
        onToggleTheme={handleToggleTheme}
        onOpenClientLogin={() => setIsClientLoginOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* 2. Unified Wide Hero Section with 3D Background Motion */}
      {content.sectionsVisibility.hero && (
        <HeroSection
          lang={lang}
          onExploreModels={() => handleScrollTo('models')}
          onOpenCalculator={() => handleScrollTo('calculator')}
        />
      )}

      {/* 3. Interactive Device Selector */}
      {content.sectionsVisibility.devices && (
        <DeviceSelector
          lang={lang}
          products={products.filter((p) => p.published)}
          selectedProduct={selectedProduct}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onProceedToCalculator={(p) => {
            setSelectedProduct(p);
            handleScrollTo('calculator');
          }}
          onOpenProductDetails={(p) => setProductDetailsItem(p)}
        />
      )}

      {/* 4. Architectural Workspace Section */}
      {content.sectionsVisibility.workspace && (
        <WorkspaceSection lang={lang} />
      )}

      {/* 5. Pricing & Lease Calculator */}
      {content.sectionsVisibility.calculator && (
        <PricingCalculator
          lang={lang}
          products={products.filter((p) => p.published)}
          selectedProduct={selectedProduct}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onContinueToQuote={(prod, mode, qty, days) =>
            handleOpenCheckoutWithPreset(prod, mode, qty, days)
          }
        />
      )}

      {/* 6. Process Story (4 steps) */}
      {content.sectionsVisibility.story && <ProcessStory lang={lang} />}

      {/* 7. Catalog Grid with Filters */}
      {content.sectionsVisibility.catalog && (
        <CatalogSection
          lang={lang}
          products={products}
          onOpenProductDetails={(p) => setProductDetailsItem(p)}
          onSelectForCalculator={(p) => {
            setSelectedProduct(p);
            handleScrollTo('calculator');
          }}
        />
      )}

      {/* 8. FAQ Section */}
      {content.sectionsVisibility.faq && <FAQSection lang={lang} />}

      {/* 9. Footer */}
      <Footer
        lang={lang}
        theme={theme}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Modals & Drawers */}
      <ProductModal
        lang={lang}
        product={productDetailsItem}
        onClose={() => setProductDetailsItem(null)}
        onProceedToQuote={(prod, mode, qty, days) =>
          handleOpenCheckoutWithPreset(prod, mode, qty, days)
        }
      />

      <CheckoutModal
        lang={lang}
        isOpen={isCheckoutOpen}
        product={checkoutProduct}
        mode={checkoutMode}
        quantity={checkoutQuantity}
        rentalDays={checkoutRentalDays}
        onClose={() => setIsCheckoutOpen(false)}
        onSubmitQuote={(req: QuoteRequest) => {
          console.log('Quote Request registered:', req);
        }}
      />

      <ClientLoginModal
        lang={lang}
        isOpen={isClientLoginOpen}
        onClose={() => setIsClientLoginOpen(false)}
      />

      <SiteEditor
        lang={lang}
        isOpen={isAdminOpen}
        content={content}
        products={products}
        onClose={() => setIsAdminOpen(false)}
        onSaveDraft={(newContent, newProducts) => {
          setContent(newContent);
          setProducts(newProducts);
        }}
        onPublishLive={(newContent, newProducts) => {
          setContent(newContent);
          setProducts(newProducts);
        }}
      />

      {/* Export Project Modal */}
      <ExportModal
        lang={lang}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
