/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type MouseEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Copy,
  Dna,
  FileText,
  Filter,
  FolderOpen,
  HardDrive,
  Hourglass,
  Link2,
  Mail,
  Microscope,
  NotebookPen,
  Play,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import {
  DEFAULT_SUBJECTS,
  GEN5_LECTURES,
  HEMATO_LECTURES,
  MCQ_FILTERS,
  MS_LECTURES,
  NS_LECTURES,
  SKIN_LECTURES,
  YEARS,
  type LabOspeCardItem,
  type LectureItem,
  type McqRound,
  type QuizQuestionItem,
  type SubjectId,
  type SubjectSection,
  type VideoLink,
  type YearId,
} from './data/knowledgeHubData';
import {
  GoogleSheetsPanel,
  type SheetSyncMeta,
  type SyncMergeMode,
} from './components/GoogleSheetsPanel';
import {
  NsModuleSyllabusPanel,
  Year2Semester2Panel,
} from './components/NsModuleDetails';
import { ExamCountdownBar } from './components/ExamCountdownBar';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { PracticeHub } from './components/PracticeHub';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  type LectureStudyEntry,
  type WatchStatus,
  useStudyProgress,
} from './hooks/useStudyProgress';
import { parseLinksCell, type SheetLectureRow } from './services/googleSheets';

const CUSTOM_LECTURES_STORAGE_KEY = 'pannawat-custom-lectures-v1';

type MinimalTheme = 'alabaster' | 'obsidian' | 'stone';

const THEME_OPTIONS: { id: MinimalTheme; label: string; swatch: string }[] = [
  { id: 'alabaster', label: 'Alabaster', swatch: '#2C4259' },
  { id: 'obsidian', label: 'Obsidian', swatch: '#14171D' },
  { id: 'stone', label: 'Stone', swatch: '#3F6251' },
];

function isCriticalNote(note: string): boolean {
  return /(เข้า|>=|≥|อ่านมาก่อน|มาเรียน|ไม่อนุญาต|จำกัด|ห้าม)/i.test(note);
}

const STATUS_BADGE_META: Record<
  WatchStatus,
  { label: string; buttonClass: string }
> = {
  unwatched: {
    label: 'ยังไม่ดู',
    buttonClass:
      'border-(--border-hairline) bg-(--bg-subtle) text-(--text-muted) hover:border-(--border-strong) hover:text-(--text-primary)',
  },
  completed: {
    label: 'ดูจบแล้ว',
    buttonClass:
      'border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
  },
  reviewed: {
    label: 'ทวนซ้ำแล้ว',
    buttonClass:
      'border-sky-500/35 bg-sky-500/12 text-sky-700 dark:text-sky-300',
  },
};

