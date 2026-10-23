import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import AppLayout from '@/layouts/app-layout';
import { apiFetch } from '@/lib/api-fetch';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { BookOpen, Calendar, Clock, Loader2, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Classes',
        href: '/classes',
    },
];

interface APIStudent {
    id: number;
    rid: string | null;
    firstname: string;
    middlename: string | null;
    lastname: string;
    fullname: string;
    email: string;
    profile_pic: string | null;
    course_id: number | null;
    course_code: string | null;
    coursedesc: string | null;
    yearlevel: string | null;
    section_id: number | null;
    section_name: string | null;
    sydesc: string | null;
    semesterdesc: string | null;
    schedules?: Array<{
        subject_code?: string | null;
        subject_title?: string | null;
        room_code?: string | null;
        day?: string | null;
        time_slot?: string | null;
        time_slot_end?: string | null;
    }>;
}

interface Class {
    section_id: number | null;
    section_name: string;
    course_code: string | null;
    coursedesc: string | null;
    subject_code: string | null;
    subject_title: string | null;
    yearlevel: string | null;
    semesterdesc: string | null;
    sydesc: string | null;
    room_code: string | null;
    day: string | null;
    time_slot: string | null;
    time_slot_end: string | null;
    subjects_count: number;
}

interface PageProps extends SharedData {}

