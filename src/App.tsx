import { DealerWorkspace } from './components/DealerWorkspace';
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HeroBlock, HeroSection } from './components/HeroSection';
import { DeviceSelector, FeaturedBlock } from './components/DeviceSelector';
import { WorkspaceSection, WorkspaceBlock } from './components/WorkspaceSection';
import { PricingCalculator } from './components/PricingCalculator';
import { ProcessStory, StoryBlock } from './components/ProcessStory';
import { CatalogSection } from './components/CatalogSection';
import { FAQSection, FAQBlock } from './components/FAQSection';
import { Footer } from './components/Footer';
import { sectionDefaults } from './data/section-defaults.mjs';
import { AboutPage, ContactPage, AboutBlock, ContactBlock } from './components/InfoPages';
import { ProductModal } from './components/ProductModal';
import { CheckoutModal } from './components/CheckoutModal';
import { PendingOrderRecovery } from './components/PendingOrderRecovery';
import { PendingOrder,readPendingOrder } from './domain/pendingOrder';
import { ClientLoginModal } from './components/ClientLoginModal';
import { OwnerBackOffice } from './components/backoffice/OwnerBackOffice';
import { TrustBlock, TrustSection } from './components/TrustSection';

import { AcquisitionMode, Language, LaptopProduct, SiteContent, Theme } from './types';


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
  const [lang, setLang] = useState<Language>(() => sessionStorage.getItem('pc-lease-lang') === 'en' ? 'en' : 'he');
  const path = window.location.pathname.replace(/\/$/, '');
  const isCatalogPage = path === '/catalog';
  const isHomePage = !path;
  const isAboutPage = path === '/about';
  const isContactPage = path === '/contact';

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
    sessionStorage.setItem('pc-lease-lang', lang);
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
  const [products, setProducts] = useState<LaptopProduct[]>([]);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [content, setContent] = useState<SiteContent>(INITIAL_SITE_CONTENT);
  const [selectedProduct, setSelectedProduct] = useState<LaptopProduct | null>(null);
  const [trust, setTrust] = useState<TrustBlock | null>(null);
  const [hero, setHero] = useState<HeroBlock | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceBlock | null>(null);
  const [featured, setFeatured] = useState<FeaturedBlock | null>(null);
  const [story, setStory] = useState<StoryBlock | null>(null);
  const [faq, setFaq] = useState<FAQBlock | null>(null);
  const [about, setAbout] = useState<AboutBlock | null>(null);
  const [contact, setContact] = useState<ContactBlock | null>(null);
  const [footer, setFooter] = useState<{content: typeof sectionDefaults.footer} | null>(null);
  const [navigation, setNavigation] = useState<{content: typeof sectionDefaults.navigation} | null>(null);
  const [calculatorContent, setCalculatorContent] = useState(sectionDefaults.calculator);
  const [infoVersion, setInfoVersion] = useState(0);
  const [homeOrder, setHomeOrder] = useState<string[]>(sectionDefaults.layout.order);
  useEffect(() => { const controller = new AbortController(); fetch('/api/site/layout', {signal: controller.signal}).then(r => {if (!r.ok) throw Error(); return r.json();}).then(data => {const order = data?.content?.order; const expected = sectionDefaults.layout.order; if (Array.isArray(order) && order.length === expected.length && new Set(order).size === expected.length && order.every((key: string) => expected.includes(key))) setHomeOrder(order);}).catch(() => {}); return () => controller.abort(); }, [infoVersion]);
  useEffect(() => { const controller = new AbortController(); fetch('/api/site/navigation', {signal:controller.signal}).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(setNavigation).catch(()=>{}); return () => controller.abort(); }, [infoVersion]);
  useEffect(() => { const controller = new AbortController(); fetch('/api/site/footer', {signal:controller.signal}).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(setFooter).catch(()=>{}); return () => controller.abort(); }, [infoVersion]);
  useEffect(() => { const controller = new AbortController(); fetch('/api/site/calculator', {signal:controller.signal}).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(data => setCalculatorContent(data.content)).catch(()=>{}); return () => controller.abort(); }, [infoVersion]);
  useEffect(() => { const controller = new AbortController(); for (const [key,setter] of [['about',setAbout],['contact',setContact]] as const) fetch(`/api/site/${key}`,{signal:controller.signal}).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(setter).catch(()=>{}); return () => controller.abort(); }, [infoVersion]);

  useEffect(() => {
    const controller = new AbortController();
    for (const [section, setter] of [['workspace', setWorkspace], ['featured', setFeatured], ['story', setStory], ['faq', setFaq]] as const) {
      fetch(`/api/site/${section}`, { signal: controller.signal }).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(setter).catch(() => {});
    }
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/site/hero', { signal: controller.signal }).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(setHero).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/site/trust', { signal: controller.signal }).then(r => { if (!r.ok) throw Error(); return r.json(); }).then(setTrust).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setCatalogStatus('loading');
    fetch('/api/catalog', { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Catalog unavailable'); return response.json(); })
      .then((data: { products: LaptopProduct[] }) => {
        if (!Array.isArray(data.products)) throw new Error('Invalid catalog response');
        setProducts(data.products);
        const requestedSlug = new URLSearchParams(window.location.search).get('product');
        setSelectedProduct((current) => data.products.find((p) => p.id === current?.id) ?? data.products.find((p) => p.slug === requestedSlug) ?? data.products[0] ?? null);
        setCatalogStatus('ready');
      })
      .catch(() => { if (!controller.signal.aborted) setCatalogStatus('error'); });
    return () => controller.abort();
  }, [catalogAttempt]);

  useEffect(() => {
    if (isHomePage && selectedProduct && /^#(models|calculator|story|faq)$/.test(window.location.hash)) {
      document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
    }
  }, [isCatalogPage, selectedProduct]);

  // Modals state
  const [productDetailsItem, setProductDetailsItem] = useState<LaptopProduct | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [pendingCustomerOrder,setPendingCustomerOrder]=useState<PendingOrder|null>(()=>readPendingOrder());
  const [isClientLoginOpen, setIsClientLoginOpen] = useState(() => /^#(?:reset|verify)=/.test(window.location.hash));
  useEffect(()=>{const openFromLink=(event:HashChangeEvent)=>{if(/^#(?:reset|verify)=/.test(new URL(event.newURL).hash))setIsClientLoginOpen(true);};window.addEventListener('hashchange',openFromLink);return()=>window.removeEventListener('hashchange',openFromLink);},[]);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [checkoutProduct, setCheckoutProduct] = useState<LaptopProduct | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<AcquisitionMode>('lease');
  const [checkoutQuantity, setCheckoutQuantity] = useState<number>(1);
  const [checkoutRentalDays, setCheckoutRentalDays] = useState<number>(30);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isDealerOpen,setIsDealerOpen]=useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [sessionUser, setSessionUser] = useState<{ email: string; role: 'admin' | 'customer'; permissions?: string[]; displayName?: string | null; dealerAccess?: boolean; dealerAccessVersion?: number } | null>(null);
  const [sessionLoaded,setSessionLoaded]=useState(false);
  const [accessChanged,setAccessChanged]=useState(false);
  const [pendingOrder,setPendingOrder]=useState('');
  const [adminOrder,setAdminOrder]=useState('');
  useEffect(()=>{const readLink=()=>{const match=window.location.hash.match(/^#admin-order=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);if(match)setPendingOrder(match[1]);};readLink();window.addEventListener('hashchange',readLink);return()=>window.removeEventListener('hashchange',readLink);},[]);
  useEffect(() => { fetch('/api/auth/me').then(r => r.ok ? r.json() : Promise.reject()).then(data => setSessionUser(data.user)).catch(() => setSessionUser(null)).finally(()=>setSessionLoaded(true)); }, []);
  useEffect(()=>{if(!sessionLoaded||!pendingOrder)return;if(!sessionUser){setIsClientLoginOpen(true);return;}if(sessionUser.role==='admin'||sessionUser.permissions?.includes('orders')){setAdminOrder(pendingOrder);setAdminEmail(sessionUser.email);setIsClientLoginOpen(false);setIsAdminOpen(true);setPendingOrder('');window.history.replaceState(null,'',window.location.pathname+window.location.search);} },[sessionLoaded,pendingOrder,sessionUser]);
  useEffect(()=>{
    if((!isAdminOpen&&!isDealerOpen)||!sessionUser)return;
    let active=true,checking=false;
    const refresh=async()=>{if(checking||document.visibilityState==='hidden')return;checking=true;try{const response=await fetch('/api/auth/me');if(!response.ok)return;const user=(await response.json()).user;if(!active)return;const permissions=(value:string[]|undefined)=>[...(value||[])].sort().join(',');if(!user||user.email!==sessionUser.email||user.role!==sessionUser.role||permissions(user.permissions)!==permissions(sessionUser.permissions)||user.dealerAccess!==sessionUser.dealerAccess||user.dealerAccessVersion!==sessionUser.dealerAccessVersion){setSessionUser(user);setIsAdminOpen(false);setIsDealerOpen(false);setAdminOrder('');setAccessChanged(true);}}catch{}finally{checking=false;}};
    const onVisibility=()=>{if(document.visibilityState==='visible')void refresh();};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',onVisibility);
    return()=>{active=false;window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',onVisibility);};
  },[isAdminOpen,isDealerOpen,sessionUser]);
  const openAdmin = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const user = response.ok ? (await response.json()).user : null;
      setSessionUser(user);
      if (user?.role === 'admin' || user?.permissions?.length) { setAccessChanged(false);setAdminEmail(user.email); setIsAdminOpen(true); }
    } catch { setSessionUser(null); }
  };

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
    if(pendingCustomerOrder){window.scrollTo({top:0,behavior:'smooth'});return;}
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
      {pendingCustomerOrder&&!isCheckoutOpen&&<PendingOrderRecovery lang={lang} pending={pendingCustomerOrder} onCleared={()=>setPendingCustomerOrder(null)}/>}
      {accessChanged&&<div role="alert" className="p-3 text-center bg-amber-100 text-slate-900">{lang==='he'?'ההרשאות או מצב החיבור השתנו. פתחו מחדש את הניהול אם יש לכם הרשאה.':'Your access or session changed. Reopen administration if you still have access.'} <button type="button" className="underline" onClick={()=>setAccessChanged(false)}>{lang==='he'?'סגירה':'Dismiss'}</button></div>}
      {pendingOrder&&sessionLoaded&&sessionUser&&sessionUser.role!=='admin'&&!sessionUser.permissions?.includes('orders')&&<div role="alert" className="p-3 text-center bg-amber-100 text-slate-900">{lang==='he'?'אין לחשבון הזה הרשאה לצפייה בהזמנות.':'This account does not have permission to view orders.'} <button className="underline" onClick={()=>{setPendingOrder('');window.history.replaceState(null,'',window.location.pathname+window.location.search);}}>{lang==='he'?'סגירה':'Dismiss'}</button></div>}
      {/* 1. Header (Top Bar Contract) */}
      <Header
        lang={lang}
        navigation={navigation?.content}
        theme={theme}
        onToggleLang={handleToggleLang}
        onToggleTheme={handleToggleTheme}
        onOpenClientLogin={() => setIsClientLoginOpen(true)}
        onOpenAdmin={openAdmin}
        isDealer={!!sessionUser?.dealerAccess}
        onOpenDealer={async()=>{try{const r=await fetch('/api/auth/me');const user=r.ok?(await r.json()).user:null;setSessionUser(user);if(user?.dealerAccess)setIsDealerOpen(true);}catch{setSessionUser(null);}}}
        isAdmin={sessionUser?.role === 'admin' || !!sessionUser?.permissions?.length}
        sessionUser={sessionUser}
        quoteAvailable={catalogStatus === 'ready' && !!selectedProduct}
        onOpenQuote={() => { if (selectedProduct) handleOpenCheckoutWithPreset(selectedProduct, 'lease', 1, 30); }}
      />

      {((isAboutPage && !about) || (isContactPage && !contact)) && <div role="status" className="max-w-[1120px] mx-auto p-8 text-center text-[var(--text-secondary)]">{lang === 'he' ? 'טוען תוכן…' : 'Loading content…'} <button type="button" onClick={() => setInfoVersion(n => n + 1)} className="underline">{lang === 'he' ? 'נסה שוב' : 'Try again'}</button></div>}
      {isAboutPage && about && <AboutPage lang={lang} block={about} />}
      {isContactPage && contact && <ContactPage lang={lang} block={contact} products={products} catalogStatus={catalogStatus} />}

      {isHomePage && homeOrder.map(section => <React.Fragment key={section}>
        {section === 'hero' && <>
      {isHomePage && content.sectionsVisibility.hero && hero && (
        <HeroSection
          lang={lang}
          content={hero.content}
          onExploreModels={() => handleScrollTo('models')}
          onOpenCalculator={() => handleScrollTo('calculator')}
        />
      )}
      {(isHomePage || isCatalogPage) && catalogStatus !== 'ready' && (
        <div role="status" className="max-w-[1280px] mx-auto px-6 py-8 text-center text-[var(--text-secondary)]">
          {catalogStatus === 'loading' ? (lang === 'he' ? 'טוען קטלוג...' : 'Loading catalog...') : (
            <><span>{lang === 'he' ? 'לא ניתן לטעון את הקטלוג.' : 'The catalog is unavailable.'}</span>{' '}
              <button className="underline" onClick={() => setCatalogAttempt((n) => n + 1)}>{lang === 'he' ? 'נסה שוב' : 'Try again'}</button></>
          )}
        </div>
      )}
      {(isHomePage || isCatalogPage) && catalogStatus === 'ready' && products.length === 0 && (
        <p role="status" className="text-center py-8 text-[var(--text-secondary)]">{lang === 'he' ? 'אין מוצרים בקטלוג.' : 'The catalog is empty.'}</p>
      )}

        </>}
        {section === 'trust' && <>
      {isHomePage && trust && <TrustSection lang={lang} content={trust.content} />}

        </>}
        {section === 'featured' && <>
      {isHomePage && content.sectionsVisibility.devices && selectedProduct && featured && (
        <DeviceSelector
          lang={lang}
          content={featured.content}
          products={products.filter((p) => p.published && p.featured !== false)}
          selectedProduct={selectedProduct}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onProceedToCalculator={(p) => {
            setSelectedProduct(p);
            handleScrollTo('calculator');
          }}
          onOpenProductDetails={(p) => setProductDetailsItem(p)}
        />
      )}
        </>}
        {section === 'calculator' && <>
      {isHomePage && content.sectionsVisibility.calculator && calculatorContent.visible && selectedProduct && (
        <PricingCalculator
          lang={lang}
          content={calculatorContent}
          products={products.filter((p) => p.published)}
          selectedProduct={selectedProduct}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onContinueToQuote={(prod, mode, qty, days) =>
            handleOpenCheckoutWithPreset(prod, mode, qty, days)
          }
        />
      )}
        </>}
        {section === 'story' && <>
      {isHomePage && content.sectionsVisibility.story && story && <ProcessStory lang={lang} content={story.content} />}
        </>}
        {section === 'workspace' && <>
      {isHomePage && content.sectionsVisibility.workspace && workspace && (
        <WorkspaceSection lang={lang} content={workspace.content} />
      )}
        </>}
        {section === 'faq' && <>
      {isHomePage && content.sectionsVisibility.faq && faq && <FAQSection lang={lang} content={faq.content} />}


        </>}
      </React.Fragment>)}
      {isCatalogPage && <>
      {(isHomePage || isCatalogPage) && catalogStatus !== 'ready' && (
        <div role="status" className="max-w-[1280px] mx-auto px-6 py-8 text-center text-[var(--text-secondary)]">
          {catalogStatus === 'loading' ? (lang === 'he' ? 'טוען קטלוג...' : 'Loading catalog...') : (
            <><span>{lang === 'he' ? 'לא ניתן לטעון את הקטלוג.' : 'The catalog is unavailable.'}</span>{' '}
              <button className="underline" onClick={() => setCatalogAttempt((n) => n + 1)}>{lang === 'he' ? 'נסה שוב' : 'Try again'}</button></>
          )}
        </div>
      )}
      {(isHomePage || isCatalogPage) && catalogStatus === 'ready' && products.length === 0 && (
        <p role="status" className="text-center py-8 text-[var(--text-secondary)]">{lang === 'he' ? 'אין מוצרים בקטלוג.' : 'The catalog is empty.'}</p>
      )}

      </>}
      {isCatalogPage && catalogStatus === 'ready' && products.length > 0 && content.sectionsVisibility.catalog && (
        <CatalogSection
          lang={lang}
          products={products}
          onOpenProductDetails={(p) => setProductDetailsItem(p)}
          onSelectForCalculator={(p) => {
            window.location.assign(`/?product=${encodeURIComponent(p.slug)}#calculator`);
          }}
        />
      )}

      {/* 9. Footer */}
      <Footer
        lang={lang}
        navigation={navigation?.content}
        theme={theme}
        content={footer?.content}
        contactAvailable={!!contact?.content.visible}
      />

      {/* Modals & Drawers */}
      <ProductModal
        lang={lang}
        contactLabel={contact?.content.visible ? (lang==='he'?contact.content.productCtaHe:contact.content.productCtaEn) : undefined}
        product={productDetailsItem}
        onClose={() => setProductDetailsItem(null)}
        onProceedToQuote={(prod, mode, qty, days) =>
          handleOpenCheckoutWithPreset(prod, mode, qty, days)
        }
      />

      {checkoutProduct && isCheckoutOpen && <CheckoutModal
        lang={lang}
        isOpen={isCheckoutOpen}
        product={checkoutProduct}
        products={products}
        mode={checkoutMode}
        quantity={checkoutQuantity}
        rentalDays={checkoutRentalDays}
        onPendingChange={setPendingCustomerOrder}
        onClose={() => setIsCheckoutOpen(false)}
      />}

      <ClientLoginModal
        lang={lang}
        isOpen={isClientLoginOpen}
        onClose={() => setIsClientLoginOpen(false)}
        onSessionChange={setSessionUser}
      />

      <ClientLoginModal lang={lang} admin isOpen={isAdminLoginOpen} onClose={() => setIsAdminLoginOpen(false)} onSessionChange={setSessionUser} onAdminAccess={(email) => { setAdminEmail(email); setIsAdminLoginOpen(false); setIsAdminOpen(true); }} />

      {isDealerOpen && <DealerWorkspace lang={lang} onClose={()=>setIsDealerOpen(false)}/>}
      {isAdminOpen && <OwnerBackOffice
        initialOrderId={adminOrder} lang={lang} theme={theme} adminEmail={adminEmail} fullAdmin={sessionUser?.role === 'admin'} permissions={sessionUser?.permissions || []} onCatalogChanged={() => setCatalogAttempt(n => n + 1)}
        onTrustSaved={setTrust}
        onHeroSaved={setHero}
        onWorkspaceSaved={setWorkspace}
        onFeaturedSaved={setFeatured}
        onStorySaved={setStory}
        onFaqSaved={setFaq}
        onInfoChanged={() => setInfoVersion(n => n + 1)}
        onToggleLang={handleToggleLang} onToggleTheme={handleToggleTheme}
        content={content} products={products}
        onUpdateContentAndProducts={(newContent, newProducts) => { setContent(newContent); setProducts(newProducts); }}
        onClose={() => {setIsAdminOpen(false);setAdminOrder('');}}
      />}

    </div>
  );
}
