import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle,
    ChevronDown,
    ChevronRight,
    ClipboardList,
    ExternalLink,
    File,
    FileText,
    Globe,
    Link2,
    Pencil,
    PenLine,
    PlayCircle,
    Plus,
    Trash2,
    Upload,
    Video,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    CONTENT_META,
    FILE_ACCEPT,
    TZ_GROUPS,
    WORLD_ZONES,
} from './_constants';
import { tzLabel, uid } from './_helpers';
import type {
    Assessment,
    Assignment,
    ContentItem,
    ContentType,
    Meeting,
    Quiz,
    QuizQuestion,
    Session,
} from './_types';

// ─── Content Picker (Add & Edit) ──────────────────────────────────────────────
interface ContentPickerProps {
    initial?: ContentItem;
    onSave: (item: ContentItem) => void;
    onCancel: () => void;
}

function ContentPicker({ initial, onSave, onCancel }: ContentPickerProps) {
    const isEdit = !!initial;
    const [selectedType, setSelectedType] = useState<ContentType | null>(initial?.type ?? null);
    const [title, setTitle] = useState(initial?.title ?? '');
    const [description, setDescription] = useState(initial?.description ?? '');
    const [url, setUrl] = useState(initial?.url ?? '');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const types: { type: ContentType; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
        { type: 'pdf',     label: 'PDF',      icon: <FileText className="h-5 w-5" />,   desc: 'Upload PDF',      color: 'hover:border-red-400 hover:bg-red-50' },
        { type: 'word',    label: 'Word Doc',  icon: <File className="h-5 w-5" />,       desc: 'Upload .docx',    color: 'hover:border-blue-400 hover:bg-blue-50' },
        { type: 'video',   label: 'Video',     icon: <Video className="h-5 w-5" />,      desc: 'Upload MP4/MOV',  color: 'hover:border-violet-400 hover:bg-violet-50' },
        { type: 'youtube', label: 'YouTube',   icon: <PlayCircle className="h-5 w-5" />, desc: 'Paste link',      color: 'hover:border-rose-400 hover:bg-rose-50' },
    ];

    const canSave = !!selectedType && !!title.trim() && (
        selectedType === 'youtube' ? !!url.trim() : (!!selectedFile || (isEdit && !!initial?.filename))
    );

    const handleSave = () => {
        if (!selectedType || !title.trim()) return;
        if (selectedType === 'youtube') {
            onSave({ id: initial?.id ?? uid(), type: selectedType, title: title.trim(), description: description.trim() || undefined, url: url.trim() });
        } else {
            onSave({
                id: initial?.id ?? uid(),
                type: selectedType,
                title: title.trim(),
                description: description.trim() || undefined,
                filename: selectedFile?.name ?? initial?.filename,
                url: initial?.url,
                file: selectedFile ?? undefined,
            });
        }
    };

    if (!selectedType) return (
        <>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Select content type</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {types.map((t) => (
                    <button key={t.type} onClick={() => setSelectedType(t.type)}
                        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-white p-3 text-center shadow-sm transition-all dark:bg-gray-800 ${t.color}`}>
                        <span className="text-gray-500">{t.icon}</span>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{t.label}</span>
                        <span className="text-[10px] text-gray-400">{t.desc}</span>
                    </button>
                ))}
            </div>
            <div className="mt-3 flex justify-end"><Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button></div>
        </>
    );

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <span className="text-blue-600">{types.find((t) => t.type === selectedType)?.icon}</span>
                <p className="text-sm font-semibold">{types.find((t) => t.type === selectedType)?.label}</p>
                {!isEdit && <button onClick={() => setSelectedType(null)} className="ml-auto text-xs text-gray-400 hover:text-blue-600">← Back</button>}
            </div>
            <Input placeholder="Content title *" value={title} onChange={(e) => setTitle(e.target.value)} />
            <textarea
                placeholder="Description (optional) — shown below the content"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 resize-none"
            />
            {selectedType === 'youtube' ? (
                <Input placeholder="YouTube URL" value={url} onChange={(e) => setUrl(e.target.value)} />
            ) : (
                <div className="space-y-2">
                    {isEdit && initial?.filename && !selectedFile && (
                        <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800">
                            <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <span className="flex-1 truncate">Current: {initial.filename}</span>
                            <span className="text-gray-400 shrink-0">Replace below</span>
                        </div>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={FILE_ACCEPT[selectedType]}
                        className="hidden"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-3 text-sm transition hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800"
                    >
                        <Upload className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className={selectedFile ? 'font-medium text-gray-800 dark:text-gray-200 truncate' : 'text-gray-400'}>
                            {selectedFile ? selectedFile.name : 'Click to choose file…'}
                        </span>
                    </button>
                    <p className="text-[11px] text-gray-400">
                        {selectedType === 'pdf' ? 'PDF only' : selectedType === 'word' ? '.docx or .doc only' : 'MP4, WebM, MOV · max 500 MB'}
                    </p>
                </div>
            )}
            <div className="flex gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                <Button size="sm" className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white" disabled={!canSave} onClick={handleSave}>
                    {isEdit ? 'Save Changes' : 'Add Content'}
                </Button>
            </div>
        </div>
    );
}

// ─── Quiz Builder (Add & Edit) ────────────────────────────────────────────────
interface QuizBuilderProps { initial?: Quiz; onSave: (quiz: Quiz) => void; onCancel: () => void; }
function QuizBuilder({ initial, onSave, onCancel }: QuizBuilderProps) {
    const isEdit = !!initial;
    const [title, setTitle] = useState(initial?.title ?? '');
    const [description, setDescription] = useState(initial?.description ?? '');
    const [questions, setQuestions] = useState<QuizQuestion[]>(initial?.questions ?? []);
    const [showQForm, setShowQForm] = useState(false);
    const [editingQ, setEditingQ] = useState<QuizQuestion | null>(null);
    const [qText, setQText] = useState('');
    const [opts, setOpts] = useState(['', '', '', '']);
    const [correctIdx, setCorrectIdx] = useState(0);

    const openNewQ = () => { setEditingQ(null); setQText(''); setOpts(['', '', '', '']); setCorrectIdx(0); setShowQForm(true); };
    const openEditQ = (q: QuizQuestion) => { setEditingQ(q); setQText(q.question); setOpts([...q.options]); setCorrectIdx(q.correctIndex); setShowQForm(true); };

    const saveQuestion = () => {
        if (!qText.trim() || opts.some((o) => !o.trim())) return;
        const updated: QuizQuestion = { id: editingQ?.id ?? uid(), question: qText.trim(), options: opts.map(o => o.trim()), correctIndex: correctIdx };
        setQuestions((prev) => editingQ ? prev.map((q) => q.id === editingQ.id ? updated : q) : [...prev, updated]);
        setShowQForm(false);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Input placeholder="Quiz title *" value={title} onChange={(e) => setTitle(e.target.value)} className="font-medium" />
                <textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
            </div>

            {/* Questions list */}
            {questions.length > 0 && (
                <div className="space-y-2">
                    {questions.map((q, i) => (
                        <div key={q.id} className="group flex items-start gap-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a]/10 text-xs font-bold text-[#1e3a8a]">{i + 1}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{q.question}</p>
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-green-600"><CheckCircle className="h-3 w-3" />{q.options[q.correctIndex]}</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">{q.options.length} options</p>
                            </div>
                            <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition">
                                <button onClick={() => openEditQ(q)} className="rounded p-1 text-gray-400 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button>
                                <button onClick={() => setQuestions((prev) => prev.filter((x) => x.id !== q.id))} className="rounded p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Question form */}
            {showQForm ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-[#1e3a8a]/70">{editingQ ? 'Edit Question' : 'New Question'}</p>
                    <textarea placeholder="Question text *" value={qText} onChange={(e) => setQText(e.target.value)} rows={2}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                    <div className="space-y-2">
                        <p className="text-xs text-gray-400 font-medium">Answer options — click circle to mark correct</p>
                        {opts.map((opt, j) => (
                            <div key={j} className="flex items-center gap-2">
                                <button type="button" onClick={() => setCorrectIdx(j)}
                                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${correctIdx === j ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-400'}`}>
                                    {correctIdx === j && <div className="h-2 w-2 rounded-full bg-white" />}
                                </button>
                                <Input placeholder={`Option ${j + 1}${correctIdx === j ? ' (correct)' : ''}`} value={opt}
                                    onChange={(e) => { const o = [...opts]; o[j] = e.target.value; setOpts(o); }}
                                    className={`text-sm ${correctIdx === j ? 'border-green-300 bg-green-50 dark:border-green-700' : ''}`} />
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                        <Button size="sm" className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white" onClick={saveQuestion} disabled={!qText.trim() || opts.some((o) => !o.trim())}>
                            {editingQ ? 'Update Question' : 'Add Question'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowQForm(false)}>Cancel</Button>
                    </div>
                </div>
            ) : (
                <button onClick={openNewQ}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#1e3a8a]/30 py-2.5 text-sm font-medium text-[#1e3a8a] transition hover:bg-[#1e3a8a]/5 dark:border-indigo-700 dark:text-indigo-400">
                    <Plus className="h-4 w-4" />Add Question {questions.length > 0 && `(${questions.length} added)`}
                </button>
            )}

            <div className="flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                <Button className="flex-1 bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white"
                    onClick={() => onSave({ id: initial?.id ?? uid(), kind: 'quiz', title: title.trim(), description: description.trim(), questions })}
                    disabled={!title.trim() || questions.length === 0}>
                    {isEdit ? 'Save Changes' : `Save Quiz${questions.length > 0 ? ` (${questions.length} Q${questions.length !== 1 ? 's' : ''})` : ''}`}
                </Button>
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
        </div>
    );
}

