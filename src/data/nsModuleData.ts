export interface SemesterCourseInfo {
  code: string;
  englishName: string;
  thaiName: string;
  credits: string;
  instructors: Array<{ name: string; department: string }>;
}

export interface NsGradingItem {
  id: string;
  order: string;
  title: string;
  hoursOrCount: string;
  percent: string;
  details: string[];
}

export interface NsExamScheduleItem {
  id: string;
  phase: 'Midblock' | 'Final';
  title: string;
  date: string;
  time: string;
  location: string;
  totalLabel: string;
  scopes: Array<{ label: string; content: string }>;
  note?: string;
}

export interface NsLabCaseItem {
  id: string;
  code: string;
  title: string;
  date: string;
  time: string;
  instructors: string;
  room: string;
  assessment: string;
}

export type ScheduleSessionKind = 'lecture' | 'lab' | 'case' | 'exam' | 'review' | 'holiday' | 'sdl';

export interface NsScheduleSession {
  time: string;
  title: string;
  instructor?: string;
  room?: string;
  kind: ScheduleSessionKind;
}

export interface NsScheduleDay {
  dayLabel: string;
  dateLabel: string;
  sessions: NsScheduleSession[];
}

export interface NsScheduleWeek {
  weekNumber: number;
  dateRange: string;
  focusLabel: string;
  days: NsScheduleDay[];
}

export const YEAR2_SEMESTER2_META = {
  announcementDate: 'ฉบับประกาศวันที่ 30 ต.ค. 2569',
  termTitle: 'ตารางสอนนักศึกษาแพทย์ชั้นปีที่ 2 ประจำภาคปลาย ปีการศึกษา 2569',
  startDate: 'เปิดเรียนภาคปลาย วันที่ 9 พฤศจิกายน 2569',
  academicAdvisor: 'ผศ.ฉลองชัย เฉลิมวัฒน์ (สาขาวิชาชีวเคมี)',
  academicAdvisorEmail: 'cchanl@kku.ac.th',
  coordinator: 'สายฝน ส่งเสริฐ (หน่วยทะเบียนและประเมินผลการศึกษา)',
  coordinatorPhone: 'ภายใน 63326 · ภายนอก 043-363326',
};

export const YEAR2_SEMESTER2_COURSES: SemesterCourseInfo[] = [
  {
    code: 'MD 532 111',
    englishName: 'Nervous System',
    thaiName: 'ระบบประสาท (หมวดวิชาเฉพาะ)',
    credits: '6 (5-2-11)',
    instructors: [
      { name: 'รศ.นนทญา นาคคำ', department: 'เภสัชวิทยา' },
      { name: 'ผศ.พิมาณ โภคาทรัพย์', department: 'เภสัชวิทยา' },
    ],
  },
  {
    code: 'MD 532 113',
    englishName: 'Gastrointestinal System',
    thaiName: 'ระบบทางเดินอาหาร (หมวดวิชาเฉพาะ)',
    credits: '5 (4-2-9)',
    instructors: [
      { name: 'ผศ.สมสุดา โสมอินทร์', department: 'กายวิภาคศาสตร์' },
      { name: 'ผศ.นิชาภา พันชะโก', department: 'กายวิภาคศาสตร์' },
    ],
  },
  {
    code: 'MD 532 114',
    englishName: 'Endocrine System',
    thaiName: 'ระบบต่อมไร้ท่อ (หมวดวิชาเฉพาะ)',
    credits: '4 (3-2-7)',
    instructors: [
      { name: 'รศ.ศริญญา คงเพชร', department: 'เภสัชวิทยา' },
      { name: 'ผศ.คัมภีร์พร บุญหล่อ', department: 'เภสัชวิทยา' },
    ],
  },
  {
    code: 'MD 742 101',
    englishName: 'Community Medicine and Epidemiology',
    thaiName: 'เวชศาสตร์ชุมชนและวิทยาการระบาด (หมวดวิชาเฉพาะ)',
    credits: '3 (3-0-6)',
    instructors: [
      { name: 'รศ.วริสรา ลุวีระ', department: 'เวชศาสตร์ชุมชนฯ' },
      { name: 'อ.นนท์ปวิธ โชติชัย', department: 'เวชศาสตร์ชุมชนฯ' },
    ],
  },
];

export const NS_MODULE_META = {
  code: 'MD 532 111',
  title: 'Nervous System 6 (5-2-11)',
  period: '9 พฤศจิกายน – 30 ธันวาคม 2569 (8 สัปดาห์)',
  passingRule: 'เกรดแบ่งเป็น A–F · เกณฑ์ผ่านตั้งแต่ร้อยละ 55 ขึ้นไป (C)',
  departmentPhone: 'สาขาวิชาเภสัชวิทยา: 043-363259, 043-363148',
  committee: [
    { role: 'ประธาน', name: 'รศ.นนทญา นาคคำ', email: 'nontna@kku.ac.th' },
    { role: 'เลขา', name: 'รศ.พิมาน โภคาทรัพย์', email: 'pimapo@kku.ac.th' },
    { role: 'ผู้ช่วยเลขา', name: 'ผศ.คณาทิพย์ สิงห์สาย', email: 'kanasi@kku.ac.th' },
  ],
};

