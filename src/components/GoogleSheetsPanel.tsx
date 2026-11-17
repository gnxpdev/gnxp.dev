import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronDown,
  Database,
  FileSpreadsheet,
  FolderPlus,
  Link2,
  LogOut,
  Plus,
  Radio,
  RefreshCw,
  Table2,
  Upload,
  X,
} from 'lucide-react';
import type {
  LabOspeCardItem,
  LectureItem,
  QuizQuestionItem,
  SubjectSection,
} from '../data/knowledgeHubData';
import { getAccessToken, googleSignIn, initAuth, logout } from '../services/googleAuth';
import {
  appendLectureRowToSheet,
  createKnowledgeHubSpreadsheet,
  detectSheetTabKind,
  extractSpreadsheetGid,
  extractSpreadsheetId,
  getSpreadsheetMetadata,
  listUserSpreadsheets,
  overwriteSheetWithLectures,
  parseCsv,
  parseOspeSheetValues,
  parseQuizSheetValues,
  parseSheetValues,
  syncAllOAuthSheetTabs,
  syncAllPublicSheetTabs,
  WorkspaceAuthExpiredError,
  type DriveSpreadsheetFile,
  type MultiTabSyncResult,
  type SheetLectureRow,
  type SpreadsheetMetadata,
} from '../services/googleSheets';

export type SyncMergeMode = 'merge' | 'replace';

export interface SheetSyncMeta {
  title: string;
  tabCount: number;
  subjectCount: number;
  lectureCount: number;
  url?: string;
  lastSyncedAt: string;
}

interface PendingMutation {
  title: string;
  description: string;
  confirmLabel: string;
  details: string[];
  execute: () => Promise<void>;
}

interface GoogleSheetsPanelProps {
  builtInLectures: LectureItem[];
  activeSubjects: SubjectSection[];
  isUsingSheetData: boolean;
  mergeMode: SyncMergeMode;
  onMergeModeChange: (mode: SyncMergeMode) => void;
  onSyncSubjects: (
    sections: SubjectSection[],
    allLectures: SheetLectureRow[],
    meta: SheetSyncMeta
  ) => void;
  onSyncPractice?: (data: {
    quizQuestions: QuizQuestionItem[];
    ospeCards: LabOspeCardItem[];
  }) => void;
  onUseBuiltInData: () => void;
}

type ConnectionMode = 'public' | 'oauth';
type PollIntervalSec = 0 | 5 | 10 | 30;

const PUBLIC_SHEET_STORAGE_KEY = 'pannawat-public-sheet-config-v1';

interface SavedPublicConfig {
  urlOrId: string;
  sheetName: string;
  gid: string;
  pollSec: PollIntervalSec;
}

