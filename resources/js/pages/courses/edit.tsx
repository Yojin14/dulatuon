import { CourseThumbnailField } from '@/components/course-thumbnail-field';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import { PageHeader } from '@/components/page-header';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Course, type Teacher } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    ChevronDown,
    GraduationCap,
    Info,
    PlayCircle,
    Settings,
    Upload,
    X,
    Youtube,
} from 'lucide-react';
import { useRef, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Courses', href: '/courses' },
    { title: 'Edit Course', href: '#' },
];

interface PageProps {
    course: Course;
    teachers: Teacher[];
    [key: string]: unknown;
}

export default function EditCourse() {
    const { course, teachers } = usePage<PageProps>().props;

    const isUploadedVideo = (url: string | null) =>
        !!url && url.startsWith('/storage/course-videos/');

    const [videoMode, setVideoMode] = useState<'url' | 'upload'>(
        isUploadedVideo(course.intro_video) ? 'upload' : 'url',
    );
    const [filePreview, setFilePreview] = useState<string | null>(
        isUploadedVideo(course.intro_video) ? course.intro_video : null,
    );
    const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const parseFocusString = (val: string | null | undefined): { x: number; y: number } => {
        const s = val ?? '';
        const m = s.match(/^([\d.]+)%\s+([\d.]+)%$/);
        if (m) return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
        return { x: 50, y: 50 };
    };

    const initialFocus = parseFocusString(course.thumbnail_focus);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(course.thumbnail ?? null);

    const { data, setData, post, processing, errors } = useForm({
        _method: 'PUT',
        course_code: course.course_code,
        title: course.title,
        description: course.description ?? '',
        short_description: course.short_description ?? '',
        level: course.level,
        status: course.status,
        teacher_ids: (course.teachers ?? []).map((t) => t.id),
        max_students: course.max_students ? String(course.max_students) : '',
        intro_video: isUploadedVideo(course.intro_video)
            ? ''
            : (course.intro_video ?? ''),
        intro_video_file: null as File | null,
        thumbnail_file: null as File | null,
        thumbnail_focus: `${initialFocus.x.toFixed(1)}% ${initialFocus.y.toFixed(1)}%`,
    });

    function toggleTeacher(id: number) {
        setData(
            'teacher_ids',
            data.teacher_ids.includes(id)
                ? data.teacher_ids.filter((t) => t !== id)
                : [...data.teacher_ids, id],
        );
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] ?? null;
        setData('intro_video_file', file);
        setFilePreview(
            file
                ? URL.createObjectURL(file)
                : isUploadedVideo(course.intro_video)
                  ? course.intro_video
                  : null,
        );
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/courses/${course.id}`, {
            forceFormData: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit — ${course.title}`} />
            <div className="min-h-full pb-10">
                {/* Header */}
                <PageHeader
                    title="Edit course"
                    description="Changes show up in the teacher's view immediately."
                    actions={
                        <Button variant="outline" asChild>
                            <Link href="/courses">
                                <ArrowLeft />
                                All courses
                            </Link>
                        </Button>
                    }
                />

                <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 py-8">
                    <div className="mb-4 sm:hidden">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/courses">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Courses
                            </Link>
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
                                            The title and code are shown in the
                                            teacher's <em>Manage Course</em>{' '}
                                            header.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="title">
                                                    Course Title{' '}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </Label>
                                                <Input
                                                    id="title"
                                                    placeholder="e.g. Earthquakes and Faults"
                                                    value={data.title}
                                                    onChange={(e) =>
                                                        setData(
                                                            'title',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Displayed as the large
                                                    heading in Manage Course.
                                                </p>
                                                {errors.title && (
                                                    <p className="text-sm text-red-600">
                                                        {errors.title}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="course_code">
                                                    Course Code{' '}
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                </Label>
                                                <Input
                                                    id="course_code"
                                                    placeholder="e.g. LOC-2024, EVNG-101"
                                                    value={data.course_code}
                                                    onChange={(e) =>
                                                        setData(
                                                            'course_code',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Unique identifier shown on
                                                    the course card.
                                                </p>
                                                {errors.course_code && (
                                                    <p className="text-sm text-red-600">
                                                        {errors.course_code}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="short_description">
                                                Short Description
                                            </Label>
                                            <Input
                                                id="short_description"
                                                placeholder="One-line summary shown on the My Class card"
                                                value={data.short_description}
                                                onChange={(e) =>
                                                    setData(
                                                        'short_description',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            {errors.short_description && (
                                                <p className="text-sm text-red-600">
                                                    {errors.short_description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="description">
                                                Full Description
                                            </Label>
                                            <Textarea
                                                id="description"
                                                placeholder="Detailed overview of the course content, goals, and audience"
                                                rows={5}
                                                value={data.description}
                                                onChange={(e) =>
                                                    setData(
                                                        'description',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Shown on the course detail page
                                                and in the Manage Course view.
                                            </p>
                                            {errors.description && (
                                                <p className="text-sm text-red-600">
                                                    {errors.description}
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Course Thumbnail */}
                                <CourseThumbnailField
                                    preview={thumbnailPreview}
                                    initialFocusX={initialFocus.x}
                                    initialFocusY={initialFocus.y}
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
                                            Shown as the course overview when
                                            the teacher opens Manage Course.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {/* Mode toggle */}
                                        <div className="flex gap-1 rounded-lg border border-border p-1">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setVideoMode('url');
                                                    setData(
                                                        'intro_video_file',
                                                        null,
                                                    );
                                                    setFilePreview(null);
                                                }}
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium transition-all ${videoMode === 'url' ? 'bg-card text-foreground shadow dark:text-white' : 'text-muted-foreground hover:text-muted-foreground'}`}
                                            >
                                                <Youtube className="h-4 w-4" />{' '}
                                                YouTube / URL
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setVideoMode('upload');
                                                    setData('intro_video', '');
                                                }}
                                                className={`flex flex-1 items-center justify-center gap-2 rounded-md py-1.5 text-sm font-medium transition-all ${videoMode === 'upload' ? 'bg-card text-foreground shadow dark:text-white' : 'text-muted-foreground hover:text-muted-foreground'}`}
                                            >
                                                <Upload className="h-4 w-4" />{' '}
                                                Upload File
                                            </button>
                                        </div>

                                        {videoMode === 'url' ? (
                                            <div className="space-y-2">
                                                <Label htmlFor="intro_video">
                                                    Video URL
                                                </Label>
                                                <div className="relative">
                                                    <Youtube className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        id="intro_video"
                                                        className="pl-9"
                                                        placeholder="https://www.youtube.com/watch?v=… or direct .mp4 URL"
                                                        value={data.intro_video}
                                                        onChange={(e) =>
                                                            setData(
                                                                'intro_video',
                                                                e.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Supports YouTube, youtu.be,
                                                    and direct video file URLs.
                                                </p>
                                                {errors.intro_video && (
                                                    <p className="text-sm text-red-600">
                                                        {errors.intro_video}
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                <Label>Upload Video File</Label>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                                                    className="hidden"
                                                    onChange={handleFileChange}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        fileInputRef.current?.click()
                                                    }
                                                    className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50 py-8 text-center transition hover:border-violet-400 hover:bg-violet-50"
                                                >
                                                    <Upload className="h-7 w-7 text-muted-foreground" />
                                                    <span className="text-sm font-medium text-muted-foreground">
                                                        {data.intro_video_file
                                                            ? data
                                                                  .intro_video_file
                                                                  .name
                                                            : 'Click to choose a video file'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        MP4, WebM, OGG, MOV ·
                                                        max 500 MB
                                                    </span>
                                                </button>
                                                {errors.intro_video_file && (
                                                    <p className="text-sm text-red-600">
                                                        {
                                                            errors.intro_video_file
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Preview */}
                                        {videoMode === 'url' &&
                                            data.intro_video &&
                                            (() => {
                                                const ytMatch =
                                                    data.intro_video.match(
                                                        /(?:youtu\.be\/|watch\?v=|embed\/)([^&\n?#]+)/,
                                                    );
                                                const ytId = ytMatch
                                                    ? ytMatch[1]
                                                    : null;
                                                return ytId ? (
                                                    <div
                                                        className="relative overflow-hidden rounded-lg border border-border"
                                                        style={{
                                                            paddingTop:
                                                                '56.25%',
                                                        }}
                                                    >
                                                        <iframe
                                                            className="absolute inset-0 h-full w-full"
                                                            src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                                                            title="Intro preview"
                                                            allowFullScreen
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="overflow-hidden rounded-lg border border-border bg-black">
                                                        <video
                                                            src={
                                                                data.intro_video
                                                            }
                                                            controls
                                                            className="max-h-48 w-full"
                                                        />
                                                    </div>
                                                );
                                            })()}
                                        {videoMode === 'upload' &&
                                            filePreview && (
                                                <div className="overflow-hidden rounded-lg border border-border bg-black">
                                                    <video
                                                        src={filePreview}
                                                        controls
                                                        className="max-h-56 w-full"
                                                    />
                                                </div>
                                            )}
                                        {videoMode === 'url' &&
                                            !data.intro_video && (
                                                <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/50 py-10 text-center">
                                                    <PlayCircle className="h-8 w-8 text-muted-foreground/60" />
                                                    <p className="text-xs text-muted-foreground">
                                                        No intro video — paste a
                                                        link above to preview.
                                                    </p>
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
                                            Determines which teacher's My Class
                                            this course appears under.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>
                                                Assign Teachers{' '}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </Label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setTeacherDropdownOpen(
                                                            (o) => !o,
                                                        )
                                                    }
                                                    className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:outline-none"
                                                >
                                                    <span
                                                        className={
                                                            data.teacher_ids
                                                                .length === 0
                                                                ? 'text-muted-foreground'
                                                                : ''
                                                        }
                                                    >
                                                        {data.teacher_ids
                                                            .length === 0
                                                            ? 'Select teachers…'
                                                            : `${data.teacher_ids.length} teacher${data.teacher_ids.length > 1 ? 's' : ''} selected`}
                                                    </span>
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                </button>
                                                {teacherDropdownOpen && (
                                                    <div className="absolute z-50 mt-1 w-full rounded-md border border-input bg-popover shadow-md">
                                                        <div className="max-h-48 overflow-y-auto p-1">
                                                            {teachers.map(
                                                                (t) => (
                                                                    <label
                                                                        key={
                                                                            t.id
                                                                        }
                                                                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                                                                    >
                                                                        <Checkbox
                                                                            checked={data.teacher_ids.includes(
                                                                                t.id,
                                                                            )}
                                                                            onCheckedChange={() =>
                                                                                toggleTeacher(
                                                                                    t.id,
                                                                                )
                                                                            }
                                                                        />
                                                                        {t.name}
                                                                    </label>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {data.teacher_ids.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {data.teacher_ids.map(
                                                        (id) => {
                                                            const t =
                                                                teachers.find(
                                                                    (t) =>
                                                                        t.id ===
                                                                        id,
                                                                );
                                                            return t ? (
                                                                <span
                                                                    key={id}
                                                                    className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
                                                                >
                                                                    {t.name}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            toggleTeacher(
                                                                                id,
                                                                            )
                                                                        }
                                                                    >
                                                                        <X className="h-3 w-3" />
                                                                    </button>
                                                                </span>
                                                            ) : null;
                                                        },
                                                    )}
                                                </div>
                                            )}
                                            <p className="text-xs text-muted-foreground">
                                                Selected teachers will see the
                                                course in My Class → Manage
                                                Course.
                                            </p>
                                            {errors.teacher_ids && (
                                                <p className="text-sm text-red-600">
                                                    {errors.teacher_ids}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label>
                                                Level{' '}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </Label>
                                            <Select
                                                value={data.level}
                                                onValueChange={(v) =>
                                                    setData(
                                                        'level',
                                                        v as typeof data.level,
                                                    )
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(
                                                        [
                                                            'Beginner',
                                                            'Intermediate',
                                                            'Advanced',
                                                        ] as const
                                                    ).map((l) => (
                                                        <SelectItem
                                                            key={l}
                                                            value={l}
                                                        >
                                                            {l}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">
                                                Groups courses in the teacher's
                                                My Class by level.
                                            </p>
                                            {errors.level && (
                                                <p className="text-sm text-red-600">
                                                    {errors.level}
                                                </p>
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
                                            <Label>
                                                Status{' '}
                                                <span className="text-red-500">
                                                    *
                                                </span>
                                            </Label>
                                            <Select
                                                value={data.status}
                                                onValueChange={(v) =>
                                                    setData(
                                                        'status',
                                                        v as typeof data.status,
                                                    )
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="draft">
                                                        <span className="flex items-center gap-2">
                                                            <span className="inline-block h-2 w-2 rounded-full bg-yellow-400" />
                                                            Draft
                                                        </span>
                                                    </SelectItem>
                                                    <SelectItem value="published">
                                                        <span className="flex items-center gap-2">
                                                            <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                                                            Published
                                                        </span>
                                                    </SelectItem>
                                                    <SelectItem value="archived">
                                                        <span className="flex items-center gap-2">
                                                            <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/40" />
                                                            Archived
                                                        </span>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">
                                                Only <strong>Published</strong>{' '}
                                                courses are visible to students.
                                            </p>
                                            {errors.status && (
                                                <p className="text-sm text-red-600">
                                                    {errors.status}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="max_students">
                                                Max Students
                                            </Label>
                                            <Input
                                                id="max_students"
                                                type="number"
                                                placeholder="Leave empty for unlimited"
                                                value={data.max_students}
                                                onChange={(e) =>
                                                    setData(
                                                        'max_students',
                                                        e.target.value,
                                                    )
                                                }
                                                min={1}
                                            />
                                            {errors.max_students && (
                                                <p className="text-sm text-red-600">
                                                    {errors.max_students}
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="flex flex-col gap-3">
                                    <Button
                                        type="submit"
                                        className="w-full bg-green-700 text-white hover:bg-green-800"
                                        disabled={processing}
                                    >
                                        {processing
                                            ? 'Saving…'
                                            : 'Save Changes'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        asChild
                                    >
                                        <Link href="/courses">Cancel</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
