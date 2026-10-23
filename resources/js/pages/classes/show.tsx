import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Award,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    FileText,
    GraduationCap,
    Layers,
    MessageCircle,
    Paperclip,
    Send,
    TrendingUp,
    Users,
    X,
} from 'lucide-react';
import { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Teacher {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
}

interface StudentProgress {
    studentId: number;
    sessionsCompleted: number;
    totalSessions: number;
    progressPct: number;
    quizAvg: number | null;
    lastActive: string;
    moduleBreakdown: { moduleTitle: string; completed: number; total: number }[];
    grades: { assessmentTitle: string; kind: 'quiz' | 'assignment'; score: number | null; maxScore: number; status: 'submitted' | 'graded' | 'pending' | 'late' }[];
}

interface StudentRow {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    studentId: string;
    yearLevel: string;
    progress: StudentProgress;
}

interface AssessmentGrade {
    studentId: number;
    studentName: string;
    avatar: string | null;
    score: number | null;
    maxScore: number;
    status: 'submitted' | 'graded' | 'pending' | 'late';
}

interface Assessment {
    id: number;
    title: string;
    kind: 'quiz' | 'assignment';
    moduleTitle: string;
    dueDate: string;
    maxScore: number;
    grades: AssessmentGrade[];
}

interface ModuleOverview {
    id: number;
    title: string;
    sessionCount: number;
    avgCompletion: number;
    assessmentCount: number;
}

interface AnnouncementReply {
    id: number;
    author: string;
    avatar: string | null;
    content: string;
    timestamp: string;
}

interface Announcement {
    id: number;
    author: string;
    avatar: string | null;
    message: string;
    timestamp: string;
    replies: AnnouncementReply[];
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────

const CLASS_INFO = {
    sectionName: 'Grade 11 · Section Rizal',
    courseTitle: 'Earthquakes',
    courseCode: 'ELS-101',
    schedule: 'Mon and Wed · 9:00 to 10:30 AM',
    room: 'Room 204',
    semester: '1st Semester · A.Y. 2025–2026',
    status: 'active' as const,
};

const TEACHERS: Teacher[] = [
    { id: 1, name: 'Grace Mendoza', email: 'grace.mendoza@dulatuon.test', avatar: null, role: 'Lead Instructor' },
    { id: 2, name: 'Daniel Reyes', email: 'daniel.reyes@dulatuon.test', avatar: null, role: 'Co-Instructor' },
];

const RAW_STUDENTS: { id: number; name: string; email: string; studentId: string; yearLevel: string; sessionsCompleted: number; quizAvg: number | null; lastActive: string }[] = [
    { id: 1, name: 'Maria Santos', email: 'm.santos@student.test', studentId: 'S-2023-001', yearLevel: 'Grade 11', sessionsCompleted: 18, quizAvg: 91, lastActive: 'Apr 13, 2026' },
    { id: 2, name: 'Jose Reyes', email: 'j.reyes@student.test', studentId: 'S-2023-002', yearLevel: 'Grade 11', sessionsCompleted: 14, quizAvg: 78, lastActive: 'Apr 12, 2026' },
    { id: 3, name: 'Ana Cruz', email: 'a.cruz@student.test', studentId: 'S-2023-003', yearLevel: 'Grade 11', sessionsCompleted: 21, quizAvg: 95, lastActive: 'Apr 14, 2026' },
    { id: 4, name: 'Carlos Dela Rosa', email: 'c.delarosa@student.test', studentId: 'S-2023-004', yearLevel: 'Grade 11', sessionsCompleted: 9, quizAvg: 65, lastActive: 'Apr 8, 2026' },
    { id: 5, name: 'Liza Mendoza', email: 'l.mendoza@student.test', studentId: 'S-2023-005', yearLevel: 'Grade 11', sessionsCompleted: 19, quizAvg: 88, lastActive: 'Apr 13, 2026' },
    { id: 6, name: 'Ramon Villanueva', email: 'r.villanueva@student.test', studentId: 'S-2023-006', yearLevel: 'Grade 11', sessionsCompleted: 21, quizAvg: 97, lastActive: 'Apr 14, 2026' },
    { id: 7, name: 'Grace Tan', email: 'g.tan@student.test', studentId: 'S-2023-007', yearLevel: 'Grade 11', sessionsCompleted: 6, quizAvg: null, lastActive: 'Mar 30, 2026' },
    { id: 8, name: 'Michael Bautista', email: 'm.bautista@student.test', studentId: 'S-2023-008', yearLevel: 'Grade 11', sessionsCompleted: 17, quizAvg: 82, lastActive: 'Apr 11, 2026' },
];

const TOTAL_SESSIONS = 21;

const STUDENTS: StudentRow[] = RAW_STUDENTS.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    avatar: null,
    studentId: s.studentId,
    yearLevel: s.yearLevel,
    progress: {
        studentId: s.id,
        sessionsCompleted: s.sessionsCompleted,
        totalSessions: TOTAL_SESSIONS,
        progressPct: Math.round((s.sessionsCompleted / TOTAL_SESSIONS) * 100),
        quizAvg: s.quizAvg,
        lastActive: s.lastActive,
        moduleBreakdown: [
            { moduleTitle: 'Module 1: Faults and Plates', completed: Math.min(s.sessionsCompleted, 7), total: 7 },
            { moduleTitle: 'Module 2: Seismic Waves and Intensity', completed: Math.max(0, Math.min(s.sessionsCompleted - 7, 14)), total: 14 },
        ],
        grades: [
            { assessmentTitle: 'Quiz 1: Types of Faults', kind: 'quiz', score: s.quizAvg !== null ? Math.round(s.quizAvg * 0.95) : null, maxScore: 100, status: s.quizAvg !== null ? 'graded' : 'pending' },
            { assessmentTitle: 'Assignment: Fault Map of Your Province', kind: 'assignment', score: s.quizAvg !== null ? Math.round(s.quizAvg * 1.02) : null, maxScore: 100, status: s.quizAvg !== null ? 'graded' : 'pending' },
            { assessmentTitle: 'Quiz 2: Magnitude vs. Intensity', kind: 'quiz', score: s.quizAvg !== null ? Math.round(s.quizAvg * 0.98) : null, maxScore: 100, status: s.sessionsCompleted >= 14 ? (s.quizAvg !== null ? 'graded' : 'submitted') : 'pending' },
            { assessmentTitle: 'Assignment: Family Quake Plan', kind: 'assignment', score: null, maxScore: 100, status: s.sessionsCompleted >= 16 ? 'submitted' : 'pending' },
        ],
    },
}));

