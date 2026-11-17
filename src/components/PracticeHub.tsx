import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookCheck,
  Check,
  Copy,
  Eye,
  EyeOff,
  HelpCircle,
  ImagePlus,
  Layers,
  Microscope,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  BUILTIN_LAB_OSPE_CARDS,
  BUILTIN_QUIZ_QUESTIONS,
  type LabOspeCardItem,
  type QuizQuestionItem,
  type SubjectSection,
} from '../data/knowledgeHubData';
import { convertDriveImageUrl } from '../services/googleSheets';

const CUSTOM_QUIZ_KEY = 'pannawat-custom-quiz-v1';
const CUSTOM_OSPE_KEY = 'pannawat-custom-ospe-v1';
const PRACTICE_PROGRESS_KEY = 'pannawat-practice-progress-v1';

interface PracticeProgressState {
  wrongQuizIds: string[];
  masteredQuizIds: string[];
  reviewOspeIds: string[];
  masteredOspeIds: string[];
}

const EMPTY_PROGRESS: PracticeProgressState = {
  wrongQuizIds: [],
  masteredQuizIds: [],
  reviewOspeIds: [],
  masteredOspeIds: [],
};

interface PracticeHubProps {
  activeSubjects: SubjectSection[];
  syncedQuizQuestions: QuizQuestionItem[];
  syncedOspeCards: LabOspeCardItem[];
}

function resizeImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 960;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('ไม่สามารถเปิดไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });
}

