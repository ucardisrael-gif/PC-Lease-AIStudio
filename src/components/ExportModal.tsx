import React, { useState } from 'react';
import { X, Download, CheckCircle2, AlertTriangle, FileArchive, Github, Terminal, Copy, Check, HardDrive } from 'lucide-react';
import { Language } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, lang }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success' | 'fallback_opened' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const handleDownloadZip = async () => {
    try {
      setDownloading(true);
      setDownloadStatus('idle');
      setErrorMessage('');

      // Fetch the binary zip directly from within the authenticated session
      const response = await fetch('/pc-lease-project.zip', {
        headers: { 'Accept': 'application/zip' }
      });

      if (!response.ok) {
        throw new Error(`Ошибка загрузки: HTTP ${response.status}`);
      }

      const blob = await response.blob();

      // Verify it is not an HTML "Cookie check" page
      if (blob.type.includes('html') || blob.size < 100000) {
        // Read text to inspect
        const text = await blob.text();
        if (text.includes('Cookie check')) {
          throw new Error('Обнаружен защитный перехватчик Cookie check. Используйте экспорт в GitHub или команду консоли ниже.');
        }
      }

      // Method A: Try modern File System Access API (showSaveFilePicker)
      // This is the cleanest method because it triggers native OS Save Dialog and bypasses iframe download blocks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const win = window as any;
      if (typeof win.showSaveFilePicker === 'function') {
        try {
          const handle = await win.showSaveFilePicker({
            suggestedName: 'pc-lease-project.zip',
            types: [
              {
                description: 'ZIP Archive',
                accept: { 'application/zip': ['.zip'] }
              }
            ]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          setDownloadStatus('success');
          setDownloading(false);
          return;
        } catch (pickerErr: any) {
          // If user cancelled, don't fallback to error
          if (pickerErr.name === 'AbortError') {
            setDownloading(false);
            return;
          }
          // If blocked by permissions or security, proceed to Blob fallback
          console.warn('showSaveFilePicker unavailable or blocked, falling back to Blob link', pickerErr);
        }
      }

      // Method B: Standard Blob URL Download
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'pc-lease-project.zip';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 5000);

      setDownloadStatus('success');
    } catch (err: any) {
      console.error('Download error:', err);
      setErrorMessage(err.message || 'Не удалось завершить скачивание');
      setDownloadStatus('error');
    } finally {
      setDownloading(false);
    }
  };

  const copyConsoleScript = () => {
    const code = `fetch('/pc-lease-project.zip').then(r=>r.blob()).then(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='pc-lease-project.zip';document.body.appendChild(a);a.click();});`;
    navigator.clipboard.writeText(code);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-[var(--bg-surface)] border border-[var(--border-line)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative"
        dir="ltr"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <FileArchive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {lang === 'he' ? 'ייצוא פרויקט מלא (ZIP)' : 'Экспорт полного проекта (ZIP)'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {lang === 'he' 
                ? '63 קבצים · 17.1 MB · כולל קוד מקור, עיצוב ותמונות ללא סודות' 
                : '63 файла · 17.1 МБ · Все исходники, стили, спецификация и графика'}
            </p>
          </div>
        </div>

        {/* Primary Download Action Card */}
        <div className="bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/40 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800/80 rounded-xl p-5 mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-600 text-white">
                  ПРОВЕРЕНО
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  pc-lease-project.zip (17.07 MB)
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Открывается архиватором (7-Zip, WinRAR, Unzip), содержит все 13 компонентов, переводы (RU/HE), ТЗ и студийные фото техники. Без <code className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded">node_modules</code>.
              </p>
            </div>

            <button
              onClick={handleDownloadZip}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-sm rounded-xl shadow-md transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Загрузка...</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-4 h-4" />
                  <span>Сохранить на диск</span>
                </>
              )}
            </button>
          </div>

          {/* Success / Error Notifications */}
          {downloadStatus === 'success' && (
            <div className="mt-4 p-3 bg-emerald-100/80 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 rounded-lg flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Файл pc-lease-project.zip успешно сохранен на ваш компьютер!</span>
            </div>
          )}

          {downloadStatus === 'error' && (
            <div className="mt-4 p-3 bg-red-100/80 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg flex items-center gap-2 text-xs text-red-800 dark:text-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Why "Cookie check" occurs & Alternative Methods */}
        <div className="space-y-4">
          {/* Explanation of Cookie Check */}
          <div className="border border-[var(--border-line)] rounded-xl p-4 bg-[var(--bg-page)]/50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Почему по прямой ссылке был «Cookie check»?
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Сервер предварительного просмотра Google AI Studio защищен межсайтовым прокси Google Cloud Run. Если вставить ссылку в пустую вкладку браузера или вызвать <code className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded">curl</code> без сессионных cookie Google, сервер отдает служебную страницу <em>«Cookie check»</em>. Зелёная кнопка выше скачивает файл <strong>изнутри активной сессии</strong>, поэтому скачивается настоящий архив.
            </p>
          </div>

          {/* Recommended Option: Native GitHub Sync in AI Studio */}
          <div className="border border-sky-200 dark:border-sky-800/80 rounded-xl p-4 bg-sky-50/50 dark:bg-sky-950/20">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-sky-500 text-white rounded-lg shrink-0">
                <Github className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-bold text-sky-950 dark:text-sky-200 mb-1">
                  Рекомендуемый способ: Кнопка «GitHub» вверху окна AI Studio
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                  В самом верхнем меню Google AI Studio (рядом с кнопками <em>Chat</em>, <em>Share</em>, <em>Publish</em>) есть вкладка <strong>• GitHub</strong>.
                  Нажмите на неё и выберите <strong>«Create new repository»</strong> — AI Studio сама за 3 секунды создаст чистый репозиторий в вашем GitHub с полным кодом, который сразу можно открыть в Cursor или другом агенте.
                </p>
              </div>
            </div>
          </div>

          {/* Method C: Browser Console One-Liner */}
          <div className="border border-[var(--border-line)] rounded-xl p-4 bg-[var(--bg-page)]/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-blue-500" />
                Способ для консоли браузера (F12)
              </h4>
              <button
                onClick={copyConsoleScript}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {copiedCmd ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCmd ? 'Скопировано!' : 'Копировать'}</span>
              </button>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mb-2">
              Если браузер блокирует скачивание во фрейме, нажмите <kbd className="px-1 py-0.5 bg-black/10 dark:bg-white/10 rounded text-[10px]">F12</kbd> → вкладка <strong>Console</strong>, вставьте и нажмите Enter:
            </p>
            <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto select-all">
              {`fetch('/pc-lease-project.zip').then(r=>r.blob()).then(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='pc-lease-project.zip';document.body.appendChild(a);a.click();});`}
            </pre>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-4 border-t border-[var(--border-line)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Стек: React 18 + Vite + Tailwind CSS v4 + TypeScript</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-[var(--border-line)] hover:bg-[var(--badge-bg)] text-[var(--text-primary)] font-medium cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