export const NS_GRADING_ITEMS: NsGradingItem[] = [
  {
    id: 'grade-lecture',
    order: '1',
    title: 'บรรยาย (L2–L65)',
    hoursOrCount: '64 ชม.',
    percent: '70%',
    details: ['สอบข้อเขียน 64 ชม. (ไม่รวม L1)'],
  },
  {
    id: 'grade-lab',
    order: '2',
    title: 'ปฏิบัติการ (Lab 1–11)',
    hoursOrCount: '31.5 ชม. / 11 คาบ',
    percent: '13%',
    details: [
      'คิดเป็น 11 ชม. บรรยาย (คะแนนปฏิบัติการละ 13/11 ≈ 1.2%)',
      'Lab 1–6, 8–10 (9 lab): สอบ 9% + attention/quiz 1.8% = 10.8%',
      'Lab 7 Clinical Pharmacology: attention + post-test = 1.1% (ไม่มีสอบ)',
      'Lab 11 Clinical Anatomy: attention + performance = 1.1% (ไม่มีสอบ)',
    ],
  },
  {
    id: 'grade-pbl',
    order: '3.1',
    title: 'กรณีศึกษา PBL: 1 case study (3 SG)',
    hoursOrCount: '6 ชม.',
    percent: '7%',
    details: ['MEQ 4.2% + SG activity 2.8% (สอบ MEQ 60%, SG activity 40%)'],
  },
  {
    id: 'grade-tbl',
    order: '3.2',
    title: 'กรณีศึกษา TBL: 2 cases (Headache & Vertigo)',
    hoursOrCount: '6 ชม.',
    percent: '7% (3.5% × 2)',
    details: [
      'TBL 1 (Headache): MEQ 2.1% + TBL activity 1.4%',
      'TBL 2 (Vertigo): MEQ 2.1% + TBL activity 1.4%',
    ],
  },
  {
    id: 'grade-ece',
    order: '4',
    title: 'Early clinical exposure (ECE)',
    hoursOrCount: '1 คาบ',
    percent: '1%',
    details: ['เข้ากิจกรรม Early clinical exposure (แบ่ง Sec 1–2)'],
  },
  {
    id: 'grade-formative',
    order: '5',
    title: 'Formative assessment',
    hoursOrCount: '2 ชุด',
    percent: '2%',
    details: [
      'ข้อสอบ 2 ชุด (ก่อน Midblock และก่อน Final exam) ทำได้ชุดละ 3 ครั้ง',
      'เลือกคะแนนครั้งที่ดีที่สุด หากได้ ≥ 80% ได้คะแนนในข้อสอบชุดนั้นเต็ม',
    ],
  },
];

export const NS_EXAM_SCHEDULE: NsExamScheduleItem[] = [
  {
    id: 'ns-exam-mid-mcq1',
    phase: 'Midblock',
    title: 'Midblock: MCQ I + Lab paper I',
    date: 'จันทร์ 30 พ.ย. 69',
    time: '13:00–16:00 น. (3 ชั่วโมง)',
    location: 'KKU Exam ห้องคอมพิวเตอร์ชั้น 3 และชั้น 7',
    totalLabel: '105 ข้อ (MCQ I 100 ข้อ + Lab paper I 5 ข้อ)',
    scopes: [
      { label: 'Anatomy', content: 'L2-4, L5-6, L7-9, L10-12, L13, L14, L24' },
      { label: 'Physiology', content: 'L17, L25, L26-27' },
      { label: 'Pharmacology', content: 'L28-29' },
      { label: 'Lab paper I (5 ข้อ)', content: 'Lab 3 Physio เฉพาะ sensation' },
    ],
    note: 'รวม 20 ชม. บรรยาย (ไม่รวม L1)',
  },
  {
    id: 'ns-exam-mid-lab',
    phase: 'Midblock',
    title: 'Midblock: สอบปฏิบัติการ Lab 1, 2, 4',
    date: 'อังคาร 1 ธ.ค. 69',
    time: '12:00–17:00 น.',
    location: 'กักตัว Lab 8 (11:00–12:00) · สอบห้อง GROSS',
    totalLabel: 'Lab 1, 2, 4',
    scopes: [
      { label: 'Lab 1', content: 'Gross Face and Infratemporal' },
      { label: 'Lab 2', content: 'Gross structure of NS & internal morphology of spinal cord' },
      { label: 'Lab 4', content: 'Brainstem, Cranial nerves and diencephalon' },
    ],
  },
  {
    id: 'ns-exam-final-mcq2',
    phase: 'Final',
    title: 'Final: MCQ II + Lab paper II',
    date: 'จันทร์ 21 ธ.ค. 69',
    time: '13:00–16:00 น. (3 ชั่วโมง)',
    location: 'KKU Exam ห้องคอมพิวเตอร์ชั้น 3 และชั้น 7',
    totalLabel: '100 ข้อ (MCQ II 95 ข้อ + Lab paper II 5 ข้อ)',
    scopes: [
      { label: 'Anatomy (19 ชม. รวม)', content: 'L15-16, L18-20, L31-32, L34, L35, L37, L38' },
      { label: 'Physiology', content: 'L21-22, L23, L33, L39, L40, L41-42' },
      { label: 'Lab paper II (5 ข้อ)', content: 'Lab 3 Physio เฉพาะ reflexes' },
    ],
  },
  {
    id: 'ns-exam-final-mcq3',
    phase: 'Final',
    title: 'Final: Lab paper III + MCQ III',
    date: 'ศุกร์ 25 ธ.ค. 69',
    time: '13:00–16:00 น. (Lab 30 นาที + MCQ 2 ชม.)',
    location: 'KKU Exam ห้องคอมพิวเตอร์ชั้น 3 และชั้น 7',
    totalLabel: '85 ข้อ (Lab paper III 20 ข้อ + MCQ III 65 ข้อ)',
    scopes: [
      { label: 'Lab paper III (20 ข้อ)', content: 'Lab 8 (Patho) + Lab 9(A) (Parasite) + Lab 9(B) (Micro)' },
      { label: 'Pathology', content: 'L30, L36, L48-49, L50, L54' },
      { label: 'Microbiology', content: 'L43-44, L45' },
      { label: 'Parasitology', content: 'L46-47' },
      { label: 'Radiology', content: 'L51-52' },
    ],
  },
  {
    id: 'ns-exam-final-mcq4',
    phase: 'Final',
    title: 'Final: MCQ IV',
    date: 'จันทร์ 28 ธ.ค. 69',
    time: '13:00–15:00 น. (2 ชั่วโมง)',
    location: 'KKU Exam ห้องคอมพิวเตอร์ชั้น 3 และชั้น 7',
    totalLabel: '60 ข้อ (12 ชม.)',
    scopes: [
      {
        label: 'Pharmacology',
        content: 'L53 (+ Intro CNS 0.5h), L55, L56, L57, L58-59, L60-61, L62, L63, L64, L65',
      },
    ],
  },
  {
    id: 'ns-exam-final-lab',
    phase: 'Final',
    title: 'Final: สอบปฏิบัติการ Lab 5, 6, 10 (A, B)',
    date: 'อังคาร 29 ธ.ค. 69',
    time: '12:00–17:00 น.',
    location: 'กักตัว ห้องมอดินแดง (11:00–12:00) · สอบห้อง LAB 8',
    totalLabel: 'Lab 5, 6, 10 (A, B)',
    scopes: [
      { label: 'Lab 5', content: 'Cerebrum, Limbic system, Olfactory & Gustatory systems' },
      { label: 'Lab 6', content: 'Motor system' },
      { label: 'Lab 10 (A, B)', content: 'Histology & Gross Anatomy of Eye & Ear' },
    ],
  },
  {
    id: 'ns-exam-final-meq',
    phase: 'Final',
    title: 'Final: MEQ paper',
    date: 'พุธ 30 ธ.ค. 69',
    time: '13:00–15:00 น. (2 ชั่วโมง)',
    location: 'KKU Exam ห้องคอมพิวเตอร์ชั้น 3 และชั้น 7',
    totalLabel: 'MEQ (PBL 4.2% + TBL1 2.1% + TBL2 2.1%)',
    scopes: [
      { label: 'กรณีศึกษา', content: 'ครอบคลุมเนื้อหา PBL case study, TBL 1 (Headache) และ TBL 2 (Vertigo)' },
    ],
  },
];

