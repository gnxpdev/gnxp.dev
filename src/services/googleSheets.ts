import type {
  LabOspeCardItem,
  LectureItem,
  LinkSourceType,
  McqRound,
  QuizQuestionItem,
  SubjectId,
  SubjectSection,
  VideoLink,
  YearId,
} from '../data/knowledgeHubData';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface SheetTabInfo {
  sheetId: number | string;
  title: string;
  rowCount?: number;
  columnCount?: number;
}

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: SheetTabInfo[];
}

export interface SheetLectureRow extends LectureItem {
  yearId: YearId;
}

export interface ParsedSheetResult {
  lectures: SheetLectureRow[];
  subjectSections: SubjectSection[];
  playlistUrl?: string;
  notices: string[];
  detectedSubject?: SubjectId;
  detectedSubjectName?: string;
}

export interface MultiTabSyncResult {
  title: string;
  spreadsheetUrl: string;
  tabs: Array<{ title: string; gid: string }>;
  sections: SubjectSection[];
  allLectures: SheetLectureRow[];
  quizQuestions: QuizQuestionItem[];
  ospeCards: LabOspeCardItem[];
  rawRowsByTab: Record<string, string[][]>;
}

export class WorkspaceAuthExpiredError extends Error {
  constructor(message = 'สิทธิ์การเชื่อมต่อหมดอายุ กรุณาลงชื่อเข้าใช้ Google ใหม่อีกครั้ง') {
    super(message);
    this.name = 'WorkspaceAuthExpiredError';
  }
}

async function fetchGoogleApi<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401) {
    throw new WorkspaceAuthExpiredError();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const apiMessage =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : `Google API error (${res.status})`;
    throw new Error(apiMessage);
  }

  return data as T;
}

export function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match?.[1]) return match[1];
  return trimmed;
}

export function extractSpreadsheetGid(input: string): string | null {
  const match = input.match(/[?#&]gid=(\d+)/);
  return match?.[1] ?? null;
}

/** RFC-4180 CSV parser supporting quoted multiline cells and escaped quotes */
export function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  const text = csvText.replace(/^\uFEFF/, '');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      currentRow.push(currentCell);
      currentCell = '';
    } else if (char === '\r' && next === '\n') {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      i++;
    } else if (char === '\n' || char === '\r') {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

export async function fetchPublicSheetMeta(
  spreadsheetId: string
): Promise<{ title: string; tabs: Array<{ title: string; gid: string }> }> {
  const res = await fetch(
    `/api/sheets/public/meta?spreadsheetId=${encodeURIComponent(spreadsheetId)}`,
    { cache: 'no-store' }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : 'ไม่สามารถอ่านข้อมูลแท็บของชีตได้');
  }
  return {
    title: typeof data.title === 'string' ? data.title : 'Google Sheet',
    tabs: Array.isArray(data.tabs) ? data.tabs : [],
  };
}

export async function fetchPublicSheetCsv(
  spreadsheetId: string,
  options?: { gid?: string | null; sheetName?: string }
): Promise<string[][]> {
  const params = new URLSearchParams({ spreadsheetId });
  if (options?.gid) {
    params.set('gid', options.gid);
  }
  if (options?.sheetName) {
    params.set('sheet', options.sheetName);
  }

  try {
    const res = await fetch(`/api/sheets/public?${params.toString()}`, {
      cache: 'no-store',
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.status !== 404 && contentType.includes('application/json')) {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.error === 'string' ? data.error : 'ไม่สามารถดึงข้อมูลจากชีตสาธารณะได้'
        );
      }
      return parseCsv(typeof data.csv === 'string' ? data.csv : '');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('ชีต')) {
      throw err;
    }
    // Fall through to direct browser gviz CSV fetch (for static hosts like GitHub Pages)
  }

  const gvizParams = new URLSearchParams({ tqx: 'out:csv', _ts: String(Date.now()) });
  if (options?.sheetName) {
    gvizParams.set('sheet', options.sheetName);
  } else if (options?.gid) {
    gvizParams.set('gid', options.gid);
  }
  const directUrl = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(
    spreadsheetId
  )}/gviz/tq?${gvizParams.toString()}`;
  const directRes = await fetch(directUrl, { cache: 'no-store' });
  const directText = await directRes.text();
  if (!directRes.ok || directText.trimStart().startsWith('<!DOCTYPE')) {
    throw new Error(
      'ไม่สามารถดึงข้อมูลชีตแบบสาธารณะได้ กรุณาตรวจสอบว่าเปิดแชร์เป็น "Anyone with the link"'
    );
  }
  return parseCsv(directText);
}

export async function listUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
  );
  const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=25`;

  const data = await fetchGoogleApi<{ files?: DriveSpreadsheetFile[] }>(url, accessToken);
  return data.files ?? [];
}