// ─── Assignment Builder (Add & Edit) ─────────────────────────────────────────
interface AssignmentBuilderProps { initial?: Assignment; onSave: (a: Assignment) => void; onCancel: () => void; }
function AssignmentBuilder({ initial, onSave, onCancel }: AssignmentBuilderProps) {
    const isEdit = !!initial;
    const [title, setTitle] = useState(initial?.title ?? '');
    const [instructions, setInstructions] = useState(initial?.instructions ?? '');
    const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
    const [maxScore, setMaxScore] = useState(initial?.maxScore ?? 100);

    return (
        <div className="space-y-3">
            <Input placeholder="Assignment title *" value={title} onChange={(e) => setTitle(e.target.value)} className="font-medium" />
            <textarea placeholder="Instructions for students *" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" />
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-gray-500">Due Date (optional)</label>
                    <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <div className="w-28">
                    <label className="mb-1 block text-xs font-medium text-gray-500">Max Score</label>
                    <Input type="number" min={1} value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} />
                </div>
            </div>
            <div className="flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                    onClick={() => onSave({ id: initial?.id ?? uid(), kind: 'assignment', title: title.trim(), instructions: instructions.trim(), dueDate, maxScore })}
                    disabled={!title.trim() || !instructions.trim()}>
                    {isEdit ? 'Save Changes' : 'Save Assignment'}
                </Button>
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
            </div>
        </div>
    );
}

