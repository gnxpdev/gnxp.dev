import { useState } from 'react';
import { Download, PlusSquare, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-(--accent) px-3.5 py-1.5 text-xs font-medium text-(--accent-fg) shadow-xs transition-opacity hover:opacity-90 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>ติดตั้งลงเครื่อง (PWA)</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuideModal(true)}
        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--btn-bg) px-3 py-1.5 text-xs font-medium text-(--text-primary) transition-colors hover:border-(--border-strong) hover:bg-(--bg-subtle) whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Smartphone className="h-3.5 w-3.5 shrink-0 text-(--text-secondary)" aria-hidden="true" />
        <span>{isIOS ? 'ติดตั้งลง iPad / iPhone' : 'เปิดแบบแอป (PWA)'}</span>
      </button>

      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-(--border-hairline) bg-(--bg-surface) p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3
                  id="pwa-install-guide-title"
                  className="text-base font-semibold text-(--text-primary)"
                >
                  ติดตั้ง Pannawat Learning Space ลงบน iPad / มือถือ
                </h3>
                <p className="mt-1 text-xs text-(--text-secondary)">
                  ใช้งานแบบเต็มจอ (Standalone) และเข้าถึงคลังบทเรียนกับโน้ตได้ทันทีแม้เน็ตช้า
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="ปิดหน้าต่างแนะนำ"
                className="rounded-lg p-1.5 text-(--text-muted) hover:bg-(--bg-subtle) hover:text-(--text-primary) cursor-pointer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <ol className="mt-4 space-y-3 rounded-xl border border-(--border-hairline) bg-(--bg-subtle) p-4 text-xs leading-relaxed text-(--text-primary)">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-(--accent) text-[11px] font-semibold text-(--accent-fg)">
                  1
                </span>
                <span>
                  เปิดเว็บนี้ในเบราว์เซอร์ <strong>Safari</strong> (บน iPad/iPhone) หรือ{' '}
                  <strong>Chrome / Edge</strong> (บน Android/Desktop)
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-(--accent) text-[11px] font-semibold text-(--accent-fg)">
                  2
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  แตะปุ่ม <Share className="inline h-3.5 w-3.5 text-(--text-secondary)" aria-hidden="true" />{' '}
                  <strong>แชร์ (Share)</strong> ที่แถบเครื่องมือด้านบนขวาของ Safari
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-(--accent) text-[11px] font-semibold text-(--accent-fg)">
                  3
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  เลื่อนลงแล้วเลือก <PlusSquare className="inline h-3.5 w-3.5 text-(--text-secondary)" aria-hidden="true" />{' '}
                  <strong>เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)</strong> จากนั้นกด &quot;เพิ่ม&quot;
                </span>
              </li>
            </ol>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="rounded-lg bg-(--accent) px-4 py-2 text-xs font-medium text-(--accent-fg) cursor-pointer"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