export function PracticeHub({
  activeSubjects,
  syncedQuizQuestions,
  syncedOspeCards,
}: PracticeHubProps) {
  const [activeTab, setActiveTab] = useState<'mcq' | 'ospe'>('mcq');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  // MCQ Mode & Filters
  const [mcqStudyMode, setMcqStudyMode] = useState<'quiz' | 'flashcard'>('quiz');
  const [onlyWrongQuiz, setOnlyWrongQuiz] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [revealedQuizIds, setRevealedQuizIds] = useState<Record<string, boolean>>({});

  // OSPE Filters & Reveal
  const [onlyReviewOspe, setOnlyReviewOspe] = useState(false);
  const [revealedOspeIds, setRevealedOspeIds] = useState<Record<string, boolean>>({});
  const [clueVisibleIds, setClueVisibleIds] = useState<Record<string, boolean>>({});
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Persisted custom items & wrong/mastered states
  const [customQuiz, setCustomQuiz] = useState<QuizQuestionItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(CUSTOM_QUIZ_KEY);
      return raw ? (JSON.parse(raw) as QuizQuestionItem[]) : [];
    } catch {
      return [];
    }
  });
  const [customOspe, setCustomOspe] = useState<LabOspeCardItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(CUSTOM_OSPE_KEY);
      return raw ? (JSON.parse(raw) as LabOspeCardItem[]) : [];
    } catch {
      return [];
    }
  });
  const [progress, setProgress] = useState<PracticeProgressState>(() => {
    if (typeof window === 'undefined') return EMPTY_PROGRESS;
    try {
      const raw = window.localStorage.getItem(PRACTICE_PROGRESS_KEY);
      return raw ? { ...EMPTY_PROGRESS, ...(JSON.parse(raw) as Partial<PracticeProgressState>) } : EMPTY_PROGRESS;
    } catch {
      return EMPTY_PROGRESS;
    }
  });

  // Add Forms
  const [showAddQuiz, setShowAddQuiz] = useState(false);
  const [qSubject, setQSubject] = useState('ns');
  const [qScope, setQScope] = useState('MCQ I');
  const [qPrompt, setQPrompt] = useState('');
  const [qOptionsText, setQOptionsText] = useState('');
  const [qAnswer, setQAnswer] = useState('');
  const [qExplain, setQExplain] = useState('');

  const [showAddOspe, setShowAddOspe] = useState(false);
  const [oSubject, setOSubject] = useState('ns');
  const [oTitle, setOTitle] = useState('');
  const [oImageUrl, setOImageUrl] = useState('');
  const [oAnswer, setOAnswer] = useState('');
  const [oClues, setOClues] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const ospeFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_QUIZ_KEY, JSON.stringify(customQuiz));
  }, [customQuiz]);

  useEffect(() => {
    window.localStorage.setItem(CUSTOM_OSPE_KEY, JSON.stringify(customOspe));
  }, [customOspe]);

  useEffect(() => {
    window.localStorage.setItem(PRACTICE_PROGRESS_KEY, JSON.stringify(progress));
  }, [progress]);

  const allQuizQuestions = useMemo(() => {
    const base = syncedQuizQuestions.length > 0 ? syncedQuizQuestions : BUILTIN_QUIZ_QUESTIONS;
    return [...base, ...customQuiz];
  }, [customQuiz, syncedQuizQuestions]);

  const allOspeCards = useMemo(() => {
    const base = syncedOspeCards.length > 0 ? syncedOspeCards : BUILTIN_LAB_OSPE_CARDS;
    return [...base, ...customOspe];
  }, [customOspe, syncedOspeCards]);

  const filteredQuiz = useMemo(() => {
    return allQuizQuestions.filter((q) => {
      if (subjectFilter !== 'all' && q.subject !== subjectFilter) return false;
      if (onlyWrongQuiz && !progress.wrongQuizIds.includes(q.id)) return false;
      return true;
    });
  }, [allQuizQuestions, onlyWrongQuiz, progress.wrongQuizIds, subjectFilter]);

  const filteredOspe = useMemo(() => {
    return allOspeCards.filter((card) => {
      if (subjectFilter !== 'all' && card.subject !== subjectFilter) return false;
      if (onlyReviewOspe && !progress.reviewOspeIds.includes(card.id)) return false;
      return true;
    });
  }, [allOspeCards, onlyReviewOspe, progress.reviewOspeIds, subjectFilter]);

  const markQuizResult = (id: string, isCorrect: boolean) => {
    setProgress((prev) => {
      if (isCorrect) {
        return {
          ...prev,
          wrongQuizIds: prev.wrongQuizIds.filter((x) => x !== id),
          masteredQuizIds: prev.masteredQuizIds.includes(id)
            ? prev.masteredQuizIds
            : [...prev.masteredQuizIds, id],
        };
      }
      return {
        ...prev,
        masteredQuizIds: prev.masteredQuizIds.filter((x) => x !== id),
        wrongQuizIds: prev.wrongQuizIds.includes(id)
          ? prev.wrongQuizIds
          : [...prev.wrongQuizIds, id],
      };
    });
  };

  const markOspeResult = (id: string, mastered: boolean) => {
    setProgress((prev) => {
      if (mastered) {
        return {
          ...prev,
          reviewOspeIds: prev.reviewOspeIds.filter((x) => x !== id),
          masteredOspeIds: prev.masteredOspeIds.includes(id)
            ? prev.masteredOspeIds
            : [...prev.masteredOspeIds, id],
        };
      }
      return {
        ...prev,
        masteredOspeIds: prev.masteredOspeIds.filter((x) => x !== id),
        reviewOspeIds: prev.reviewOspeIds.includes(id)
          ? prev.reviewOspeIds
          : [...prev.reviewOspeIds, id],
      };
    });
  };

  const handleSelectOption = (q: QuizQuestionItem, opt: string) => {
    setSelectedAnswers((prev) => ({ ...prev, [q.id]: opt }));
    setRevealedQuizIds((prev) => ({ ...prev, [q.id]: true }));
    const normOpt = opt.trim().toLowerCase();
    const normAns = q.answer.trim().toLowerCase();
    const isCorrect =
      normOpt === normAns ||
      normAns.startsWith(normOpt.slice(0, 2)) ||
      normOpt.startsWith(normAns.slice(0, 2));
    markQuizResult(q.id, isCorrect);
  };

  const handleAddQuizSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!qPrompt.trim() || !qAnswer.trim()) return;
    const options = qOptionsText
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const newItem: QuizQuestionItem = {
      id: `custom-quiz-${Date.now()}`,
      subject: qSubject,
      mcqScope: qScope.trim() || undefined,
      question: qPrompt.trim(),
      options: options.length >= 2 ? options : undefined,
      answer: qAnswer.trim(),
      explanation: qExplain.trim() || undefined,
    };
    setCustomQuiz((prev) => [newItem, ...prev]);
    setQPrompt('');
    setQOptionsText('');
    setQAnswer('');
    setQExplain('');
    setShowAddQuiz(false);
  };

  const handleAddOspeSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!oAnswer.trim() && !oTitle.trim()) return;
    const newItem: LabOspeCardItem = {
      id: `custom-ospe-${Date.now()}`,
      subject: oSubject,
      title: oTitle.trim() || 'สไลด์ทวนสอบ Lab / OSPE',
      imageUrl: oImageUrl.trim() ? convertDriveImageUrl(oImageUrl.trim()) : '',
      structureOrDiagnosis: oAnswer.trim() || oTitle.trim(),
      clues: oClues.trim() || undefined,
    };
    setCustomOspe((prev) => [newItem, ...prev]);
    setOTitle('');
    setOImageUrl('');
    setOAnswer('');
    setOClues('');
    setShowAddOspe(false);
  };

  const handleOspeFilePick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFileToDataUrl(file);
      setOImageUrl(dataUrl);
    } catch {
      // ignore invalid file
    } finally {
      e.target.value = '';
    }
  };

  const handleCopyTemplate = (kind: 'quiz' | 'ospe') => {
    const text =
      kind === 'quiz'
        ? 'วิชา\tรอบสอบ\tหัวข้อ\tโจทย์\tตัวเลือก\tเฉลย\tคำอธิบาย'
        : 'วิชา\tหัวข้อ\tลิงก์รูปภาพ\tโครงสร้าง/คำวินิจฉัย\tจุดสังเกต\tรอบสอบ';
    void navigator.clipboard?.writeText(text);
    setCopiedTemplate(kind);
    window.setTimeout(() => setCopiedTemplate(null), 2200);
  };

  const subjectNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of activeSubjects) map.set(s.id, s.name);
    return map;
  }, [activeSubjects]);

  return (
    <section
      style={{ boxShadow: 'var(--shadow-card)' }}
      className="rounded-2xl border border-(--border-hairline) bg-(--bg-surface) p-5 sm:p-6"
    >
      {/* Header + Top Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--border-hairline) pb-4">
        <div>
          <h2 className="text-base font-semibold text-(--text-primary)">
            คลังข้อสอบ MCQ &amp; ทวนสไลด์ Lab / OSPE (Active Recall)
          </h2>
          <p className="mt-0.5 text-xs text-(--text-secondary)">
            {syncedQuizQuestions.length > 0 || syncedOspeCards.length > 0
              ? `ซิงค์โจทย์จากชีต ${syncedQuizQuestions.length} ข้อ · สไลด์ Lab ${syncedOspeCards.length} ภาพ`
              : 'ฝึกทำข้อสอบ แฟลชการ์ดทวนข้อผิด หรือซิงค์แท็บข้อสอบ / สไลด์จาก Google Sheets อัตโนมัติ'}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-(--border-hairline) bg-(--bg-control) p-1">
          <button
            type="button"
            onClick={() => setActiveTab('mcq')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'mcq'
                ? 'bg-(--accent) text-(--accent-fg) shadow-xs'
                : 'text-(--text-secondary) hover:text-(--text-primary)'
            }`}
          >
            <BookCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>ข้อสอบ MCQ / Flashcard ({allQuizQuestions.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ospe')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'ospe'
                ? 'bg-(--accent) text-(--accent-fg) shadow-xs'
                : 'text-(--text-secondary) hover:text-(--text-primary)'
            }`}
          >
            <Microscope className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Lab / OSPE Image Recall ({allOspeCards.length})</span>
          </button>
        </div>
      </div>

      {/* Shared Subject Filter Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubjectFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              subjectFilter === 'all'
                ? 'bg-(--accent) text-(--accent-fg)'
                : 'bg-(--bg-subtle) text-(--text-secondary) hover:text-(--text-primary)'
            }`}
          >
            ทุกวิชา
          </button>
          {activeSubjects.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => setSubjectFilter(sub.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                subjectFilter === sub.id
                  ? 'bg-(--accent) text-(--accent-fg)'
                  : 'bg-(--bg-subtle) text-(--text-secondary) hover:text-(--text-primary)'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>

        {activeTab === 'mcq' ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-(--border-hairline) bg-(--bg-control) p-0.5">
              <button
                type="button"
                onClick={() => setMcqStudyMode('quiz')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  mcqStudyMode === 'quiz'
                    ? 'bg-(--bg-surface) text-(--text-primary) shadow-2xs'
                    : 'text-(--text-secondary)'
                }`}
              >
                ฝึกทำข้อสอบ
              </button>
              <button
                type="button"
                onClick={() => setMcqStudyMode('flashcard')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                  mcqStudyMode === 'flashcard'
                    ? 'bg-(--bg-surface) text-(--text-primary) shadow-2xs'
                    : 'text-(--text-secondary)'
                }`}
              >
                <Layers className="h-3 w-3" />
                <span>Flashcard</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setOnlyWrongQuiz((p) => !p)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                onlyWrongQuiz
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-600'
                  : 'border-(--border-hairline) bg-(--bg-subtle) text-(--text-secondary) hover:text-(--text-primary)'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>เฉพาะข้อที่ตอบผิด ({progress.wrongQuizIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyTemplate('quiz')}
              className="inline-flex items-center gap-1 rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) cursor-pointer"
              title="คัดลอกหัวคอลัมน์สำหรับสร้างแท็บข้อสอบใน Google Sheets"
            >
              {copiedTemplate === 'quiz' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedTemplate === 'quiz' ? 'คัดลอกหัวตารางแล้ว' : 'หัวตาราง Sheets'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddQuiz((p) => !p)}
              className="inline-flex items-center gap-1 rounded-lg bg-(--accent) px-3 py-1.5 text-xs font-medium text-(--accent-fg) cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>เพิ่มโจทย์</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyReviewOspe((p) => !p)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                onlyReviewOspe
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-600'
                  : 'border-(--border-hairline) bg-(--bg-subtle) text-(--text-secondary) hover:text-(--text-primary)'
              }`}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>เฉพาะภาพที่ต้องทวน ({progress.reviewOspeIds.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyTemplate('ospe')}
              className="inline-flex items-center gap-1 rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-2.5 py-1.5 text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) cursor-pointer"
              title="คัดลอกหัวคอลัมน์สำหรับสร้างแท็บ Lab OSPE ใน Google Sheets"
            >
              {copiedTemplate === 'ospe' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedTemplate === 'ospe' ? 'คัดลอกหัวตารางแล้ว' : 'หัวตาราง Sheets'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddOspe((p) => !p)}
              className="inline-flex items-center gap-1 rounded-lg bg-(--accent) px-3 py-1.5 text-xs font-medium text-(--accent-fg) cursor-pointer"
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>เพิ่มภาพ Lab / OSPE</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: MCQ & Active Recall */}
      {activeTab === 'mcq' && (
        <div className="mt-5 space-y-4">
          {showAddQuiz && (
            <form
              onSubmit={handleAddQuizSubmit}
              className="space-y-3 rounded-xl border border-(--border-hairline) bg-(--bg-subtle) p-4"
            >
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <select
                  aria-label="วิชาของโจทย์"
                  value={qSubject}
                  onChange={(e) => setQSubject(e.target.value)}
                  className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-1.5 text-xs leading-normal text-(--text-primary)"
                >
                  {activeSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={qScope}
                  onChange={(e) => setQScope(e.target.value)}
                  placeholder="รอบสอบ (เช่น MCQ I)"
                  className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted)"
                />
                <input
                  type="text"
                  required
                  value={qAnswer}
                  onChange={(e) => setQAnswer(e.target.value)}
                  placeholder="เฉลยที่ถูกต้อง (เช่น C. CN VI)"
                  className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted)"
                />
              </div>
              <textarea
                rows={2}
                required
                value={qPrompt}
                onChange={(e) => setQPrompt(e.target.value)}
                placeholder="พิมพ์โจทย์คำถาม..."
                className="w-full rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted)"
              />
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <textarea
                  rows={3}
                  value={qOptionsText}
                  onChange={(e) => setQOptionsText(e.target.value)}
                  placeholder={'ตัวเลือก (บรรทัดละ 1 ข้อ ถ้ามี)\nA. ...\nB. ...'}
                  className="w-full rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted)"
                />
                <textarea
                  rows={3}
                  value={qExplain}
                  onChange={(e) => setQExplain(e.target.value)}
                  placeholder="คำอธิบาย / เหตุผลประกอบ (ถ้ามี)..."
                  className="w-full rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted)"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddQuiz(false)}
                  className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-1.5 text-xs text-(--text-secondary) cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-(--accent) px-4 py-1.5 text-xs font-medium text-(--accent-fg) cursor-pointer"
                >
                  บันทึกข้อสอบ
                </button>
              </div>
            </form>
          )}

          {filteredQuiz.length === 0 ? (
            <div className="rounded-xl border border-dashed border-(--border-hairline) bg-(--bg-subtle) px-4 py-10 text-center text-xs text-(--text-secondary)">
              {onlyWrongQuiz
                ? 'ยังไม่มีข้อที่ตอบผิดค้างไว้ · เก่งมาก!'
                : 'ไม่พบโจทย์ข้อสอบในหมวดนี้'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredQuiz.map((q, idx) => {
                const selected = selectedAnswers[q.id];
                const isRevealed = Boolean(revealedQuizIds[q.id]);
                const isWrong = progress.wrongQuizIds.includes(q.id);
                const isMastered = progress.masteredQuizIds.includes(q.id);
                const subLabel = subjectNames.get(q.subject) ?? q.subject.toUpperCase();

                return (
                  <article
                    key={q.id}
                    className="flex flex-col justify-between rounded-xl border border-(--border-hairline) bg-(--bg-subtle)/70 p-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-(--text-muted)">
                        <span>
                          ข้อ {idx + 1} · {subLabel}
                          {q.mcqScope ? ` · ${q.mcqScope}` : ''}
                          {q.topicTag ? ` · ${q.topicTag}` : ''}
                        </span>

                        <div className="flex items-center gap-2">
                          {isMastered && (
                            <span className="font-medium text-emerald-600">จำได้แล้ว</span>
                          )}
                          {isWrong && (
                            <span className="font-medium text-amber-600">ต้องทวนซ้ำ</span>
                          )}
                          {q.id.startsWith('custom-quiz-') && (
                            <button
                              type="button"
                              onClick={() =>
                                setCustomQuiz((prev) => prev.filter((item) => item.id !== q.id))
                              }
                              aria-label="ลบโจทย์"
                              className="text-(--text-muted) hover:text-red-500 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 text-sm font-medium leading-relaxed text-(--text-primary)">
                        {q.question}
                      </p>

                      {mcqStudyMode === 'quiz' && q.options && q.options.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {q.options.map((opt) => {
                            const isPicked = selected === opt;
                            const isCorrectOpt =
                              opt.trim().toLowerCase() === q.answer.trim().toLowerCase() ||
                              q.answer.trim().toLowerCase().startsWith(opt.trim().toLowerCase().slice(0, 2));

                            let styleClass =
                              'border-(--border-hairline) bg-(--bg-surface) text-(--text-primary) hover:border-(--border-strong)';
                            if (isRevealed) {
                              if (isCorrectOpt) {
                                styleClass = 'border-emerald-500/50 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300';
                              } else if (isPicked) {
                                styleClass = 'border-red-500/50 bg-red-500/12 text-red-600 dark:text-red-300';
                              }
                            }

                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => handleSelectOption(q, opt)}
                                className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors cursor-pointer ${styleClass}`}
                              >
                                <span>{opt}</span>
                                {isRevealed && isCorrectOpt && (
                                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                )}
                                {isRevealed && isPicked && !isCorrectOpt && (
                                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {isRevealed && (
                        <div className="mt-3 rounded-lg border border-(--border-hairline) bg-(--bg-surface) p-3 text-xs">
                          <p className="font-semibold text-(--text-primary)">
                            เฉลย: {q.answer}
                          </p>
                          {q.explanation && (
                            <p className="mt-1 leading-relaxed text-(--text-secondary)">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-(--border-hairline) pt-3">
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedQuizIds((prev) => ({ ...prev, [q.id]: !prev[q.id] }))
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-1.5 text-xs font-medium text-(--text-primary) cursor-pointer"
                      >
                        {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        <span>{isRevealed ? 'ซ่อนเฉลย' : 'เปิดเฉลย'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => markQuizResult(q.id, false)}
                          className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-2.5 py-1.5 text-xs text-(--text-secondary) hover:border-amber-500/50 hover:text-amber-600 cursor-pointer"
                        >
                          ยังไม่แม่น / ทวนซ้ำ
                        </button>
                        <button
                          type="button"
                          onClick={() => markQuizResult(q.id, true)}
                          className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-2.5 py-1.5 text-xs text-(--text-secondary) hover:border-emerald-500/50 hover:text-emerald-600 cursor-pointer"
                        >
                          แม่นแล้ว
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Lab / OSPE Image Recall */}
      {activeTab === 'ospe' && (
        <div className="mt-5 space-y-4">
          {showAddOspe && (
            <form
              onSubmit={handleAddOspeSubmit}
              className="space-y-3 rounded-xl border border-(--border-hairline) bg-(--bg-subtle) p-4"
            >
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <select
                  aria-label="วิชาของสไลด์"
                  value={oSubject}
                  onChange={(e) => setOSubject(e.target.value)}
                  className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-1.5 text-xs leading-normal text-(--text-primary)"
                >
                  {activeSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  required
                  value={oTitle}
                  onChange={(e) => setOTitle(e.target.value)}
                  placeholder="หัวข้อ (เช่น Lab 8 Glioblastoma)"
                  className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted)"
                />
                <input
                  type="text"
                  required
                  value={oAnswer}
                  onChange={(e) => setOAnswer(e.target.value)}
                  placeholder="เฉลยโครงสร้าง / คำวินิจฉัย"
                  className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted)"
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={oImageUrl}
                  onChange={(e) => setOImageUrl(e.target.value)}
                  placeholder="วางลิงก์รูป (Google Drive / URL) หรือกดอัปโหลดรูปสไลด์จาก iPad..."
                  className="w-full rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted)"
                />
                <input
                  ref={ospeFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleOspeFilePick}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => ospeFileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs font-medium text-(--text-primary) whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>เลือกรูปจากเครื่อง</span>
                </button>
              </div>

              <input
                type="text"
                value={oClues}
                onChange={(e) => setOClues(e.target.value)}
                placeholder="จุดสังเกต / คำใบ้ (เช่น Pseudopalisading necrosis)..."
                className="w-full rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted)"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddOspe(false)}
                  className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-1.5 text-xs text-(--text-secondary) cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-(--accent) px-4 py-1.5 text-xs font-medium text-(--accent-fg) cursor-pointer"
                >
                  เพิ่มสไลด์ทวนสอบ
                </button>
              </div>
            </form>
          )}

          {filteredOspe.length === 0 ? (
            <div className="rounded-xl border border-dashed border-(--border-hairline) bg-(--bg-subtle) px-4 py-10 text-center text-xs text-(--text-secondary)">
              {onlyReviewOspe
                ? 'ยังไม่มีภาพสไลด์ที่ค้างทวนซ้ำ'
                : 'ยังไม่มีภาพสไลด์ Lab / OSPE ในหมวดนี้ · กดปุ่ม "เพิ่มภาพ Lab / OSPE" ด้านบนเพื่ออัปโหลดรูปจาก iPad ได้ทันที'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredOspe.map((card) => {
                const isRevealed = Boolean(revealedOspeIds[card.id]);
                const showClue = Boolean(clueVisibleIds[card.id]);
                const hasValidImage = Boolean(card.imageUrl) && !brokenImages[card.id];
                const isReview = progress.reviewOspeIds.includes(card.id);
                const isMastered = progress.masteredOspeIds.includes(card.id);
                const subLabel = subjectNames.get(card.subject) ?? card.subject.toUpperCase();

                return (
                  <article
                    key={card.id}
                    className="flex flex-col justify-between overflow-hidden rounded-xl border border-(--border-hairline) bg-(--bg-subtle)/70"
                  >
                    {/* Specimen / Slide Image Container with CSS fallback */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-(--border-hairline) bg-(--bg-control)">
                      {hasValidImage ? (
                        <img
                          src={card.imageUrl}
                          alt={isRevealed ? card.structureOrDiagnosis : card.title}
                          loading="lazy"
                          onError={() =>
                            setBrokenImages((prev) => ({ ...prev, [card.id]: true }))
                          }
                          className="h-full w-full object-contain bg-black/80"
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center p-5 text-center">
                          <Microscope
                            className="h-8 w-8 text-(--text-muted)"
                            aria-hidden="true"
                          />
                          <p className="mt-2 text-xs font-medium text-(--text-secondary)">
                            {card.title}
                          </p>
                          <p className="mt-1 text-[11px] text-(--text-muted)">
                            การ์ดทบทวนจุดสังเกต Lab / OSPE (สามารถเพิ่มรูปสไลด์จริงของคุณจาก iPad หรือ Google Drive ได้)
                          </p>
                        </div>
                      )}

                      {!isRevealed && (
                        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-lg bg-black/75 px-3 py-1.5 text-[11px] text-white backdrop-blur-xs">
                          <span>ซ่อนชื่อโครงสร้าง / คำวินิจฉัยอยู่</span>
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4">
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-(--text-muted)">
                          <span>
                            {subLabel}
                            {card.topicTag ? ` · ${card.topicTag}` : ''}
                          </span>
                          <div className="flex items-center gap-2">
                            {isMastered && (
                              <span className="font-medium text-emerald-600">แม่นแล้ว</span>
                            )}
                            {isReview && (
                              <span className="font-medium text-amber-600">ต้องทวนซ้ำ</span>
                            )}
                            {card.id.startsWith('custom-ospe-') && (
                              <button
                                type="button"
                                onClick={() =>
                                  setCustomOspe((prev) => prev.filter((item) => item.id !== card.id))
                                }
                                aria-label="ลบการ์ดสไลด์"
                                className="text-(--text-muted) hover:text-red-500 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className="mt-1.5 text-sm font-semibold text-(--text-primary)">
                          {card.title}
                        </h4>

                        {showClue && card.clues && (
                          <p className="mt-2 rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs text-(--text-secondary)">
                            จุดสังเกต: {card.clues}
                          </p>
                        )}

                        {isRevealed ? (
                          <div className="mt-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-(--text-primary)">
                            เฉลย: {card.structureOrDiagnosis}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-(--text-muted)">
                            ลองระบุโครงสร้างหรือคำวินิจฉัยในใจก่อนกดเฉลย
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-(--border-hairline) pt-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setRevealedOspeIds((prev) => ({
                                ...prev,
                                [card.id]: !prev[card.id],
                              }))
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent) px-3 py-1.5 text-xs font-medium text-(--accent-fg) cursor-pointer"
                          >
                            {isRevealed ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                            <span>{isRevealed ? 'ซ่อนคำตอบ' : 'เฉลยโครงสร้าง'}</span>
                          </button>

                          {card.clues && (
                            <button
                              type="button"
                              onClick={() =>
                                setClueVisibleIds((prev) => ({
                                  ...prev,
                                  [card.id]: !prev[card.id],
                                }))
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-2.5 py-1.5 text-xs text-(--text-secondary) hover:text-(--text-primary) cursor-pointer"
                            >
                              <HelpCircle className="h-3.5 w-3.5" />
                              <span>{showClue ? 'ซ่อนคำใบ้' : 'คำใบ้'}</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => markOspeResult(card.id, false)}
                            className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-2.5 py-1.5 text-xs text-(--text-secondary) hover:border-amber-500/50 hover:text-amber-600 cursor-pointer"
                          >
                            ทวนซ้ำ
                          </button>
                          <button
                            type="button"
                            onClick={() => markOspeResult(card.id, true)}
                            className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-2.5 py-1.5 text-xs text-(--text-secondary) hover:border-emerald-500/50 hover:text-emerald-600 cursor-pointer"
                          >
                            แม่นแล้ว
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