// ─── Assessment Picker ────────────────────────────────────────────────────────
interface AssessmentPickerProps { onAdd: (a: Assessment) => void; onCancel: () => void; }
function AssessmentPicker({ onAdd, onCancel }: AssessmentPickerProps) {
    const [mode, setMode] = useState<'choose' | 'quiz' | 'assignment'>('choose');
    if (mode === 'quiz') return (
        <div>
            <div className="mb-3 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-[#1e3a8a]" /><p className="text-sm font-semibold">Create Quiz</p><button onClick={() => setMode('choose')} className="ml-auto text-xs text-gray-400 hover:text-blue-600">← Back</button></div>
            <QuizBuilder onSave={onAdd} onCancel={onCancel} />
        </div>
    );
    if (mode === 'assignment') return (
        <div>
            <div className="mb-3 flex items-center gap-2"><PenLine className="h-4 w-4 text-amber-500" /><p className="text-sm font-semibold">Create Assignment</p><button onClick={() => setMode('choose')} className="ml-auto text-xs text-gray-400 hover:text-blue-600">← Back</button></div>
            <AssignmentBuilder onSave={onAdd} onCancel={onCancel} />
        </div>
    );
    return (
        <>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">Add Assessment</p>
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setMode('quiz')} className="flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-white p-4 shadow-sm transition hover:border-[#1e3a8a]/30 hover:bg-[#1e3a8a]/5 dark:bg-gray-800">
                    <ClipboardList className="h-7 w-7 text-[#1e3a8a]" /><span className="text-sm font-semibold">Quiz</span><span className="text-[10px] text-gray-400">Multiple choice questions</span>
                </button>
                <button onClick={() => setMode('assignment')} className="flex flex-col items-center gap-2 rounded-xl border-2 border-transparent bg-white p-4 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 dark:bg-gray-800">
                    <PenLine className="h-7 w-7 text-amber-500" /><span className="text-sm font-semibold">Assignment</span><span className="text-[10px] text-gray-400">Written / file submission</span>
                </button>
            </div>
            <div className="mt-3 flex justify-end"><Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button></div>
        </>
    );
}