export default function ClassesIndex() {
    const { auth, apiServerUrl } = usePage<PageProps>().props;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allClasses, setAllClasses] = useState<Class[]>([]);
    const [allStudentsData, setAllStudentsData] = useState<APIStudent[]>([]); // Store all students data
    const [filters, setFilters] = useState({
        sy: '',
        semester: '',
        yearlevel: '',
    });

    // Fetch classes from API
    const fetchClasses = useCallback(async () => {
        setLoading(true);
        setError(null);
        setAllClasses([]);

        const ssoToken = auth.user?.sso_token;
        if (!ssoToken) {
            setError('No SSO token found. Please log in with AIMS.');
            setLoading(false);
            return;
        }

        if (!apiServerUrl) {
            setError('API server URL is not configured.');
            setLoading(false);
            return;
        }

        try {
            // Use the same students endpoint and transform data into classes
            const apiUrl = `${apiServerUrl}/api/hive/get-students`;
            const responseData = await apiFetch(apiUrl, ssoToken);

            // Extract students array from response
            let studentsArray: APIStudent[] = [];

            if (Array.isArray(responseData)) {
                studentsArray = responseData;
            } else if (
                responseData &&
                typeof responseData === 'object' &&
                'data' in responseData &&
                Array.isArray(responseData.data)
            ) {
                studentsArray = responseData.data;
            } else if (
                responseData &&
                typeof responseData === 'object' &&
                'students' in responseData &&
                Array.isArray(responseData.students)
            ) {
                studentsArray = responseData.students;
            } else if (
                responseData &&
                typeof responseData === 'object' &&
                'result' in responseData &&
                Array.isArray(responseData.result)
            ) {
                studentsArray = responseData.result;
            }

            // Transform students data into classes
            // Create a class for each unique section + subject combination
            const classesMap = new Map<string, Class>();

            studentsArray.forEach((student) => {
                const sectionName = student.section_name || 'Unassigned';
                const sectionId = student.section_id;

                // Handle schedules - can be array or object
                let schedulesArray: any[] = [];

                if (student.schedules) {
                    if (Array.isArray(student.schedules)) {
                        // Already an array
                        schedulesArray = student.schedules;
                    } else if (typeof student.schedules === 'object') {
                        // Convert object to array (e.g., {"1": {...}, "2": {...}})
                        schedulesArray = Object.values(student.schedules);
                    }
                }

                // If student has schedules, create a class for each subject
                if (schedulesArray.length > 0) {
                    schedulesArray.forEach((schedule: any) => {
                        const subjectCode = schedule?.subject_code || null;
                        const subjectTitle = schedule?.subject_title || null;
                        const roomCode = schedule?.room_code || null;

                        // Handle day - can be array or string
                        let dayString: string | null = null;
                        if (schedule?.day) {
                            if (Array.isArray(schedule.day)) {
                                dayString = schedule.day.join(', ');
                            } else {
                                dayString = schedule.day;
                            }
                        }

                        const timeSlot = schedule?.time_slot || null;
                        const timeSlotEnd = schedule?.time_slot_end || null;

                        // Create unique key: section + subject combination
                        const classKey = sectionId
                            ? `${sectionId}-${sectionName}-${subjectCode || schedule?.subject_id || 'no-subject'}`
                            : `unassigned-${sectionName}-${subjectCode || schedule?.subject_id || 'no-subject'}`;

                        if (!classesMap.has(classKey)) {
                            classesMap.set(classKey, {
                                section_id: sectionId,
                                section_name: sectionName,
                                course_code: student.course_code,
                                coursedesc: student.coursedesc,
                                subject_code: subjectCode,
                                subject_title: subjectTitle,
                                yearlevel: student.yearlevel,
                                semesterdesc: student.semesterdesc,
                                sydesc: student.sydesc,
                                room_code: roomCode,
                                day: dayString,
                                time_slot: timeSlot,
                                time_slot_end: timeSlotEnd,
                                subjects_count: 1, // Each class represents one subject
                            });
                        }
                    });
                } else {
                    // If no schedules, create one class per section
                    const sectionKey = sectionId
                        ? `${sectionId}-${sectionName}`
                        : `unassigned-${sectionName}`;

                    if (!classesMap.has(sectionKey)) {
                        classesMap.set(sectionKey, {
                            section_id: sectionId,
                            section_name: sectionName,
                            course_code: student.course_code,
                            coursedesc: student.coursedesc,
                            subject_code: null,
                            subject_title: null,
                            yearlevel: student.yearlevel,
                            semesterdesc: student.semesterdesc,
                            sydesc: student.sydesc,
                            room_code: null,
                            day: null,
                            time_slot: null,
                            time_slot_end: null,
                            subjects_count: 0,
                        });
                    }
                }
            });

            const classesArray = Array.from(classesMap.values());
            setAllClasses(classesArray);
            // Store all students data for passing to detail page
            setAllStudentsData(studentsArray);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to fetch classes';
            setError(errorMessage);
            setAllClasses([]);
        } finally {
            setLoading(false);
        }
    }, [auth.user?.sso_token, apiServerUrl]);

    // Fetch classes on mount
    useEffect(() => {
        fetchClasses();
    }, [fetchClasses]);

    // Filter classes
    const filteredClasses = useMemo(() => {
        if (!Array.isArray(allClasses)) return [];

        let filtered = allClasses;

        // Apply filters
        if (filters.sy && filters.sy.trim() !== '') {
            filtered = filtered.filter(
                (classItem) => classItem.sydesc === filters.sy,
            );
        }
        if (filters.semester && filters.semester.trim() !== '') {
            filtered = filtered.filter(
                (classItem) => classItem.semesterdesc === filters.semester,
            );
        }
        if (filters.yearlevel && filters.yearlevel.trim() !== '') {
            filtered = filtered.filter(
                (classItem) => classItem.yearlevel === filters.yearlevel,
            );
        }

        return filtered;
    }, [allClasses, filters]);

    // Extract available filter options
    const availableSchoolYears = useMemo(() => {
        if (!Array.isArray(allClasses)) return [];

        const years = new Set<string>();
        allClasses.forEach((classItem) => {
            if (classItem.sydesc && classItem.sydesc.trim() !== '') {
                years.add(classItem.sydesc);
            }
        });
        return Array.from(years).sort().reverse();
    }, [allClasses]);

    const availableSemesters = useMemo(() => {
        if (!Array.isArray(allClasses)) return [];

        const semesters = new Set<string>();
        allClasses.forEach((classItem) => {
            if (
                classItem.semesterdesc &&
                classItem.semesterdesc.trim() !== ''
            ) {
                semesters.add(classItem.semesterdesc);
            }
        });
        return Array.from(semesters).sort();
    }, [allClasses]);

    const availableYearLevels = useMemo(() => {
        if (!Array.isArray(allClasses)) return [];

        const levels = new Set<string>();
        allClasses.forEach((classItem) => {
            if (classItem.yearlevel && classItem.yearlevel.trim() !== '') {
                levels.add(classItem.yearlevel);
            }
        });
        return Array.from(levels).sort();
    }, [allClasses]);

    const handleFilterChange = (
        filterType: 'sy' | 'semester' | 'yearlevel',
        value: string,
    ) => {
        setFilters((prev) => ({
            ...prev,
            [filterType]: value === 'all' ? '' : value,
        }));
    };

    const clearFilters = () => {
        setFilters({
            sy: '',
            semester: '',
            yearlevel: '',
        });
    };

    const retryFetch = () => {
        fetchClasses();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Classes" />
            <div className="min-h-full pb-10">
                {/* Header */}
                <PageHeader title="Classes" description="Pick a class to manage students, attendance, assignments and more." />

                <div className="mx-auto w-full max-w-[1600px] space-y-8 px-5 py-8 sm:px-8">
                    {/* Filters */}
                    {!loading && !error && allClasses.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {availableSchoolYears.length > 0 && (
                                <Select
                                    value={
                                        filters.sy && filters.sy.trim() !== ''
                                            ? filters.sy
                                            : 'all'
                                    }
                                    onValueChange={(value) =>
                                        handleFilterChange('sy', value)
                                    }
                                >
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="School Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All School Years
                                        </SelectItem>
                                        {availableSchoolYears.map((sy) => (
                                            <SelectItem key={sy} value={sy}>
                                                {sy}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {availableSemesters.length > 0 && (
                                <Select
                                    value={
                                        filters.semester &&
                                        filters.semester.trim() !== ''
                                            ? filters.semester
                                            : 'all'
                                    }
                                    onValueChange={(value) =>
                                        handleFilterChange('semester', value)
                                    }
                                >
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Semester" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Semesters
                                        </SelectItem>
                                        {availableSemesters.map((semester) => (
                                            <SelectItem
                                                key={semester}
                                                value={semester}
                                            >
                                                {semester}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                            {availableYearLevels.length > 0 && (
                                <Select
                                    value={
                                        filters.yearlevel &&
                                        filters.yearlevel.trim() !== ''
                                            ? filters.yearlevel
                                            : 'all'
                                    }
                                    onValueChange={(value) =>
                                        handleFilterChange('yearlevel', value)
                                    }
                                >
                                    <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Year Level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All Year Levels
                                        </SelectItem>
                                        {availableYearLevels.map(
                                            (yearlevel) => (
                                                <SelectItem
                                                    key={yearlevel}
                                                    value={yearlevel}
                                                >
                                                    {yearlevel}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                            {(filters.sy ||
                                filters.semester ||
                                filters.yearlevel) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Clear
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 py-12 dark:border-gray-800">
                            <Loader2 className="h-7 w-7 animate-spin text-gray-300 dark:text-gray-600" />
                            <span className="mt-3 text-sm text-gray-400">
                                Loading classes...
                            </span>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && !loading && (
                        <div className="flex flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 py-10 text-center dark:border-red-800 dark:bg-red-900/10">
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                {error}
                            </p>
                            <Button
                                variant="outline"
                                onClick={retryFetch}
                                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                            >
                                <Loader2 className="mr-2 h-4 w-4" />
                                Try Again
                            </Button>
                        </div>
                    )}

                    {/* Classes Grid */}
                    {!loading && !error && filteredClasses.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredClasses.map((classItem) => (
                                <div
                                    key={`${classItem.section_id}-${classItem.section_name}-${classItem.subject_code || classItem.subject_title || 'no-subject'}`}
                                    className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                                >
                                    <div className="mb-4 flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-foreground">
                                                {classItem.subject_title}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {classItem.coursedesc || 'N/A'}
                                            </p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="shrink-0 text-xs"
                                        >
                                            {classItem.subject_code ||
                                                'Subject'}
                                        </Badge>
                                    </div>
                                    <div className="mb-4 space-y-1.5">
                                        {classItem.section_name && (
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Users className="h-3.5 w-3.5" />
                                                {classItem.section_name}
                                            </div>
                                        )}
                                        {classItem.semesterdesc && (
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {classItem.semesterdesc}
                                                {classItem.sydesc
                                                    ? ` (${classItem.sydesc})`
                                                    : ''}
                                            </div>
                                        )}
                                        {classItem.day &&
                                            classItem.time_slot && (
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {classItem.day} •{' '}
                                                    {classItem.time_slot}
                                                    {classItem.time_slot_end
                                                        ? ` - ${classItem.time_slot_end}`
                                                        : ''}
                                                </div>
                                            )}
                                    </div>
                                    <Button
                                        className="mt-auto w-full bg-violet-900 hover:bg-violet-800"
                                        onClick={() => {
                                            if (allStudentsData.length > 0) {
                                                sessionStorage.setItem(
                                                    'classes_students_data',
                                                    JSON.stringify(
                                                        allStudentsData,
                                                    ),
                                                );
                                            }
                                            router.visit(
                                                `/classes/${encodeURIComponent(classItem.section_name)}`,
                                            );
                                        }}
                                    >
                                        <BookOpen className="mr-2 h-4 w-4" />
                                        Open Class
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : !loading && !error && allClasses.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-100 py-12 text-center dark:border-gray-800">
                            <BookOpen className="h-8 w-8 text-gray-200 dark:text-gray-700" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    No classes found
                                </p>
                                <p className="mt-0.5 text-xs text-gray-400">
                                    You don't have any assigned classes yet.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={retryFetch}
                            >
                                <Loader2 className="mr-2 h-4 w-4" />
                                Refresh
                            </Button>
                        </div>
                    ) : !loading &&
                      !error &&
                      allClasses.length > 0 &&
                      filteredClasses.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-100 py-12 text-center dark:border-gray-800">
                            <BookOpen className="h-8 w-8 text-gray-200 dark:text-gray-700" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    No matching classes
                                </p>
                                <p className="mt-0.5 text-xs text-gray-400">
                                    No classes match the selected filters.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Clear Filters
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>
        </AppLayout>
    );
}
