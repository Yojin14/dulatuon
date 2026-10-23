import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    Download,
    Edit,
    FileText,
    Filter,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
    Users,
    XCircle,
    FolderOpen,
    Laptop,
    HelpCircle,
    PenLine,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Assignments',
        href: '/assignments',
    },
];

// Mock data for assignments
const mockAssignments = [
    {
        id: 1,
        title: 'JavaScript Project',
        description:
            'Create a todo application using vanilla JavaScript with local storage functionality.',
        course: 'Web Development Basics',
        instructor: 'Dr. Sarah Johnson',
        dueDate: '2024-01-20T23:59:00Z',
        points: 100,
        type: 'project',
        status: 'published',
        submissionsCount: 18,
        totalStudents: 24,
        isSubmitted: false,
        grade: null,
        feedback: null,
    },
    {
        id: 2,
        title: 'React Hooks Assignment',
        description:
            'Implement useState and useEffect hooks in a React component.',
        course: 'Advanced React',
        instructor: 'Prof. Mike Chen',
        dueDate: '2024-01-18T14:00:00Z',
        points: 50,
        type: 'coding',
        status: 'published',
        submissionsCount: 12,
        totalStudents: 18,
        isSubmitted: true,
        grade: 95,
        feedback:
            'Excellent work! Your implementation of useEffect is particularly well done.',
    },
    {
        id: 3,
        title: 'Database Design Report',
        description:
            'Design a normalized database schema for an e-commerce platform.',
        course: 'Database Design',
        instructor: 'Dr. Emily Rodriguez',
        dueDate: '2024-01-25T11:59:00Z',
        points: 75,
        type: 'report',
        status: 'draft',
        submissionsCount: 0,
        totalStudents: 12,
        isSubmitted: false,
        grade: null,
        feedback: null,
    },
];