// ─── Meeting Builder ──────────────────────────────────────────────────────────
interface MeetingBuilderProps {
    initial?: Meeting;
    onSave: (m: Meeting) => void;
    onCancel: () => void;
}
function MeetingBuilder({ initial, onSave, onCancel }: MeetingBuilderProps) {
    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const parseInitial = () => {
        if (!initial) return { date: '', time: '' };
        const d = new Date(initial.scheduledAt);
        const inTz = new Date(d.toLocaleString('en-US', { timeZone: initial.timezone }));
        const pad = (n: number) => String(n).padStart(2, '0');
        return {
            date: `${inTz.getFullYear()}-${pad(inTz.getMonth() + 1)}-${pad(inTz.getDate())}`,
            time: `${pad(inTz.getHours())}:${pad(inTz.getMinutes())}`,
        };
    };

    const { date: initDate, time: initTime } = parseInitial();

    const [title, setTitle]               = useState(initial?.title ?? '');
    const [description, setDescription]   = useState(initial?.description ?? '');
    const [meetLink, setMeetLink]         = useState(initial?.meetLink ?? '');
    const [date, setDate]                 = useState(initDate);
    const [time, setTime]                 = useState(initTime);
    const [timezone, setTimezone]         = useState(initial?.timezone ?? localTz);
    const [duration, setDuration]         = useState<string>(initial?.durationMinutes != null ? String(initial.durationMinutes) : '60');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [now, setNow]                   = useState(new Date());

    // Only tick the clock when the world-time panel is actually open
    useEffect(() => {
        if (!showAdvanced) return;
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, [showAdvanced]);

    const scheduledIso = (() => {
        if (!date || !time) return null;
        try {
            const [y, mo, d2] = date.split('-').map(Number);
            const [h, mi]     = time.split(':').map(Number);
            // Build a string that JS can parse as if it were in the chosen timezone
            const local = new Date(`${date}T${time}:00`);
            // Get offset of the chosen timezone at that moment
            const fmt = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false,
            });
            // Find the UTC instant where the chosen-tz wall clock reads date+time
            const utcApprox = new Date(`${date}T${time}:00Z`);
            const tzParts   = fmt.formatToParts(utcApprox);
            const get = (t: string) => Number(tzParts.find((p) => p.type === t)?.value ?? 0);
            const tzYear = get('year'), tzMonth = get('month'), tzDay = get('day');
            const tzHour = get('hour') % 24, tzMin = get('minute'), tzSec = get('second');
            const diff = utcApprox.getTime() - Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, tzSec);
            return new Date(Date.UTC(y, mo - 1, d2, h, mi, 0) + diff).toISOString();
        } catch { return null; }
    })();

    const worldPreview = useMemo(() => {
        if (!showAdvanced || !scheduledIso) return null;
        return WORLD_ZONES.map(({ tz, flag, city }) => {
            const t = new Date(scheduledIso);
            const timeStr = t.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });
            const dateStr = t.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' });
            const isSelected = tz === timezone;
            return { tz, flag, city, timeStr, dateStr, isSelected };
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAdvanced, scheduledIso, timezone, now]);

    const handleSave = () => {
        if (!title.trim() || !meetLink.trim() || !date || !time || !scheduledIso) return;
        const m: Meeting = {
            id:              initial?.id ?? 'meeting-' + Math.random().toString(36).slice(2),
            dbId:            initial?.dbId,
            title:           title.trim(),
            description:     description.trim(),
            meetLink:        meetLink.trim(),
            scheduledAt:     scheduledIso,
            timezone,
            durationMinutes: duration ? Number(duration) : null,
        };
        onSave(m);
    };

    const valid = title.trim() && meetLink.trim() && date && time;

    return (
        <div className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Meeting Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Live Q&A Session" className="h-9" />
            </div>

            {/* Google Meet link */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Google Meet Link</label>
                <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <Input
                        value={meetLink}
                        onChange={(e) => setMeetLink(e.target.value)}
                        placeholder="https://meet.google.com/xxx-xxxx-xxx"
                        className="h-9 pl-8"
                    />
                </div>
            </div>

            {/* Date, time, timezone row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Date</label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Time</label>
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Duration (min)</label>
                    <Input type="number" min={1} max={1440} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" className="h-9" />
                </div>
            </div>

            {/* Timezone selector */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-blue-400" /> Timezone
                </label>
                <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 h-9"
                >
                    {TZ_GROUPS.map((g) => (
                        <optgroup key={g.label} label={g.label}>
                            {g.options.map((tz) => (
                                <option key={tz} value={tz}>{tzLabel(tz)}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>
                <p className="text-[11px] text-gray-400">Your local timezone: {tzLabel(localTz)}</p>
            </div>

            {/* Advanced toggle */}
            <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors"
            >
                <Globe className="h-3.5 w-3.5" />
                World Time Zones
                {showAdvanced ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>

            {/* World clock preview */}
            {showAdvanced && worldPreview && (
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {worldPreview.map(({ tz, flag, city, timeStr, dateStr, isSelected }) => (
                            <button
                                key={tz}
                                type="button"
                                onClick={() => setTimezone(tz)}
                                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-all ${
                                    isSelected
                                        ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/40'
                                        : 'border-gray-100 bg-gray-50 hover:border-blue-200 hover:bg-blue-50/50 dark:border-gray-800 dark:bg-gray-900/60'
                                }`}
                            >
                                <span className="text-base leading-none">{flag}</span>
                                <div className="min-w-0 flex-1">
                                    <p className={`truncate font-semibold ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{city}</p>
                                    <p className={`font-mono tabular-nums ${isSelected ? 'text-blue-600 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`}>{timeStr}</p>
                                    <p className="truncate text-[10px] text-gray-400">{dateStr}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Description <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What will be covered in this meeting?"
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 resize-none"
                />
            </div>

            <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
                <Button size="sm" disabled={!valid} onClick={handleSave}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {initial ? 'Save Changes' : 'Add Meeting'}
                </Button>
            </div>
        </div>
    );
}

// ─── Content Panel Editor (right panel, edit mode) ────────────────────────────
interface ContentPanelEditorProps {
    session: Session;
    onAddContent: (c: ContentItem) => void;
    onUpdateContent: (c: ContentItem) => void;
    onDeleteContent: (id: string) => void;
    onAddAssessment: (a: Assessment) => void;
    onUpdateAssessment: (a: Assessment) => void;
    onDeleteAssessment: (id: string) => void;
    onAddMeeting: (m: Meeting) => void;
    onUpdateMeeting: (m: Meeting) => void;
    onDeleteMeeting: (id: string) => void;
}
export function ContentPanelEditor({ session, onAddContent, onUpdateContent, onDeleteContent, onAddAssessment, onUpdateAssessment, onDeleteAssessment, onAddMeeting, onUpdateMeeting, onDeleteMeeting }: ContentPanelEditorProps) {
    type PanelMode = 'list' | 'add-content' | 'edit-content' | 'add-assessment' | 'edit-assessment' | 'add-meeting' | 'edit-meeting';
    const [mode, setMode] = useState<PanelMode>('list');
    const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
    const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
    const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'content' | 'assessment' | 'meeting'; id: string; name: string } | null>(null);

    const reset = () => { setMode('list'); setEditingContent(null); setEditingAssessment(null); setEditingMeeting(null); };

    if (mode === 'add-content' || mode === 'edit-content') return (
        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 overflow-y-auto">
            <div className="flex items-center gap-2">
                <button onClick={reset} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600"><ArrowLeft className="h-4 w-4" />{mode === 'edit-content' ? 'Edit Content' : 'Add Content'}</button>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
                <ContentPicker initial={editingContent ?? undefined} onSave={(item) => { mode === 'edit-content' ? onUpdateContent(item) : onAddContent(item); reset(); }} onCancel={reset} />
            </div>
        </div>
    );

    if (mode === 'add-assessment' || mode === 'edit-assessment') {
        const isEditAssessment = mode === 'edit-assessment' && editingAssessment;
        return (
            <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 overflow-y-auto">
                <div className="flex items-center gap-2">
                    <button onClick={reset} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600"><ArrowLeft className="h-4 w-4" />{isEditAssessment ? 'Edit Assessment' : 'Add Assessment'}</button>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                    {isEditAssessment ? (
                        editingAssessment.kind === 'quiz'
                            ? <QuizBuilder initial={editingAssessment} onSave={(q) => { onUpdateAssessment(q); reset(); }} onCancel={reset} />
                            : <AssignmentBuilder initial={editingAssessment} onSave={(a) => { onUpdateAssessment(a); reset(); }} onCancel={reset} />
                    ) : (
                        <AssessmentPicker onAdd={(a) => { onAddAssessment(a); reset(); }} onCancel={reset} />
                    )}
                </div>
            </div>
        );
    }

    if (mode === 'add-meeting' || mode === 'edit-meeting') return (
        <div className="flex flex-1 flex-col gap-4 p-4 sm:p-6 overflow-y-auto">
            <div className="flex items-center gap-2">
                <button onClick={reset} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-600">
                    <ArrowLeft className="h-4 w-4" />{mode === 'edit-meeting' ? 'Edit Meeting' : 'Add Meeting'}
                </button>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <MeetingBuilder
                    initial={editingMeeting ?? undefined}
                    onSave={(m) => { mode === 'edit-meeting' ? onUpdateMeeting(m) : onAddMeeting(m); reset(); }}
                    onCancel={reset}
                />
            </div>
        </div>
    );

    return (
        <div className="flex flex-1 flex-col overflow-y-auto">
            {/* Session header — minimal */}
            <div className="shrink-0 border-b border-gray-100 px-5 py-3.5 dark:border-gray-800">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{session.title}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                    {session.contents.length} material{session.contents.length !== 1 ? 's' : ''}
                    {' · '}{session.assessments.length} assessment{session.assessments.length !== 1 ? 's' : ''}
                    {' · '}{session.meetings.length} meeting{session.meetings.length !== 1 ? 's' : ''}
                </p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/50">
                {/* Materials */}
                <div className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-gray-400">Materials</span>
                        <button onClick={() => setMode('add-content')} className="flex items-center gap-1 text-[11px] font-medium text-blue-500 hover:text-blue-700 transition-colors">
                            <Plus className="h-3 w-3" />Add
                        </button>
                    </div>
                    {session.contents.length === 0 ? (
                        <p className="text-xs text-gray-300 dark:text-gray-600">No materials yet.</p>
                    ) : (
                        <div className="space-y-0.5">
                            {session.contents.map((c) => (
                                <div key={c.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs ${CONTENT_META[c.type].badge}`}>
                                        {CONTENT_META[c.type].icon}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">{c.title}</p>
                                        <p className="text-[11px] text-gray-400">{CONTENT_META[c.type].label}</p>
                                    </div>
                                    <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={() => { setEditingContent(c); setMode('edit-content'); }} className="rounded p-1 text-gray-300 hover:text-blue-500 transition"><Pencil className="h-3.5 w-3.5" /></button>
                                        <button onClick={() => setDeleteTarget({ type: 'content', id: c.id, name: c.title })} className="rounded p-1 text-gray-300 hover:text-red-400 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Assessments */}
                <div className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-gray-400">Assessments</span>
                        <button onClick={() => setMode('add-assessment')} className="flex items-center gap-1 text-[11px] font-medium text-amber-500 hover:text-amber-700 transition-colors">
                            <Plus className="h-3 w-3" />Add
                        </button>
                    </div>
                    {session.assessments.length === 0 ? (
                        <p className="text-xs text-gray-300 dark:text-gray-600">No assessments yet.</p>
                    ) : (
                        <div className="space-y-0.5">
                            {session.assessments.map((a) => (
                                <div key={a.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${a.kind === 'quiz' ? 'bg-[#1e3a8a]/10 text-[#1e3a8a]' : 'bg-amber-50 text-amber-500'}`}>
                                        {a.kind === 'quiz' ? <ClipboardList className="h-3.5 w-3.5" /> : <PenLine className="h-3.5 w-3.5" />}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">{a.title}</p>
                                        <p className="text-[11px] text-gray-400">
                                            {a.kind === 'quiz' ? `Quiz · ${a.questions.length}Q` : `Assignment · ${a.maxScore} pts${a.dueDate ? ` · Due ${a.dueDate}` : ''}`}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={() => { setEditingAssessment(a); setMode('edit-assessment'); }} className="rounded p-1 text-gray-300 hover:text-blue-500 transition"><Pencil className="h-3.5 w-3.5" /></button>
                                        <button onClick={() => setDeleteTarget({ type: 'assessment', id: a.id, name: a.title })} className="rounded p-1 text-gray-300 hover:text-red-400 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Meetings */}
                <div className="px-5 py-4">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-gray-400">Meetings</span>
                        <button onClick={() => setMode('add-meeting')} className="flex items-center gap-1 text-[11px] font-medium text-emerald-500 hover:text-emerald-700 transition-colors">
                            <Plus className="h-3 w-3" />Add
                        </button>
                    </div>
                    {session.meetings.length === 0 ? (
                        <p className="text-xs text-gray-300 dark:text-gray-600">No meetings yet.</p>
                    ) : (
                        <div className="space-y-0.5">
                            {session.meetings.map((m) => {
                                const meetDate = new Date(m.scheduledAt);
                                const dateStr = meetDate.toLocaleDateString('en-US', { timeZone: m.timezone, weekday: 'short', month: 'short', day: 'numeric' });
                                const timeStr = meetDate.toLocaleTimeString('en-US', { timeZone: m.timezone, hour: '2-digit', minute: '2-digit', hour12: true });
                                const tzCity = m.timezone.split('/').pop()?.replace(/_/g, ' ') ?? m.timezone;
                                return (
                                    <div key={m.id} className="group flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-emerald-50 text-emerald-500">
                                            <Video className="h-3.5 w-3.5" />
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200 truncate">{m.title}</p>
                                            <p className="text-[11px] text-gray-400">{dateStr} · {timeStr} ({tzCity}){m.durationMinutes ? ` · ${m.durationMinutes}m` : ''}</p>
                                            <a href={m.meetLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[11px] text-emerald-500 hover:underline">
                                                <ExternalLink className="h-2.5 w-2.5" />Join
                                            </a>
                                        </div>
                                        <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100 transition">
                                            <button onClick={() => { setEditingMeeting(m); setMode('edit-meeting'); }} className="rounded p-1 text-gray-300 hover:text-blue-500 transition"><Pencil className="h-3.5 w-3.5" /></button>
                                            <button onClick={() => setDeleteTarget({ type: 'meeting', id: m.id, name: m.title })} className="rounded p-1 text-gray-300 hover:text-red-400 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete confirm dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                            Delete {deleteTarget?.type === 'content' ? 'Content' : deleteTarget?.type === 'meeting' ? 'Meeting' : 'Assessment'}?
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600 dark:text-gray-400">"<strong>{deleteTarget?.name}</strong>" will be permanently removed.</p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => {
                            if (!deleteTarget) return;
                            if (deleteTarget.type === 'content') onDeleteContent(deleteTarget.id);
                            else if (deleteTarget.type === 'assessment') onDeleteAssessment(deleteTarget.id);
                            else onDeleteMeeting(deleteTarget.id);
                            setDeleteTarget(null);
                        }}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
