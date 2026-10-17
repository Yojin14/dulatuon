import { CourseThumbnailField } from '@/components/course-thumbnail-field';
import { PORTAL_GRADIENT } from '@/components/dashboards/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Teacher } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, BookOpen, ChevronDown, GraduationCap, Info, PlayCircle, Settings, Upload, X, Youtube } from 'lucide-react';
import { useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Courses', href: '/courses' },
    { title: 'Create Course', href: '/courses/create' },
];

interface PageProps {
    teachers: Teacher[];
    [key: string]: unknown;
}

export default function CreateCourse() {
    const { teachers } = usePage<PageProps>().props;

    const [videoMode, setVideoMode] = useState<'url' | 'upload'>('url');
    const [filePreview, setFilePreview] = useState<string | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        course_code:       '',
        title:             '',
        description:       '',
        short_description: '',
        level:             'Beginner' as 'Beginner' | 'Intermediate' | 'Advanced',
        status:            'draft' as 'draft' | 'published' | 'archived',
        teacher_ids:       [] as number[],
        max_students:      '',
        intro_video:       '',
        intro_video_file:  null as File | null,
        thumbnail_file:    null as File | null,
        thumbnail_focus:   '50.0% 50.0%',
    });

    function toggleTeacher(id: number) {
        setData('teacher_ids', data.teacher_ids.includes(id)
            ? data.teacher_ids.filter((t) => t !== id)
            : [...data.teacher_ids, id]
        );
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        setData('intro_video_file', file);
        setFilePreview(file ? URL.createObjectURL(file) : null);
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/courses');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Course" />
            <div className="min-h-full bg-white dark:bg-gray-950">

                {/* Header */}
                <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8" style={{ background: PORTAL_GRADIENT }}>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow-300/80">Admin Portal</p>
                            <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">Create Course</h1>
                            <p className="mt-1 text-sm text-blue-200/50">
                                Add a new course. The assigned teacher will see it in their My Class dashboard.
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                            <Button variant="ghost" size="sm" asChild className="hidden text-white/80 hover:bg-white/10 hover:text-white sm:flex">
                                <Link href="/courses">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Courses
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                <div className="mb-4 sm:hidden">
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/courses"><ArrowLeft className="mr-2 h-4 w-4" />Back to Courses</Link>
                    </Button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-6 lg:grid-cols-3">

                        {/* ── Left column ── */}
                        <div className="space-y-6 lg:col-span-2">

                            {/* Course Identity */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                        Course Identity
                                    </CardTitle>
                                    <CardDescription>
                                        The title and code are shown in the teacher's <em>Manage Course</em> header.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="title">Course Title <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="title"
                                                placeholder="e.g. The Life of Christ"
                                                value={data.title}
                                                onChange={(e) => setData('title', e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Displayed as the large heading in Manage Course.
                                            </p>
                                            {errors.title && (
                                                <p className="text-sm text-red-600">{errors.title}</p>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="course_code">Course Code <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="course_code"
                                                placeholder="e.g. LOC-2024, EVNG-101"
                                                value={data.course_code}
                                                onChange={(e) => setData('course_code', e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Unique identifier shown on the course card.
                                            </p>
                                            {errors.course_code && (
                                                <p className="text-sm text-red-600">{errors.course_code}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="short_description">Short Description</Label>
                                        <Input
                                            id="short_description"
                                            placeholder="One-line summary shown on the My Class card"
                                            value={data.short_description}
                                            onChange={(e) => setData('short_description', e.target.value)}
                                        />
                                        {errors.short_description && (
                                            <p className="text-sm text-red-600">{errors.short_description}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Full Description</Label>
                                        <Textarea
                                            id="description"
                                            placeholder="Detailed overview of the course content, goals, and audience"
                                            rows={5}
                                            value={data.description}
                                            onChange={(e) => setData('description', e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Shown on the course detail page and in the Manage Course view.
                                        </p>
                                        {errors.description && (
                                            <p className="text-sm text-red-600">{errors.description}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Course Thumbnail */}
                            <CourseThumbnailField
                                preview={thumbnailPreview}
                                error={errors.thumbnail_file}
                                onSelect={(file) => {
                                    setData('thumbnail_file', file);
                                    setThumbnailPreview(URL.createObjectURL(file));
                                }}
                                onRemove={() => {
                                    setData('thumbnail_file', null);
                                    setThumbnailPreview(null);
                                }}
                                onFocusChange={(focus) => setData('thumbnail_focus', focus)}
                            />

                            {/* Course Intro Video */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                        Course Intro Video
                                    </CardTitle>
                                    <CardDescription>
                                        Shown as the course overview when the teacher opens Manage Course.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Mode toggle */}
                                    <div className="flex rounded-lg border border-gray-200 p-1 gap-1 dark:border-gray-700">
                                        <button type="button" onClick={() => { setVideoMode('url'); setData('intro_video_file', null); setFilePreview(null); }}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium transition-all ${videoMode === 'url' ? 'bg-white shadow text-gray-900 dark:bg-gray-800 dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                                            <Youtube className="h-4 w-4" /> YouTube / URL
                                        </button>
                                        <button type="button" onClick={() => { setVideoMode('upload'); setData('intro_video', ''); }}
                                            className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium transition-all ${videoMode === 'upload' ? 'bg-white shadow text-gray-900 dark:bg-gray-800 dark:text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                                            <Upload className="h-4 w-4" /> Upload File
                                        </button>
                                    </div>

                                    {videoMode === 'url' ? (
                                        <div className="space-y-2">
                                            <Label htmlFor="intro_video">Video URL</Label>
                                            <div className="relative">
                                                <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input id="intro_video" className="pl-9" placeholder="https://www.youtube.com/watch?v=… or direct .mp4 URL"
                                                    value={data.intro_video} onChange={(e) => setData('intro_video', e.target.value)} />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Supports YouTube, youtu.be, and direct video file URLs.</p>
                                            {errors.intro_video && <p className="text-sm text-red-600">{errors.intro_video}</p>}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label>Upload Video File</Label>
                                            <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" className="hidden" onChange={handleFileChange} />
                                            <button type="button" onClick={() => fileInputRef.current?.click()}
                                                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-8 text-center transition hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-800/40">
                                                <Upload className="h-7 w-7 text-gray-400" />
                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                                    {data.intro_video_file ? data.intro_video_file.name : 'Click to choose a video file'}
                                                </span>
                                                <span className="text-xs text-gray-400">MP4, WebM, OGG, MOV · max 500 MB</span>
                                            </button>
                                            {errors.intro_video_file && <p className="text-sm text-red-600">{errors.intro_video_file}</p>}
                                        </div>
                                    )}

                                    {/* Preview */}
                                    {videoMode === 'url' && data.intro_video && (() => {
                                        const ytMatch = data.intro_video.match(/(?:youtu\.be\/|watch\?v=|embed\/)([^&\n?#]+)/);
                                        const ytId = ytMatch ? ytMatch[1] : null;
                                        return ytId ? (
                                            <div className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700" style={{ paddingTop: '56.25%' }}>
                                                <iframe className="absolute inset-0 h-full w-full" src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`} title="Intro preview" allowFullScreen />
                                            </div>
                                        ) : (
                                            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-black">
                                                <video src={data.intro_video} controls className="w-full max-h-48" />
                                            </div>
                                        );
                                    })()}
                                    {videoMode === 'upload' && filePreview && (
                                        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-black">
                                            <video src={filePreview} controls className="w-full max-h-56" />
                                        </div>
                                    )}
                                    {videoMode === 'url' && !data.intro_video && (
                                        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-10 text-center dark:border-gray-700 dark:bg-gray-800/40">
                                            <PlayCircle className="h-8 w-8 text-gray-300" />
                                            <p className="text-xs text-gray-400">No intro video — paste a link above to preview.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* ── Sidebar ── */}
                        <div className="space-y-6">

                            {/* Instructor & Classification */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                        Instructor & Classification
                                    </CardTitle>
                                    <CardDescription>
                                        Determines which teacher's My Class this course appears under.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Assign Teachers <span className="text-red-500">*</span></Label>
                                        <div className="relative">
                                            <button
                                                type="button"
                                                onClick={() => setTeacherDropdownOpen((o) => !o)}
                                                className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                            >
                                                <span className={data.teacher_ids.length === 0 ? 'text-muted-foreground' : ''}>
                                                    {data.teacher_ids.length === 0
                                                        ? 'Select teachers…'
                                                        : `${data.teacher_ids.length} teacher${data.teacher_ids.length > 1 ? 's' : ''} selected`}
                                                </span>
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            </button>
                                            {teacherDropdownOpen && (
                                                <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-popover shadow-md">
                                                    <div className="max-h-48 overflow-y-auto p-1">
                                                        {teachers.map((t) => (
                                                            <label
                                                                key={t.id}
                                                                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                                            >
                                                                <Checkbox
                                                                    checked={data.teacher_ids.includes(t.id)}
                                                                    onCheckedChange={() => toggleTeacher(t.id)}
                                                                />
                                                                {t.name}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {data.teacher_ids.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {data.teacher_ids.map((id) => {
                                                    const t = teachers.find((t) => t.id === id);
                                                    return t ? (
                                                        <span key={id} className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                                            {t.name}
                                                            <button type="button" onClick={() => toggleTeacher(id)}><X className="h-3 w-3" /></button>
                                                        </span>
                                                    ) : null;
                                                })}
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            Selected teachers will see the course in My Class → Manage Course.
                                        </p>
                                        {errors.teacher_ids && (
                                            <p className="text-sm text-red-600">{errors.teacher_ids}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Level <span className="text-red-500">*</span></Label>
                                        <Select
                                            value={data.level}
                                            onValueChange={(v) => setData('level', v as typeof data.level)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(['Beginner', 'Intermediate', 'Advanced'] as const).map((l) => (
                                                    <SelectItem key={l} value={l}>{l}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Groups courses in the teacher's My Class by level.
                                        </p>
                                        {errors.level && (
                                            <p className="text-sm text-red-600">{errors.level}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Publishing */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Settings className="h-4 w-4 text-muted-foreground" />
                                        Publishing
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Status <span className="text-red-500">*</span></Label>
                                        <Select
                                            value={data.status}
                                            onValueChange={(v) => setData('status', v as typeof data.status)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="draft">
                                                    <span className="flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full bg-yellow-400 inline-block" />
                                                        Draft
                                                    </span>
                                                </SelectItem>
                                                <SelectItem value="published">
                                                    <span className="flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full bg-green-500 inline-block" />
                                                        Published
                                                    </span>
                                                </SelectItem>
                                                <SelectItem value="archived">
                                                    <span className="flex items-center gap-2">
                                                        <span className="h-2 w-2 rounded-full bg-gray-400 inline-block" />
                                                        Archived
                                                    </span>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Only <strong>Published</strong> courses are visible to students.
                                        </p>
                                        {errors.status && (
                                            <p className="text-sm text-red-600">{errors.status}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="max_students">Max Students</Label>
                                        <Input
                                            id="max_students"
                                            type="number"
                                            placeholder="Leave empty for unlimited"
                                            value={data.max_students}
                                            onChange={(e) => setData('max_students', e.target.value)}
                                            min={1}
                                        />
                                        {errors.max_students && (
                                            <p className="text-sm text-red-600">{errors.max_students}</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex flex-col gap-3">
                                <Button
                                    type="submit"
                                    className="w-full bg-green-700 hover:bg-green-800 text-white"
                                    disabled={processing}
                                >
                                    {processing ? 'Creating…' : 'Create Course'}
                                </Button>
                                <Button type="button" variant="outline" className="w-full" asChild>
                                    <Link href="/courses">Cancel</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </form>

                {/* No teachers warning */}
                {teachers.length === 0 && (
                    <div className="mt-6 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
                        <div className="flex items-center gap-3">
                            <BookOpen className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                No teachers found. Please add teacher accounts first before creating a course.
                            </p>
                        </div>
                    </div>
                )}
                </div>
            </div>
        </AppLayout>
    );
}