export interface BlockExamConfig {
  id: string;
  subjectId: string;
  label: string;
  dateIso: string; // YYYY-MM-DD (Gregorian CE: 2569 BE = 2026 CE)
  timeNote?: string;
  mcqRound?: 'mcq-1' | 'mcq-2' | 'mcq-3' | 'mcq-4' | 'lab';
}

export const DEFAULT_BLOCK_EXAMS: BlockExamConfig[] = [
  {
    id: 'ns-mcq-1',
    subjectId: 'ns',
    label: 'NS Midblock: MCQ I + Lab paper I',
    dateIso: '2026-11-30',
    timeNote: '13:00–16:00 น. · KKU Exam',
    mcqRound: 'mcq-1',
  },
  {
    id: 'ns-mid-lab',
    subjectId: 'ns',
    label: 'NS Midblock: สอบ Lab 1, 2, 4',
    dateIso: '2026-12-01',
    timeNote: '12:00–17:00 น. · ห้อง GROSS',
    mcqRound: 'lab',
  },
  {
    id: 'ns-mcq-2',
    subjectId: 'ns',
    label: 'NS Final: MCQ II + Lab paper II',
    dateIso: '2026-12-21',
    timeNote: '13:00–16:00 น. · KKU Exam',
    mcqRound: 'mcq-2',
  },
  {
    id: 'ns-mcq-3',
    subjectId: 'ns',
    label: 'NS Final: Lab paper III + MCQ III',
    dateIso: '2026-12-25',
    timeNote: '13:00–16:00 น. · KKU Exam',
    mcqRound: 'mcq-3',
  },
  {
    id: 'ns-mcq-4',
    subjectId: 'ns',
    label: 'NS Final: MCQ IV (Pharmaco)',
    dateIso: '2026-12-28',
    timeNote: '13:00–15:00 น. · KKU Exam',
    mcqRound: 'mcq-4',
  },
  {
    id: 'ns-final-lab',
    subjectId: 'ns',
    label: 'NS Final: สอบ Lab 5, 6, 10 (A, B)',
    dateIso: '2026-12-29',
    timeNote: '12:00–17:00 น. · LAB 8',
    mcqRound: 'lab',
  },
];


