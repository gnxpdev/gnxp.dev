import { useMemo, useState } from 'react';
import {
  Award,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Clock,
  FlaskConical,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Users,
} from 'lucide-react';
import {
  NS_EXAM_SCHEDULE,
  NS_GRADING_ITEMS,
  NS_LABS_AND_CASES,
  NS_MODULE_META,
  NS_WEEKLY_SCHEDULE,
  YEAR2_SEMESTER2_COURSES,
  YEAR2_SEMESTER2_META,
  type ScheduleSessionKind,
} from '../data/nsModuleData';
import type { McqRound } from '../data/knowledgeHubData';

type NsDetailTab = 'exams' | 'schedule' | 'grading';

const KIND_LABELS: Record<ScheduleSessionKind, string> = {
  lecture: 'บรรยาย',
  lab: 'Lab',
  case: 'PBL/TBL/Case',
  exam: 'สอบ',
  review: 'ทบทวน/RE',
  holiday: 'วันหยุด',
  sdl: 'SDL',
};

const KIND_STYLES: Record<ScheduleSessionKind, string> = {
  lecture: 'border-(--border-hairline) bg-(--bg-surface) text-(--text-primary)',
  lab: 'border-emerald-500/30 bg-emerald-500/8 text-(--text-primary)',
  case: 'border-amber-500/35 bg-amber-500/10 text-(--text-primary)',
  exam: 'border-rose-500/40 bg-rose-500/10 text-(--text-primary)',
  review: 'border-sky-500/35 bg-sky-500/10 text-(--text-primary)',
  holiday: 'border-(--border-hairline) bg-(--bg-control) text-(--text-muted)',
  sdl: 'border-(--border-hairline) bg-(--bg-subtle) text-(--text-secondary)',
};