function formatSyncTime(date: Date): string {
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function GoogleSheetsPanel({
  builtInLectures,
  activeSubjects,
  isUsingSheetData,
  mergeMode,
  onMergeModeChange,
  onSyncSubjects,
  onSyncPractice,
  onUseBuiltInData,
}: GoogleSheetsPanelProps) {
  const [mode, setMode] = useState<ConnectionMode>('public');

  // Public real-time link state (no login required, persisted URL config only)
  const [publicUrlInput, setPublicUrlInput] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = window.localStorage.getItem(PUBLIC_SHEET_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedPublicConfig).urlOrId ?? '' : '';
    } catch {
      return '';
    }
  });
  const [publicTabs, setPublicTabs] = useState<Array<{ title: string; gid: string }>>([]);
  const [publicActiveConfig, setPublicActiveConfig] = useState<SavedPublicConfig | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(PUBLIC_SHEET_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedPublicConfig) : null;
    } catch {
      return null;
    }
  });
  const [publicTitle, setPublicTitle] = useState<string>('Google Sheet');

  // Polling interval for real-time auto-sync (applies to both Public & OAuth modes)
  const [pollIntervalSec, setPollIntervalSec] = useState<PollIntervalSec>(() => {
    if (typeof window === 'undefined') return 10;
    try {
      const raw = window.localStorage.getItem(PUBLIC_SHEET_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as SavedPublicConfig).pollSec ?? 10 : 10;
    } catch {
      return 10;
    }
  });

  // OAuth private-sheet state
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [manualIdInput, setManualIdInput] = useState('');
  const [metadata, setMetadata] = useState<SpreadsheetMetadata | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>('');

  // Shared UI & preview state
  const [panelOpen, setPanelOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [rawRowsByTab, setRawRowsByTab] = useState<Record<string, string[][]>>({});
  const [previewTabTitle, setPreviewTabTitle] = useState<string>('');
  const [showTablePreview, setShowTablePreview] = useState(false);
  const [showAddRowForm, setShowAddRowForm] = useState(false);

  // Add row form fields (for OAuth mode)
  const [newSubject, setNewSubject] = useState<string>('GEN 5');
  const [newLectureLabel, setNewLectureLabel] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newMcqScope, setNewMcqScope] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');

  // Mandatory explicit confirmation modal before any mutating API call
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);
  const [isMutating, setIsMutating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const requireToken = useCallback(async (): Promise<string | null> => {
    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return null;
    }
    return token;
  }, []);

  const handleApiError = useCallback((err: unknown) => {
    if (err instanceof WorkspaceAuthExpiredError) {
      setNeedsAuth(true);
    }
    setErrorMessage(
      err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets'
    );
  }, []);

  const applyMultiTabResult = useCallback(
    (result: MultiTabSyncResult, silent = false) => {
      setRawRowsByTab(result.rawRowsByTab);
      setPreviewTabTitle((prev) =>
        prev && result.rawRowsByTab[prev] ? prev : result.tabs[0]?.title ?? ''
      );

      const syncedAt = formatSyncTime(new Date());
      setLastSyncedAt(syncedAt);

      onSyncSubjects(result.sections, result.allLectures, {
        title: result.title,
        tabCount: result.tabs.length,
        subjectCount: result.sections.length,
        lectureCount: result.allLectures.length,
        url: result.spreadsheetUrl,
        lastSyncedAt: syncedAt,
      });

      if (onSyncPractice) {
        onSyncPractice({
          quizQuestions: result.quizQuestions,
          ospeCards: result.ospeCards,
        });
      }

      if (!silent) {
        const extraPracticeParts: string[] = [];
        if (result.quizQuestions.length > 0) extraPracticeParts.push(`${result.quizQuestions.length} ข้อสอบ`);
        if (result.ospeCards.length > 0) extraPracticeParts.push(`${result.ospeCards.length} สไลด์ Lab`);
        const extraSuffix =
          extraPracticeParts.length > 0 ? ` · ${extraPracticeParts.join(', ')}` : '';
        setStatusMessage(
          `ซิงค์ข้อมูลจาก "${result.title}" แล้ว · พบ ${result.sections.length} วิชา (${result.allLectures.length} รายการ${extraSuffix}) จาก ${result.tabs.length} แท็บ`
        );
      }
    },
    [onSyncPractice, onSyncSubjects]
  );

  // ---- Public Sheet Multi-Tab Sync Logic ----
  const syncPublicSheet = useCallback(
    async (config: SavedPublicConfig, silent = false) => {
      const spreadsheetId = extractSpreadsheetId(config.urlOrId);
      if (!spreadsheetId) return;

      if (!silent) {
        setIsSyncing(true);
        setErrorMessage(null);
      }
      try {
        const result = await syncAllPublicSheetTabs(spreadsheetId, {
          preferredGid: config.gid || undefined,
          knownTabs: publicTabs,
          knownTitle: publicTitle,
        });

        setPublicTitle(result.title);
        setPublicTabs(result.tabs);
        applyMultiTabResult(result, silent);
        if (silent) {
          setErrorMessage(null);
        }
      } catch (err) {
        if (!silent) {
          handleApiError(err);
        }
      } finally {
        if (!silent) {
          setIsSyncing(false);
        }
      }
    },
    [applyMultiTabResult, handleApiError, publicTabs, publicTitle]
  );

  const handleConnectPublicUrl = async () => {
    const spreadsheetId = extractSpreadsheetId(publicUrlInput);
    if (!spreadsheetId || spreadsheetId.length < 10) {
      setErrorMessage('กรุณาวางลิงก์ Google Sheets หรือ Spreadsheet ID ให้ถูกต้อง');
      return;
    }

    const gid = extractSpreadsheetGid(publicUrlInput) ?? '';
    const nextConfig: SavedPublicConfig = {
      urlOrId: publicUrlInput.trim(),
      sheetName: '',
      gid,
      pollSec: pollIntervalSec,
    };

    setPublicActiveConfig(nextConfig);
    window.localStorage.setItem(PUBLIC_SHEET_STORAGE_KEY, JSON.stringify(nextConfig));
    await syncPublicSheet(nextConfig, false);
  };

  const handleDisconnectPublic = () => {
    setPublicActiveConfig(null);
    setPublicTabs([]);
    setRawRowsByTab({});
    setPreviewTabTitle('');
    setLastSyncedAt(null);
    setStatusMessage(null);
    window.localStorage.removeItem(PUBLIC_SHEET_STORAGE_KEY);
    onUseBuiltInData();
  };

  // ---- OAuth Private Sheet Multi-Tab Sync Logic ----
  const loadDriveFiles = async (tokenOverride?: string) => {
    const token = tokenOverride ?? (await requireToken());
    if (!token) {
      setErrorMessage('กรุณาลงชื่อเข้าใช้ Google ก่อนโหลดรายชื่อไฟล์');
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const files = await listUserSpreadsheets(token);
      setDriveFiles(files);
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncOAuthAllTabs = useCallback(
    async (
      targetMeta: SpreadsheetMetadata | null = metadata,
      tokenOverride?: string,
      silent = false
    ) => {
      if (!targetMeta) return;
      const token = tokenOverride ?? (await requireToken());
      if (!token) return;

      if (!silent) {
        setIsSyncing(true);
        setErrorMessage(null);
      }
      try {
        // Refresh spreadsheet metadata so newly created tabs are discovered in real time
        const freshMeta = await getSpreadsheetMetadata(token, targetMeta.spreadsheetId);
        setMetadata(freshMeta);
        setSelectedTab((prev) =>
          prev && freshMeta.sheets.some((s) => s.title === prev)
            ? prev
            : freshMeta.sheets[0]?.title ?? ''
        );

        const result = await syncAllOAuthSheetTabs(token, freshMeta);
        applyMultiTabResult(result, silent);
      } catch (err) {
        if (!silent) {
          handleApiError(err);
        } else if (err instanceof WorkspaceAuthExpiredError) {
          setNeedsAuth(true);
        }
      } finally {
        if (!silent) {
          setIsSyncing(false);
        }
      }
    },
    [applyMultiTabResult, handleApiError, metadata, requireToken]
  );

  const handleSelectOAuthSpreadsheet = async (rawIdOrUrl: string, tokenOverride?: string) => {
    const spreadsheetId = extractSpreadsheetId(rawIdOrUrl);
    if (!spreadsheetId) {
      setErrorMessage('กรุณากรอก Google Sheets URL หรือ Spreadsheet ID');
      return;
    }

    const token = tokenOverride ?? (await requireToken());
    if (!token) {
      setErrorMessage('กรุณาลงชื่อเข้าใช้ Google ก่อนเปิดไฟล์');
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);
    try {
      const meta = await getSpreadsheetMetadata(token, spreadsheetId);
      setMetadata(meta);
      const firstTab = meta.sheets[0]?.title ?? '';
      setSelectedTab(firstTab);
      setPreviewTabTitle(firstTab);
      await syncOAuthAllTabs(meta, token, false);
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setNeedsAuth(false);
      await loadDriveFiles(result.accessToken);
    } catch (err) {
      handleApiError(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setDriveFiles([]);
    setMetadata(null);
    setSelectedTab('');
    setRawRowsByTab({});
    setPreviewTabTitle('');
    setLastSyncedAt(null);
    onUseBuiltInData();
  };

  // Auto-load saved public sheet on first mount
  useEffect(() => {
    if (mode === 'public' && publicActiveConfig) {
      void syncPublicSheet(publicActiveConfig, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time background polling + window focus instant sync
  useEffect(() => {
    const hasPublicTarget = mode === 'public' && Boolean(publicActiveConfig);
    const hasOAuthTarget = mode === 'oauth' && !needsAuth && Boolean(metadata);

    if (!hasPublicTarget && !hasOAuthTarget) return;

    const runSilentSync = () => {
      if (document.visibilityState === 'hidden') return;
      if (hasPublicTarget && publicActiveConfig) {
        void syncPublicSheet(publicActiveConfig, true);
      } else if (hasOAuthTarget && metadata) {
        void syncOAuthAllTabs(metadata, undefined, true);
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        runSilentSync();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    let timerId: number | undefined;
    if (pollIntervalSec > 0) {
      timerId = window.setInterval(runSilentSync, pollIntervalSec * 1000);
    }

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (timerId !== undefined) window.clearInterval(timerId);
    };
  }, [
    metadata,
    mode,
    needsAuth,
    pollIntervalSec,
    publicActiveConfig,
    syncOAuthAllTabs,
    syncPublicSheet,
  ]);

  const handlePollIntervalChange = (nextSec: PollIntervalSec) => {
    setPollIntervalSec(nextSec);
    if (publicActiveConfig) {
      const updated = { ...publicActiveConfig, pollSec: nextSec };
      setPublicActiveConfig(updated);
      window.localStorage.setItem(PUBLIC_SHEET_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const handleUploadLocalCsv = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const hint = file.name.replace(/\.csv$/i, '');
      const kind = detectSheetTabKind(rows, hint);

      if (kind === 'quiz') {
        const quizQuestions = parseQuizSheetValues(rows, hint);
        if (onSyncPractice) {
          onSyncPractice({ quizQuestions, ospeCards: [] });
        }
        setStatusMessage(`นำเข้าข้อสอบจาก "${file.name}" แล้ว · ${quizQuestions.length} ข้อ`);
        return;
      }

      if (kind === 'ospe') {
        const ospeCards = parseOspeSheetValues(rows, hint);
        if (onSyncPractice) {
          onSyncPractice({ quizQuestions: [], ospeCards });
        }
        setStatusMessage(`นำเข้าสไลด์ Lab / OSPE จาก "${file.name}" แล้ว · ${ospeCards.length} รายการ`);
        return;
      }

      const parsed = parseSheetValues(rows, 'CSV Import');
      const tabTitle = parsed.detectedSubjectName || hint || 'CSV Import';
      applyMultiTabResult(
        {
          title: file.name,
          spreadsheetUrl: '',
          tabs: [{ title: tabTitle, gid: 'csv' }],
          sections: parsed.subjectSections,
          allLectures: parsed.lectures,
          quizQuestions: [],
          ospeCards: [],
          rawRowsByTab: { [tabTitle]: rows },
        },
        false
      );
    } catch (err) {
      handleApiError(err);
    } finally {
      e.target.value = '';
    }
  };

  // ---- OAuth Mutating Actions (with Mandatory Confirmation Modal) ----
  const requestCreateTemplateSheet = () => {
    setPendingMutation({
      title: 'สร้าง Google Sheet ใหม่ใน Google Drive',
      description:
        'ระบบจะสร้างสเปรดชีตใหม่ชื่อ "Pannawat Learning Space - Lectures" และเขียนข้อมูลบทเรียน SKIN & GEN 5 ทั้งหมดลงในแท็บ Lectures',
      confirmLabel: 'ยืนยันสร้าง Google Sheet',
      details: [
        'ชื่อไฟล์: Pannawat Learning Space - Lectures',
        `จำนวนข้อมูลเริ่มต้น: ${builtInLectures.length} รายการ`,
      ],
      execute: async () => {
        const token = await requireToken();
        if (!token) return;
        const created = await createKnowledgeHubSpreadsheet(
          token,
          'Pannawat Learning Space - Lectures',
          builtInLectures
        );
        await loadDriveFiles(token);
        await handleSelectOAuthSpreadsheet(created.spreadsheetId, token);
      },
    });
  };

  const requestOverwriteTab = () => {
    if (!metadata || !selectedTab) return;
    setPendingMutation({
      title: 'เขียนทับข้อมูลใน Google Sheet',
      description: `การดำเนินการนี้จะล้างข้อมูลเดิมในแท็บ "${selectedTab}" ของไฟล์ "${metadata.title}" และบันทึกข้อมูลบทเรียนทั้งหมดใหม่`,
      confirmLabel: 'ยืนยันเขียนทับข้อมูล',
      details: [
        `ไฟล์เป้าหมาย: ${metadata.title}`,
        `แท็บ: ${selectedTab} (ช่วง A1:Z500)`,
        `จำนวนแถวที่จะเขียน: ${builtInLectures.length + 1} แถว (รวมหัวตาราง)`,
      ],
      execute: async () => {
        const token = await requireToken();
        if (!token) return;
        await overwriteSheetWithLectures(token, metadata.spreadsheetId, selectedTab, builtInLectures);
        await syncOAuthAllTabs(metadata, token, false);
      },
    });
  };

  const requestAppendRow = () => {
    if (!metadata || !selectedTab) return;
    if (!newLectureLabel.trim() || !newTitle.trim()) {
      setErrorMessage('กรุณากรอกรหัส Lecture และชื่ออาจารย์/หัวข้อก่อนเพิ่มข้อมูล');
      return;
    }

    const subjectValue = newSubject.trim() || selectedTab;
    const rowValues = [
      'year2',
      subjectValue,
      newLectureLabel.trim(),
      newTitle.trim(),
      newSubtitle.trim(),
      newMcqScope.trim(),
      newVideoUrl.trim() ? 'อัปโหลดแล้ว' : '',
      newVideoUrl.trim(),
    ];

    setPendingMutation({
      title: 'เพิ่มรายการบทเรียนใหม่ลง Google Sheet',
      description: `ยืนยันการเพิ่ม 1 แถวใหม่ต่อท้ายแท็บ "${selectedTab}" ในไฟล์ "${metadata.title}"`,
      confirmLabel: 'ยืนยันเพิ่มแถวข้อมูล',
      details: [
        `วิชา: ${subjectValue} · ${newLectureLabel.trim()}`,
        `อาจารย์ / หัวข้อ: ${newTitle.trim()}`,
        ...(newSubtitle.trim() ? [`รายละเอียด: ${newSubtitle.trim()}`] : []),
        ...(newVideoUrl.trim() ? [`ลิงก์วิดีโอ: ${newVideoUrl.trim()}`] : []),
      ],
      execute: async () => {
        const token = await requireToken();
        if (!token) return;
        await appendLectureRowToSheet(token, metadata.spreadsheetId, selectedTab, rowValues);
        setNewLectureLabel('');
        setNewTitle('');
        setNewSubtitle('');
        setNewMcqScope('');
        setNewVideoUrl('');
        setShowAddRowForm(false);
        await syncOAuthAllTabs(metadata, token, false);
      },
    });
  };

  const handleConfirmMutation = async () => {
    if (!pendingMutation) return;
    setIsMutating(true);
    setErrorMessage(null);
    try {
      await pendingMutation.execute();
      setPendingMutation(null);
    } catch (err) {
      handleApiError(err);
      setPendingMutation(null);
    } finally {
      setIsMutating(false);
    }
  };

  const isLivePollingActive =
    pollIntervalSec > 0 &&
    ((mode === 'public' && Boolean(publicActiveConfig)) ||
      (mode === 'oauth' && !needsAuth && Boolean(metadata)));

  const rawPreviewRows = rawRowsByTab[previewTabTitle] ?? Object.values(rawRowsByTab)[0] ?? [];

  return (
    <section
      style={{ boxShadow: 'var(--shadow-card)' }}
      className="rounded-2xl border border-(--border-hairline) bg-(--bg-surface) px-5 py-4 sm:px-6"
    >
      {/* Compact Header Row (always visible, toggles full sync controls) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-(--border-hairline) bg-(--bg-subtle) text-(--text-primary)">
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-(--text-primary)">
                Google Sheets Real-Time Sync
              </h2>
              {isLivePollingActive && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 tabular-nums">
                  <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>อัปเดตอัตโนมัติทุก {pollIntervalSec} วิ</span>
                </span>
              )}
              {lastSyncedAt && (
                <span className="text-xs text-(--text-muted) tabular-nums">
                  · ซิงค์ล่าสุด {lastSyncedAt}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-(--text-secondary)">
              {isUsingSheetData
                ? `กำลังเชื่อมต่อกับ "${publicTitle}" (${activeSubjects.length} วิชา)`
                : 'ซิงค์ทุกแท็บวิชาใน Google Sheets อัตโนมัติ หรือนำเข้า CSV'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isUsingSheetData && (
            <button
              type="button"
              onClick={handleDisconnectPublic}
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-3 py-1.5 text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Database className="h-3.5 w-3.5" aria-hidden="true" />
              <span>รีเซ็ตเป็นข้อมูลเริ่มต้น</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setPanelOpen((prev) => !prev)}
            aria-expanded={panelOpen}
            className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--btn-bg) px-3 py-1.5 text-xs font-medium text-(--text-primary) hover:border-(--border-strong) whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{panelOpen ? 'ซ่อนการเชื่อมต่อชีต' : 'ตั้งค่าซิงค์ชีต'}</span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform duration-200 ${panelOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {panelOpen && (
        <div className="mt-4 border-t border-(--border-hairline) pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Mode Switcher */}
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-(--border-hairline) bg-(--bg-control) p-1">
              <button
                type="button"
                onClick={() => setMode('public')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'public'
                    ? 'bg-(--bg-surface) text-(--text-primary) shadow-xs'
                    : 'text-(--text-secondary) hover:text-(--text-primary)'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>ลิงก์ชีตสาธารณะ (ไม่ต้องล็อกอิน)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('oauth')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  mode === 'oauth'
                    ? 'bg-(--bg-surface) text-(--text-primary) shadow-xs'
                    : 'text-(--text-secondary) hover:text-(--text-primary)'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                <span>บัญชี Google ส่วนตัว (อ่าน &amp; แก้ไข)</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Subject Merge vs Replace selector */}
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-2.5 py-1 text-xs leading-normal text-(--text-secondary)">
                <span>การแสดงวิชา:</span>
                <select
                  aria-label="โหมดการรวมวิชาจาก Google Sheets"
                  value={mergeMode}
                  onChange={(e) => onMergeModeChange(e.target.value as SyncMergeMode)}
                  className="bg-transparent py-1 text-xs leading-normal font-medium text-(--text-primary) focus:outline-none cursor-pointer"
                >
                  <option value="merge">เพิ่ม/อัปเดตร่วมกับวิชาที่มีอยู่</option>
                  <option value="replace">แสดงเฉพาะวิชาจากชีตนี้</option>
                </select>
              </label>

              {/* Auto-Sync Interval Selector */}
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-2.5 py-1 text-xs leading-normal text-(--text-secondary)">
                <span>รีเฟรช:</span>
                <select
                  aria-label="ความถี่ในการอัปเดตเรียลไทม์"
                  value={pollIntervalSec}
                  onChange={(e) => handlePollIntervalChange(Number(e.target.value) as PollIntervalSec)}
                  className="bg-transparent py-1 text-xs leading-normal font-medium text-(--text-primary) focus:outline-none cursor-pointer"
                >
                  <option value={5}>ทุก 5 วิ</option>
                  <option value={10}>ทุก 10 วิ</option>
                  <option value={30}>ทุก 30 วิ</option>
                  <option value={0}>ปิดอัตโนมัติ</option>
                </select>
              </label>

              {/* Local CSV import helper */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleUploadLocalCsv}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--btn-bg) px-3 py-1.5 text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>นำเข้า CSV</span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
            >
              <span>{errorMessage}</span>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                aria-label="ปิดข้อความแจ้งเตือน"
                className="rounded p-0.5 hover:bg-red-100 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {statusMessage && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-(--border-hairline) bg-(--bg-subtle) px-3.5 py-2.5 text-xs text-(--text-primary)">
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Mode 1: Public Google Sheet URL Real-Time Sync */}
          {mode === 'public' && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={publicUrlInput}
                  onChange={(e) => setPublicUrlInput(e.target.value)}
                  placeholder="วางลิงก์ Google Sheets (แชร์แบบ Anyone with the link can view)..."
                  aria-label="ลิงก์ Google Sheets สาธารณะ"
                  className="w-full rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-3.5 py-2.5 text-xs leading-normal text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--border-strong) focus:outline-none"
                />
            <button
              type="button"
              onClick={() => void handleConnectPublicUrl()}
              disabled={isSyncing || !publicUrlInput.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-(--accent) px-4 py-2 text-xs font-medium text-(--accent-fg) disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{publicActiveConfig ? 'ซิงค์ตอนนี้' : 'เชื่อมต่อเรียลไทม์'}</span>
            </button>
          </div>

          {publicActiveConfig && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--border-hairline) bg-(--bg-subtle) px-4 py-3">
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span className="font-semibold text-(--text-primary)">{publicTitle}</span>
                {publicTabs.length > 0 && (
                  <span className="text-(--text-secondary) tabular-nums">
                    · ซิงค์ทั้งหมด {publicTabs.length} แท็บ
                  </span>
                )}
                <a
                  href={`https://docs.google.com/spreadsheets/d/${extractSpreadsheetId(
                    publicActiveConfig.urlOrId
                  )}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-(--text-secondary) hover:text-(--text-primary)"
                >
                  <span>เปิดชีตต้นทาง</span>
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {publicTabs.length > 1 && showTablePreview && (
                  <select
                    aria-label="เลือกแท็บสำหรับดูตารางดิบ"
                    value={previewTabTitle}
                    onChange={(e) => setPreviewTabTitle(e.target.value)}
                    className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-2.5 py-1.5 text-xs text-(--text-primary) focus:outline-none"
                  >
                    {publicTabs.map((t) => (
                      <option key={t.gid} value={t.title}>
                        แท็บ: {t.title}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setShowTablePreview((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-1.5 text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{showTablePreview ? 'ซ่อนตารางดิบ' : 'ดูตารางดิบ'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: OAuth Private Google Sheet Sync + Write Back */}
      {mode === 'oauth' && (
        <div className="mt-4 space-y-4 border-t border-(--border-hairline) pt-4">
          {needsAuth ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-(--text-secondary)">
                สำหรับชีตส่วนตัวที่ไม่ได้เปิดสาธารณะ หรือต้องการเพิ่ม/แก้ข้อมูลจากหน้าเว็บกลับขึ้นชีต
              </p>
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="inline-flex items-center gap-2.5 rounded-lg border border-[#747775] bg-white px-4 py-2 text-xs font-medium text-[#1F1F1F] shadow-2xs transition-colors hover:bg-[#F8F9FA] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 48 48"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
                <span>{isLoggingIn ? 'กำลังเชื่อมต่อ...' : 'Sign in with Google'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-(--text-secondary)">
                  บัญชีที่เชื่อมต่อ: <strong className="text-(--text-primary)">{user?.email ?? user?.displayName}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--btn-bg) px-3 py-1.5 text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <select
                    aria-label="เลือกไฟล์ Google Sheets จาก Drive"
                    value={metadata?.spreadsheetId ?? ''}
                    onChange={(e) => {
                      if (e.target.value) void handleSelectOAuthSpreadsheet(e.target.value);
                    }}
                    className="min-w-[220px] flex-1 rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-3 py-2 text-xs text-(--text-primary) focus:outline-none"
                  >
                    <option value="">
                      {driveFiles.length > 0
                        ? 'เลือกไฟล์ Google Sheets จาก Google Drive...'
                        : 'กดโหลดรายชื่อไฟล์ใน Drive'}
                    </option>
                    {driveFiles.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => void loadDriveFiles()}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--btn-bg) px-3 py-2 text-xs font-medium text-(--text-primary) whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                    <span>โหลดรายชื่อ</span>
                  </button>
                </div>

                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="text"
                    value={manualIdInput}
                    onChange={(e) => setManualIdInput(e.target.value)}
                    placeholder="หรือวาง URL / Spreadsheet ID..."
                    className="w-full rounded-lg border border-(--border-hairline) bg-(--bg-subtle) px-3 py-2 text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSelectOAuthSpreadsheet(manualIdInput)}
                    disabled={isSyncing || !manualIdInput.trim()}
                    className="rounded-lg bg-(--accent) px-3.5 py-2 text-xs font-medium text-(--accent-fg) disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    เปิดไฟล์
                  </button>
                </div>

                <button
                  type="button"
                  onClick={requestCreateTemplateSheet}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--btn-bg) px-3.5 py-2 text-xs font-medium text-(--text-primary) whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FolderPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>สร้าง Sheet ใหม่</span>
                </button>
              </div>

              {metadata && (
                <div className="space-y-4 rounded-xl border border-(--border-hairline) bg-(--bg-subtle) p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5 text-xs">
                      <span className="font-semibold text-(--text-primary)">
                        {metadata.title}
                      </span>
                      <span className="text-(--text-secondary) tabular-nums">
                        · ซิงค์ทั้งหมด {metadata.sheets.length} แท็บ
                      </span>
                      <select
                        aria-label="เลือกแท็บสำหรับแก้ไขหรือดูตัวอย่าง"
                        value={selectedTab}
                        onChange={(e) => {
                          const nextTab = e.target.value;
                          setSelectedTab(nextTab);
                          setPreviewTabTitle(nextTab);
                        }}
                        className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-2.5 py-1 text-xs text-(--text-primary) focus:outline-none"
                      >
                        {metadata.sheets.map((tab) => (
                          <option key={String(tab.sheetId)} value={tab.title}>
                            แท็บเป้าหมาย: {tab.title}
                          </option>
                        ))}
                      </select>
                      <a
                        href={metadata.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-(--text-secondary) hover:text-(--text-primary)"
                      >
                        <span>เปิดใน Sheets</span>
                        <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void syncOAuthAllTabs(metadata, undefined, false)}
                        disabled={isSyncing}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-1.5 text-xs font-medium text-(--text-primary) whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                        <span>ดึงข้อมูลทุกแท็บ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowAddRowForm((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-1.5 text-xs font-medium text-(--text-primary) whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>เพิ่มบทเรียนลง Sheet</span>
                      </button>

                      <button
                        type="button"
                        onClick={requestOverwriteTab}
                        disabled={isSyncing}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-1.5 text-xs font-medium text-(--text-primary) whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>ส่งข้อมูลชุดหลักขึ้น Sheet</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowTablePreview((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-1.5 text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Table2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{showTablePreview ? 'ซ่อนตารางดิบ' : 'ดูตารางดิบ'}</span>
                      </button>
                    </div>
                  </div>

                  {showAddRowForm && (
                    <div className="grid grid-cols-1 gap-3 border-t border-(--border-hairline) pt-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <input
                          type="text"
                          list="sheet-subject-suggestions"
                          aria-label="วิชา"
                          value={newSubject}
                          onChange={(e) => setNewSubject(e.target.value)}
                          placeholder="ชื่อวิชา (เช่น GEN 5, CARDIO)"
                          className="w-full rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs text-(--text-primary) placeholder:text-(--text-muted)"
                        />
                        <datalist id="sheet-subject-suggestions">
                          {activeSubjects.map((sub) => (
                            <option key={sub.id} value={sub.name} />
                          ))}
                        </datalist>
                      </div>
                      <input
                        type="text"
                        value={newLectureLabel}
                        onChange={(e) => setNewLectureLabel(e.target.value)}
                        placeholder="Lec ที่สอน (เช่น 43, 44)"
                        className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs text-(--text-primary) placeholder:text-(--text-muted)"
                      />
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="ชื่ออาจารย์ผู้สอน"
                        className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs text-(--text-primary) placeholder:text-(--text-muted)"
                      />
                      <input
                        type="text"
                        value={newSubtitle}
                        onChange={(e) => setNewSubtitle(e.target.value)}
                        placeholder="อีเมล / หัวข้อ"
                        className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs text-(--text-primary) placeholder:text-(--text-muted)"
                      />
                      <input
                        type="text"
                        value={newMcqScope}
                        onChange={(e) => setNewMcqScope(e.target.value)}
                        placeholder="รอบสอบ (เช่น ออกสอบ: MCQ III)"
                        className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs text-(--text-primary) placeholder:text-(--text-muted)"
                      />
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={newVideoUrl}
                          onChange={(e) => setNewVideoUrl(e.target.value)}
                          placeholder="ลิงก์ YouTube / Drive"
                          className="w-full rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-3 py-2 text-xs text-(--text-primary) placeholder:text-(--text-muted)"
                        />
                        <button
                          type="button"
                          onClick={requestAppendRow}
                          className="rounded-lg bg-(--accent) px-4 py-2 text-xs font-medium text-(--accent-fg) whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          บันทึก
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

              {/* Raw Sheet Preview (Shared across Public / OAuth / CSV modes) */}
              {showTablePreview && rawPreviewRows.length > 0 && (
                <div className="mt-4 max-h-64 overflow-auto rounded-xl border border-(--border-hairline) bg-(--bg-surface)">
                  <table className="w-full border-collapse text-left text-xs tabular-nums">
                    <tbody>
                      {rawPreviewRows.slice(0, 30).map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className={
                            rIdx <= 1
                              ? 'border-b border-(--border-hairline) bg-(--bg-subtle) font-semibold text-(--text-primary)'
                              : 'border-b border-(--border-hairline)/60 text-(--text-secondary)'
                          }
                        >
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="max-w-[220px] truncate px-3 py-2">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

      {/* Mandatory Explicit Confirmation Modal for Mutating Operations */}
      {pendingMutation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-sheet-mutation-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
        >
          <div className="w-full max-w-md rounded-2xl border border-(--border-hairline) bg-(--bg-surface) p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h3
                  id="confirm-sheet-mutation-title"
                  className="text-base font-semibold text-(--text-primary)"
                >
                  {pendingMutation.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-(--text-secondary)">
                  {pendingMutation.description}
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-1.5 rounded-xl border border-(--border-hairline) bg-(--bg-subtle) p-3.5 text-xs text-(--text-primary)">
              {pendingMutation.details.map((detail) => (
                <li key={detail} className="break-all">
                  · {detail}
                </li>
              ))}
            </ul>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingMutation(null)}
                disabled={isMutating}
                className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-4 py-2 text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmMutation()}
                disabled={isMutating}
                className="rounded-lg bg-(--accent) px-4 py-2 text-xs font-medium text-(--accent-fg) disabled:opacity-60 cursor-pointer"
              >
                {isMutating ? 'กำลังบันทึก...' : pendingMutation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
