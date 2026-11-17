import { type FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  HardDrive,
  Link2,
  NotebookPen,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import type { LectureItem, VideoLink } from '../data/knowledgeHubData';
import type { LectureStudyEntry, WatchStatus } from '../hooks/useStudyProgress';

interface VideoPlayerModalProps {
  lecture: LectureItem | null;
  initialLinkIndex?: number;
  studyEntry: LectureStudyEntry;
  customSlides: VideoLink[];
  customSummaries: VideoLink[];
  onClose: () => void;
  onChangeStatus: (status: WatchStatus) => void;
  onUpdateMeta: (patch: { timestamp?: string; note?: string }) => void;
  onAddResource: (kind: 'slides' | 'summaries', link: VideoLink) => void;
  onRemoveResource: (kind: 'slides' | 'summaries', url: string) => void;
}

function parseTimestampToSeconds(raw: string): number {
  const cleaned = raw.trim();
  if (!cleaned) return 0;
  const parts = cleaned.split(':').map((n) => Number(n));
  if (parts.some((n) => Number.isNaN(n) || n < 0)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return 0;
}

function buildEmbedUrl(link: VideoLink | undefined, startSeconds = 0): {
  embedUrl: string | null;
  kind: 'youtube' | 'drive' | 'unsupported';
} {
  if (!link) return { embedUrl: null, kind: 'unsupported' };
  const url = link.url.trim();

  // YouTube patterns
  const ytMatch =
    url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/) ||
    url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/) ||
    url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (ytMatch?.[1]) {
    const startParam = startSeconds > 0 ? `&start=${startSeconds}` : '';
    return {
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0${startParam}`,
      kind: 'youtube',
    };
  }

  // Google Drive patterns
  const driveMatch =
    url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
    url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
  if (driveMatch?.[1]) {
    return {
      embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`,
      kind: 'drive',
    };
  }

  return { embedUrl: null, kind: 'unsupported' };
}