const MODULES: ModuleOverview[] = [
    { id: 1, title: 'Module 1: Faults and Plates', sessionCount: 7, avgCompletion: 82, assessmentCount: 2 },
    { id: 2, title: 'Module 2: Seismic Waves and Intensity', sessionCount: 14, avgCompletion: 61, assessmentCount: 2 },
];

const ASSESSMENTS: Assessment[] = [
    {
        id: 1, title: 'Quiz 1: Types of Faults', kind: 'quiz', moduleTitle: 'Module 1', dueDate: 'Feb 15, 2026', maxScore: 100,
        grades: STUDENTS.map((s) => ({ studentId: s.id, studentName: s.name, avatar: null, score: s.progress.grades[0].score, maxScore: 100, status: s.progress.grades[0].status })),
    },
    {
        id: 2, title: 'Assignment: Fault Map of Your Province', kind: 'assignment', moduleTitle: 'Module 1', dueDate: 'Mar 1, 2026', maxScore: 100,
        grades: STUDENTS.map((s) => ({ studentId: s.id, studentName: s.name, avatar: null, score: s.progress.grades[1].score, maxScore: 100, status: s.progress.grades[1].status })),
    },
    {
        id: 3, title: 'Quiz 2: Magnitude vs. Intensity', kind: 'quiz', moduleTitle: 'Module 2', dueDate: 'Mar 22, 2026', maxScore: 100,
        grades: STUDENTS.map((s) => ({ studentId: s.id, studentName: s.name, avatar: null, score: s.progress.grades[2].score, maxScore: 100, status: s.progress.grades[2].status })),
    },
    {
        id: 4, title: 'Assignment: Family Quake Plan', kind: 'assignment', moduleTitle: 'Module 2', dueDate: 'Apr 20, 2026', maxScore: 100,
        grades: STUDENTS.map((s) => ({ studentId: s.id, studentName: s.name, avatar: null, score: null, maxScore: 100, status: s.progress.grades[3].status })),
    },
];

