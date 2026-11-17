import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarClock, ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { LectureItem, McqRound, SubjectId } from '../data/knowledgeHubData';
import { type BlockExamConfig, DEFAULT_BLOCK_EXAMS } from '../data/nsModuleData';
import type { LectureStudyEntry } from '../hooks/useStudyProgress';

const EXAMS_STORAGE_KEY = 'pannawat-block-exams-v1';

interface ExamCountdownBarProps {
  subjectId: SubjectId;
  subjectName: string;
  lectures: LectureItem[];
  progressMap: Record<string, LectureStudyEntry>;
  onSelectMcqRound?: (round: McqRound) => void;
}

function getDaysRemaining(dateIso: string): number {
  const target = new Date(`${dateIso}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatThaiShortDate(dateIso: string): string {
  const parsed = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateIso;
  const buddhistYear = parsed.getFullYear() + 543;
  const shortBe = String(buddhistYear).slice(-2);
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${parsed.getDate()} ${months[parsed.getMonth()]} ${shortBe}`;
}

export function ExamCountdownBar({
  subjectId,
  subjectName,
  lectures,
  progressMap,
  onSelectMcqRound,
}: ExamCountdownBarProps) {
  const [customExams, setCustomExams] = useState<BlockExamConfig[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(EXAMS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as BlockExamConfig[]) : [];
    } catch {
      return [];
    }
  });
  const [dismissedDefaultIds, setDismissedDefaultIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(`${EXAMS_STORAGE_KEY}-dismissed`);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [expanded, setExpanded] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDateIso, setNewDateIso] = useState('');
  const [newMcqRound, setNewMcqRound] = useState<'' | 'mcq-1' | 'mcq-2' | 'mcq-3' | 'mcq-4' | 'lab'>('');
  const [avgHoursPerClip, setAvgHoursPerClip] = useState<number>(1.5);

  useEffect(() => {
    window.localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(customExams));
  }, [customExams]);

  useEffect(() => {
    window.localStorage.setItem(
      `${EXAMS_STORAGE_KEY}-dismissed`,
      JSON.stringify(dismissedDefaultIds)
    );
  }, [dismissedDefaultIds]);

  const subjectExams = useMemo(() => {
    const defaults = DEFAULT_BLOCK_EXAMS.filter(
      (ex) => ex.subjectId === subjectId && !dismissedDefaultIds.includes(ex.id)
    );
    const customs = customExams.filter((ex) => ex.subjectId === subjectId);
    return [...defaults, ...customs].sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  }, [customExams, dismissedDefaultIds, subjectId]);

  const computeExamStats = (exam: BlockExamConfig) => {
    const scopedLectures = exam.mcqRound
      ? lectures.filter(
          (lec) =>
            lec.mcqRound === exam.mcqRound ||
            (lec.mcqRounds?.includes(exam.mcqRound!) ?? false)
        )
      : lectures;

    const targetList = scopedLectures.length > 0 ? scopedLectures : lectures;
    const withVideo = targetList.filter((l) => l.links.length > 0);
    const pool = withVideo.length > 0 ? withVideo : targetList;
    const remainingCount = pool.filter(
      (l) => (progressMap[l.id]?.status ?? 'unwatched') === 'unwatched'
    ).length;

    const daysLeft = getDaysRemaining(exam.dateIso);
    const activeDays = Math.max(daysLeft, 1);
    const hoursRemaining = remainingCount * avgHoursPerClip;
    const hoursPerDay = remainingCount === 0 ? 0 : hoursRemaining / activeDays;

    return {
      totalScoped: pool.length,
      remainingCount,
      daysLeft,
      hoursPerDay,
    };
  };

  const handleAddExam = (e: FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newDateIso) return;
    const item: BlockExamConfig = {
      id: `custom-exam-${subjectId}-${Date.now()}`,
      subjectId,
      label: newLabel.trim(),
      dateIso: newDateIso,
      mcqRound: newMcqRound || undefined,
    };
    setCustomExams((prev) => [...prev, item]);
    setNewLabel('');
    setNewDateIso('');
    setNewMcqRound('');
    setShowAddForm(false);
    setExpanded(true);
  };

  const handleDeleteExam = (id: string) => {
    if (id.startsWith('custom-exam-')) {
      setCustomExams((prev) => prev.filter((ex) => ex.id !== id));
    } else {
      setDismissedDefaultIds((prev) => [...prev, id]);
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-(--border-hairline) bg-(--bg-subtle) p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="inline-flex items-center gap-2 text-left text-xs font-semibold text-(--text-primary) cursor-pointer"
        >
          <CalendarClock className="h-4 w-4 text-(--text-secondary)" aria-hidden="true" />
          <span>นับถอยหลังวันสอบ &amp; แผนเก็บคลิป (Exam Countdown · {subjectName})</span>
          <ChevronDown
            className={`h-3.5 w-3.5 text-(--text-muted) transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-2.5 py-1 text-[11px] leading-normal text-(--text-secondary)">
            <span>เฉลี่ย/คลิป:</span>
            <select
              aria-label="ความยาวคลิปเฉลี่ยต่อรายการ"
              value={avgHoursPerClip}
              onChange={(e) => setAvgHoursPerClip(Number(e.target.value))}
              className="bg-transparent py-0.5 text-[11px] leading-normal font-medium text-(--text-primary) focus:outline-none cursor-pointer"
            >
              <option value={1}>1 ชม.</option>
              <option value={1.5}>1.5 ชม.</option>
              <option value={2}>2 ชม.</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-2.5 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--border-strong) cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>ตั้งวันสอบ</span>
          </button>
        </div>
      </div>

      {showAddForm && (
        <form
          onSubmit={handleAddExam}
          className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-(--border-hairline) bg-(--bg-surface) p-3 sm:grid-cols-4"
        >
          <input
            type="text"
            required
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="ชื่อรอบสอบ (เช่น MCQ I)"
            className="rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted)"
          />
          <input
            type="date"
            required
            value={newDateIso}
            onChange={(e) => setNewDateIso(e.target.value)}
            aria-label="วันสอบ"
            className="rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-3 py-2 text-xs leading-normal text-(--text-primary)"
          />
          <select
            aria-label="ผูกกับรอบสอบ"
            value={newMcqRound}
            onChange={(e) =>
              setNewMcqRound(
                e.target.value as '' | 'mcq-1' | 'mcq-2' | 'mcq-3' | 'mcq-4' | 'lab'
              )
            }
            className="rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-3 py-1.5 text-xs leading-normal text-(--text-primary)"
          >
            <option value="">ทุกคลิปในวิชานี้</option>
            <option value="mcq-1">เฉพาะ MCQ I</option>
            <option value="mcq-2">เฉพาะ MCQ II</option>
            <option value="mcq-3">เฉพาะ MCQ III</option>
            <option value="mcq-4">เฉพาะ MCQ IV</option>
            <option value="lab">เฉพาะ Lab</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-(--accent) px-3 py-2 text-xs font-medium text-(--accent-fg) cursor-pointer"
          >
            เพิ่ม Countdown
          </button>
        </form>
      )}

      {expanded && (
        <div className="mt-3">
          {subjectExams.length === 0 ? (
            <p className="text-xs text-(--text-muted)">
              ยังไม่ได้กำหนดวันสอบของวิชา {subjectName} · กดปุ่ม &quot;ตั้งวันสอบ&quot; เพื่อเริ่มนับถอยหลังและคำนวณชั่วโมงเก็บคลิปต่อวัน
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
              {subjectExams.map((exam) => {
                const stats = computeExamStats(exam);
                const isUrgent = stats.daysLeft >= 0 && stats.daysLeft <= 7;
                const isPast = stats.daysLeft < 0;

                return (
                  <div
                    key={exam.id}
                    className="flex flex-col justify-between rounded-xl border border-(--border-hairline) bg-(--bg-surface) p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] tabular-nums text-(--text-muted)">
                          <span>{formatThaiShortDate(exam.dateIso)}</span>
                          {exam.timeNote && <span>· {exam.timeNote}</span>}
                        </div>
                        <p className="mt-0.5 text-xs font-semibold text-(--text-primary)">
                          {exam.label}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteExam(exam.id)}
                        aria-label={`ลบ ${exam.label}`}
                        className="rounded p-1 text-(--text-muted) hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-(--border-hairline) pt-2 text-xs tabular-nums">
                      <span
                        className={`font-semibold ${
                          isPast
                            ? 'text-(--text-muted)'
                            : isUrgent
                              ? 'text-amber-600'
                              : 'text-(--text-primary)'
                        }`}
                      >
                        {isPast
                          ? `ผ่านวันสอบมา ${Math.abs(stats.daysLeft)} วัน`
                          : stats.daysLeft === 0
                            ? 'สอบวันนี้!'
                            : `เหลืออีก ${stats.daysLeft} วัน`}
                      </span>

                      <span className="text-(--text-secondary)">
                        {stats.remainingCount === 0
                          ? `ดูครบทั้ง ${stats.totalScoped} บทแล้ว`
                          : `ค้าง ${stats.remainingCount} คลิป (~${stats.hoursPerDay.toFixed(1)} ชม./วัน)`}
                      </span>
                    </div>

                    {exam.mcqRound && onSelectMcqRound && (
                      <button
                        type="button"
                        onClick={() => onSelectMcqRound(exam.mcqRound!)}
                        className="mt-2 self-start text-[11px] font-medium text-(--text-secondary) underline decoration-(--border-strong) underline-offset-2 hover:text-(--text-primary) cursor-pointer"
                      >
                        กรองดูเฉพาะบทเรียนในรอบนี้
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