export function Year2Semester2Panel() {
  const [open, setOpen] = useState(false);

  return (
    <section
      style={{ boxShadow: 'var(--shadow-card)' }}
      className="rounded-2xl border border-(--border-hairline) bg-(--bg-surface)"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 rounded-2xl px-6 py-4 text-left transition-colors hover:bg-(--bg-subtle)/60 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent)"
      >
        <div className="flex items-center gap-3 min-w-0">
          <GraduationCap className="h-4 w-4 shrink-0 text-(--text-secondary)" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-(--text-primary)">
              {YEAR2_SEMESTER2_META.termTitle}
            </div>
            <div className="mt-0.5 text-xs text-(--text-muted)">
              {YEAR2_SEMESTER2_META.announcementDate} · {YEAR2_SEMESTER2_META.startDate} · 4 รายวิชา (18 หน่วยกิต)
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-(--text-muted) transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="border-t border-(--border-hairline) px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {YEAR2_SEMESTER2_COURSES.map((course) => (
              <div
                key={course.code}
                className="rounded-xl border border-(--border-hairline) bg-(--bg-subtle) p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold tracking-wide text-(--text-muted) tabular-nums">
                      {course.code}
                    </span>
                    <h3 className="mt-0.5 text-sm font-semibold text-(--text-primary)">
                      {course.englishName}
                    </h3>
                    <p className="text-xs text-(--text-secondary)">{course.thaiName}</p>
                  </div>
                  <span className="rounded-lg border border-(--border-hairline) bg-(--bg-surface) px-2.5 py-1 text-xs font-medium text-(--text-primary) tabular-nums whitespace-nowrap shrink-0">
                    {course.credits} หน่วยกิต
                  </span>
                </div>

                <div className="mt-3 space-y-1 border-t border-(--border-hairline) pt-2.5 text-xs text-(--text-secondary)">
                  {course.instructors.map((inst) => (
                    <div key={inst.name} className="flex items-center justify-between gap-2">
                      <span className="font-medium text-(--text-primary)">{inst.name}</span>
                      <span className="text-(--text-muted)">{inst.department}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-(--border-hairline) bg-(--bg-subtle)/60 px-4 py-3 text-xs text-(--text-secondary)">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                <strong className="text-(--text-primary)">ผู้ช่วยฝ่ายวิชาการปรีคลินิก:</strong>{' '}
                {YEAR2_SEMESTER2_META.academicAdvisor}
              </span>
              <a
                href={`mailto:${YEAR2_SEMESTER2_META.academicAdvisorEmail}`}
                className="inline-flex items-center gap-1 font-medium text-(--text-primary) hover:underline"
              >
                <Mail className="h-3.5 w-3.5 text-(--text-muted)" aria-hidden="true" />
                <span>{YEAR2_SEMESTER2_META.academicAdvisorEmail}</span>
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-(--text-muted)">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              <span>
                ผู้ประสานงาน: {YEAR2_SEMESTER2_META.coordinator} ({YEAR2_SEMESTER2_META.coordinatorPhone})
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function NsModuleSyllabusPanel({
  searchQuery,
  onSelectMcqScope,
}: {
  searchQuery: string;
  onSelectMcqScope?: (round: McqRound) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<NsDetailTab>('exams');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  const query = searchQuery.trim().toLowerCase();

  const currentWeek = useMemo(
    () => NS_WEEKLY_SCHEDULE.find((w) => w.weekNumber === selectedWeek) ?? NS_WEEKLY_SCHEDULE[0],
    [selectedWeek]
  );

  const filteredScheduleDays = useMemo(() => {
    if (!query) return currentWeek.days;
    return currentWeek.days
      .map((day) => ({
        ...day,
        sessions: day.sessions.filter((s) =>
          `${s.time} ${s.title} ${s.instructor ?? ''} ${s.room ?? ''}`.toLowerCase().includes(query)
        ),
      }))
      .filter((day) => day.sessions.length > 0);
  }, [currentWeek, query]);

  const examScopeMap: Record<string, McqRound | undefined> = {
    'ns-exam-mid-mcq1': 'mcq-1',
    'ns-exam-final-mcq2': 'mcq-2',
    'ns-exam-final-mcq3': 'mcq-3',
    'ns-exam-final-mcq4': 'mcq-4',
  };

  return (
    <section className="mt-6 rounded-2xl border border-(--border-hairline) bg-(--bg-subtle)/45">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-4 rounded-2xl px-5 py-3.5 text-left transition-colors hover:bg-(--bg-subtle) cursor-pointer"
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <CalendarDays className="h-4 w-4 shrink-0 text-(--text-secondary)" aria-hidden="true" />
          <span className="text-xs font-semibold text-(--text-primary)">
            คู่มือโมดูล {NS_MODULE_META.code} {NS_MODULE_META.title}
          </span>
          <span className="text-xs text-(--text-muted)">
            · {NS_MODULE_META.period} · เกณฑ์ผ่าน 55% (C)
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-(--text-muted) transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="border-t border-(--border-hairline) p-4 sm:p-5 space-y-4">
          {/* Sub-navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 rounded-xl border border-(--border-hairline) bg-(--bg-control) p-1">
              <button
                type="button"
                onClick={() => setActiveTab('exams')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'exams'
                    ? 'bg-(--accent) text-(--accent-fg) shadow-xs'
                    : 'text-(--text-secondary) hover:text-(--text-primary)'
                }`}
              >
                <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>กำหนดการสอบ &amp; ขอบเขต (7)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'schedule'
                    ? 'bg-(--accent) text-(--accent-fg) shadow-xs'
                    : 'text-(--text-secondary) hover:text-(--text-primary)'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                <span>ตารางเรียน 8 สัปดาห์</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('grading')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'grading'
                    ? 'bg-(--accent) text-(--accent-fg) shadow-xs'
                    : 'text-(--text-secondary) hover:text-(--text-primary)'
                }`}
              >
                <Award className="h-3.5 w-3.5" aria-hidden="true" />
                <span>สัดส่วนคะแนน &amp; Lab 1–11</span>
              </button>
            </div>

            <div className="text-xs text-(--text-muted)">
              {NS_MODULE_META.passingRule}
            </div>
          </div>

          {/* Tab 1: Exam Schedule & Scopes */}
          {activeTab === 'exams' && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {NS_EXAM_SCHEDULE.map((exam) => {
                const targetMcq = examScopeMap[exam.id];
                return (
                  <div
                    key={exam.id}
                    className="flex flex-col justify-between rounded-xl border border-(--border-hairline) bg-(--bg-surface) p-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`rounded-md px-2 py-0.5 font-semibold ${
                              exam.phase === 'Midblock'
                                ? 'bg-amber-500/15 text-(--text-primary)'
                                : 'bg-(--bg-subtle) text-(--text-primary)'
                            }`}
                          >
                            {exam.phase}
                          </span>
                          <span className="font-semibold text-(--text-primary)">{exam.date}</span>
                        </div>
                        <span className="text-xs font-medium text-(--text-muted) tabular-nums">
                          {exam.totalLabel}
                        </span>
                      </div>

                      <h4 className="mt-2 text-sm font-semibold text-(--text-primary)">
                        {exam.title}
                      </h4>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-(--text-secondary)">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-(--text-muted)" aria-hidden="true" />
                          <span>{exam.time}</span>
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-(--text-muted)" aria-hidden="true" />
                          <span>{exam.location}</span>
                        </span>
                      </div>

                      <div className="mt-3 space-y-1.5 border-t border-(--border-hairline) pt-2.5">
                        {exam.scopes.map((sc) => (
                          <div key={sc.label} className="text-xs leading-relaxed">
                            <span className="font-semibold text-(--text-primary)">{sc.label}: </span>
                            <span className="text-(--text-secondary) tabular-nums">{sc.content}</span>
                          </div>
                        ))}
                        {exam.note && (
                          <p className="text-[11px] text-(--text-muted)">หมายเหตุ: {exam.note}</p>
                        )}
                      </div>
                    </div>

                    {targetMcq && onSelectMcqScope && (
                      <div className="mt-3 border-t border-(--border-hairline) pt-2.5">
                        <button
                          type="button"
                          onClick={() => onSelectMcqScope(targetMcq)}
                          className="rounded-lg border border-(--border-hairline) bg-(--btn-bg) px-3 py-1.5 text-xs font-medium text-(--text-primary) transition-colors hover:border-(--btn-hover-bg) hover:bg-(--btn-hover-bg) hover:text-(--btn-hover-fg) cursor-pointer"
                        >
                          กรองคลิปเฉพาะรอบสอบนี้ ({targetMcq.toUpperCase()})
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: 8-Week Schedule */}
          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {NS_WEEKLY_SCHEDULE.map((week) => {
                  const isActive = week.weekNumber === selectedWeek;
                  return (
                    <button
                      key={week.weekNumber}
                      type="button"
                      onClick={() => setSelectedWeek(week.weekNumber)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                        isActive
                          ? 'border-(--accent) bg-(--accent) text-(--accent-fg)'
                          : 'border-(--border-hairline) bg-(--bg-surface) text-(--text-secondary) hover:text-(--text-primary)'
                      }`}
                    >
                      สัปดาห์ {week.weekNumber} ({week.dateRange})
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-(--border-hairline) bg-(--bg-surface) px-4 py-2.5 text-xs text-(--text-secondary)">
                <strong className="text-(--text-primary)">
                  สัปดาห์ที่ {currentWeek.weekNumber} ({currentWeek.dateRange}):
                </strong>{' '}
                {currentWeek.focusLabel}
              </div>

              <div className="space-y-3">
                {filteredScheduleDays.length > 0 ? (
                  filteredScheduleDays.map((day) => (
                    <div
                      key={`${day.dayLabel}-${day.dateLabel}`}
                      className="rounded-xl border border-(--border-hairline) bg-(--bg-surface) p-4"
                    >
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-(--text-primary)">
                        <span>วัน{day.dayLabel}</span>
                        <span className="text-(--text-muted) tabular-nums">{day.dateLabel}</span>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {day.sessions.map((session, idx) => (
                          <div
                            key={`${day.dateLabel}-${session.time}-${idx}`}
                            className={`rounded-lg border p-3 text-xs ${KIND_STYLES[session.kind]}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold tabular-nums">{session.time}</span>
                              <span className="rounded bg-(--bg-surface)/80 px-1.5 py-0.5 text-[10px] font-medium text-(--text-muted)">
                                {KIND_LABELS[session.kind]}
                              </span>
                            </div>
                            <div className="mt-1 font-medium leading-snug text-(--text-primary)">
                              {session.title}
                            </div>
                            {(session.instructor || session.room) && (
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-(--text-secondary)">
                                {session.instructor && <span>{session.instructor}</span>}
                                {session.instructor && session.room && <span aria-hidden="true">·</span>}
                                {session.room && <span className="text-(--text-muted)">{session.room}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-(--border-hairline) bg-(--bg-surface) p-6 text-center text-xs text-(--text-muted)">
                    ไม่พบคาบเรียนในสัปดาห์ที่ {selectedWeek} ที่ตรงกับคำค้นหา &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Grading Breakdown, Lab 1-11 & Module Committee */}
          {activeTab === 'grading' && (
            <div className="space-y-5">
              {/* Committee */}
              <div className="rounded-xl border border-(--border-hairline) bg-(--bg-surface) p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-(--border-hairline)">
                  <div className="flex items-center gap-2 text-xs font-semibold text-(--text-primary)">
                    <Users className="h-3.5 w-3.5 text-(--text-muted)" aria-hidden="true" />
                    <span>คณะกรรมการประจำ Module NS ({NS_MODULE_META.code})</span>
                  </div>
                  <span className="text-xs text-(--text-muted)">{NS_MODULE_META.departmentPhone}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {NS_MODULE_META.committee.map((member) => (
                    <div
                      key={member.email}
                      className="rounded-lg border border-(--border-hairline) bg-(--bg-subtle) p-3 text-xs"
                    >
                      <div className="text-(--text-muted)">{member.role}</div>
                      <div className="mt-0.5 font-semibold text-(--text-primary)">{member.name}</div>
                      <a
                        href={`mailto:${member.email}`}
                        className="mt-1 inline-flex items-center gap-1 text-(--text-secondary) hover:text-(--text-primary) hover:underline"
                      >
                        <Mail className="h-3 w-3" aria-hidden="true" />
                        <span>{member.email}</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grading Table */}
              <div className="overflow-x-auto rounded-xl border border-(--border-hairline) bg-(--bg-surface)">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-(--border-hairline) bg-(--bg-subtle) text-(--text-secondary)">
                      <th className="px-4 py-2.5 font-semibold">ลำดับ</th>
                      <th className="px-4 py-2.5 font-semibold">หัวข้อประเมิน</th>
                      <th className="px-4 py-2.5 font-semibold whitespace-nowrap">ชม. / คาบ</th>
                      <th className="px-4 py-2.5 font-semibold whitespace-nowrap">สัดส่วน</th>
                      <th className="px-4 py-2.5 font-semibold">รายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-hairline)">
                    {NS_GRADING_ITEMS.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-4 py-3 font-medium text-(--text-muted) tabular-nums">
                          {item.order}
                        </td>
                        <td className="px-4 py-3 font-semibold text-(--text-primary)">
                          {item.title}
                        </td>
                        <td className="px-4 py-3 text-(--text-secondary) tabular-nums whitespace-nowrap">
                          {item.hoursOrCount}
                        </td>
                        <td className="px-4 py-3 font-semibold text-(--text-primary) tabular-nums whitespace-nowrap">
                          {item.percent}
                        </td>
                        <td className="px-4 py-3 text-(--text-secondary) space-y-0.5">
                          {item.details.map((d) => (
                            <div key={d}>{d}</div>
                          ))}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-(--bg-subtle)/70 font-semibold text-(--text-primary)">
                      <td className="px-4 py-2.5" colSpan={3}>
                        รวมทั้งหมด (เกรด A–F · เกณฑ์ผ่าน ≥ 55% (C))
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">100%</td>
                      <td className="px-4 py-2.5 text-xs font-normal text-(--text-muted)">
                        ช่วงคะแนนแต่ละเกรดตามที่ฝ่ายวิชาการกำหนด
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Lab 1-11 & Case Studies */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-(--text-primary)">
                  <FlaskConical className="h-3.5 w-3.5 text-(--text-muted)" aria-hidden="true" />
                  <span>รายการปฏิบัติการ Lab 1–11 และกรณีศึกษา (PBL / TBL / ECE)</span>
                </div>
                <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                  {NS_LABS_AND_CASES.map((lab) => (
                    <div
                      key={lab.id}
                      className="rounded-xl border border-(--border-hairline) bg-(--bg-surface) p-3.5 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-(--text-primary)">{lab.code}: </span>
                          <span className="font-medium text-(--text-primary)">{lab.title}</span>
                        </div>
                        <span className="rounded bg-(--bg-subtle) px-2 py-0.5 text-[11px] text-(--text-secondary) whitespace-nowrap shrink-0">
                          {lab.room}
                        </span>
                      </div>
                      <div className="mt-1.5 text-(--text-secondary) tabular-nums">
                        {lab.date} · {lab.time}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-(--text-muted)">
                        <span>{lab.instructors}</span>
                        <span className="font-medium text-(--text-secondary)">{lab.assessment}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