export const NS_LABS_AND_CASES: NsLabCaseItem[] = [
  {
    id: 'ns-lab-1',
    code: 'Lab 1',
    title: 'Gross Face and Infratemporal',
    date: 'ศ. 13 พ.ย. (Sec 1) · จ. 16 พ.ย. (Sec 2)',
    time: '13:00–16:00 น.',
    instructors: 'จริยา และคณะ (Anat.)',
    room: 'LAB GROSS',
    assessment: 'สอบ Midblock 1 ธ.ค. 69',
  },
  {
    id: 'ns-lab-2',
    code: 'Lab 2',
    title: 'Gross structure of the nervous system & internal morphology of spinal cord',
    date: 'ศ. 20 พ.ย. 69',
    time: 'Sec 2: 09:00–11:00 · Sec 1: 13:00–15:00 น.',
    instructors: 'รรินธร และคณะ (Anat.)',
    room: 'LAB GROSS',
    assessment: 'สอบ Midblock 1 ธ.ค. 69',
  },
  {
    id: 'ns-lab-3',
    code: 'Lab 3',
    title: 'Sensation & Reflex',
    date: 'ศ. 20 พ.ย. 69',
    time: 'Sec 1: 11:00–12:00 · Sec 2: 15:00–16:00 น.',
    instructors: 'ภารดี จุฑามาศ และคณะ (Physio)',
    room: 'LAB 1–2',
    assessment: 'Lab paper I (sensation 5 ข้อ) · Lab paper II (reflexes 5 ข้อ)',
  },
  {
    id: 'ns-lab-4',
    code: 'Lab 4',
    title: 'Brainstem, Cranial nerves and diencephalon',
    date: 'จ. 23 พ.ย. (Sec 1) · อ. 24 พ.ย. (Sec 2)',
    time: 'Sec 1: 13:00–15:00 · Sec 2: 09:00–11:00 น.',
    instructors: 'ธันยาภรณ์-นารีลักษณ์ และคณะ (Anat.)',
    room: 'LAB 8',
    assessment: 'สอบ Midblock 1 ธ.ค. 69',
  },
  {
    id: 'ns-lab-5',
    code: 'Lab 5',
    title: 'Cerebrum, Limbic system, Olfactory and Gustatory systems',
    date: 'ศ. 4 ธ.ค. 69',
    time: 'Sec 1: 09:00–11:00 · Sec 2: 13:00–15:00 น.',
    instructors: 'อารดา, สมสุดา และคณะ (Anat.)',
    room: 'LAB GROSS',
    assessment: 'สอบ Final 29 ธ.ค. 69',
  },
  {
    id: 'ns-lab-6',
    code: 'Lab 6',
    title: 'Motor system',
    date: 'อ. 8 ธ.ค. 69',
    time: 'Sec 1: 09:00–10:30 · Sec 2: 13:00–14:30 น.',
    instructors: 'ตุลยณัฐ และคณะ (Anat.)',
    room: 'LAB 8',
    assessment: 'สอบ Final 29 ธ.ค. 69',
  },
  {
    id: 'ns-lab-7',
    code: 'Lab 7',
    title: 'Clinical pharmacology: Neurology drugs',
    date: 'อ. 8 ธ.ค. 69',
    time: 'Sec 2: 10:30–12:00 · Sec 1: 14:30–16:00 น.',
    instructors: 'นนทญา และคณะ (Pharmaco)',
    room: 'ห้องเรียนกลุ่มย่อย 4201-4206, 4301-4306, 4401-4403',
    assessment: 'Attention + post-test 1.1% (ไม่มีสอบ)',
  },
  {
    id: 'ns-lab-8',
    code: 'Lab 8',
    title: 'Pathology in NS (Sec 1 & 2)',
    date: 'พ. 9 ธ.ค. 69',
    time: '09:00–12:00 น.',
    instructors: 'ศักดา และคณะ (Patho)',
    room: 'ปช.2 เวชวิชชาคาร',
    assessment: 'Lab paper III (25 ธ.ค. 69)',
  },
  {
    id: 'ns-lab-9',
    code: 'Lab 9 (A/B)',
    title: 'CNS infection: Parasitic (9A) & Microbial (9B)',
    date: 'พ. 9 ธ.ค. 69',
    time: '13:00–16:00 น. (สลับ Sec 1 / Sec 2)',
    instructors: 'อภิสิทธิ์และคณะ (Parasite) / ปรม-สกาวรัตน์ (Micro)',
    room: 'LAB 6 (9A) / LAB 7 (9B)',
    assessment: 'Lab paper III (25 ธ.ค. 69)',
  },
  {
    id: 'ns-lab-10',
    code: 'Lab 10 (A/B)',
    title: 'Histology (virtual slide) & Gross Anatomy of Eye & Ear (Demonstration)',
    date: 'ศ. 11 ธ.ค. 69',
    time: '10A: 09:00–10:00 · 10B: 10:00–12:00 น.',
    instructors: 'ตุลยณัฐ, อนุสรา และคณะ (Anat.)',
    room: 'ปช.2 เวชวิชชาคาร (10A) / LAB GROSS (10B)',
    assessment: 'สอบ Final 29 ธ.ค. 69',
  },
  {
    id: 'ns-lab-11',
    code: 'Lab 11',
    title: 'Clinical anatomy (ตรวจร่างกาย)',
    date: 'จ. 14 ธ.ค. 69',
    time: 'Sec 1: 13:00–14:30 · Sec 2: 14:30–16:00 น.',
    instructors: 'Anat.',
    room: 'ห้องประชุมมิตรภาพ',
    assessment: 'Attention + performance 1.1% (ไม่มีสอบ)',
  },
  {
    id: 'ns-pbl',
    code: 'PBL',
    title: 'PBL Case study (SG 1/3, 2/3, 3/3)',
    date: 'จ. 23 พ.ย. · พ. 25 พ.ย. · ศ. 27 พ.ย. 69',
    time: '10:00–12:00 น.',
    instructors: '30 กลุ่มย่อย',
    room: 'ห้องกลุ่มย่อย 4201-4606 อาคารเวชวิชชาคาร',
    assessment: '7% (MEQ 4.2% + SG activity 2.8%)',
  },
  {
    id: 'ns-tbl-1',
    code: 'TBL 1',
    title: 'TBL 1: Headache',
    date: 'ศ. 11 ธ.ค. 69',
    time: '13:00–16:00 น.',
    instructors: 'ศักดา และคณะ (Patho)',
    room: 'ห้องประชุมมิตรภาพ',
    assessment: '3.5% (MEQ 2.1% + TBL activity 1.4%)',
  },
  {
    id: 'ns-tbl-2',
    code: 'TBL 2',
    title: 'TBL 2: Vertigo',
    date: 'อ. 15 ธ.ค. 69',
    time: '13:00–16:00 น.',
    instructors: 'ศิริพร และคณะ (Pharmaco)',
    room: 'ห้องประชุมมิตรภาพ',
    assessment: '3.5% (MEQ 2.1% + TBL activity 1.4%)',
  },
  {
    id: 'ns-ece',
    code: 'ECE',
    title: 'Early Clinical Exposure (Sec 1 & 2)',
    date: 'พฤ. 17 ธ.ค. (Sec 1) · ศ. 18 ธ.ค. (Sec 2)',
    time: '13:00–15:00 น.',
    instructors: 'คณาจารย์ประจำโมดูล',
    room: 'ตามประกาศกลุ่ม',
    assessment: '1%',
  },
];