export async function getSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata> {
  const fields = encodeURIComponent(
    'spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title,gridProperties)'
  );
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}?fields=${fields}`;

  const data = await fetchGoogleApi<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties?: { title?: string };
    sheets?: Array<{
      properties?: {
        sheetId?: number;
        title?: string;
        gridProperties?: { rowCount?: number; columnCount?: number };
      };
    }>;
  }>(url, accessToken);

  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title ?? 'Untitled Spreadsheet',
    spreadsheetUrl: data.spreadsheetUrl,
    sheets: (data.sheets ?? []).map((s, idx) => ({
      sheetId: s.properties?.sheetId ?? idx,
      title: s.properties?.title ?? `Sheet ${idx + 1}`,
      rowCount: s.properties?.gridProperties?.rowCount,
      columnCount: s.properties?.gridProperties?.columnCount,
    })),
  };
}

export async function readSheetValues(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<string[][]> {
  const escapedTitle = `'${sheetTitle.replace(/'/g, "''")}'`;
  const range = encodeURIComponent(`${escapedTitle}!A1:Z500`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${range}`;

  const data = await fetchGoogleApi<{ values?: string[][] }>(url, accessToken);
  return data.values ?? [];
}

function normalizeYear(raw: string): YearId {
  const v = raw.toLowerCase().trim();
  if (v === 'year1' || v === 'ปี 1' || v === '1') return 'year1';
  if (v === 'year3' || v === 'ปี 3' || v === '3') return 'year3';
  if (v === 'year4' || v === 'ปี 4' || v === '4') return 'year4';
  if (v === 'year5' || v === 'ปี 5' || v === '5') return 'year5';
  if (v === 'year6' || v === 'ปี 6' || v === '6') return 'year6';
  return 'year2';
}

function isGenericSheetName(raw: string): boolean {
  const lower = raw.trim().toLowerCase();
  return (
    !lower ||
    lower === 'sheet1' ||
    lower === 'ชีต1' ||
    lower === 'ชีตหลัก' ||
    lower === 'lectures' ||
    lower === 'csv import' ||
    /^gid\s+\d+$/i.test(lower)
  );
}

export function normalizeSubjectIdentity(raw: string): { id: SubjectId; name: string } {
  const cleaned = raw.trim().replace(/\s+/g, ' ');
  const lower = cleaned.toLowerCase();

  if (!cleaned) {
    return { id: 'general', name: 'รายวิชาจากชีต' };
  }
  if (lower === 'gen5' || lower === 'gen 5' || lower.startsWith('gen 5') || lower.startsWith('gen5')) {
    return { id: 'gen5', name: 'GEN 5' };
  }
  if (lower === 'skin' || lower === 'skin block' || lower.startsWith('skin ')) {
    return { id: 'skin', name: 'SKIN Block' };
  }
  if (lower === 'ms' || lower === 'ms block' || lower.startsWith('ms ') || lower.includes('musculoskeletal')) {
    return { id: 'ms', name: 'MS' };
  }
  if (lower === 'hemato' || lower === 'hemato block' || lower.startsWith('hemato')) {
    return { id: 'hemato', name: 'Hemato' };
  }
  if (lower === 'ns' || lower === 'ns block' || lower.startsWith('ns ') || lower.includes('nervous')) {
    return { id: 'ns', name: 'NS' };
  }

  const slug = lower
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return {
    id: slug || 'general',
    name: cleaned,
  };
}

function normalizeMcqRound(raw: string): Exclude<McqRound, 'all'> | undefined {
  const v = raw.toLowerCase().trim();
  if (!v) return undefined;
  if (v.includes('lab')) return 'lab';
  if (v.includes('1-1') || v.includes('ชุดที่ 1') || v.includes('i-1')) return 'mcq-1-1';
  if (v.includes('1-2') || v.includes('ชุดที่ 2') || v.includes('i-2')) return 'mcq-1-2';
  if (v.includes('iii') || v.includes('3')) return 'mcq-3';
  if (v.includes('ii') || v.includes('2')) return 'mcq-2';
  return undefined;
}

function detectLinkSource(url: string): LinkSourceType {
  const lower = url.toLowerCase();
  if (lower.includes('youtu.be') || lower.includes('youtube.com')) return 'youtube';
  if (lower.includes('docs.google.com/document') || lower.includes('notion.so') || lower.includes('goodnotes')) {
    return 'docs';
  }
  if (lower.endsWith('.pdf') || lower.includes('.pdf?')) return 'pdf';
  if (lower.includes('drive.google.com')) return 'drive';
  return 'external';
}

function formatLinkLabel(
  prefix: string,
  totalLinks: number,
  index: number,
  source: LinkSourceType,
  fallbackDefault?: string
): string {
  const cleaned = prefix
    .replace(/[:\s]+$/, '')
    .replace(/เวลา\s*/g, '')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned) {
    return cleaned;
  }
  if (totalLinks > 1) {
    return fallbackDefault ? `${fallbackDefault} ${index + 1}` : `Part ${index + 1}`;
  }
  if (fallbackDefault) return fallbackDefault;
  if (source === 'drive') return 'Google Drive';
  if (source === 'pdf') return 'ไฟล์สไลด์ PDF';
  if (source === 'docs') return 'เอกสารสรุป';
  return 'ดูคลิปสอน';
}

function normalizeMultiPartLinkLabels(links: VideoLink[], fallbackPrefix = 'Part'): VideoLink[] {
  if (links.length <= 1) return links;
  return links.map((link, idx) => {
    const isGeneric =
      link.label === 'ดูคลิปสอน' ||
      link.label === 'Google Drive' ||
      link.label === 'ไฟล์สไลด์ PDF' ||
      link.label === 'เอกสารสรุป' ||
      link.label === 'สไลด์' ||
      link.label === 'ชีตสรุป';
    return {
      ...link,
      label: isGeneric ? `${fallbackPrefix} ${idx + 1}` : link.label,
    };
  });
}

function unwrapGoogleRedirectUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (
      (parsed.hostname === 'www.google.com' || parsed.hostname === 'google.com') &&
      parsed.pathname === '/url'
    ) {
      const target = parsed.searchParams.get('q') ?? parsed.searchParams.get('url');
      if (target && /^https?:\/\//i.test(target)) {
        return target;
      }
    }
  } catch {
    // Keep original URL if parsing fails
  }
  return rawUrl;
}

export function parseLinksCell(raw: string, defaultLabel?: string): VideoLink[] {
  if (!raw.trim()) return [];

  // Support =HYPERLINK("https://...", "Label") formula strings if ever returned raw
  const hyperlinkMatch = raw.match(/^\s*=HYPERLINK\(\s*"([^"]+)"\s*[,;]\s*"([^"]*)"\s*\)\s*$/i);
  if (hyperlinkMatch) {
    const url = unwrapGoogleRedirectUrl(hyperlinkMatch[1].trim());
    const label = hyperlinkMatch[2].trim();
    const source = detectLinkSource(url);
    return [
      {
        label: label || defaultLabel || (source === 'drive' ? 'Google Drive' : 'ดูคลิปสอน'),
        url,
        source,
      },
    ];
  }

  const lines = raw
    .split(/[\n|]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const totalUrls = lines.reduce(
    (sum, line) => sum + Array.from(line.matchAll(/(https?:\/\/[^\s"'<>]+)/gi)).length,
    0
  );

  const links: VideoLink[] = [];
  let pendingLabel = '';

  lines.forEach((line) => {
    const urls = Array.from(line.matchAll(/(https?:\/\/[^\s"'<>]+)/gi));
    if (urls.length === 0) {
      pendingLabel = line;
      return;
    }

    urls.forEach((match, urlIdx) => {
      const url = unwrapGoogleRedirectUrl(match[1].replace(/[),.;]+$/, ''));
      const urlPos = match.index ?? line.indexOf(match[1]);
      const prevEnd = urlIdx === 0 ? 0 : (urls[urlIdx - 1].index ?? 0) + urls[urlIdx - 1][0].length;
      const inlinePrefix = line.slice(prevEnd, urlPos).trim();
      const prefix = inlinePrefix || (urlIdx === 0 ? pendingLabel : '');
      pendingLabel = '';
      const source = detectLinkSource(url);

      links.push({
        label: formatLinkLabel(prefix, totalUrls, links.length, source, defaultLabel).replace(
          /\bpart\s+(\d+)/gi,
          'Part $1'
        ),
        url,
        source,
      });
    });
  });

  return normalizeMultiPartLinkLabels(links, defaultLabel ?? 'Part');
}

function formatLectureLabel(raw: string, subjectId: SubjectId, rowIndex: number): string {
  const trimmed = raw.trim().replace(/,/g, ', ').replace(/\s+/g, ' ');
  if (!trimmed) return `Row ${rowIndex + 1}`;
  if (/^(lec|skin|gen|lab)/i.test(trimmed)) return trimmed;
  return subjectId === 'skin' ? `SKIN: Lec ${trimmed}` : `Lec ${trimmed}`;
}

export function parseSheetValues(
  values: string[][],
  sheetTitleHint = ''
): ParsedSheetResult {
  if (values.length === 0) {
    return { lectures: [], subjectSections: [], notices: [] };
  }

  let headerRowIndex = -1;
  const hasSpecificTabTitle = !isGenericSheetName(sheetTitleHint);
  let inferredIdentity = hasSpecificTabTitle
    ? normalizeSubjectIdentity(sheetTitleHint)
    : { id: 'general', name: 'รายวิชาจากชีต' };

  let playlistUrl: string | undefined;
  const notices: string[] = [];

  // Scan top rows (0..5) to detect header row and sheet title banner (e.g. "GEN 5", "MS", "Hemato", "NS")
  const scanLimit = Math.min(values.length, 6);
  const headerKeywords = [
    'lec',
    'lecture',
    'อาจารย์',
    'ชื่อ อาจารย์',
    'ผู้สอน',
    'instructor',
    'teacher',
    'title',
    'อีเมล์',
    'อีเมล',
    'email',
    'สถานะวิดีโอ',
    'ลิ้งค์',
    'ลิงก์',
    'ลิงค์',
    'link',
    'url',
    'video',
    'youtube',
    'ยูทูป',
    'drive',
    'คลิป',
    'หัวข้อ',
    'เรื่อง',
    'topic',
    'คนที่',
    'หมายเหตุ',
    'note',
    'subject',
    'วิชา',
    'block',
  ];

  const countHeaderMatches = (row: string[]) =>
    row.filter((cell) => {
      const lower = cell.toLowerCase().trim();
      return lower !== '' && headerKeywords.some((kw) => lower.includes(kw));
    }).length;

  for (let r = 0; r < scanLimit; r++) {
    const row = values[r] ?? [];
    const nonEmpty = row.map((c) => c.trim()).filter(Boolean);
    const matches = countHeaderMatches(row);

    if (matches >= 2) {
      headerRowIndex = r;
      break;
    }

    if (nonEmpty.length >= 1 && nonEmpty.length <= 3) {
      const bannerText = nonEmpty[0];
      if (bannerText && !bannerText.startsWith('*') && !/^https?:\/\//i.test(bannerText)) {
        const bannerIdentity = normalizeSubjectIdentity(bannerText);
        if (
          !hasSpecificTabTitle ||
          ['gen5', 'skin', 'ms', 'hemato', 'ns'].includes(bannerIdentity.id)
        ) {
          inferredIdentity = bannerIdentity;
        }
      }
    }
  }

  // Extract side-column playlist link & notices (like "*ต้องใช้ kkumail ดูเท่านั้น")
  for (let r = 0; r < Math.min(values.length, 30); r++) {
    const row = values[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const cell = (row[c] ?? '').trim();
      if (!cell) continue;
      const lower = cell.toLowerCase();
      if ((lower.includes('playlist') || lower.includes('เพลย์ลิสต์')) && !playlistUrl) {
        const nextCell = (row[c + 1] ?? '').trim();
        const urlMatch = nextCell.match(/(https?:\/\/[^\s]+)/i) ?? cell.match(/(https?:\/\/[^\s]+)/i);
        if (urlMatch) playlistUrl = urlMatch[1];
      }
      if (cell.startsWith('*') && !notices.includes(cell)) {
        notices.push(cell);
      }
    }
  }

  const hasHeader = headerRowIndex >= 0;
  const headerRow = (hasHeader ? values[headerRowIndex] : []).map((c) => c.toLowerCase().trim());

  // Search keywords in strict priority order so exact/primary headers win over side columns
  const findCol = (keywords: string[], fallback: number): number => {
    if (!hasHeader) return fallback;
    for (const kw of keywords) {
      const idx = headerRow.findIndex((h) => h.includes(kw));
      if (idx >= 0) return idx;
    }
    return fallback;
  };

  // Detect Thai spreadsheet layout vs standard template layout
  const isThaiFacultySheet =
    hasHeader &&
    headerRow.some((h) => h.includes('อาจารย์') || h.includes('ลิ้งค์') || h.includes('คนที่'));

  const colYear = findCol(['year', 'ชั้นปี'], hasHeader ? -1 : 0);
  const colSubject = findCol(['subject', 'block', 'วิชา'], hasHeader ? -1 : 1);
  const colLecture = findCol(
    ['lec ที่สอน', 'lecture', 'lec', 'หัวข้อที่', 'ครั้งที่'],
    hasHeader ? -1 : isThaiFacultySheet ? 1 : 2
  );
  const colTitle = findCol(
    [
      'ชื่อ อาจารย์',
      'อาจารย์ผู้สอน',
      'อาจารย์',
      'ผู้สอน',
      'instructor',
      'teacher',
      'title',
      'ชื่อเรื่อง',
      'หัวข้อ',
      'เรื่อง',
      'topic',
      'name',
      'ชื่อ',
    ],
    hasHeader ? -1 : isThaiFacultySheet ? 2 : 3
  );
  const colSubtitle = findCol(
    ['อีเมล์', 'อีเมล', 'email', 'รายละเอียด', 'description', 'subtitle', 'หัวข้อ', 'topic'],
    hasHeader ? -1 : isThaiFacultySheet ? 3 : 4
  );
  const colMcq = findCol(['mcq', 'exam', 'ข้อสอบ', 'รอบสอบ'], -1);
  const colPermission = findCol(['อนุญาตหรือไม่', 'อนุญาต'], -1);
  const colStatus = findCol(['สถานะวิดีโอ', 'status', 'สถานะ'], hasHeader ? -1 : 6);
  const colSlides = findCol(['สไลด์', 'slides', 'slide', 'handout', 'เอกสารประกอบ', 'pdf'], -1);
  const colSummaries = findCol(['ชีตสรุป', 'สรุปรุ่น', 'summary', 'summaries', 'สรุป'], -1);
  const colLinks = findCol(
    [
      'ลิ้งค์การสอน',
      'ลิงก์การสอน',
      'ลิงค์การสอน',
      'ลิ้งค์',
      'ลิงก์',
      'ลิงค์',
      'youtube',
      'ยูทูป',
      'video',
      'คลิป',
      'link',
      'url',
      'drive',
    ],
    hasHeader ? -1 : 7
  );
  const colNote = findCol(['หมายเหตุ', 'note', 'remark'], isThaiFacultySheet ? 9 : -1);

  const startIndex = hasHeader ? headerRowIndex + 1 : 0;
  const lectures: SheetLectureRow[] = [];
  const sectionMap = new Map<
    SubjectId,
    { id: SubjectId; name: string; lectures: SheetLectureRow[]; yearId: YearId }
  >();

  let currentIdentity = inferredIdentity;

  for (let i = startIndex; i < values.length; i++) {
    const r = values[i];
    if (!r || r.every((cell) => !cell || !cell.trim())) continue;

    // Skip repeated header rows in stacked multi-subject sheets
    if (countHeaderMatches(r) >= 2 && !r.some((c) => /https?:\/\//i.test(c))) {
      continue;
    }

    // Detect mid-sheet subject section header (e.g. a banner row saying "MS", "Hemato", "NS")
    const nonEmptyCells = r.map((c) => c.trim()).filter(Boolean);
    if (
      nonEmptyCells.length === 1 &&
      !/https?:\/\//i.test(nonEmptyCells[0]) &&
      !nonEmptyCells[0].startsWith('*') &&
      nonEmptyCells[0] !== 'TRUE' &&
      nonEmptyCells[0] !== 'FALSE' &&
      !/^\d+$/.test(nonEmptyCells[0])
    ) {
      const candidate = normalizeSubjectIdentity(nonEmptyCells[0]);
      if (['gen5', 'skin', 'ms', 'hemato', 'ns'].includes(candidate.id)) {
        currentIdentity = candidate;
        continue;
      }
    }

    const rawTitle = colTitle >= 0 && colTitle !== colLinks ? (r[colTitle] ?? '').trim() : '';
    const lectureRaw = colLecture >= 0 && colLecture !== colLinks ? (r[colLecture] ?? '').trim() : '';
    const rawSubtitle =
      colSubtitle >= 0 && colSubtitle !== colTitle && colSubtitle !== colLinks
        ? (r[colSubtitle] ?? '').trim()
        : '';
    const linksRaw = colLinks >= 0 ? (r[colLinks] ?? '').trim() : '';
    const slidesRaw = colSlides >= 0 ? (r[colSlides] ?? '').trim() : '';
    const summariesRaw = colSummaries >= 0 ? (r[colSummaries] ?? '').trim() : '';

    // Skip bottom helper formula rows (e.g. "TRUE", `["`, or numbered helper rows like ",18,TRUE,,,")
    if (
      rawTitle === 'TRUE' ||
      rawTitle === 'FALSE' ||
      rawTitle.startsWith('[') ||
      rawTitle.startsWith('`') ||
      ((r[2] ?? '').trim() === 'TRUE' && !rawTitle && !linksRaw)
    ) {
      continue;
    }

    let parsedLinks = parseLinksCell(linksRaw);
    const parsedSlides = parseLinksCell(slidesRaw, 'สไลด์');
    const parsedSummaries = parseLinksCell(summariesRaw, 'ชีตสรุป');

    // Also scan extra link/part columns (e.g. Part 1 / Part 2 in adjacent columns) or any non-playlist URLs
    const extraLinkChunks: string[] = [];
    for (let c = 0; c < r.length; c++) {
      if (c === colLinks || c === colSlides || c === colSummaries) continue;
      const cellVal = (r[c] ?? '').trim();
      if (!cellVal || !/https?:\/\//i.test(cellVal)) continue;

      const prevCell = (r[c - 1] ?? '').toLowerCase();
      if (prevCell.includes('playlist') || prevCell.includes('เพลย์ลิสต์')) continue;

      const colHeader = (headerRow[c] ?? '').trim();
      if (colHeader.includes('playlist') || colHeader.includes('เพลย์ลิสต์')) continue;

      const isExplicitLinkCol =
        colLinks === -1 ||
        /(part|ลิ้งค์|ลิงก์|ลิงค์|link|url|video|youtube|ยูทูป|drive|คลิป)/i.test(colHeader) ||
        /^https?:\/\/(youtu\.be|www\.youtube\.com|youtube\.com|drive\.google\.com)/i.test(cellVal);

      if (isExplicitLinkCol) {
        const hasPartHeader = /part\s*\d+/i.test(colHeader);
        if (hasPartHeader && /^https?:\/\//i.test(cellVal)) {
          extraLinkChunks.push(`${colHeader} ${cellVal}`);
        } else {
          extraLinkChunks.push(cellVal);
        }
      }
    }

    if (extraLinkChunks.length > 0) {
      const existingUrls = new Set(parsedLinks.map((l) => l.url));
      const extraLinks = parseLinksCell(extraLinkChunks.join('\n')).filter(
        (l) => !existingUrls.has(l.url)
      );
      if (extraLinks.length > 0) {
        parsedLinks = normalizeMultiPartLinkLabels([...parsedLinks, ...extraLinks]);
      }
    }

    // Skip rows with no meaningful lecture label, title, or resource links
    if (
      !rawTitle &&
      !lectureRaw &&
      parsedLinks.length === 0 &&
      parsedSlides.length === 0 &&
      parsedSummaries.length === 0
    ) {
      continue;
    }

    const rowSubjectRaw = colSubject >= 0 ? (r[colSubject] ?? '').trim() : '';
    const subjectIdentity = rowSubjectRaw
      ? normalizeSubjectIdentity(rowSubjectRaw)
      : currentIdentity;

    const mcqRaw = colMcq >= 0 ? (r[colMcq] ?? '').trim() : '';
    const permissionRaw = colPermission >= 0 ? (r[colPermission] ?? '').trim() : '';
    const statusRaw = colStatus >= 0 ? (r[colStatus] ?? '').trim() : '';
    const noteRaw = colNote >= 0 ? (r[colNote] ?? '').trim() : '';
    const note = noteRaw && noteRaw !== '-' ? noteRaw : undefined;
    const yearId = colYear >= 0 ? normalizeYear(r[colYear] ?? 'year2') : 'year2';

    const cleanSubtitle = rawSubtitle === '?' ? '' : rawSubtitle;
    const lectureLabel = formatLectureLabel(lectureRaw, subjectIdentity.id, i);
    const title = rawTitle || cleanSubtitle || lectureLabel;
    const subtitle = title === cleanSubtitle ? '' : cleanSubtitle;

    let resolvedStatus: string | undefined =
      statusRaw && statusRaw !== '-' ? statusRaw : undefined;
    if (!resolvedStatus && permissionRaw && permissionRaw !== '-') {
      resolvedStatus =
        permissionRaw === 'อนุญาต' && parsedLinks.length === 0
          ? 'อนุญาต (รออัปโหลด)'
          : permissionRaw;
    } else if (permissionRaw.includes('ไม่อนุญาต') && resolvedStatus === 'อัปโหลดแล้ว' && parsedLinks.length === 0) {
      resolvedStatus = 'ไม่อนุญาต';
    }

    // Merge continuation rows (blank Lec+Title row with links, or repeated same Lec+Title) into previous card as Part 1 / Part 2
    const prevLecture = lectures[lectures.length - 1];
    const isContinuationRow =
      prevLecture &&
      prevLecture.subject === subjectIdentity.id &&
      (parsedLinks.length > 0 || parsedSlides.length > 0 || parsedSummaries.length > 0) &&
      ((!rawTitle && !lectureRaw) ||
        (lectureRaw !== '' &&
          prevLecture.lectureLabel === lectureLabel &&
          prevLecture.title === title));

    if (isContinuationRow) {
      const existingUrls = new Set(prevLecture.links.map((l) => l.url));
      const newLinks = parsedLinks.filter((l) => !existingUrls.has(l.url));
      if (newLinks.length > 0) {
        prevLecture.links = normalizeMultiPartLinkLabels([...prevLecture.links, ...newLinks]);
      }
      if (parsedSlides.length > 0) {
        const existingSlideUrls = new Set((prevLecture.slides ?? []).map((l) => l.url));
        const extraSlides = parsedSlides.filter((l) => !existingSlideUrls.has(l.url));
        if (extraSlides.length > 0) {
          prevLecture.slides = normalizeMultiPartLinkLabels(
            [...(prevLecture.slides ?? []), ...extraSlides],
            'สไลด์'
          );
        }
      }
      if (parsedSummaries.length > 0) {
        const existingSumUrls = new Set((prevLecture.summaries ?? []).map((l) => l.url));
        const extraSums = parsedSummaries.filter((l) => !existingSumUrls.has(l.url));
        if (extraSums.length > 0) {
          prevLecture.summaries = normalizeMultiPartLinkLabels(
            [...(prevLecture.summaries ?? []), ...extraSums],
            'ชีตสรุป'
          );
        }
      }
      if (!prevLecture.note && note) prevLecture.note = note;
      continue;
    }

    const stableId = `sheet-${subjectIdentity.id}-${lectureLabel}-${title}-${i}`.replace(/\s+/g, '-');

    const item: SheetLectureRow = {
      id: stableId,
      yearId,
      subject: subjectIdentity.id,
      lectureLabel,
      title,
      subtitle,
      mcqRound: normalizeMcqRound(mcqRaw),
      mcqLabel: mcqRaw || undefined,
      status: resolvedStatus,
      note,
      links: parsedLinks,
      slides: parsedSlides.length > 0 ? parsedSlides : undefined,
      summaries: parsedSummaries.length > 0 ? parsedSummaries : undefined,
    };

    lectures.push(item);

    const existingSection = sectionMap.get(subjectIdentity.id);
    if (existingSection) {
      existingSection.lectures.push(item);
    } else {
      sectionMap.set(subjectIdentity.id, {
        id: subjectIdentity.id,
        name: subjectIdentity.name,
        lectures: [item],
        yearId,
      });
    }
  }

  const subjectSections: SubjectSection[] = Array.from(sectionMap.values()).map((sec) => ({
    id: sec.id,
    name: sec.name,
    lectures: sec.lectures,
    playlistUrl: sec.id === inferredIdentity.id || sectionMap.size === 1 ? playlistUrl : undefined,
    notices: sec.id === inferredIdentity.id || sectionMap.size === 1 ? notices : undefined,
    yearId: sec.yearId,
  }));

  return {
    lectures,
    subjectSections,
    playlistUrl,
    notices,
    detectedSubject: subjectSections[0]?.id ?? inferredIdentity.id,
    detectedSubjectName: subjectSections[0]?.name ?? inferredIdentity.name,
  };
}

export function parseRowsToLectures(values: string[][]): SheetLectureRow[] {
  return parseSheetValues(values).lectures;
}

function mergeParsedSections(sectionsList: SubjectSection[]): SubjectSection[] {
  const merged = new Map<SubjectId, SubjectSection>();

  for (const sec of sectionsList) {
    const existing = merged.get(sec.id);
    if (!existing) {
      merged.set(sec.id, {
        ...sec,
        lectures: [...sec.lectures],
        notices: sec.notices ? [...sec.notices] : undefined,
      });
      continue;
    }

    existing.lectures.push(...sec.lectures);
    if (!existing.playlistUrl && sec.playlistUrl) {
      existing.playlistUrl = sec.playlistUrl;
    }
    if (sec.notices && sec.notices.length > 0) {
      const combinedNotices = new Set([...(existing.notices ?? []), ...sec.notices]);
      existing.notices = Array.from(combinedNotices);
    }
  }

  return Array.from(merged.values());
}

export function convertDriveImageUrl(rawUrl: string): string {
  const cleaned = unwrapGoogleRedirectUrl(rawUrl.trim());
  const fileMatch = cleaned.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileMatch?.[1]) {
    return `https://drive.google.com/thumbnail?id=${fileMatch[1]}&sz=w1200`;
  }
  const idMatch = cleaned.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
  if (idMatch?.[1]) {
    return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1200`;
  }
  return cleaned;
}

export type SheetTabKind = 'lectures' | 'quiz' | 'ospe';

export function detectSheetTabKind(values: string[][], tabTitle = ''): SheetTabKind {
  const titleLower = tabTitle.toLowerCase();
  const sampleHeaders = values
    .slice(0, 5)
    .flat()
    .map((c) => c.toLowerCase().trim())
    .filter(Boolean);

  const hasOspeHeader =
    (sampleHeaders.some((h) => h.includes('รูป') || h.includes('image') || h.includes('ภาพ')) &&
      sampleHeaders.some(
        (h) =>
          h.includes('โครงสร้าง') ||
          h.includes('คำวินิจฉัย') ||
          h.includes('diagnosis') ||
          h.includes('structure') ||
          h.includes('เฉลย')
      )) ||
    titleLower.includes('ospe') ||
    titleLower.includes('lab recall') ||
    titleLower.includes('image recall') ||
    titleLower.includes('ทวนสไลด์');

  if (hasOspeHeader) return 'ospe';

  const hasQuizHeader =
    (sampleHeaders.some((h) => h.includes('โจทย์') || h.includes('คำถาม') || h.includes('question')) &&
      sampleHeaders.some(
        (h) =>
          h.includes('เฉลย') ||
          h.includes('answer') ||
          h.includes('คำตอบ') ||
          h.includes('ตัวเลือก') ||
          h.includes('option')
      )) ||
    titleLower.includes('quiz') ||
    titleLower.includes('ข้อสอบ') ||
    titleLower.includes('flashcard');

  if (hasQuizHeader) return 'quiz';
  return 'lectures';
}

export function parseQuizSheetValues(values: string[][], tabTitle = ''): QuizQuestionItem[] {
  if (values.length === 0) return [];
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(values.length, 6); r++) {
    const row = (values[r] ?? []).map((c) => c.toLowerCase().trim());
    if (
      row.some((c) => c.includes('โจทย์') || c.includes('คำถาม') || c.includes('question')) &&
      row.some((c) => c.includes('เฉลย') || c.includes('answer') || c.includes('คำตอบ') || c.includes('ตัวเลือก'))
    ) {
      headerRowIdx = r;
      break;
    }
  }

  const headerRow = (headerRowIdx >= 0 ? values[headerRowIdx] : []).map((c) => c.toLowerCase().trim());
  const findCol = (kws: string[], fallback = -1) => {
    for (const kw of kws) {
      const idx = headerRow.findIndex((h) => h.includes(kw));
      if (idx >= 0) return idx;
    }
    return fallback;
  };

  const colSubject = findCol(['วิชา', 'subject', 'block'], 0);
  const colScope = findCol(['รอบสอบ', 'mcq', 'scope', 'ชุด'], -1);
  const colTopic = findCol(['หัวข้อ', 'topic', 'tag', 'บท'], -1);
  const colQuestion = findCol(['โจทย์', 'คำถาม', 'question'], headerRowIdx >= 0 ? -1 : 1);
  const colOptions = findCol(['ตัวเลือก', 'options', 'choices', 'choice'], -1);
  const colOptA = findCol(['a.', 'option a', 'ตัวเลือก a', 'a)'], -1);
  const colOptB = findCol(['b.', 'option b', 'ตัวเลือก b', 'b)'], -1);
  const colOptC = findCol(['c.', 'option c', 'ตัวเลือก c', 'c)'], -1);
  const colOptD = findCol(['d.', 'option d', 'ตัวเลือก d', 'd)'], -1);
  const colAnswer = findCol(['เฉลย', 'answer', 'คำตอบ'], headerRowIdx >= 0 ? -1 : 2);
  const colExplain = findCol(['คำอธิบาย', 'อธิบาย', 'explanation', 'เหตุผล', 'note'], -1);

  const start = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  const fallbackSubject = isGenericSheetName(tabTitle)
    ? 'general'
    : normalizeSubjectIdentity(tabTitle).id;

  const items: QuizQuestionItem[] = [];
  for (let i = start; i < values.length; i++) {
    const r = values[i] ?? [];
    const question = (colQuestion >= 0 ? r[colQuestion] ?? '' : '').trim();
    const answer = (colAnswer >= 0 ? r[colAnswer] ?? '' : '').trim();
    if (!question || !answer) continue;

    const rawSub = (colSubject >= 0 ? r[colSubject] ?? '' : '').trim();
    const subjectId = rawSub ? normalizeSubjectIdentity(rawSub).id : fallbackSubject;

    let options: string[] | undefined;
    if (colOptions >= 0 && (r[colOptions] ?? '').trim()) {
      const split = (r[colOptions] ?? '')
        .split(/[\n|]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      if (split.length >= 2) options = split;
    } else {
      const abcd = [colOptA, colOptB, colOptC, colOptD]
        .filter((idx) => idx >= 0)
        .map((idx) => (r[idx] ?? '').trim())
        .filter(Boolean);
      if (abcd.length >= 2) options = abcd;
    }

    items.push({
      id: `sheet-quiz-${subjectId}-${i}`,
      subject: subjectId,
      mcqScope: colScope >= 0 ? (r[colScope] ?? '').trim() || undefined : undefined,
      topicTag: colTopic >= 0 ? (r[colTopic] ?? '').trim() || undefined : undefined,
      question,
      options,
      answer,
      explanation: colExplain >= 0 ? (r[colExplain] ?? '').trim() || undefined : undefined,
    });
  }
  return items;
}

export function parseOspeSheetValues(values: string[][], tabTitle = ''): LabOspeCardItem[] {
  if (values.length === 0) return [];
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(values.length, 6); r++) {
    const row = (values[r] ?? []).map((c) => c.toLowerCase().trim());
    if (
      row.some((c) => c.includes('รูป') || c.includes('image') || c.includes('ภาพ')) ||
      row.some((c) => c.includes('โครงสร้าง') || c.includes('คำวินิจฉัย') || c.includes('diagnosis'))
    ) {
      headerRowIdx = r;
      break;
    }
  }

  const headerRow = (headerRowIdx >= 0 ? values[headerRowIdx] : []).map((c) => c.toLowerCase().trim());
  const findCol = (kws: string[], fallback = -1) => {
    for (const kw of kws) {
      const idx = headerRow.findIndex((h) => h.includes(kw));
      if (idx >= 0) return idx;
    }
    return fallback;
  };

  const colSubject = findCol(['วิชา', 'subject', 'block'], 0);
  const colTitle = findCol(['หัวข้อ', 'ชื่อสไลด์', 'lab', 'title', 'specimen'], 1);
  const colImage = findCol(['รูป', 'image', 'ภาพ', 'url', 'link', 'ลิงก์'], 2);
  const colAnswer = findCol(['โครงสร้าง', 'คำวินิจฉัย', 'เฉลย', 'diagnosis', 'structure', 'answer'], 3);
  const colClues = findCol(['คำใบ้', 'จุดสังเกต', 'คำอธิบาย', 'clue', 'hint', 'note'], 4);
  const colTag = findCol(['รอบสอบ', 'tag', 'หมวด'], -1);

  const start = headerRowIdx >= 0 ? headerRowIdx + 1 : 0;
  const fallbackSubject = isGenericSheetName(tabTitle)
    ? 'general'
    : normalizeSubjectIdentity(tabTitle).id;

  const cards: LabOspeCardItem[] = [];
  for (let i = start; i < values.length; i++) {
    const r = values[i] ?? [];
    const structureOrDiagnosis = (colAnswer >= 0 ? r[colAnswer] ?? '' : '').trim();
    const rawImg = (colImage >= 0 ? r[colImage] ?? '' : '').trim();
    const title = (colTitle >= 0 ? r[colTitle] ?? '' : '').trim();
    if (!structureOrDiagnosis && !title) continue;

    const rawSub = (colSubject >= 0 ? r[colSubject] ?? '' : '').trim();
    const subjectId = rawSub ? normalizeSubjectIdentity(rawSub).id : fallbackSubject;
    const urlMatch = rawImg.match(/(https?:\/\/[^\s"'<>]+)/i);
    const imageUrl = urlMatch ? convertDriveImageUrl(urlMatch[1]) : rawImg;

    cards.push({
      id: `sheet-ospe-${subjectId}-${i}`,
      subject: subjectId,
      title: title || `สไลด์ ${i + 1}`,
      imageUrl,
      structureOrDiagnosis: structureOrDiagnosis || title,
      clues: colClues >= 0 ? (r[colClues] ?? '').trim() || undefined : undefined,
      topicTag: colTag >= 0 ? (r[colTag] ?? '').trim() || undefined : undefined,
    });
  }
  return cards;
}

export async function syncAllPublicSheetTabs(
  spreadsheetId: string,
  options?: { preferredGid?: string | null; knownTabs?: Array<{ title: string; gid: string }>; knownTitle?: string }
): Promise<MultiTabSyncResult> {
  let title = options?.knownTitle ?? 'Google Sheet';
  let tabs = options?.knownTabs ?? [];

  try {
    const meta = await fetchPublicSheetMeta(spreadsheetId);
    title = meta.title;
    if (meta.tabs.length > 0) {
      tabs = meta.tabs;
    }
  } catch {
    // Fallback to previously known tabs or single-tab fetch below
  }

  const rawRowsByTab: Record<string, string[][]> = {};
  const allSections: SubjectSection[] = [];
  const allLectures: SheetLectureRow[] = [];
  const quizQuestions: QuizQuestionItem[] = [];
  const ospeCards: LabOspeCardItem[] = [];

  const processTabRows = (tabTitle: string, rows: string[][]) => {
    const kind = detectSheetTabKind(rows, tabTitle);
    if (kind === 'quiz') {
      quizQuestions.push(...parseQuizSheetValues(rows, tabTitle));
      return;
    }
    if (kind === 'ospe') {
      ospeCards.push(...parseOspeSheetValues(rows, tabTitle));
      return;
    }
    const parsed = parseSheetValues(rows, tabTitle);
    if (parsed.lectures.length > 0) {
      allSections.push(...parsed.subjectSections);
      allLectures.push(...parsed.lectures);
    }
  };

  if (tabs.length > 0) {
    const tabResults = await Promise.allSettled(
      tabs.map(async (tab) => {
        const rows = await fetchPublicSheetCsv(spreadsheetId, {
          sheetName: tab.title,
          gid: tab.gid,
        });
        return { tab, rows };
      })
    );

    let anySuccess = false;
    let firstError: unknown;

    for (const res of tabResults) {
      if (res.status === 'fulfilled') {
        anySuccess = true;
        rawRowsByTab[res.value.tab.title] = res.value.rows;
        processTabRows(res.value.tab.title, res.value.rows);
      } else if (!firstError) {
        firstError = res.reason;
      }
    }

    if (!anySuccess && firstError) {
      throw firstError;
    }
  } else {
    const rows = await fetchPublicSheetCsv(spreadsheetId, {
      gid: options?.preferredGid || undefined,
    });
    const fallbackTabTitle = options?.preferredGid ? `gid ${options.preferredGid}` : 'ชีตหลัก';
    rawRowsByTab[fallbackTabTitle] = rows;
    processTabRows(fallbackTabTitle, rows);
    tabs = [{ title: fallbackTabTitle, gid: options?.preferredGid ?? '0' }];
  }

  return {
    title,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit${
      options?.preferredGid ? `#gid=${options.preferredGid}` : ''
    }`,
    tabs,
    sections: mergeParsedSections(allSections),
    allLectures,
    quizQuestions,
    ospeCards,
    rawRowsByTab,
  };
}

export async function syncAllOAuthSheetTabs(
  accessToken: string,
  meta: SpreadsheetMetadata
): Promise<MultiTabSyncResult> {
  const ranges = meta.sheets.map((tab) => `'${tab.title.replace(/'/g, "''")}'!A1:Z500`);
  const rangeParams = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    meta.spreadsheetId
  )}/values:batchGet?${rangeParams}`;

  const data = await fetchGoogleApi<{
    valueRanges?: Array<{ range?: string; values?: string[][] }>;
  }>(url, accessToken);

  const rawRowsByTab: Record<string, string[][]> = {};
  const allSections: SubjectSection[] = [];
  const allLectures: SheetLectureRow[] = [];
  const quizQuestions: QuizQuestionItem[] = [];
  const ospeCards: LabOspeCardItem[] = [];

  meta.sheets.forEach((tab, idx) => {
    const rows = data.valueRanges?.[idx]?.values ?? [];
    rawRowsByTab[tab.title] = rows;
    const kind = detectSheetTabKind(rows, tab.title);
    if (kind === 'quiz') {
      quizQuestions.push(...parseQuizSheetValues(rows, tab.title));
      return;
    }
    if (kind === 'ospe') {
      ospeCards.push(...parseOspeSheetValues(rows, tab.title));
      return;
    }
    const parsed = parseSheetValues(rows, tab.title);
    if (parsed.lectures.length > 0) {
      allSections.push(...parsed.subjectSections);
      allLectures.push(...parsed.lectures);
    }
  });

  return {
    title: meta.title,
    spreadsheetUrl: meta.spreadsheetUrl,
    tabs: meta.sheets.map((s) => ({ title: s.title, gid: String(s.sheetId) })),
    sections: mergeParsedSections(allSections),
    allLectures,
    quizQuestions,
    ospeCards,
    rawRowsByTab,
  };
}

export const SHEET_TEMPLATE_HEADERS = [
  'Year',
  'Subject',
  'Lecture',
  'Instructor / Title',
  'Topic / Email',
  'MCQ Scope',
  'Status',
  'Video Links',
  'Slides (PDF/Drive)',
  'Summary Sheets',
  'Note',
];

export function lecturesToSheetRows(lectures: LectureItem[], yearId: YearId = 'year2'): string[][] {
  return lectures.map((item) => [
    yearId,
    item.subject.toUpperCase(),
    item.lectureLabel,
    item.title,
    item.subtitle,
    item.mcqLabel ?? (item.mcqRound ?? ''),
    item.status ?? '',
    item.links.map((l) => `${l.label} ${l.url}`).join('\n'),
    (item.slides ?? []).map((l) => `${l.label} ${l.url}`).join('\n'),
    (item.summaries ?? []).map((l) => `${l.label} ${l.url}`).join('\n'),
    item.note ?? '',
  ]);
}

export async function createKnowledgeHubSpreadsheet(
  accessToken: string,
  title: string,
  initialLectures: LectureItem[]
): Promise<SpreadsheetMetadata> {
  const sheetTitle = 'Lectures';
  const created = await fetchGoogleApi<{
    spreadsheetId: string;
    spreadsheetUrl: string;
    properties?: { title?: string };
    sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
  }>('https://sheets.googleapis.com/v4/spreadsheets', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: [{ properties: { title: sheetTitle } }],
    }),
  });

  const rows = [SHEET_TEMPLATE_HEADERS, ...lecturesToSheetRows(initialLectures, 'year2')];
  const range = encodeURIComponent(`'${sheetTitle}'!A1`);
  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      created.spreadsheetId
    )}/values/${range}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({ values: rows }),
    }
  );

  return {
    spreadsheetId: created.spreadsheetId,
    title: created.properties?.title ?? title,
    spreadsheetUrl: created.spreadsheetUrl,
    sheets: (created.sheets ?? []).map((s, idx) => ({
      sheetId: s.properties?.sheetId ?? idx,
      title: s.properties?.title ?? sheetTitle,
    })),
  };
}

export async function overwriteSheetWithLectures(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  lectures: LectureItem[]
): Promise<void> {
  const escapedTitle = `'${sheetTitle.replace(/'/g, "''")}'`;
  const clearRange = encodeURIComponent(`${escapedTitle}!A1:Z500`);
  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${clearRange}:clear`,
    accessToken,
    { method: 'POST' }
  );

  const rows = [SHEET_TEMPLATE_HEADERS, ...lecturesToSheetRows(lectures, 'year2')];
  const writeRange = encodeURIComponent(`${escapedTitle}!A1`);
  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${writeRange}?valueInputOption=USER_ENTERED`,
    accessToken,
    {
      method: 'PUT',
      body: JSON.stringify({ values: rows }),
    }
  );
}

export async function appendLectureRowToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  rowValues: string[]
): Promise<void> {
  const escapedTitle = `'${sheetTitle.replace(/'/g, "''")}'`;
  const range = encodeURIComponent(`${escapedTitle}!A1`);
  await fetchGoogleApi(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ values: [rowValues] }),
    }
  );
}
