import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    Clock,
    Edit,
    Play,
    Star,
    Users,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Courses',
        href: '/courses',
    },
    {
        title: 'Course Details',
        href: '#',
    },
];

// TODO: Replace with real data from API
const course = null;

export default function CourseShow() {
    const { auth, courseId } = usePage<SharedData & { courseId: number }>()
        .props;
    const user = auth.user;

    const canEditCourse = user.role === 'admin' || user.role === 'teacher';
    const canEnrollCourse = user.role === 'student';

    const handleBack = () => {
        router.visit('/courses');
    };

    const handleEdit = () => {
        router.visit(`/courses/${courseId}/edit`);
    };

    const handleEnroll = () => {
        if (confirm('Are you sure you want to enroll in this course?')) {
            alert(
                'Successfully enrolled in the course! (This is a demo - no actual enrollment occurred)',
            );
        }
    };

    const handleStartLesson = (moduleId: number) => {
        alert(`Starting lesson for module ${moduleId} (This is a demo)`);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
            case 'draft':
                return 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700';
            case 'archived':
                return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700';
        }
    };

    if (!course) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Course Not Found" />
                <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 flex flex-1 flex-col gap-6 py-8">
                    <div className="flex h-64 items-center justify-center">
                        <div className="text-center">
                            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                            <h3 className="mb-2 text-lg font-semibold">
                                Course Not Found
                            </h3>
                            <p className="mb-4 text-muted-foreground">
                                The course you're looking for doesn't exist.
                            </p>
                            <Button
                                onClick={handleBack}
                                className="bg-green-700 hover:bg-green-800"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Courses
                            </Button>
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${course.title} - Course Details`} />
            <div className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 flex flex-1 flex-col gap-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleBack}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Courses
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                {course.title}
                            </h1>
                            <p className="mt-1 text-muted-foreground">
                                by {(course as any).teachers?.[0]?.name ?? 'No instructor'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(course.status)}>
                            {course.status}
                        </Badge>
                        {canEditCourse && (
                            <Button
                                onClick={handleEdit}
                                className="bg-green-700 hover:bg-green-800"
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Course
                            </Button>
                        )}
                        {canEnrollCourse && (
                            <Button
                                onClick={handleEnroll}
                                className="bg-green-700 hover:bg-green-800"
                            >
                                Enroll Now
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Content */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Course Overview */}
                        <Card className="border-2 transition-all duration-300 hover:border-green-600 hover:shadow-lg dark:hover:border-green-400">
                            <CardHeader>
                                <CardTitle className="text-foreground">
                                    Course Overview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-muted-foreground">
                                    {course.description}
                                </p>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <h4 className="font-medium">
                                            Learning Objectives
                                        </h4>
                                        <ul className="space-y-1 text-sm text-muted-foreground">
                                            {course.learningObjectives?.map(
                                                (objective, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex items-start space-x-2"
                                                    >
                                                        <Star className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />
                                                        <span>{objective}</span>
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium">
                                            Prerequisites
                                        </h4>
                                        <ul className="space-y-1 text-sm text-muted-foreground">
                                            {course.prerequisites?.map(
                                                (prerequisite, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex items-start space-x-2"
                                                    >
                                                        <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-500" />
                                                        <span>
                                                            {prerequisite}
                                                        </span>
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Course Modules */}
                        <Card className="border-2 transition-all duration-300 hover:border-green-600 hover:shadow-lg dark:hover:border-green-400">
                            <CardHeader>
                                <CardTitle className="text-foreground">
                                    Course Modules
                                </CardTitle>
                                <CardDescription>
                                    Complete all modules to finish the course
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {course.modules?.map((module) => (
                                        <div
                                            key={module.id}
                                            className="flex items-center justify-between rounded-lg border p-4"
                                        >
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center space-x-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
                                                        <BookOpen className="h-5 w-5 text-green-700 dark:text-green-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-foreground">
                                                            {module.title}
                                                        </h3>
                                                        <p className="text-sm text-muted-foreground">
                                                            {module.description}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="ml-13 space-y-2">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span>Progress</span>
                                                        <span>
                                                            {module.progress}%
                                                        </span>
                                                    </div>
                                                    <Progress
                                                        value={module.progress}
                                                        className="w-full"
                                                    />

                                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                        <span>
                                                            {module.lessons}{' '}
                                                            lessons
                                                        </span>
                                                        <span>
                                                            {module.duration}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="ml-4">
                                                <Button
                                                    className={
                                                        module.progress > 0
                                                            ? 'bg-green-700 hover:bg-green-800'
                                                            : 'border-green-700 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20'
                                                    }
                                                    variant={
                                                        module.progress > 0
                                                            ? 'default'
                                                            : 'outline'
                                                    }
                                                    onClick={() =>
                                                        handleStartLesson(
                                                            module.id,
                                                        )
                                                    }
                                                >
                                                    <Play className="mr-2 h-4 w-4" />
                                                    {module.progress > 0
                                                        ? 'Continue'
                                                        : 'Start'}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Course Stats */}
                        <Card className="border-2 transition-all duration-300 hover:border-green-600 hover:shadow-lg dark:hover:border-green-400">
                            <CardHeader>
                                <CardTitle className="text-foreground">
                                    Course Statistics
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            Students
                                        </span>
                                    </div>
                                    <span className="font-medium text-green-700 dark:text-green-400">
                                        {course.enrolledStudents}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">Lessons</span>
                                    </div>
                                    <span className="font-medium text-green-700 dark:text-green-400">
                                        {course.totalLessons}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">
                                            Duration
                                        </span>
                                    </div>
                                    <span className="font-medium text-green-700 dark:text-green-400">
                                        {course.duration}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Star className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">Rating</span>
                                    </div>
                                    <span className="font-medium text-green-700 dark:text-green-400">
                                        {course.rating}/5
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Course Info */}
                        <Card className="border-2 transition-all duration-300 hover:border-green-600 hover:shadow-lg dark:hover:border-green-400">
                            <CardHeader>
                                <CardTitle className="text-foreground">
                                    Course Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Category
                                    </span>
                                    <Badge variant="outline">
                                        {course.category}
                                    </Badge>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Created
                                    </span>
                                    <span className="text-sm">
                                        {new Date(
                                            course.createdAt,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">
                                        Last Updated
                                    </span>
                                    <span className="text-sm">
                                        {new Date(
                                            course.updatedAt,
                                        ).toLocaleDateString()}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