const ANNOUNCEMENTS: Announcement[] = [
    {
        id: 1, author: 'Grace Mendoza', avatar: null,
        message: 'Please finish the Shake Town lab before Wednesday. We will compare intensity readings from each town in class, so note down your results.',
        timestamp: 'Apr 12, 2026 · 10:30 AM',
        replies: [
            { id: 1, author: 'Maria Santos', avatar: null, content: "Thank you, Ma'am! Looking forward to it.", timestamp: 'Apr 12, 2026 · 11:15 AM' },
            { id: 2, author: 'Ramon Villanueva', avatar: null, content: 'Should we record the depth for each run too?', timestamp: 'Apr 12, 2026 · 2:00 PM' },
        ],
    },
    {
        id: 2, author: 'Daniel Reyes', avatar: null,
        message: 'Reminder: Quiz 2 results are now posted. Please check your individual grades under the Grades tab. If you have concerns, message me directly.',
        timestamp: 'Apr 10, 2026 · 4:00 PM',
        replies: [],
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

function progressColor(pct: number) {
    if (pct >= 80) return 'text-emerald-600';
    if (pct >= 50) return 'text-amber-600';
    return 'text-rose-500';
}

function progressBarColor(pct: number) {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
}

function statusBadge(status: AssessmentGrade['status'], score: number | null, max: number) {
    if (status === 'graded' && score !== null) {
        const pct = (score / max) * 100;
        const cls = pct >= 75 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : pct >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';
        return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cls}`}>{score}/{max}</span>;
    }
    if (status === 'submitted') return <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">Submitted</span>;
    if (status === 'late') return <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Late</span>;
    return <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-500">Pending</span>;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
    return (
        <Card className="overflow-hidden border-0 shadow-sm">
            <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
                        {icon}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground">{label}</p>
                        <p className="mt-0.5 text-xl font-bold text-foreground">{value}</p>
                        {sub && <p className="mt-0.5 text-[11px] text-gray-400">{sub}</p>}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function StudentDetailPanel({ student, onClose }: { student: StudentRow; onClose: () => void }) {
    return (
        <Sheet open onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg [&>button:last-child]:hidden">
                <SheetTitle className="sr-only">{student.name}</SheetTitle>
                <SheetDescription className="sr-only">Progress and grades for {student.name}</SheetDescription>
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border p-4 shrink-0">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={student.avatar ?? undefined} />
                        <AvatarFallback className="bg-violet-100 text-violet-700 text-sm font-bold">{initials(student.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.studentId} · {student.yearLevel}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="overflow-y-auto p-4 space-y-5">
                    {/* Overall progress */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-foreground/85">Overall Progress</p>
                            <span className={`text-sm font-bold ${progressColor(student.progress.progressPct)}`}>{student.progress.progressPct}%</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${progressBarColor(student.progress.progressPct)}`} style={{ width: `${student.progress.progressPct}%` }} />
                        </div>
                        <p className="mt-1 text-xs text-gray-400">{student.progress.sessionsCompleted} of {student.progress.totalSessions} lessons completed · Last active {student.progress.lastActive}</p>
                    </div>

                    {/* Module breakdown */}
                    <div>
                        <p className="text-sm font-semibold text-foreground/85 mb-2">Module Breakdown</p>
                        <div className="space-y-2">
                            {student.progress.moduleBreakdown.map((m) => {
                                const pct = Math.round((m.completed / m.total) * 100);
                                return (
                                    <div key={m.moduleTitle}>
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs text-muted-foreground truncate pr-2">{m.moduleTitle}</p>
                                            <span className="text-xs font-medium text-gray-500 shrink-0">{m.completed}/{m.total}</span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                            <div className={`h-full rounded-full ${progressBarColor(pct)}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Grades */}
                    <div>
                        <p className="text-sm font-semibold text-foreground/85 mb-2">Assessment Grades</p>
                        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                            {student.progress.grades.map((g) => (
                                <div key={g.assessmentTitle} className="flex items-center gap-3 px-3 py-2.5 bg-card">
                                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${g.kind === 'quiz' ? 'bg-violet-50 text-violet-600' : 'bg-violet-50 text-violet-600'}`}>
                                        {g.kind === 'quiz' ? <FileText className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
                                    </div>
                                    <p className="flex-1 text-xs text-foreground/85 truncate">{g.assessmentTitle}</p>
                                    {statusBadge(g.status, g.score, g.maxScore)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab() {
    const avgProgress = Math.round(STUDENTS.reduce((s, st) => s + st.progress.progressPct, 0) / STUDENTS.length);
    const completedCount = STUDENTS.filter((s) => s.progress.progressPct === 100).length;

    return (
        <div className="space-y-6">
            {/* Class progress summary */}
            <Card className="border-0 shadow-sm overflow-hidden">
                <CardHeader className="pb-2 pt-5 px-5">
                    <CardTitle className="text-sm font-semibold text-foreground/85 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-violet-500" />
                        Class Progress
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                    <div className="flex items-end gap-3 mb-3">
                        <span className={`text-4xl font-black ${progressColor(avgProgress)}`}>{avgProgress}%</span>
                        <span className="mb-1 text-sm text-gray-500">average completion</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${progressBarColor(avgProgress)}`} style={{ width: `${avgProgress}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{completedCount} completed</span>
                        <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-500" />{STUDENTS.length - completedCount} in progress</span>
                        <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-violet-500" />{STUDENTS.length} students total</span>
                    </div>
                </CardContent>
            </Card>

            {/* Module progress */}
            <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground/85">Module Completion</h3>
                <div className="space-y-3">
                    {MODULES.map((mod) => (
                        <Card key={mod.id} className="border-0 shadow-sm">
                            <CardContent className="px-5 py-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-900/30">
                                            <Layers className="h-4 w-4 text-violet-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-foreground truncate">{mod.title}</p>
                                            <p className="text-xs text-gray-400">{mod.sessionCount} lessons · {mod.assessmentCount} assessments</p>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 text-lg font-black ${progressColor(mod.avgCompletion)}`}>{mod.avgCompletion}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${progressBarColor(mod.avgCompletion)}`} style={{ width: `${mod.avgCompletion}%` }} />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Assessment summary */}
            <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground/85">Assessment Overview</h3>
                <div className="divide-y divide-border rounded-xl border border-border overflow-hidden bg-card shadow-sm">
                    {ASSESSMENTS.map((a) => {
                        const graded = a.grades.filter((g) => g.status === 'graded').length;
                        const submitted = a.grades.filter((g) => g.status === 'submitted').length;
                        const avgScore = graded > 0 ? Math.round(a.grades.filter((g) => g.status === 'graded' && g.score !== null).reduce((s, g) => s + (g.score ?? 0), 0) / graded) : null;
                        return (
                            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${a.kind === 'quiz' ? 'bg-violet-50 text-violet-600' : 'bg-violet-50 text-violet-600'}`}>
                                    {a.kind === 'quiz' ? <FileText className="h-3.5 w-3.5" /> : <Paperclip className="h-3.5 w-3.5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                                    <p className="text-xs text-gray-400">{a.moduleTitle} · Due {a.dueDate}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    {avgScore !== null
                                        ? <p className={`text-sm font-bold ${progressColor(avgScore)}`}>{avgScore}<span className="text-xs font-normal text-gray-400">/{a.maxScore}</span></p>
                                        : <p className="text-xs text-gray-400">—</p>
                                    }
                                    <p className="text-[10px] text-gray-400">{graded} graded · {submitted} pending</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Tab: Students ────────────────────────────────────────────────────────────

function StudentsTab() {
    const [search, setSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);

    const filtered = STUDENTS.filter(
        (s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.studentId.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <div className="space-y-4">
            {selectedStudent && (
                <StudentDetailPanel student={selectedStudent} onClose={() => setSelectedStudent(null)} />
            )}

            <div className="flex items-center gap-2">
                <Input
                    placeholder="Search students..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs text-sm"
                />
                <span className="text-xs text-gray-400">{filtered.length} of {STUDENTS.length}</span>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block rounded-xl border border-border overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                            <TableHead className="text-xs font-semibold">Student</TableHead>
                            <TableHead className="text-xs font-semibold">ID</TableHead>
                            <TableHead className="text-xs font-semibold">Year</TableHead>
                            <TableHead className="text-xs font-semibold">Progress</TableHead>
                            <TableHead className="text-xs font-semibold text-center">Quiz Avg</TableHead>
                            <TableHead className="text-xs font-semibold">Last Active</TableHead>
                            <TableHead />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.map((s) => (
                            <TableRow
                                key={s.id}
                                className="cursor-pointer hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-colors"
                                onClick={() => setSelectedStudent(s)}
                            >
                                <TableCell>
                                    <div className="flex items-center gap-2.5">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-bold">{initials(s.name)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{s.name}</p>
                                            <p className="text-xs text-gray-400">{s.email}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs text-gray-500 font-mono">{s.studentId}</TableCell>
                                <TableCell className="text-xs text-gray-500">{s.yearLevel}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 min-w-[120px]">
                                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                            <div className={`h-full rounded-full ${progressBarColor(s.progress.progressPct)}`} style={{ width: `${s.progress.progressPct}%` }} />
                                        </div>
                                        <span className={`text-xs font-bold shrink-0 ${progressColor(s.progress.progressPct)}`}>{s.progress.progressPct}%</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    {s.progress.quizAvg !== null
                                        ? <span className={`text-sm font-bold ${progressColor(s.progress.quizAvg)}`}>{s.progress.quizAvg}</span>
                                        : <span className="text-xs text-gray-400">—</span>}
                                </TableCell>
                                <TableCell className="text-xs text-gray-400">{s.progress.lastActive}</TableCell>
                                <TableCell>
                                    <ChevronRight className="h-4 w-4 text-gray-300" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
                {filtered.map((s) => (
                    <button
                        key={s.id}
                        className="w-full text-left rounded-xl border border-border bg-card p-4 shadow-sm hover:border-violet-200 hover:shadow-md transition-all"
                        onClick={() => setSelectedStudent(s)}
                    >
                        <div className="flex items-start gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                                <AvatarFallback className="bg-violet-100 text-violet-700 text-sm font-bold">{initials(s.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-foreground truncate">{s.name}</p>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                                </div>
                                <p className="text-xs text-gray-400">{s.studentId} · {s.yearLevel}</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div className={`h-full rounded-full ${progressBarColor(s.progress.progressPct)}`} style={{ width: `${s.progress.progressPct}%` }} />
                                    </div>
                                    <span className={`text-xs font-bold shrink-0 ${progressColor(s.progress.progressPct)}`}>{s.progress.progressPct}%</span>
                                </div>
                                <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                                    <span>Quiz avg: <span className={`font-semibold ${s.progress.quizAvg !== null ? progressColor(s.progress.quizAvg) : ''}`}>{s.progress.quizAvg ?? '—'}</span></span>
                                    <span>· {s.progress.lastActive}</span>
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">No students match your search.</div>
            )}
        </div>
    );
}

// ─── Tab: Grades ──────────────────────────────────────────────────────────────

function GradesTab() {
    const [selectedAssessment, setSelectedAssessment] = useState<number>(ASSESSMENTS[0].id);
    const assessment = ASSESSMENTS.find((a) => a.id === selectedAssessment)!;
    const graded = assessment.grades.filter((g) => g.status === 'graded');
    const avgScore = graded.length > 0 ? Math.round(graded.reduce((s, g) => s + (g.score ?? 0), 0) / graded.length) : null;

    return (
        <div className="space-y-4">
            {/* Assessment picker */}
            <div className="flex flex-wrap gap-2">
                {ASSESSMENTS.map((a) => (
                    <button
                        key={a.id}
                        onClick={() => setSelectedAssessment(a.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                            a.id === selectedAssessment
                                ? 'border-violet-600 bg-violet-600 text-white shadow-sm'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-violet-300 hover:text-violet-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                    >
                        {a.kind === 'quiz' ? <FileText className="h-3 w-3" /> : <Paperclip className="h-3 w-3" />}
                        {a.title}
                    </button>
                ))}
            </div>

            {/* Assessment stats */}
            <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                    <Award className="h-4 w-4 text-amber-500" />
                    <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Class Avg</p>
                        <p className={`text-lg font-black ${avgScore !== null ? progressColor(avgScore) : 'text-gray-400'}`}>{avgScore ?? '—'}<span className="text-xs font-normal text-gray-400">/{assessment.maxScore}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Graded</p>
                        <p className="text-lg font-black text-foreground">{graded.length}<span className="text-xs font-normal text-gray-400">/{assessment.grades.length}</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                    <Clock className="h-4 w-4 text-violet-400" />
                    <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Due</p>
                        <p className="text-sm font-bold text-foreground">{assessment.dueDate}</p>
                    </div>
                </div>
            </div>

            {/* Grade table */}
            <div className="overflow-hidden rounded-3xl border bg-card shadow-panel">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                            <TableHead className="text-xs font-semibold">Student</TableHead>
                            <TableHead className="text-xs font-semibold text-center">Score</TableHead>
                            <TableHead className="text-xs font-semibold text-center hidden sm:table-cell">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assessment.grades.map((g) => (
                            <TableRow key={g.studentId}>
                                <TableCell>
                                    <div className="flex items-center gap-2.5">
                                        <Avatar className="h-7 w-7 shrink-0">
                                            <AvatarFallback className="bg-violet-100 text-violet-700 text-[10px] font-bold">{initials(g.studentName)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium text-foreground">{g.studentName}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    {statusBadge(g.status, g.score, g.maxScore)}
                                </TableCell>
                                <TableCell className="text-center hidden sm:table-cell">
                                    {g.status === 'graded' && (
                                        <div className="flex items-center justify-center gap-1.5">
                                            <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                                <div className={`h-full rounded-full ${progressBarColor(Math.round(((g.score ?? 0) / g.maxScore) * 100))}`} style={{ width: `${Math.round(((g.score ?? 0) / g.maxScore) * 100)}%` }} />
                                            </div>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

// ─── Tab: People ──────────────────────────────────────────────────────────────

function PeopleTab() {
    return (
        <div className="space-y-6">
            {/* Teachers */}
            <div>
                <h3 className="mb-3 text-sm font-semibold text-foreground/85 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-violet-500" />
                    Instructors
                </h3>
                <div className="space-y-2">
                    {TEACHERS.map((t) => (
                        <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-violet-700 text-white text-sm font-bold">{initials(t.name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                                <p className="text-xs text-gray-400">{t.email}</p>
                            </div>
                            <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                                {t.role}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Students roster */}
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground/85 flex items-center gap-2">
                        <Users className="h-4 w-4 text-violet-500" />
                        Enrolled Students
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">{STUDENTS.length}</span>
                    </h3>
                </div>
                <div className="overflow-hidden rounded-3xl border bg-card shadow-panel">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                                <TableHead className="text-xs font-semibold">Name</TableHead>
                                <TableHead className="text-xs font-semibold hidden sm:table-cell">Student ID</TableHead>
                                <TableHead className="text-xs font-semibold hidden md:table-cell">Email</TableHead>
                                <TableHead className="text-xs font-semibold">Year</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {STUDENTS.map((s) => (
                                <TableRow key={s.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2.5">
                                            <Avatar className="h-7 w-7 shrink-0">
                                                <AvatarFallback className="bg-violet-100 text-violet-700 text-[10px] font-bold">{initials(s.name)}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium text-foreground">{s.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell text-xs font-mono text-gray-500">{s.studentId}</TableCell>
                                    <TableCell className="hidden md:table-cell text-xs text-gray-400">{s.email}</TableCell>
                                    <TableCell className="text-xs text-gray-500">{s.yearLevel}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

// ─── Tab: Announcements ───────────────────────────────────────────────────────

function AnnouncementsTab() {
    const [announcements, setAnnouncements] = useState<Announcement[]>(ANNOUNCEMENTS);
    const [newMessage, setNewMessage] = useState('');
    const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
    const [replyInputs, setReplyInputs] = useState<Record<number, string>>({});

    function toggleReplies(id: number) {
        setExpandedReplies((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function postAnnouncement() {
        if (!newMessage.trim()) return;
        const a: Announcement = {
            id: Date.now(),
            author: 'Grace Mendoza',
            avatar: null,
            message: newMessage.trim(),
            timestamp: new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
            replies: [],
        };
        setAnnouncements((prev) => [a, ...prev]);
        setNewMessage('');
    }

    function postReply(announcementId: number) {
        const text = replyInputs[announcementId]?.trim();
        if (!text) return;
        const reply: AnnouncementReply = {
            id: Date.now(),
            author: 'Grace Mendoza',
            avatar: null,
            content: text,
            timestamp: new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
        };
        setAnnouncements((prev) =>
            prev.map((a) => a.id === announcementId ? { ...a, replies: [...a.replies, reply] } : a),
        );
        setReplyInputs((prev) => ({ ...prev, [announcementId]: '' }));
    }

    return (
        <div className="space-y-4">
            {/* Compose */}
            <div className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Post an announcement</p>
                <Textarea
                    placeholder="Write a message to your class..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                    className="resize-none text-sm"
                />
                <div className="mt-2 flex justify-end">
                    <Button
                        size="sm"
                        className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-sm"
                        onClick={postAnnouncement}
                        disabled={!newMessage.trim()}
                    >
                        <Send className="h-3.5 w-3.5" />
                        Post
                    </Button>
                </div>
            </div>

            {/* Threads */}
            {announcements.map((a) => (
                <div key={a.id} className="overflow-hidden rounded-3xl border bg-card shadow-panel">
                    <div className="p-4">
                        <div className="flex items-start gap-3">
                            <Avatar className="h-9 w-9 shrink-0">
                                <AvatarFallback className="bg-violet-700 text-white text-sm font-bold">{initials(a.author)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-semibold text-foreground">{a.author}</p>
                                    <p className="text-xs text-gray-400">{a.timestamp}</p>
                                </div>
                                <p className="mt-1.5 text-sm text-foreground/85 leading-relaxed">{a.message}</p>
                            </div>
                        </div>

                        {a.replies.length > 0 && (
                            <button
                                className="mt-3 flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700"
                                onClick={() => toggleReplies(a.id)}
                            >
                                <MessageCircle className="h-3.5 w-3.5" />
                                {expandedReplies.has(a.id) ? 'Hide' : 'Show'} {a.replies.length} repl{a.replies.length !== 1 ? 'ies' : 'y'}
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expandedReplies.has(a.id) ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                    </div>

                    {expandedReplies.has(a.id) && a.replies.length > 0 && (
                        <div className="border-t border-border bg-gray-50/50 dark:bg-gray-800/30 px-4 py-3 space-y-3">
                            {a.replies.map((r) => (
                                <div key={r.id} className="flex items-start gap-2.5">
                                    <Avatar className="h-7 w-7 shrink-0">
                                        <AvatarFallback className="bg-gray-200 text-gray-600 text-[10px] font-bold">{initials(r.author)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="text-xs font-semibold text-foreground">{r.author}</p>
                                            <p className="text-[10px] text-gray-400">{r.timestamp}</p>
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{r.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Reply input */}
                    <div className="border-t border-border px-4 py-3 flex items-center gap-2">
                        <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="bg-violet-700 text-white text-[10px] font-bold">JM</AvatarFallback>
                        </Avatar>
                        <Input
                            placeholder="Reply..."
                            value={replyInputs[a.id] ?? ''}
                            onChange={(e) => setReplyInputs((prev) => ({ ...prev, [a.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); postReply(a.id); } }}
                            className="text-xs h-8"
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 text-violet-600"
                            onClick={() => postReply(a.id)}
                            disabled={!replyInputs[a.id]?.trim()}
                        >
                            <Send className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            ))}

            {announcements.length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">No announcements yet.</div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Classes', href: '/classes' },
    { title: CLASS_INFO.sectionName, href: '#' },
];

export default function ClassShow() {
    const totalStudents = STUDENTS.length;
    const avgProgress = Math.round(STUDENTS.reduce((s, st) => s + st.progress.progressPct, 0) / STUDENTS.length);
    const gradedCount = ASSESSMENTS.reduce((s, a) => s + a.grades.filter((g) => g.status === 'graded').length, 0);
    const totalGrades = ASSESSMENTS.reduce((s, a) => s + a.grades.length, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${CLASS_INFO.sectionName} — Class Management`} />
            <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 flex flex-1 flex-col gap-6 py-8">

                {/* ── Hero Header ── */}
                <div className="overflow-hidden rounded-2xl bg-linear-to-br from-violet-700 to-violet-500 p-5 sm:p-6 text-white shadow-lg shadow-blue-200 dark:shadow-none">
                    {/* Back */}
                    <Link href="/classes">
                        <Button variant="ghost" size="sm" className="mb-3 -ml-1 h-8 gap-1.5 text-white/80 hover:bg-white/10 hover:text-white text-xs px-2">
                            <ArrowLeft className="h-3.5 w-3.5" />
                            All Classes
                        </Button>
                    </Link>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm">{CLASS_INFO.courseCode}</span>
                                <span className="flex items-center gap-1 rounded-full bg-emerald-400/30 px-2.5 py-0.5 text-[11px] font-semibold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                                    Active
                                </span>
                            </div>
                            <h1 className="mt-2 text-xl font-black leading-tight sm:text-2xl">{CLASS_INFO.sectionName}</h1>
                            <p className="mt-0.5 text-sm text-white/80 font-medium">{CLASS_INFO.courseTitle}</p>
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/70">
                                <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" />{CLASS_INFO.schedule}</span>
                                <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{CLASS_INFO.semester}</span>
                            </div>
                        </div>

                        {/* Instructors avatars */}
                        <div className="shrink-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60 mb-1.5">Instructors</p>
                            <div className="flex -space-x-2">
                                {TEACHERS.map((t) => (
                                    <div key={t.id} title={t.name} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/40 bg-white/20 backdrop-blur-sm text-sm font-bold text-white">
                                        {initials(t.name)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <StatCard icon={<Users className="h-5 w-5 text-violet-600" />} label="Total Students" value={totalStudents} sub="enrolled" color="bg-violet-50 dark:bg-violet-900/30" />
                    <StatCard icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} label="Avg Progress" value={`${avgProgress}%`} sub="course completion" color="bg-emerald-50 dark:bg-emerald-900/30" />
                    <StatCard icon={<Award className="h-5 w-5 text-amber-600" />} label="Grades Submitted" value={`${gradedCount}/${totalGrades}`} sub="across all assessments" color="bg-amber-50 dark:bg-amber-900/30" />
                    <StatCard icon={<BookOpen className="h-5 w-5 text-violet-600" />} label="Modules" value={MODULES.length} sub={`${ASSESSMENTS.length} assessments`} color="bg-violet-50 dark:bg-violet-900/30" />
                </div>

                {/* ── Tabs ── */}
                <Tabs defaultValue="overview" className="flex-1">
                    <TabsList className="mb-2 -mx-4 flex h-auto gap-0 rounded-none border-b border-gray-200 bg-transparent px-4 dark:border-gray-800 sm:-mx-6 sm:px-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {[
                            { value: 'overview', label: 'Overview', icon: <TrendingUp className="h-3.5 w-3.5" /> },
                            { value: 'students', label: 'Students', icon: <Users className="h-3.5 w-3.5" /> },
                            { value: 'grades', label: 'Grades', icon: <Award className="h-3.5 w-3.5" /> },
                            { value: 'people', label: 'People', icon: <GraduationCap className="h-3.5 w-3.5" /> },
                            { value: 'announcements', label: 'Announcements', icon: <MessageCircle className="h-3.5 w-3.5" /> },
                        ].map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="shrink-0 flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs font-semibold text-gray-500 data-[state=active]:border-violet-600 data-[state=active]:text-violet-600 dark:text-gray-400 dark:data-[state=active]:text-violet-400"
                            >
                                {tab.icon}
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="overview" className="mt-4"><OverviewTab /></TabsContent>
                    <TabsContent value="students" className="mt-4"><StudentsTab /></TabsContent>
                    <TabsContent value="grades" className="mt-4"><GradesTab /></TabsContent>
                    <TabsContent value="people" className="mt-4"><PeopleTab /></TabsContent>
                    <TabsContent value="announcements" className="mt-4"><AnnouncementsTab /></TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
