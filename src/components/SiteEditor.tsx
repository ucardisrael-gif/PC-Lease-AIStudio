import React, { useState } from 'react';
import { X, Check, Save, Upload, Eye, EyeOff, Layers, FileEdit, CheckCircle2 } from 'lucide-react';
import { Language, LaptopProduct, SiteContent } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface SiteEditorProps {
  lang: Language;
  isOpen: boolean;
  content: SiteContent;
  products: LaptopProduct[];
  onClose: () => void;
  onSaveDraft: (newContent: SiteContent, updatedProducts: LaptopProduct[]) => void;
  onPublishLive: (newContent: SiteContent, updatedProducts: LaptopProduct[]) => void;
}

export const SiteEditor: React.FC<SiteEditorProps> = ({
  lang,
  isOpen,
  content,
  products,
  onClose,
  onSaveDraft,
  onPublishLive,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'models' | 'visibility'>('content');
  const [draftContent, setDraftContent] = useState<SiteContent>(content);
  const [draftProducts, setDraftProducts] = useState<LaptopProduct[]>(products);
  const [notification, setNotification] = useState<string | null>(null);

  if (!isOpen) return null;

  const t = TRANSLATIONS[lang];

  const handleToggleVisibility = (sectionKey: keyof SiteContent['sectionsVisibility']) => {
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

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = () => {
    onSaveDraft(draftContent, draftProducts);
    showNotification(t.admin.draftSaved);
  };

  const handlePublish = () => {
    onPublishLive(draftContent, draftProducts);
    showNotification(t.admin.publishedSuccess);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-line)] shadow-2xl p-6 sm:p-8 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-line)]">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold uppercase rounded bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent-border)] mb-1">
              <span>{t.admin.badge}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">
              {t.admin.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--badge-bg)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors ${
              activeTab === 'content'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-page)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.admin.tabContent}
          </button>

          <button
            onClick={() => setActiveTab('models')}
            className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors ${
              activeTab === 'models'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-page)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.admin.tabCatalog}
          </button>

          <button
            onClick={() => setActiveTab('visibility')}
            className={`px-3 py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors ${
              activeTab === 'visibility'
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-page)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.admin.sectionsVisibility}
          </button>
        </div>

        {/* Notification Feedback Banner */}
        {notification && (
          <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Tab Panels */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6">
          {/* TAB 1: Content Editing */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[var(--bg-page)] border border-[var(--border-line)] space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FileEdit className="w-4 h-4 text-[var(--accent)]" />
                  <span>{t.admin.heroGroup}</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      {t.admin.heroTitleHe}
                    </label>
                    <input
                      type="text"
                      value={draftContent.hero.titleHe}
                      onChange={(e) =>
                        setDraftContent({
                          ...draftContent,
                          hero: { ...draftContent.hero, titleHe: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      {t.admin.heroTitleAccentHe}
                    </label>
                    <input
                      type="text"
                      value={draftContent.hero.titleAccentHe}
                      onChange={(e) =>
                        setDraftContent({
                          ...draftContent,
                          hero: { ...draftContent.hero, titleAccentHe: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    {t.admin.heroSubtitleHe}
                  </label>
                  <textarea
                    rows={2}
                    value={draftContent.hero.subtitleHe}
                    onChange={(e) =>
                      setDraftContent({
                        ...draftContent,
                        hero: { ...draftContent.hero, subtitleHe: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-primary)] resize-none"
                  />
                </div>

                {/* English counterpart */}
                <div className="pt-3 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      {t.admin.heroTitleEn}
                    </label>
                    <input
                      type="text"
                      value={draftContent.hero.titleEn}
                      onChange={(e) =>
                        setDraftContent({
                          ...draftContent,
                          hero: { ...draftContent.hero, titleEn: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                      {t.admin.heroTitleAccentEn}
                    </label>
                    <input
                      type="text"
                      value={draftContent.hero.titleAccentEn}
                      onChange={(e) =>
                        setDraftContent({
                          ...draftContent,
                          hero: { ...draftContent.hero, titleAccentEn: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded border border-[var(--border-line)] bg-[var(--bg-surface)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Model Fleet Management */}
          {activeTab === 'models' && (
            <div className="space-y-4">
              <div className="text-xs text-[var(--text-secondary)]">
                ניהול זמינות הדגמים בקטלוג ובדף הבית (תרחיש: ״דגם אחד אזל — מושכים מהקטלוג״).
              </div>

              <div className="space-y-3">
                {draftProducts.map((p) => (
                  <div
                    key={p.slug}
                    className="p-4 rounded-xl bg-[var(--bg-page)] border border-[var(--border-line)] flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-10 rounded bg-[var(--bg-surface)] p-1 flex items-center justify-center border border-[var(--border-subtle)]">
                        <img
                          src={p.imagePath}
                          alt={p.model}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[var(--text-primary)] font-mono">
                          {p.manufacturer} {p.model}
                        </div>
                        <div className="text-[11px] text-[var(--text-secondary)]">
                          {p.cpu.family} · {p.ramGB}GB RAM · {p.storage.capacityGB}GB SSD
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded ${
                          p.published
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/20'
                        }`}
                      >
                        {p.published ? t.admin.modelActive : t.admin.modelInactive}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleToggleProductPublish(p.slug)}
                        className="px-3 py-1.5 text-xs font-medium rounded border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
                      >
                        {t.admin.statusChange}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Section Visibility */}
          {activeTab === 'visibility' && (
            <div className="space-y-4">
              <div className="text-xs text-[var(--text-secondary)]">
                הדלקה וכיבוי של מקטעים בעמוד הבית בלחיצת כפתור אחת.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(draftContent.sectionsVisibility).map(([key, isVisible]) => (
                  <div
                    key={key}
                    className="p-3.5 rounded-xl bg-[var(--bg-page)] border border-[var(--border-line)] flex items-center justify-between"
                  >
                    <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] capitalize">
                      מקטע: {key}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(key as any)}
                      className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded transition-colors ${
                        isVisible
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-stone-500/10 text-stone-600 dark:text-stone-400 border border-stone-500/20'
                      }`}
                    >
                      {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{isVisible ? 'מוצג' : 'מוסתר'}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions: Save Draft vs Publish Live */}
        <div className="pt-4 border-t border-[var(--border-line)] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {t.admin.exitEditor}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded border border-[var(--border-line)] bg-[var(--bg-surface)] hover:bg-[var(--badge-bg)] text-[var(--text-primary)] transition-colors"
            >
              <Save className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{t.admin.saveDraft}</span>
            </button>

            <button
              type="button"
              onClick={handlePublish}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{t.admin.publishLive}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