function TiltLectureCard({
  item,
  index,
  studyEntry,
  customSlides,
  customSummaries,
  onCycleStatus,
  onOpenPlayer,
  onDelete,
}: {
  item: LectureItem;
  index: number;
  studyEntry: LectureStudyEntry;
  customSlides: VideoLink[];
  customSummaries: VideoLink[];
  onCycleStatus: (id: string) => void;
  onOpenPlayer: (item: LectureItem, linkIdx?: number) => void;
  onDelete?: (id: string) => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const [copiedEmail, setCopiedEmail] = useState(false);

  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const smoothX = useSpring(mouseX, { stiffness: 280, damping: 24, mass: 0.45 });
  const smoothY = useSpring(mouseY, { stiffness: 280, damping: 24, mass: 0.45 });

  const rotateX = useTransform(smoothY, [0, 1], [6.5, -6.5]);
  const rotateY = useTransform(smoothX, [0, 1], [-6.5, 6.5]);
  const sheenX = useTransform(smoothX, [0, 1], ['0%', '100%']);
  const sheenY = useTransform(smoothY, [0, 1], ['0%', '100%']);
  const spotlight = useMotionTemplate`radial-gradient(280px circle at ${sheenX} ${sheenY}, var(--specular-color), transparent 72%)`;

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    if (prefersReducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const handleCopyEmail = () => {
    if (!item.subtitle.includes('@')) return;
    void navigator.clipboard?.writeText(item.subtitle.trim());
    setCopiedEmail(true);
    window.setTimeout(() => setCopiedEmail(false), 1800);
  };

  const isLab = item.mcqRound === 'lab';
  const statusMeta = STATUS_BADGE_META[studyEntry.status];
  const allSlides = [...(item.slides ?? []), ...customSlides];
  const allSummaries = [...(item.summaries ?? []), ...customSummaries];
  const hasCriticalNote = Boolean(item.note && isCriticalNote(item.note));

  return (
    <div className="perspective-scene">
      <motion.article
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.25,
          delay: Math.min(index * 0.02, 0.22),
          ease: [0.16, 1, 0.3, 1],
        }}
        whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.015 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.995 }}
        style={
          prefersReducedMotion
            ? {
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
                boxShadow: 'var(--shadow-card)',
              }
            : {
                rotateX,
                rotateY,
                transformStyle: 'preserve-3d',
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-hairline)',
                boxShadow: 'var(--shadow-card)',
              }
        }
        className={`group relative flex h-full flex-col justify-between rounded-xl border p-5 transition-[border-color,box-shadow,opacity] duration-200 hover:border-(--border-strong) hover:shadow-(--shadow-card-hover) ${
          studyEntry.status !== 'unwatched' ? 'border-emerald-500/25' : ''
        }`}
      >
        {/* Top specular edge */}
        <div
          aria-hidden="true"
          style={{ background: 'linear-gradient(90deg, transparent, var(--rim-highlight), transparent)' }}
          className="pointer-events-none absolute inset-x-4 top-0 h-px opacity-80"
        />

        {/* Pointer-tracking 3D sheen */}
        <motion.div
          aria-hidden="true"
          style={{ background: spotlight }}
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />

        <div className="relative preserve-3d">
          {/* Top Row: Unboxed Metadata + Interactive Watch Status Toggle */}
          <div className="depth-layer-sm flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-(--text-muted) tabular-nums">
              <span className="font-semibold tracking-tight text-(--text-primary)">
                {item.lectureLabel}
              </span>
              {item.mcqLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-(--text-secondary)">
                    {item.mcqLabel.replace('ออกสอบ: ', '')}
                  </span>
                </>
              )}
              {item.status && !item.mcqLabel && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{item.status}</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => onCycleStatus(item.id)}
              title="แตะเพื่อสลับสถานะ: ยังไม่ดู → ดูจบแล้ว → ทวนซ้ำแล้ว"
              className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${statusMeta.buttonClass}`}
            >
              {studyEntry.status === 'completed' ? (
                <CheckCircle2 className="h-3 w-3 shrink-0" aria-hidden="true" />
              ) : studyEntry.status === 'reviewed' ? (
                <RotateCcw className="h-3 w-3 shrink-0" aria-hidden="true" />
              ) : (
                <Circle className="h-3 w-3 shrink-0" aria-hidden="true" />
              )}
              <span>{statusMeta.label}</span>
            </button>
          </div>

          <h4 className="depth-layer-md mt-2.5 text-[15px] font-semibold leading-snug text-(--text-primary)">
            {item.title}
          </h4>

          {item.topic && (
            <p className="mt-1 text-xs font-medium leading-snug text-(--text-primary)/85">
              {item.topic}
            </p>
          )}

          {item.subtitle && (
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="flex min-w-0 items-start gap-1.5 text-xs leading-relaxed text-(--text-secondary)">
                {item.subtitle.includes('@') ? (
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--text-muted)" aria-hidden="true" />
                ) : isLab ? (
                  <Microscope className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--text-muted)" aria-hidden="true" />
                ) : null}
                <span className="break-all">{item.subtitle}</span>
              </p>

              {item.subtitle.includes('@') && (
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  title="คัดลอกอีเมลอาจารย์"
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-(--border-hairline) bg-(--bg-subtle) px-2 py-0.5 text-[11px] font-medium text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary) cursor-pointer"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                      <span className="text-emerald-600">คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" aria-hidden="true" />
                      <span>คัดลอก</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {item.schedule && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-(--text-muted) tabular-nums">
              <Calendar className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{item.schedule}</span>
            </p>
          )}

          {item.note && (
            hasCriticalNote ? (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{item.note}</span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-(--text-muted)">
                หมายเหตุ: {item.note}
              </p>
            )
          )}

          {/* Personal Timestamp & Short Study Note Preview */}
          {(studyEntry.timestamp || studyEntry.note) && (
            <button
              type="button"
              onClick={() => onOpenPlayer(item, 0)}
              className="mt-2.5 flex w-full flex-col gap-1 rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-2.5 py-2 text-left text-[11px] hover:border-(--border-strong) cursor-pointer"
            >
              {studyEntry.timestamp && (
                <span className="inline-flex items-center gap-1 font-medium tabular-nums text-(--text-primary)">
                  <Clock className="h-3 w-3 text-(--text-secondary)" aria-hidden="true" />
                  <span>ดูค้างที่ {studyEntry.timestamp}</span>
                </span>
              )}
              {studyEntry.note && (
                <span className="line-clamp-2 text-(--text-secondary)">
                  โน้ต: {studyEntry.note}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Unified Action Deck: Video Player Modal + External + Slides + Summary Sheets + Notes */}
        <div className="relative mt-5 flex flex-col gap-2.5 border-t border-(--border-hairline) pt-3.5 preserve-3d">
          <div className="depth-layer-sm flex flex-wrap items-center gap-1.5">
            {item.links.length > 0 ? (
              item.links.map((link, linkIdx) => (
                <div
                  key={`${item.id}-${link.label}-${linkIdx}`}
                  className="inline-flex items-center rounded-lg border border-(--border-hairline) bg-(--btn-bg) transition-colors hover:border-(--border-strong)"
                >
                  <button
                    type="button"
                    onClick={() => onOpenPlayer(item, linkIdx)}
                    className="inline-flex items-center gap-1.5 rounded-l-lg px-2.5 py-1.5 text-xs font-medium text-(--text-primary) hover:bg-(--btn-hover-bg) hover:text-(--btn-hover-fg) whitespace-nowrap cursor-pointer"
                  >
                    {link.source === 'drive' ? (
                      <HardDrive className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    ) : (
                      <Play className="h-3 w-3 shrink-0 fill-current" aria-hidden="true" />
                    )}
                    <span>{link.label}</span>
                  </button>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="เปิดดูในแท็บใหม่"
                    aria-label={`เปิด ${link.label} ในแท็บใหม่`}
                    className="border-l border-(--border-hairline) px-2 py-1.5 text-(--text-muted) hover:text-(--text-primary)"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              ))
            ) : (
              <span className="inline-flex items-center text-xs text-(--text-muted)">
                {item.status?.includes('ไม่อนุญาต')
                  ? 'ไม่อนุญาตให้เผยแพร่วิดีโอ'
                  : item.status === 'อัปโหลดแล้ว' && item.note
                    ? 'ตรวจสอบเงื่อนไขในหมายเหตุ'
                    : 'รออัปเดตลิงก์คลิปการสอน'}
              </span>
            )}
          </div>

          {/* Slides + Summary + Workspace Notes row */}
          <div className="depth-layer-sm flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {allSlides.map((slide, sIdx) => (
                <a
                  key={`slide-${slide.url}-${sIdx}`}
                  href={slide.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-2.5 py-1 text-[11px] font-medium text-(--text-primary) hover:border-(--border-strong)"
                >
                  <FileText className="h-3 w-3 text-sky-600" aria-hidden="true" />
                  <span>{slide.label}</span>
                  <ArrowUpRight className="h-3 w-3 opacity-60" aria-hidden="true" />
                </a>
              ))}

              {allSummaries.map((sum, sumIdx) => (
                <a
                  key={`sum-${sum.url}-${sumIdx}`}
                  href={sum.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-2.5 py-1 text-[11px] font-medium text-(--text-primary) hover:border-(--border-strong)"
                >
                  <Link2 className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                  <span>{sum.label}</span>
                  <ArrowUpRight className="h-3 w-3 opacity-60" aria-hidden="true" />
                </a>
              ))}

              <button
                type="button"
                onClick={() => onOpenPlayer(item, 0)}
                className="inline-flex items-center gap-1 rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-2.5 py-1 text-[11px] font-medium text-(--text-secondary) hover:border-(--border-strong) hover:text-(--text-primary) cursor-pointer"
              >
                <NotebookPen className="h-3 w-3" aria-hidden="true" />
                <span>จดโน้ต / สไลด์</span>
              </button>
            </div>

            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                aria-label={`ลบ ${item.lectureLabel}`}
                title="ลบรายการที่เพิ่มเอง"
                className="rounded-lg p-1.5 text-(--text-muted) transition-colors hover:bg-(--bg-subtle) hover:text-red-600 shrink-0 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </motion.article>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<MinimalTheme>(() => {
    if (typeof window === 'undefined') return 'alabaster';
    const saved = window.localStorage.getItem('pannawat-minimal-theme');
    return saved === 'obsidian' || saved === 'stone' || saved === 'alabaster' ? saved : 'alabaster';
  });
  const [activeYear, setActiveYear] = useState<YearId>('year2');
  const [activeSubject, setActiveSubject] = useState<SubjectId>('skin');
  const [mcqFilter, setMcqFilter] = useState<McqRound>('all');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetSections, setSheetSections] = useState<SubjectSection[] | null>(null);
  const [sheetSourceInfo, setSheetSourceInfo] = useState<SheetSyncMeta | null>(null);
  const [mergeMode, setMergeMode] = useState<SyncMergeMode>('merge');
  const [customLectures, setCustomLectures] = useState<SheetLectureRow[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(CUSTOM_LECTURES_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SheetLectureRow[]) : [];
    } catch {
      return [];
    }
  });
  const [onlyUnwatched, setOnlyUnwatched] = useState(false);
  const [playerState, setPlayerState] = useState<{
    lecture: LectureItem;
    linkIdx: number;
  } | null>(null);
  const [syncedQuizQuestions, setSyncedQuizQuestions] = useState<QuizQuestionItem[]>([]);
  const [syncedOspeCards, setSyncedOspeCards] = useState<LabOspeCardItem[]>([]);

  const {
    progressMap,
    getEntry,
    setStatus,
    cycleStatus,
    updateMeta,
    addCustomResource,
    removeCustomResource,
    getCustomResources,
    summarizeLectures,
  } = useStudyProgress();

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickLec, setQuickLec] = useState('');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSubtitle, setQuickSubtitle] = useState('');
  const [quickLinksText, setQuickLinksText] = useState('');
  const [quickSlidesText, setQuickSlidesText] = useState('');
  const [quickSummariesText, setQuickSummariesText] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('pannawat-minimal-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_LECTURES_STORAGE_KEY, JSON.stringify(customLectures));
  }, [customLectures]);

  const currentYearInfo = YEARS.find((y) => y.id === activeYear) ?? YEARS[1];
  const trimmedQuery = searchQuery.trim().toLowerCase();

  const builtInLectures = useMemo(
    () => [
      ...SKIN_LECTURES,
      ...GEN5_LECTURES,
      ...MS_LECTURES,
      ...HEMATO_LECTURES,
      ...NS_LECTURES,
    ],
    []
  );

  const activeSubjects = useMemo<SubjectSection[]>(() => {
    const builtInForYear = DEFAULT_SUBJECTS.filter(
      (sec) => (sec.yearId ?? 'year2') === activeYear
    );

    let baseSubjects: SubjectSection[];
    if (!sheetSections) {
      baseSubjects = builtInForYear;
    } else {
      const sheetForYear: SubjectSection[] = sheetSections
        .map((sec) => {
          const yearLectures = sec.lectures.filter((item) => {
            const itemYear = (item as Partial<SheetLectureRow>).yearId ?? sec.yearId ?? 'year2';
            return itemYear === activeYear;
          });
          return {
            ...sec,
            lectures: yearLectures,
          };
        })
        .filter((sec) => sec.lectures.length > 0);

      if (mergeMode === 'replace') {
        baseSubjects = sheetForYear;
      } else {
        const mergedMap = new Map<SubjectId, SubjectSection>();
        for (const sec of builtInForYear) {
          mergedMap.set(sec.id, sec);
        }
        for (const sec of sheetForYear) {
          const existing = mergedMap.get(sec.id);
          const enrichedLectures = sec.lectures.map((lec) => {
            const matchedBuiltIn = existing?.lectures.find(
              (b) =>
                b.lectureLabel.toLowerCase().replace(/\s+/g, '') ===
                  lec.lectureLabel.toLowerCase().replace(/\s+/g, '') ||
                (lec.title && b.title.trim() === lec.title.trim())
            );
            if (!matchedBuiltIn) return lec;
            return {
              ...lec,
              topic: lec.topic ?? matchedBuiltIn.topic,
              schedule: lec.schedule ?? matchedBuiltIn.schedule,
              mcqRound: lec.mcqRound ?? matchedBuiltIn.mcqRound,
              mcqRounds: lec.mcqRounds ?? matchedBuiltIn.mcqRounds,
              mcqLabel: lec.mcqLabel ?? matchedBuiltIn.mcqLabel,
            };
          });
          mergedMap.set(sec.id, {
            ...sec,
            lectures: enrichedLectures,
            playlistUrl: sec.playlistUrl ?? existing?.playlistUrl,
            notices:
              sec.notices && sec.notices.length > 0 ? sec.notices : existing?.notices,
          });
        }
        baseSubjects = Array.from(mergedMap.values());
      }
    }

    const customForYear = customLectures.filter((item) => item.yearId === activeYear);
    if (customForYear.length === 0) {
      return baseSubjects;
    }

    const bySubject = new Map<SubjectId, SheetLectureRow[]>();
    for (const item of customForYear) {
      const list = bySubject.get(item.subject) ?? [];
      list.push(item);
      bySubject.set(item.subject, list);
    }

    return baseSubjects.map((sec) => {
      const extra = bySubject.get(sec.id);
      if (!extra || extra.length === 0) return sec;
      return {
        ...sec,
        lectures: [...sec.lectures, ...extra],
      };
    });
  }, [activeYear, customLectures, mergeMode, sheetSections]);

  const currentSubject = useMemo(
    () => activeSubjects.find((s) => s.id === activeSubject) ?? activeSubjects[0],
    [activeSubject, activeSubjects]
  );

  const currentLectures = useMemo(
    () => currentSubject?.lectures ?? [],
    [currentSubject]
  );

  const availableMcqFilters = useMemo(() => {
    const presentRounds = new Set<Exclude<McqRound, 'all'>>();
    for (const item of currentLectures) {
      if (item.mcqRound) presentRounds.add(item.mcqRound);
      if (item.mcqRounds) {
        for (const r of item.mcqRounds) presentRounds.add(r);
      }
    }
    if (presentRounds.size === 0) return [];
    return MCQ_FILTERS.filter((f) => f.id === 'all' || presentRounds.has(f.id));
  }, [currentLectures]);

  const hasMcqRounds = availableMcqFilters.length > 1;

  const scopeLectures = useMemo(() => {
    if (!hasMcqRounds || mcqFilter === 'all') return currentLectures;
    return currentLectures.filter(
      (item) => item.mcqRound === mcqFilter || (item.mcqRounds?.includes(mcqFilter) ?? false)
    );
  }, [currentLectures, hasMcqRounds, mcqFilter]);

  const subjectProgressSummary = useMemo(
    () => summarizeLectures(scopeLectures),
    [scopeLectures, summarizeLectures]
  );

  const filteredLectures = useMemo(() => {
    return scopeLectures.filter((item) => {
      if (onlyUnwatched && getEntry(item.id).status !== 'unwatched') {
        return false;
      }
      if (!trimmedQuery) return true;
      const searchable = [
        item.lectureLabel,
        item.topic ?? '',
        item.schedule ?? '',
        item.title,
        item.subtitle,
        item.note ?? '',
        item.mcqLabel ?? '',
        item.status ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(trimmedQuery);
    });
  }, [getEntry, onlyUnwatched, scopeLectures, trimmedQuery]);

  const handleYearChange = (yearId: YearId) => {
    setActiveYear(yearId);
    setSearchQuery('');
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim() !== '' && !drawerOpen) {
      setDrawerOpen(true);
    }
  };

  const totalMatches = filteredLectures.length;

  const subjectSummaryLabel =
    activeSubjects.length > 0
      ? activeSubjects.map((s) => s.name).join(' · ')
      : 'SKIN & GEN 5 Block';

  return (
    <div className="min-h-screen bg-(--bg-canvas) text-(--text-primary) pb-20 transition-colors duration-200">
      {/* Minimal Architectural Header */}
      <header className="border-b border-(--border-hairline) bg-(--bg-surface) transition-colors duration-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium tracking-wider text-(--text-muted)">
              Medical Student Knowledge Hub · {subjectSummaryLabel}
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-(--text-primary) sm:text-3xl text-balance">
              Pannawat Learning Space
            </h1>
            <p className="mt-1 text-sm text-(--text-secondary)">
              ศูนย์รวมบทเรียน คลังคลิปการสอน และขอบเขตข้อสอบ MCQ
            </p>
          </div>

          {/* Right Controls: PWA Install + 3D Floating Year Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            <PWAInstallButton />

            <nav
              aria-label="เลือกชั้นปี"
              className="flex flex-wrap items-center gap-1 rounded-xl border border-(--border-hairline) bg-(--bg-control) p-1"
            >
              {YEARS.map((year) => {
                const isActive = year.id === activeYear;
                return (
                  <button
                    key={year.id}
                    type="button"
                    onClick={() => handleYearChange(year.id)}
                    className={`relative rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent) ${
                      isActive
                        ? 'text-(--accent-fg)'
                        : 'text-(--text-secondary) hover:text-(--text-primary)'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="yearTabIndicator"
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 420, damping: 32 }
                        }
                        className="absolute inset-0 rounded-lg bg-(--accent) shadow-xs"
                      />
                    )}
                    <span className="relative z-10">{year.shortLabel}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto mt-8 max-w-6xl px-4 sm:px-6">
        {/* Workspace Toolbar: Search + Minimal Palette Switcher */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {activeSubjects.length > 0 ? (
            <div className="relative flex flex-1 items-center rounded-xl border border-(--border-hairline) bg-(--bg-surface) px-4 py-1 shadow-(--shadow-card) transition-[border-color,box-shadow] focus-within:border-(--border-strong)">
              <Search className="mr-3 h-4 w-4 shrink-0 text-(--text-muted)" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="ค้นหาอาจารย์, วิชา, Lecture, หัวข้อ, หรือรอบข้อสอบ (MCQ I–IV)..."
                aria-label="ค้นหาบทเรียน"
                className="w-full bg-transparent py-2 text-sm leading-normal text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="ล้างคำค้นหา"
                  className="ml-2 rounded-lg p-1 text-(--text-muted) hover:bg-(--bg-subtle) hover:text-(--text-primary) cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            <div />
          )}

          {/* Minimal 3-Tone Theme Switcher */}
          <div
            role="group"
            aria-label="เลือกโทนสี"
            className="flex items-center gap-1 self-start rounded-xl border border-(--border-hairline) bg-(--bg-control) p-1 sm:self-auto"
          >
            {THEME_OPTIONS.map((option) => {
              const isSelected = theme === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTheme(option.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-(--bg-surface) text-(--text-primary) shadow-xs'
                      : 'text-(--text-secondary) hover:text-(--text-primary)'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: option.swatch }}
                    className="h-2.5 w-2.5 rounded-full border border-black/15"
                  />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Google Sheets Workspace Sync */}
        <div className="mb-6">
          <GoogleSheetsPanel
            builtInLectures={builtInLectures}
            activeSubjects={activeSubjects}
            isUsingSheetData={sheetSections !== null}
            mergeMode={mergeMode}
            onMergeModeChange={setMergeMode}
            onSyncSubjects={(sections, _allLectures, meta) => {
              const isNewSource = !sheetSourceInfo || sheetSourceInfo.title !== meta.title;
              setSheetSections(sections);
              setSheetSourceInfo(meta);
              if (
                isNewSource &&
                sections.length > 0 &&
                !sections.some((sec) => sec.id === activeSubject)
              ) {
                setActiveSubject(sections[0].id);
                setMcqFilter('all');
              }
            }}
            onSyncPractice={({ quizQuestions, ospeCards }) => {
              if (quizQuestions.length > 0) setSyncedQuizQuestions(quizQuestions);
              if (ospeCards.length > 0) setSyncedOspeCards(ospeCards);
            }}
            onUseBuiltInData={() => {
              setSheetSections(null);
              setSheetSourceInfo(null);
              setSyncedQuizQuestions([]);
              setSyncedOspeCards([]);
            }}
          />
        </div>

        <AnimatePresence mode="wait">
          {activeSubjects.length === 0 ? (
            <motion.section
              key={activeYear}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              style={{ boxShadow: 'var(--shadow-card)' }}
              className="rounded-2xl border border-(--border-hairline) bg-(--bg-surface) px-6 py-16 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-(--border-hairline) bg-(--bg-subtle) text-(--text-secondary)">
                {activeYear === 'year1' || activeYear === 'year3' ? (
                  <Hourglass className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <UserRound className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <h2 className="mt-4 text-lg font-semibold text-(--text-primary)">
                {currentYearInfo.fullTitle}
              </h2>
              <p className="mt-1.5 text-sm text-(--text-secondary)">
                {currentYearInfo.placeholderDescription}
              </p>
            </motion.section>
          ) : (
            <motion.div
              key={activeYear}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeYear === 'year2' && <Year2Semester2Panel />}

              {/* Lectures Directory Container */}
              <section
                style={{ boxShadow: 'var(--shadow-card)' }}
                className="rounded-2xl border border-(--border-hairline) bg-(--bg-surface)"
              >
                <button
                  type="button"
                  onClick={() => setDrawerOpen((prev) => !prev)}
                  aria-expanded={drawerOpen}
                  className="flex w-full items-center justify-between gap-4 rounded-2xl px-6 py-4 text-left text-sm font-semibold text-(--text-primary) transition-colors hover:bg-(--bg-subtle)/60 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)"
                >
                  <span className="flex items-center gap-2.5">
                    <FolderOpen className="h-4 w-4 shrink-0 text-(--text-secondary)" aria-hidden="true" />
                    <span>คลังคลิปการสอนอาจารย์ &amp; ขอบเขตสอบ MCQ ({subjectSummaryLabel})</span>
                  </span>
                  <motion.span
                    animate={{ rotate: drawerOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-(--text-muted)"
                  >
                    <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {drawerOpen && (
                    <motion.div
                      initial={prefersReducedMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="border-t border-(--border-hairline) p-5 sm:p-6"
                    >
                      {/* Dynamic Subject Tabs & Playlist */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-5">
                        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-(--border-hairline) bg-(--bg-control) p-1">
                          {activeSubjects.map((subject) => {
                            const isSelected = currentSubject?.id === subject.id;
                            const SubjectIcon = subject.id === 'skin' ? Dna : BookOpen;
                            return (
                              <button
                                key={subject.id}
                                type="button"
                                onClick={() => {
                                  setActiveSubject(subject.id);
                                  setMcqFilter('all');
                                }}
                                className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                  isSelected
                                    ? 'text-(--accent-fg)'
                                    : 'text-(--text-secondary) hover:text-(--text-primary)'
                                }`}
                              >
                                {isSelected && (
                                  <motion.span
                                    layoutId="subjectTabIndicator"
                                    transition={
                                      prefersReducedMotion
                                        ? { duration: 0 }
                                        : { type: 'spring', stiffness: 420, damping: 32 }
                                    }
                                    className="absolute inset-0 rounded-lg bg-(--accent) shadow-xs"
                                  />
                                )}
                                <SubjectIcon className="relative z-10 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span className="relative z-10 tabular-nums">
                                  วิชา {subject.name} ({subject.lectures.length})
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {sheetSourceInfo && (
                          <span className="text-xs text-(--text-secondary) tabular-nums">
                            ซิงค์จาก: {sheetSourceInfo.title} · อัปเดต {sheetSourceInfo.lastSyncedAt}
                          </span>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          {currentSubject?.playlistUrl && (
                            <a
                              href={currentSubject.playlistUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--btn-bg) px-3.5 py-2 text-xs font-medium text-(--text-primary) transition-colors hover:border-(--btn-hover-bg) hover:bg-(--btn-hover-bg) hover:text-(--btn-hover-fg) whitespace-nowrap shrink-0"
                            >
                              <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                              <span>Playlist รวมวิชา {currentSubject.name}</span>
                              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
                            </a>
                          )}

                          {currentSubject && (
                            <button
                              type="button"
                              onClick={() => setShowQuickAdd((prev) => !prev)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-3.5 py-2 text-xs font-medium text-(--text-primary) transition-colors hover:border-(--border-strong) whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>เพิ่ม Lec / YouTube</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {showQuickAdd && currentSubject && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const lecText = quickLec.trim();
                            const titleText = quickTitle.trim();
                            const parsedLinks = parseLinksCell(quickLinksText);
                            const parsedSlides = parseLinksCell(quickSlidesText, 'สไลด์');
                            const parsedSummaries = parseLinksCell(quickSummariesText, 'ชีตสรุป');
                            if (
                              !lecText &&
                              !titleText &&
                              parsedLinks.length === 0 &&
                              parsedSlides.length === 0 &&
                              parsedSummaries.length === 0
                            ) {
                              return;
                            }

                            const lectureLabel = lecText
                              ? /^(lec|skin|gen|lab)/i.test(lecText)
                                ? lecText
                                : `Lec ${lecText}`
                              : `Lec ${currentLectures.length + 1}`;

                            const newItem: SheetLectureRow = {
                              id: `custom-${currentSubject.id}-${Date.now()}`,
                              yearId: activeYear,
                              subject: currentSubject.id,
                              lectureLabel,
                              title: titleText || lectureLabel,
                              subtitle: quickSubtitle.trim(),
                              note: quickNote.trim() || undefined,
                              status: parsedLinks.length > 0 ? 'อัปโหลดแล้ว' : undefined,
                              links: parsedLinks,
                              slides: parsedSlides.length > 0 ? parsedSlides : undefined,
                              summaries: parsedSummaries.length > 0 ? parsedSummaries : undefined,
                            };

                            setCustomLectures((prev) => [...prev, newItem]);
                            setQuickLec('');
                            setQuickTitle('');
                            setQuickSubtitle('');
                            setQuickLinksText('');
                            setQuickSlidesText('');
                            setQuickSummariesText('');
                            setQuickNote('');
                            setShowQuickAdd(false);
                          }}
                          className="mb-5 space-y-3 rounded-xl border border-(--border-hairline) bg-(--bg-subtle) p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-(--text-primary)">
                              เพิ่มบทเรียนในวิชา {currentSubject.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowQuickAdd(false)}
                              aria-label="ปิดฟอร์มเพิ่มบทเรียน"
                              className="rounded p-1 text-(--text-muted) hover:text-(--text-primary) cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                            <input
                              type="text"
                              value={quickLec}
                              onChange={(e) => setQuickLec(e.target.value)}
                              placeholder="Lec ที่สอน (เช่น 1, 2)"
                              className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none"
                            />
                            <input
                              type="text"
                              value={quickTitle}
                              onChange={(e) => setQuickTitle(e.target.value)}
                              placeholder="ชื่ออาจารย์ / หัวข้อ"
                              className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none"
                            />
                            <input
                              type="text"
                              value={quickSubtitle}
                              onChange={(e) => setQuickSubtitle(e.target.value)}
                              placeholder="อีเมล / รายละเอียด (ถ้ามี)"
                              className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none"
                            />
                            <input
                              type="text"
                              value={quickNote}
                              onChange={(e) => setQuickNote(e.target.value)}
                              placeholder="หมายเหตุ (เช่น เข้า ≥ 60%)"
                              className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            <input
                              type="text"
                              value={quickSlidesText}
                              onChange={(e) => setQuickSlidesText(e.target.value)}
                              placeholder="ลิงก์สไลด์ PDF / Google Drive (ถ้ามี)"
                              className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none"
                            />
                            <input
                              type="text"
                              value={quickSummariesText}
                              onChange={(e) => setQuickSummariesText(e.target.value)}
                              placeholder="ลิงก์ชีตสรุปรุ่น / Docs (ถ้ามี)"
                              className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none"
                            />
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <textarea
                              rows={2}
                              value={quickLinksText}
                              onChange={(e) => setQuickLinksText(e.target.value)}
                              placeholder="วางลิงก์ YouTube / Google Drive (วางหลายบรรทัดได้ เช่น L1 https://youtu.be/...)"
                              className="w-full rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none"
                            />
                            <button
                              type="submit"
                              className="rounded-lg bg-(--accent) px-4 py-2 text-xs font-medium text-(--accent-fg) whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              เพิ่มการ์ด Lec
                            </button>
                          </div>
                        </form>
                      )}

                      {currentSubject?.notices && currentSubject.notices.length > 0 && (
                        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--text-secondary)">
                          {currentSubject.notices.map((notice) => (
                            <span key={notice}>{notice}</span>
                          ))}
                        </div>
                      )}

                      {/* Exam Countdown per Block */}
                      {currentSubject && (
                        <ExamCountdownBar
                          subjectId={currentSubject.id}
                          subjectName={currentSubject.name}
                          lectures={currentLectures}
                          progressMap={progressMap}
                          onSelectMcqRound={(round) => setMcqFilter(round)}
                        />
                      )}

                      {/* Watch Progress Bar + Unwatched Filter */}
                      {currentLectures.length > 0 && (
                        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-(--border-hairline) bg-(--bg-subtle) p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-semibold text-(--text-primary)">
                                ความคืบหน้าการดูคลิป ({currentSubject?.name}
                                {hasMcqRounds && mcqFilter !== 'all'
                                  ? ` · ${availableMcqFilters.find((f) => f.id === mcqFilter)?.label ?? ''}`
                                  : ''}
                                )
                              </span>
                              <span className="tabular-nums text-(--text-secondary)">
                                ดูจบแล้ว {subjectProgressSummary.watched}/{subjectProgressSummary.total} บท ({subjectProgressSummary.percent}%)
                                {subjectProgressSummary.reviewed > 0
                                  ? ` · ทวนซ้ำ ${subjectProgressSummary.reviewed}`
                                  : ''}
                              </span>
                            </div>
                            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-(--bg-control)">
                              <div
                                style={{ width: `${subjectProgressSummary.percent}%` }}
                                className="h-full rounded-full bg-(--accent) transition-[width] duration-300"
                              />
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setOnlyUnwatched((prev) => !prev)}
                            className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                              onlyUnwatched
                                ? 'border-(--accent) bg-(--accent) text-(--accent-fg)'
                                : 'border-(--border-hairline) bg-(--bg-surface) text-(--text-primary) hover:border-(--border-strong)'
                            }`}
                          >
                            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>เฉพาะคลิปที่ยังไม่ได้ดู ({subjectProgressSummary.unwatched})</span>
                          </button>
                        </div>
                      )}

                      {/* Minimal MCQ Filter Strip (shown automatically for subjects with MCQ metadata) */}
                      {hasMcqRounds && (
                        <div className="flex flex-wrap items-center gap-1.5 border-b border-(--border-hairline) pb-5">
                          {availableMcqFilters.map((f) => {
                            const isSelected = mcqFilter === f.id;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => setMcqFilter(f.id)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                  isSelected
                                    ? 'bg-(--accent) text-(--accent-fg)'
                                    : 'bg-(--bg-subtle) text-(--text-secondary) hover:text-(--text-primary)'
                                }`}
                              >
                                {f.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {currentSubject?.id === 'ns' && (
                        <NsModuleSyllabusPanel
                          searchQuery={searchQuery}
                          onSelectMcqScope={(round) => {
                            setMcqFilter(round);
                          }}
                        />
                      )}

                      {/* 3D Interactive Card Grid */}
                      {filteredLectures.length > 0 ? (
                        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                          {filteredLectures.map((item, idx) => {
                            const extraRes = getCustomResources(item.id);
                            return (
                              <TiltLectureCard
                                key={item.id}
                                item={item}
                                index={idx}
                                studyEntry={getEntry(item.id)}
                                customSlides={extraRes.slides ?? []}
                                customSummaries={extraRes.summaries ?? []}
                                onCycleStatus={cycleStatus}
                                onOpenPlayer={(lec, linkIdx = 0) =>
                                  setPlayerState({ lecture: lec, linkIdx })
                                }
                                onDelete={
                                  item.id.startsWith('custom-')
                                    ? (id) =>
                                        setCustomLectures((prev) =>
                                          prev.filter((entry) => entry.id !== id)
                                        )
                                    : undefined
                                }
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="mt-6 rounded-xl border border-dashed border-(--border-hairline) bg-(--bg-subtle) px-4 py-12 text-center">
                          <p className="text-sm font-medium text-(--text-secondary)">
                            {onlyUnwatched && currentLectures.length > 0
                              ? 'ดูบทเรียนในหมวดนี้ครบทั้งหมดแล้ว!'
                              : currentLectures.length === 0 && currentSubject
                                ? `ยังไม่มีข้อมูลบทเรียนในวิชา ${currentSubject.name}`
                                : 'ไม่พบรายการคลิปการสอนที่ตรงกับเงื่อนไขในหมวดนี้'}
                          </p>
                          {onlyUnwatched && currentLectures.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setOnlyUnwatched(false)}
                              className="mt-3 rounded-lg bg-(--accent) px-3.5 py-1.5 text-xs font-medium text-(--accent-fg) cursor-pointer"
                            >
                              แสดงทั้งหมด
                            </button>
                          )}
                          {currentLectures.length === 0 && currentSubject && (
                            <>
                              <p className="mt-1.5 text-xs text-(--text-muted)">
                                เพิ่มแท็บชื่อ &quot;{currentSubject.name}&quot; ใน Google Sheets เพื่อซิงค์อัตโนมัติ หรือเพิ่ม Lec และลิงก์ YouTube ได้ทันทีด้านล่าง
                              </p>
                              <button
                                type="button"
                                onClick={() => setShowQuickAdd(true)}
                                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-(--accent) px-4 py-2 text-xs font-medium text-(--accent-fg) whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>เพิ่ม Lec / ลิงก์ YouTube ในวิชา {currentSubject.name}</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Empty Search State */}
              {trimmedQuery !== '' && totalMatches === 0 && (
                <div className="rounded-2xl border border-(--border-hairline) bg-(--bg-surface) px-6 py-12 text-center text-(--text-secondary)">
                  <Search className="mx-auto h-6 w-6 text-(--text-muted)" aria-hidden="true" />
                  <p className="mt-2 text-sm">ไม่พบข้อมูลที่ตรงกับคำค้นหาของคุณ</p>
                </div>
              )}

              {/* Upgraded MCQ Practice, Active Recall & Lab/OSPE Image Recall Hub */}
              <PracticeHub
                activeSubjects={activeSubjects}
                syncedQuizQuestions={syncedQuizQuestions}
                syncedOspeCards={syncedOspeCards}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* In-App Modal Video Player & Study Workspace */}
      {playerState && (
        <VideoPlayerModal
          lecture={playerState.lecture}
          initialLinkIndex={playerState.linkIdx}
          studyEntry={getEntry(playerState.lecture.id)}
          customSlides={getCustomResources(playerState.lecture.id).slides ?? []}
          customSummaries={getCustomResources(playerState.lecture.id).summaries ?? []}
          onClose={() => setPlayerState(null)}
          onChangeStatus={(status) => setStatus(playerState.lecture.id, status)}
          onUpdateMeta={(patch) => updateMeta(playerState.lecture.id, patch)}
          onAddResource={(kind, link) =>
            addCustomResource(playerState.lecture.id, kind, link)
          }
          onRemoveResource={(kind, url) =>
            removeCustomResource(playerState.lecture.id, kind, url)
          }
        />
      )}

      <OfflineIndicator />
    </div>
  );
}