export default function AssignmentsIndex() {
    const { auth } = usePage<SharedData>().props;
    const user = auth.user;

    const canCreateAssignment =
        user.role === 'admin' || user.role === 'teacher';
    const canEditAssignment = user.role === 'admin' || user.role === 'teacher';

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
            case 'draft':
                return 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700';
            case 'archived':
                return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'project':
                return FolderOpen;
            case 'coding':
                return Laptop;
            case 'report':
                return FileText;
            case 'quiz':
                return HelpCircle;
            default:
                return PenLine;
        }
    };

    const getSubmissionStatus = (assignment: any) => {
        if (!assignment.isSubmitted) {
            const dueDate = new Date(assignment.dueDate);
            const now = new Date();
            if (now > dueDate) {
                return {
                    status: 'overdue',
                    color: 'text-red-600',
                    icon: XCircle,
                };
            } else {
                const hoursLeft = Math.floor(
                    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60),
                );
                if (hoursLeft < 24) {
                    return {
                        status: 'due-soon',
                        color: 'text-yellow-600',
                        icon: AlertCircle,
                    };
                } else {
                    return {
                        status: 'pending',
                        color: 'text-violet-600',
                        icon: Clock,
                    };
                }
            }
        } else {
            return {
                status: 'submitted',
                color: 'text-green-600',
                icon: CheckCircle,
            };
        }
    };

    const formatDueDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor(
            (date.getTime() - now.getTime()) / (1000 * 60 * 60),
        );

        if (diffInHours < 0) return 'Overdue';
        if (diffInHours < 24) return `Due in ${diffInHours}h`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `Due in ${diffInDays}d`;
        return date.toLocaleDateString();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Assignments" />
            <div className="min-h-full pb-10">

                {/* Header */}
                <PageHeader
                    title={user.role === 'student' ? 'My assignments' : 'Assignments'}
                    description={user.role === 'student' ? 'Track your submissions and grades.' : 'Manage course assignments and review submissions.'}
                />

                <div className="mx-auto w-full max-w-[1600px] space-y-8 px-5 py-8 sm:px-8">

                {/* Toolbar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:max-w-sm sm:flex-1">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                        <Input
                            placeholder="Search assignments..."
                            className="pl-10"
                        />
                    </div>
                    <div className="flex items-center gap-3 sm:ml-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-green-700 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20"
                        >
                            <Filter className="mr-2 h-4 w-4" />
                            Filters
                        </Button>
                        {canCreateAssignment && (
                            <Button size="sm" className="bg-violet-900 hover:bg-violet-800">
                                <Plus className="mr-2 h-4 w-4" />
                                Create Assignment
                            </Button>
                        )}
                    </div>
                </div>

                {/* Assignments Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {mockAssignments.map((assignment) => {
                        const submissionStatus =
                            getSubmissionStatus(assignment);
                        const StatusIcon = submissionStatus.icon;

                        return (
                            <Card
                                key={assignment.id}
                                className="group cursor-pointer border-2 transition-all duration-300 hover:border-green-600 hover:shadow-lg dark:hover:border-green-400"
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center space-x-3">
                                            {(() => {
                                                const TypeIcon = getTypeIcon(assignment.type);
                                                return (
                                                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                                                        <TypeIcon className="size-5" />
                                                    </span>
                                                );
                                            })()}
                                            <div>
                                                <CardTitle className="text-lg">
                                                    {assignment.title}
                                                </CardTitle>
                                                <p className="text-sm text-muted-foreground">
                                                    {assignment.instructor}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Badge
                                                className={getStatusColor(
                                                    assignment.status,
                                                )}
                                            >
                                                {assignment.status}
                                            </Badge>
                                            {canEditAssignment && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit Assignment
                                                        </DropdownMenuItem>
                                                        {user.role ===
                                                            'teacher' && (
                                                            <DropdownMenuItem>
                                                                <Download className="mr-2 h-4 w-4" />
                                                                Download
                                                                Submissions
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canEditAssignment && (
                                                            <DropdownMenuItem className="text-red-600">
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete
                                                                Assignment
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <CardDescription className="line-clamp-2">
                                        {assignment.description}
                                    </CardDescription>

                                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-1">
                                                <Calendar className="h-4 w-4" />
                                                <span>
                                                    {formatDueDate(
                                                        assignment.dueDate,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <FileText className="h-4 w-4" />
                                                <span>
                                                    {assignment.points} pts
                                                </span>
                                            </div>
                                        </div>
                                        {user.role === 'teacher' && (
                                            <div className="flex items-center space-x-1">
                                                <Users className="h-4 w-4" />
                                                <span>
                                                    {
                                                        assignment.submissionsCount
                                                    }
                                                    /{assignment.totalStudents}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <Badge
                                            variant="outline"
                                            className="text-xs"
                                        >
                                            {assignment.course}
                                        </Badge>
                                        <div
                                            className={`flex items-center space-x-1 text-sm ${submissionStatus.color}`}
                                        >
                                            <StatusIcon className="h-4 w-4" />
                                            <span className="capitalize">
                                                {submissionStatus.status.replace(
                                                    '-',
                                                    ' ',
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {user.role === 'student' &&
                                        assignment.isSubmitted &&
                                        assignment.grade && (
                                            <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-sm font-medium">
                                                        Grade:{' '}
                                                        {assignment.grade}/100
                                                    </span>
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        Submitted
                                                    </Badge>
                                                </div>
                                                {assignment.feedback && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {assignment.feedback}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                    <div className="pt-2">
                                        <Button
                                            className={`w-full ${
                                                assignment.status ===
                                                'published'
                                                    ? 'bg-green-700 hover:bg-green-800 text-white'
                                                    : 'border-green-700 text-green-700 hover:bg-green-50 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/20'
                                            }`}
                                            variant={
                                                assignment.status ===
                                                'published'
                                                    ? 'default'
                                                    : 'outline'
                                            }
                                            disabled={
                                                assignment.status !==
                                                'published'
                                            }
                                        >
                                            {user.role === 'student'
                                                ? assignment.isSubmitted
                                                    ? 'View Submission'
                                                    : 'Submit Assignment'
                                                : 'View Submissions'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Empty State */}
                {mockAssignments.length === 0 && (
                    <Card className="py-12 text-center">
                        <CardContent>
                            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                            <h3 className="mb-2 text-lg font-semibold">
                                No assignments found
                            </h3>
                            <p className="mb-4 text-muted-foreground">
                                {canCreateAssignment
                                    ? 'Get started by creating your first assignment.'
                                    : 'No assignments are available at the moment.'}
                            </p>
                            {canCreateAssignment && (
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Your First Assignment
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

                </div>
            </div>
        </AppLayout>
    );
}