export function VideoPlayerModal({
  lecture,
  initialLinkIndex = 0,
  studyEntry,
  customSlides,
  customSummaries,
  onClose,
  onChangeStatus,
  onUpdateMeta,
  onAddResource,
  onRemoveResource,
}: VideoPlayerModalProps) {
  const [activeIndex, setActiveIndex] = useState(initialLinkIndex);
  const [appliedStartSec, setAppliedStartSec] = useState(0);
  const [timestampInput, setTimestampInput] = useState(studyEntry.timestamp ?? '');
  const [noteInput, setNoteInput] = useState(studyEntry.note ?? '');
  const [showAddRes, setShowAddRes] = useState(false);
  const [resKind, setResKind] = useState<'slides' | 'summaries'>('slides');
  const [resLabel, setResLabel] = useState('');
  const [resUrl, setResUrl] = useState('');

  useEffect(() => {
    setActiveIndex(initialLinkIndex);
    setAppliedStartSec(0);
  }, [lecture?.id, initialLinkIndex]);

  useEffect(() => {
    setTimestampInput(studyEntry.timestamp ?? '');
    setNoteInput(studyEntry.note ?? '');
  }, [lecture?.id, studyEntry.timestamp, studyEntry.note]);

  useEffect(() => {
    if (!lecture) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lecture, onClose]);

  const activeLink = lecture?.links[activeIndex] ?? lecture?.links[0];
  const embedInfo = useMemo(
    () => buildEmbedUrl(activeLink, appliedStartSec),
    [activeLink, appliedStartSec]
  );

  if (!lecture) return null;

  const allSlides = [...(lecture.slides ?? []), ...customSlides];
  const allSummaries = [...(lecture.summaries ?? []), ...customSummaries];

  const handleApplyTimestamp = () => {
    const cleaned = timestampInput.trim();
    onUpdateMeta({ timestamp: cleaned });
    const sec = parseTimestampToSeconds(cleaned);
    setAppliedStartSec(sec);
  };

  const handleAddResourceSubmit = (e: FormEvent) => {
    e.preventDefault();
    const url = resUrl.trim();
    if (!/^https?:\/\//i.test(url)) return;
    const label = resLabel.trim() || (resKind === 'slides' ? 'สไลด์ PDF / Drive' : 'ชีตสรุป');
    const source = url.includes('drive.google.com')
      ? 'drive'
      : url.toLowerCase().includes('.pdf')
        ? 'pdf'
        : url.includes('docs.google.com')
          ? 'docs'
          : 'external';
    onAddResource(resKind, { label, url, source });
    setResLabel('');
    setResUrl('');
    setShowAddRes(false);
  };

  const statusOptions: { id: WatchStatus; label: string }[] = [
    { id: 'unwatched', label: 'ยังไม่ได้ดู' },
    { id: 'completed', label: 'ดูจบแล้ว' },
    { id: 'reviewed', label: 'ทวนซ้ำแล้ว' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-player-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-2 sm:p-4 backdrop-blur-[2px]"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-(--border-hairline) bg-(--bg-surface) shadow-2xl"
      >
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border-hairline) px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-(--text-muted)">
              <span className="font-semibold text-(--text-primary)">{lecture.lectureLabel}</span>
              {lecture.mcqLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{lecture.mcqLabel.replace('ออกสอบ: ', '')}</span>
                </>
              )}
            </div>
            <h3
              id="video-player-modal-title"
              className="mt-0.5 truncate text-sm font-semibold text-(--text-primary) sm:text-base"
            >
              {lecture.title}
              {lecture.topic ? ` — ${lecture.topic}` : ''}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {activeLink && (
              <a
                href={activeLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--btn-bg) px-3 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--border-strong) whitespace-nowrap shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                <span>เปิดในแท็บใหม่</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดหน้าต่างวิดีโอ"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-(--border-hairline) bg-(--bg-subtle) text-(--text-secondary) hover:text-(--text-primary) cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Two-Zone Split Stage */}
        <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12">
          {/* Left / Top Stage: Video Embed */}
          <div className="flex flex-col border-b border-(--border-hairline) bg-black/95 lg:col-span-8 lg:border-b-0 lg:border-r">
            {lecture.links.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-white/10 bg-zinc-900 px-3 py-2">
                {lecture.links.map((link, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={`${link.url}-${idx}`}
                      type="button"
                      onClick={() => {
                        setActiveIndex(idx);
                        setAppliedStartSec(0);
                      }}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-white text-zinc-900'
                          : 'bg-white/10 text-zinc-200 hover:bg-white/20'
                      }`}
                    >
                      {link.source === 'drive' ? (
                        <HardDrive className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                      )}
                      <span>{link.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="relative aspect-video w-full bg-black">
              {embedInfo.embedUrl ? (
                <iframe
                  key={`${embedInfo.embedUrl}`}
                  src={embedInfo.embedUrl}
                  title={`${lecture.lectureLabel} - ${activeLink?.label ?? ''}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center text-zinc-300">
                  <p className="text-sm font-medium">
                    {activeLink
                      ? 'ไม่สามารถเล่นลิงก์นี้แบบฝังหน้าต่างได้โดยตรง'
                      : 'ยังไม่มีลิงก์คลิปวิดีโอสำหรับบทเรียนนี้'}
                  </p>
                  {activeLink && (
                    <a
                      href={activeLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-zinc-900"
                    >
                      <span>เปิดวิดีโอในแท็บใหม่</span>
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/95 px-4 py-2 text-[11px] text-zinc-300">
              <span>
                หากคลิปขึ้นว่าต้องลงชื่อเข้าใช้ ให้เปิดดูด้วยบัญชี <strong>@kkumail.com</strong> หรือกด &quot;เปิดในแท็บใหม่&quot;
              </span>
              {appliedStartSec > 0 && embedInfo.kind === 'youtube' && (
                <span className="tabular-nums text-emerald-300">
                  เริ่มที่วินาที {appliedStartSec} ({timestampInput})
                </span>
              )}
            </div>
          </div>

          {/* Right / Bottom Deck: Status, Timestamp Bookmark, Notes & Slides/Summaries */}
          <div className="flex flex-col gap-4 overflow-y-auto p-4 sm:p-5 lg:col-span-4">
            {/* Status Selector */}
            <div>
              <span className="text-xs font-semibold text-(--text-primary)">
                สถานะการเรียนบทนี้
              </span>
              <div className="mt-2 grid grid-cols-3 gap-1.5 rounded-xl border border-(--border-hairline) bg-(--bg-control) p-1">
                {statusOptions.map((opt) => {
                  const isSelected = studyEntry.status === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangeStatus(opt.id)}
                      className={`inline-flex min-h-[36px] items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-(--accent) text-(--accent-fg) shadow-xs'
                          : 'text-(--text-secondary) hover:text-(--text-primary)'
                      }`}
                    >
                      {opt.id === 'completed' && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                      {opt.id === 'reviewed' && <RotateCcw className="h-3.5 w-3.5 shrink-0" />}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timestamp Bookmark */}
            <div className="rounded-xl border border-(--border-hairline) bg-(--bg-subtle) p-3.5">
              <label
                htmlFor="modal-timestamp-input"
                className="flex items-center gap-1.5 text-xs font-semibold text-(--text-primary)"
              >
                <Clock className="h-3.5 w-3.5 text-(--text-secondary)" aria-hidden="true" />
                <span>ปักหมุดนาทีที่ดูค้าง (เช่น 42:15 หรือ 1:14:20)</span>
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="modal-timestamp-input"
                  type="text"
                  value={timestampInput}
                  onChange={(e) => {
                    setTimestampInput(e.target.value);
                    onUpdateMeta({ timestamp: e.target.value });
                  }}
                  placeholder="00:45:10"
                  className="w-full rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal tabular-nums text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
                />
                {embedInfo.kind === 'youtube' && (
                  <button
                    type="button"
                    onClick={handleApplyTimestamp}
                    disabled={!timestampInput.trim()}
                    className="min-h-[36px] rounded-lg bg-(--accent) px-3 py-1.5 text-xs font-medium text-(--accent-fg) disabled:opacity-45 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    ข้ามไปนาทีนี้
                  </button>
                )}
              </div>
            </div>

            {/* Quick Notes per Lecture */}
            <div className="flex flex-1 flex-col rounded-xl border border-(--border-hairline) bg-(--bg-subtle) p-3.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="modal-lec-note"
                  className="flex items-center gap-1.5 text-xs font-semibold text-(--text-primary)"
                >
                  <NotebookPen className="h-3.5 w-3.5 text-(--text-secondary)" aria-hidden="true" />
                  <span>โน้ตสั้น / จุดที่อาจารย์ย้ำออกสอบ</span>
                </label>
                <span className="text-[11px] text-(--text-muted)">บันทึกอัตโนมัติ</span>
              </div>
              <textarea
                id="modal-lec-note"
                rows={5}
                value={noteInput}
                onChange={(e) => {
                  setNoteInput(e.target.value);
                  onUpdateMeta({ note: e.target.value });
                }}
                placeholder="จดสรุปสั้นๆ จุดสำคัญ หรือนาทีที่ต้องกลับมาทวนซ้ำ..."
                className="mt-2 w-full flex-1 resize-y rounded-lg border border-(--border-hairline) bg-(--bg-surface) p-3 text-xs leading-relaxed text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
              />
            </div>

            {/* Unified Slides + Summary Sheets */}
            <div className="rounded-xl border border-(--border-hairline) bg-(--bg-subtle) p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-(--text-primary)">
                  <BookOpen className="h-3.5 w-3.5 text-(--text-secondary)" aria-hidden="true" />
                  <span>สไลด์ &amp; ชีตสรุปประจำบท</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddRes((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-2.5 py-1 text-[11px] font-medium text-(--text-primary) hover:border-(--border-strong) cursor-pointer"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                  <span>แนบลิงก์</span>
                </button>
              </div>

              {showAddRes && (
                <form
                  onSubmit={handleAddResourceSubmit}
                  className="mt-2.5 space-y-2 rounded-lg border border-(--border-hairline) bg-(--bg-surface) p-2.5"
                >
                  <div className="flex gap-1.5">
                    <select
                      aria-label="ประเภทไฟล์"
                      value={resKind}
                      onChange={(e) => setResKind(e.target.value as 'slides' | 'summaries')}
                      className="rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-2 py-1 text-xs leading-normal text-(--text-primary)"
                    >
                      <option value="slides">สไลด์ (PDF/Drive)</option>
                      <option value="summaries">ชีตสรุป</option>
                    </select>
                    <input
                      type="text"
                      value={resLabel}
                      onChange={(e) => setResLabel(e.target.value)}
                      placeholder="ชื่อปุ่ม (เช่น สไลด์ L18)"
                      className="w-full rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-2.5 py-1.5 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted)"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      required
                      value={resUrl}
                      onChange={(e) => setResUrl(e.target.value)}
                      placeholder="วางลิงก์ PDF / Google Drive..."
                      className="w-full rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-2.5 py-1.5 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted)"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-(--accent) px-3 py-1.5 text-xs font-medium text-(--accent-fg) whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      เพิ่ม
                    </button>
                  </div>
                </form>
              )}

              {allSlides.length === 0 && allSummaries.length === 0 ? (
                <p className="mt-2 text-[11px] text-(--text-muted)">
                  ยังไม่มีสไลด์หรือชีตสรุป · เพิ่มคอลัมน์ &quot;สไลด์&quot; / &quot;ชีตสรุป&quot; ใน Google Sheets หรือกดปุ่มแนบลิงก์ด้านบนได้ทันที
                </p>
              ) : (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {allSlides.map((s, idx) => {
                    const isCustom = customSlides.some((c) => c.url === s.url);
                    return (
                      <div key={`slide-${s.url}-${idx}`} className="inline-flex items-center gap-1">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-2.5 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--border-strong)"
                        >
                          <FileText className="h-3 w-3 text-sky-600" aria-hidden="true" />
                          <span>{s.label}</span>
                          <ArrowUpRight className="h-3 w-3 opacity-60" aria-hidden="true" />
                        </a>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => onRemoveResource('slides', s.url)}
                            aria-label={`ลบลิงก์ ${s.label}`}
                            className="rounded p-1 text-(--text-muted) hover:text-red-500 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {allSummaries.map((s, idx) => {
                    const isCustom = customSummaries.some((c) => c.url === s.url);
                    return (
                      <div key={`sum-${s.url}-${idx}`} className="inline-flex items-center gap-1">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-2.5 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--border-strong)"
                        >
                          <Link2 className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                          <span>{s.label}</span>
                          <ArrowUpRight className="h-3 w-3 opacity-60" aria-hidden="true" />
                        </a>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={() => onRemoveResource('summaries', s.url)}
                            aria-label={`ลบลิงก์ ${s.label}`}
                            className="rounded p-1 text-(--text-muted) hover:text-red-500 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