export const NS_WEEKLY_SCHEDULE: NsScheduleWeek[] = [
  {
    weekNumber: 1,
    dateRange: '9–13 พ.ย. 69',
    focusLabel: 'Orientation, Neuroanatomy L1–L20, Motor Function L21–22, Lab 1 (Sec 1)',
    days: [
      {
        dayLabel: 'จันทร์',
        dateLabel: '9 พ.ย. 69',
        sessions: [
          { time: '08:15–09:00', title: 'ฝ่ายวิชาการพบ นศ.', room: 'ปช.2 เวชวิชชาคาร', kind: 'case' },
          { time: '09:00–10:00', title: 'Case Presentation and course orientation', instructor: 'นนทญา, นิศา, และคณะ', room: 'ปช.2 เวชวิชชาคาร', kind: 'case' },
          { time: '10:00–11:00', title: 'L1 Glossary of neuroanatomical terms and eponyms', instructor: 'สุภัจฉรี (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '13:00–16:00', title: 'L2-4 The gross structure of the nervous system', instructor: 'รรินธร (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
        ],
      },
      {
        dayLabel: 'อังคาร',
        dateLabel: '10 พ.ย. 69',
        sessions: [
          { time: '09:00–11:00', title: 'L5-6 Development of nervous system', instructor: 'วันชนะ (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '13:00–16:00', title: 'L7-9 Brainstem and cranial nerves', instructor: 'ธันยาภรณ์ (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
        ],
      },
      {
        dayLabel: 'พุธ',
        dateLabel: '11 พ.ย. 69',
        sessions: [
          { time: '09:00–12:00', title: 'L10-12 Face, Scalp, Infratemporal region', instructor: 'จริยา (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '13:00–14:00', title: 'L13 Diencephalon', instructor: 'นารีลักษณ์ (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '14:00–15:00', title: 'L14 ANS', instructor: 'นารีลักษณ์ (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
        ],
      },
      {
        dayLabel: 'พฤหัสฯ',
        dateLabel: '12 พ.ย. 69',
        sessions: [
          { time: '09:00–11:00', title: 'L15-16 The cerebrum', instructor: 'อารดา (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '11:00–12:00', title: 'L17 ANS', instructor: 'วิภาวี (Physio)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '13:00–16:00', title: 'L18-20 Motor system (Pyramidal system, cerebellum, basal ganglia)', instructor: 'ตุลยณัฐ (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
        ],
      },
      {
        dayLabel: 'ศุกร์',
        dateLabel: '13 พ.ย. 69',
        sessions: [
          { time: '09:00–11:00', title: 'L21-22 Motor function', instructor: 'อภิวันท์ (Physio)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '13:00–16:00', title: 'Lab 1 Gross Face and Infratemporal (Sec 1) · SDL (Sec 2)', instructor: 'จริยา และคณะ (Anat.)', room: 'LAB GROSS', kind: 'lab' },
        ],
      },
    ],
  },
  {
    weekNumber: 2,
    dateRange: '16–20 พ.ย. 69',
    focusLabel: 'Neuro Exam, Sensory/Reflex/Pain/Special Senses L23–L42, Lab 1 (Sec 2), Lab 2, Lab 3',
    days: [
      {
        dayLabel: 'จันทร์',
        dateLabel: '16 พ.ย. 69',
        sessions: [
          { time: '09:00–10:00', title: 'Neuro Exam', instructor: 'ศ.สมศักดิ์', room: 'ปช.2 เวชวิชชาคาร', kind: 'case' },
          { time: '10:00–11:00', title: 'L23 Reflex', instructor: 'จุฑามาศ (Physio)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '11:00–12:00', title: 'L24 Somatosensory system', instructor: 'นงนุช (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '13:00–16:00', title: 'Lab 1 Gross Face and Infratemporal (Sec 2) · SDL (Sec 1)', instructor: 'จริยา และคณะ (Anat.)', room: 'LAB GROSS', kind: 'lab' },
        ],
      },
      {
        dayLabel: 'อังคาร',
        dateLabel: '17 พ.ย. 69',
        sessions: [
          { time: '09:00–10:00', title: 'L25 Sensory', instructor: 'ภารดี (Physio)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '10:00–12:00', title: 'L26-27 Pain & Itch', instructor: 'ภารดี (Physio)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '13:00–15:00', title: 'L28-29 Narcotic analgesic drugs', instructor: 'ปณต (Pharmaco)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '15:00–16:00', title: 'L30 Trauma & mechanical dis.', instructor: 'ศักดา (Patho.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
        ],
      },
      {
        dayLabel: 'พุธ',
        dateLabel: '18 พ.ย. 69',
        sessions: [
          { time: '09:00–11:00', title: 'L31-32 The limbic, olfactory, and gustatory system', instructor: 'สมสุดา (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '11:00–12:00', title: 'L33 Taste & smell', instructor: 'วิภาวี (Physio)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '13:00–14:00', title: 'L34 Gross & histo of the eye', instructor: 'ตุลยณัฐ (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '14:00–15:00', title: 'L35 The visual system', instructor: 'ตุลยณัฐ (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '15:00–16:00', title: 'L36 Cerebrovascular disease', instructor: 'ศักดา (Patho.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
        ],
      },
      {
        dayLabel: 'พฤหัสฯ',
        dateLabel: '19 พ.ย. 69',
        sessions: [
          { time: '09:00–10:00', title: 'L37 The auditory sys.', instructor: 'อนุสรา (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '10:00–11:00', title: 'L38 The vestibular sys.', instructor: 'อนุสรา (Anat.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '13:00–14:00', title: 'L39 Auditory vestibular', instructor: 'วิยะดา (Physio)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '14:00–15:00', title: 'L40 Physiology of the visual system', instructor: 'วิยะดา (Physio)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '15:00–17:00', title: 'L41-42 Higher brain functions', instructor: 'สุภาพร (Physio)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
        ],
      },
      {
        dayLabel: 'ศุกร์',
        dateLabel: '20 พ.ย. 69',
        sessions: [
          { time: '09:00–11:00', title: 'Lab 2 Gross structure of the NS & spinal cord (Sec 2)', instructor: 'รรินธร และคณะ (Anat.)', room: 'LAB GROSS', kind: 'lab' },
          { time: '11:00–12:00', title: 'Lab 3 Sensation & Reflex (Sec 1)', instructor: 'ภารดี จุฑามาศ และคณะ (Physio)', room: 'LAB 1–2', kind: 'lab' },
          { time: '13:00–15:00', title: 'Lab 2 Gross structure of the NS & spinal cord (Sec 1)', instructor: 'รรินธร และคณะ (Anat.)', room: 'LAB GROSS', kind: 'lab' },
          { time: '15:00–16:00', title: 'Lab 3 Sensation & Reflex (Sec 2)', instructor: 'ภารดี จุฑามาศ และคณะ (Physio)', room: 'LAB 1–2', kind: 'lab' },
        ],
      },
    ],
  },
  {
    weekNumber: 3,
    dateRange: '23–27 พ.ย. 69',
    focusLabel: 'PBL Case Study (SG 1–3), Lab 4, NS Infections L43–L47, RE 1–3 & Wrap-up Midblock',
    days: [
      {
        dayLabel: 'จันทร์',
        dateLabel: '23 พ.ย. 69',
        sessions: [
          { time: '10:00–12:00', title: 'PBL Case study: SG 1/3 (30 กลุ่ม)', room: 'ห้องกลุ่มย่อย 4201-4606 อาคารเวชวิชชาคาร', kind: 'case' },
          { time: '13:00–15:00', title: 'Lab 4 Brainstem, Cranial nerves and diencephalon (Sec 1) · SDL (Sec 2)', instructor: 'ธันยาภรณ์-นารีลักษณ์ และคณะ', room: 'LAB 8', kind: 'lab' },
        ],
      },
      {
        dayLabel: 'อังคาร',
        dateLabel: '24 พ.ย. 69',
        sessions: [
          { time: '09:00–11:00', title: 'Lab 4 Brainstem, Cranial nerves and diencephalon (Sec 2) · SDL (Sec 1)', instructor: 'ธันยาภรณ์-นารีลักษณ์ และคณะ', room: 'LAB 8', kind: 'lab' },
        ],
      },
      {
        dayLabel: 'พุธ',
        dateLabel: '25 พ.ย. 69',
        sessions: [
          { time: '09:00–10:00', title: 'RE1', instructor: 'ภารดี (Physio)', room: 'ปช.2 เวชวิชชาคาร', kind: 'review' },
          { time: '10:00–12:00', title: 'PBL Case study: SG 2/3 (30 กลุ่ม)', room: 'ห้องกลุ่มย่อย 4201-4606 อาคารเวชวิชชาคาร', kind: 'case' },
          { time: '13:00–15:00', title: 'L43-44 Bacterial infections in the NS', instructor: 'จุฬาพรรณ (Micro)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '15:00–16:00', title: 'L45 Viral infections in the NS', instructor: 'ปรม (Micro)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '16:00–16:30', title: 'Micro Lab orientation', instructor: 'ปรม (Micro)', room: 'ปช.2 เวชวิชชาคาร', kind: 'case' },
        ],
      },
      {
        dayLabel: 'พฤหัสฯ',
        dateLabel: '26 พ.ย. 69',
        sessions: [
          { time: '10:00–12:00', title: 'RE2', instructor: 'ภารดี (Physio)', room: 'ปช.2 เวชวิชชาคาร', kind: 'review' },
          { time: '13:00–15:00', title: 'L46-47 Parasitic infections of the NS', instructor: 'อภิสิทธิ์ (Parasite)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '15:00–16:00', title: 'Wrap-up 1 for midblock', room: 'ปช.2 เวชวิชชาคาร', kind: 'review' },
        ],
      },
      {
        dayLabel: 'ศุกร์',
        dateLabel: '27 พ.ย. 69',
        sessions: [
          { time: '10:00–12:00', title: 'PBL Case study: SG 3/3 (30 กลุ่ม)', room: 'ห้องกลุ่มย่อย 4201-4606 อาคารเวชวิชชาคาร', kind: 'case' },
          { time: '13:00–15:00', title: 'RE3', instructor: 'ภารดี (Physio)', room: 'ปช.2 เวชวิชชาคาร', kind: 'review' },
        ],
      },
    ],
  },
  {
    weekNumber: 4,
    dateRange: '30 พ.ย.–4 ธ.ค. 69',
    focusLabel: 'สอบ Midblock (MCQ I & Lab 1,2,4), Patho/Radio/Pharmaco L48–L59, Lab 5',
    days: [
      {
        dayLabel: 'จันทร์',
        dateLabel: '30 พ.ย. 69',
        sessions: [
          { time: '13:00–16:00', title: 'Midblock examination: MCQ I (100 ข้อ) + Lab paper I (5 ข้อ)', room: 'KKU Exam ชั้น 3 และ 7', kind: 'exam' },
        ],
      },
      {
        dayLabel: 'อังคาร',
        dateLabel: '1 ธ.ค. 69',
        sessions: [
          { time: '11:00–12:00', title: 'กักตัวสอบ Lab (Lab 8)', room: 'Lab 8', kind: 'exam' },
          { time: '12:00–17:00', title: 'Midblock examination Lab 1, 2, and 4', room: 'ห้อง GROSS', kind: 'exam' },
        ],
      },
      {
        dayLabel: 'พุธ',
        dateLabel: '2 ธ.ค. 69',
        sessions: [
          { time: '09:00–11:00', title: 'L48-49 Infection & Inflammation', instructor: 'ศักดา (Patho.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '11:00–12:00', title: 'L50 Neoplasm in NS', instructor: 'ศักดา (Patho.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '13:00–15:00', title: 'L51-52 Imaging in NS', instructor: 'วรินทร (Radio)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '15:00–15:30', title: 'Introduction to CNS (0.5 h)', instructor: 'พิมาน (Pharmaco)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '15:30–16:30', title: 'L53 Sedative and hypnotic drugs', instructor: 'พิมาน (Pharmaco)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
        ],
      },
      {
        dayLabel: 'พฤหัสฯ',
        dateLabel: '3 ธ.ค. 69',
        sessions: [
          { time: '09:00–10:00', title: 'L54 Demyelinating & degenerative dis.', instructor: 'ศักดา (Patho.)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '10:00–11:00', title: "L55 Drugs in Parkinson's disease", instructor: 'คัชรินทร์ (Pharmaco)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '11:00–12:00', title: 'L56 Antidepressants', instructor: 'คัชรินทร์ (Pharmaco)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '13:00–14:00', title: "L57 Drugs in Alzheimer's disease", instructor: 'นนทญา (Pharmaco)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '14:00–16:00', title: 'L58-59 Anti-epileptic drugs', instructor: 'ศิริพร (Pharmaco)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
        ],
      },
      {
        dayLabel: 'ศุกร์',
        dateLabel: '4 ธ.ค. 69',
        sessions: [
          { time: '09:00–11:00', title: 'Lab 5 Cerebrum, Limbic, Olfactory & Gustatory (Sec 1) · SDL (Sec 2)', instructor: 'อารดา, สมสุดา และคณะ', room: 'LAB GROSS', kind: 'lab' },
          { time: '13:00–15:00', title: 'Lab 5 Cerebrum, Limbic, Olfactory & Gustatory (Sec 2) · SDL (Sec 1)', instructor: 'อารดา, สมสุดา และคณะ', room: 'LAB GROSS', kind: 'lab' },
        ],
      },
    ],
  },
  {
    weekNumber: 5,
    dateRange: '7–11 ธ.ค. 69',
    focusLabel: 'Lab 6, Lab 7 (Pharmaco), Lab 8 (Patho), Lab 9 (Micro/Parasite), Lab 10 (Eye/Ear) & TBL 1 Headache',
    days: [
      {
        dayLabel: 'จันทร์',
        dateLabel: '7 ธ.ค. 69',
        sessions: [{ time: 'ทั้งวัน', title: 'หยุดชดเชยวันพ่อแห่งชาติ', kind: 'holiday' }],
      },
      {
        dayLabel: 'อังคาร',
        dateLabel: '8 ธ.ค. 69',
        sessions: [
          { time: '09:00–10:30', title: 'Lab 6 Motor system (Sec 1)', instructor: 'ตุลยณัฐ และคณะ (Anat.)', room: 'LAB 8', kind: 'lab' },
          { time: '10:30–12:00', title: 'Lab 7 Clinical pharmacology: Neurology drugs (Sec 2)', instructor: 'นนทญา และคณะ', room: 'ห้อง 4201-4403', kind: 'lab' },
          { time: '13:00–14:30', title: 'Lab 6 Motor system (Sec 2)', instructor: 'ตุลยณัฐ และคณะ (Anat.)', room: 'LAB 8', kind: 'lab' },
          { time: '14:30–16:00', title: 'Lab 7 Clinical pharmacology: Neurology drugs (Sec 1)', instructor: 'นนทญา และคณะ', room: 'ห้อง 4201-4403', kind: 'lab' },
        ],
      },
      {
        dayLabel: 'พุธ',
        dateLabel: '9 ธ.ค. 69',
        sessions: [
          { time: '09:00–12:00', title: 'Lab 8 Pathology in NS (Sec 1 & 2)', instructor: 'ศักดา และคณะ (Patho)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lab' },
          { time: '13:00–14:30', title: 'Lab 9(A) Parasitic (Sec 1) · Lab 9(B) Microbial (Sec 2)', instructor: 'อภิสิทธิ์ / ปรม-สกาวรัตน์', room: 'LAB 6 / LAB 7', kind: 'lab' },
          { time: '14:30–16:00', title: 'Lab 9(B) Microbial (Sec 1) · Lab 9(A) Parasitic (Sec 2)', instructor: 'ปรม-สกาวรัตน์ / อภิสิทธิ์', room: 'LAB 7 / LAB 6', kind: 'lab' },
        ],
      },
      {
        dayLabel: 'พฤหัสฯ',
        dateLabel: '10 ธ.ค. 69',
        sessions: [{ time: 'ทั้งวัน', title: 'หยุดวันรัฐธรรมนูญ', kind: 'holiday' }],
      },
      {
        dayLabel: 'ศุกร์',
        dateLabel: '11 ธ.ค. 69',
        sessions: [
          { time: '09:00–10:00', title: 'Lab 10(A) Histology of Eye & Ear (Sec 1 & 2 - virtual slide)', instructor: 'ตุลยณัฐ, อนุสรา และคณะ', room: 'ปช.2 เวชวิชชาคาร', kind: 'lab' },
          { time: '10:00–11:00', title: 'Lab 10(B) Gross Anatomy of Eye & Ear (Sec 1)', instructor: 'ตุลยณัฐ, อนุสรา และคณะ', room: 'LAB GROSS', kind: 'lab' },
          { time: '11:00–12:00', title: 'Lab 10(B) Gross Anatomy of Eye & Ear (Sec 2)', instructor: 'ตุลยณัฐ, อนุสรา และคณะ', room: 'LAB GROSS', kind: 'lab' },
          { time: '13:00–16:00', title: 'TBL 1: Headache', instructor: 'ศักดา และคณะ (Patho)', room: 'ห้องประชุมมิตรภาพ', kind: 'case' },
        ],
      },
    ],
  },
  {
    weekNumber: 6,
    dateRange: '14–18 ธ.ค. 69',
    focusLabel: 'CNS Pharmaco L60–L65, Lab 11 (Clinical Anatomy), TBL 2 Vertigo, Wrap-up Final & ECE',
    days: [
      {
        dayLabel: 'จันทร์',
        dateLabel: '14 ธ.ค. 69',
        sessions: [
          { time: '09:30–11:00', title: 'L60-61 Antipsychotic drugs (1.5 h)', instructor: 'พิมาน (Pharmaco)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '11:00–12:00', title: 'L62 Drugs in migraine and vertigo vestibular disorders', instructor: 'ศิริพร (Pharmaco)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '13:00–14:30', title: 'Lab 11 Clinical anatomy (ตรวจร่างกาย) (Sec 1)', instructor: 'Anat.', room: 'ห้องประชุมมิตรภาพ', kind: 'lab' },
          { time: '14:30–16:00', title: 'Lab 11 Clinical anatomy (ตรวจร่างกาย) (Sec 2)', instructor: 'Anat.', room: 'ห้องประชุมมิตรภาพ', kind: 'lab' },
        ],
      },
      {
        dayLabel: 'อังคาร',
        dateLabel: '15 ธ.ค. 69',
        sessions: [
          { time: '09:00–10:00', title: 'Case Presentation – Clinical correlation', instructor: 'นิศา (อายุรศาสตร์)', room: 'ปช.2 เวชวิชชาคาร', kind: 'case' },
          { time: '10:00–11:00', title: 'L63 General anesthetic drugs', instructor: 'สุดา (Pharmaco)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '11:00–12:00', title: 'L64 Drugs abuse', instructor: 'สุดา (Pharmaco)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '13:00–16:00', title: 'TBL 2: Vertigo', instructor: 'ศิริพร และคณะ (Pharmaco)', room: 'ห้องประชุมมิตรภาพ', kind: 'case' },
        ],
      },
      {
        dayLabel: 'พุธ',
        dateLabel: '16 ธ.ค. 69',
        sessions: [{ time: 'ทั้งวัน', title: 'วันหยุดกรณีพิเศษ พระราชพิธีถวายพระเพลิงพระบรมศพฯ', kind: 'holiday' }],
      },
      {
        dayLabel: 'พฤหัสฯ',
        dateLabel: '17 ธ.ค. 69',
        sessions: [
          { time: '09:00–10:00', title: 'L65 Local anesthetic drugs', instructor: 'นนทญา (Pharmaco)', room: 'ปช.2 เวชวิชชาคาร', kind: 'lecture' },
          { time: '10:00–12:00', title: 'Wrap-up 2 for final exam', room: 'ปช.2 เวชวิชชาคาร', kind: 'review' },
          { time: '13:00–15:00', title: 'ECE Sec 1 · SDL (Sec 2)', kind: 'case' },
        ],
      },
      {
        dayLabel: 'ศุกร์',
        dateLabel: '18 ธ.ค. 69',
        sessions: [{ time: '13:00–15:00', title: 'ECE Sec 2 · SDL (Sec 1)', kind: 'case' }],
      },
    ],
  },
  {
    weekNumber: 7,
    dateRange: '21–25 ธ.ค. 69',
    focusLabel: 'สอบ Final: MCQ II + Lab paper II (21 ธ.ค.) และ Lab paper III + MCQ III (25 ธ.ค.)',
    days: [
      {
        dayLabel: 'จันทร์',
        dateLabel: '21 ธ.ค. 69',
        sessions: [
          { time: '13:00–16:00', title: 'Final examination: MCQ II (95 ข้อ) + Lab paper II (5 ข้อ)', room: 'KKU Exam ชั้น 3 และ 7', kind: 'exam' },
        ],
      },
      {
        dayLabel: 'อังคาร',
        dateLabel: '22 ธ.ค. 69',
        sessions: [{ time: 'ทั้งวัน', title: 'SDL (อ่านเตรียมสอบ)', kind: 'sdl' }],
      },
      {
        dayLabel: 'พุธ–พฤหัสฯ',
        dateLabel: '23–24 ธ.ค. 69',
        sessions: [{ time: 'ทั้งวัน', title: 'วันพระราชทานปริญญาบัตร', kind: 'holiday' }],
      },
      {
        dayLabel: 'ศุกร์',
        dateLabel: '25 ธ.ค. 69',
        sessions: [
          { time: '13:00–16:00', title: 'Final examination: Lab paper III (20 ข้อ) + MCQ III (65 ข้อ)', room: 'KKU Exam ชั้น 3 และ 7', kind: 'exam' },
        ],
      },
    ],
  },
  {
    weekNumber: 8,
    dateRange: '28–30 ธ.ค. 69',
    focusLabel: 'สอบ Final: MCQ IV (28 ธ.ค.), Lab 5/6/10 (29 ธ.ค.) และ MEQ paper (30 ธ.ค.)',
    days: [
      {
        dayLabel: 'จันทร์',
        dateLabel: '28 ธ.ค. 69',
        sessions: [
          { time: '13:00–15:00', title: 'Final examination: MCQ IV (60 ข้อ Pharmaco)', room: 'KKU Exam ชั้น 3 และ 7', kind: 'exam' },
        ],
      },
      {
        dayLabel: 'อังคาร',
        dateLabel: '29 ธ.ค. 69',
        sessions: [
          { time: '11:00–12:00', title: 'กักตัวสอบ Lab (ห้องมอดินแดง)', room: 'ห้องมอดินแดง', kind: 'exam' },
          { time: '12:00–17:00', title: 'Final examination: Lab 5, 6, and 10 (A, B)', room: 'ห้อง LAB 8', kind: 'exam' },
        ],
      },
      {
        dayLabel: 'พุธ',
        dateLabel: '30 ธ.ค. 69',
        sessions: [
          { time: '13:00–15:00', title: 'Final Examination: MEQ paper', room: 'KKU Exam ชั้น 3 และ 7', kind: 'exam' },
        ],
      },
      {
        dayLabel: 'พฤหัสฯ–ศุกร์',
        dateLabel: '31 ธ.ค.–1 ม.ค.',
        sessions: [{ time: 'ทั้งวัน', title: 'วันหยุดสิ้นปี / วันหยุดปีใหม่', kind: 'holiday' }],
      },
    ],
  },
];
