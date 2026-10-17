import { PORTAL_GRADIENT } from '@/components/dashboards/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useDebounce } from '@/hooks/use-debounce';
import { useInitials } from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import { apiFetch } from '@/lib/api-fetch';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Filter, Loader2, Search, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Students',
        href: '/students',
    },
];

interface Student {
    id: number;
    rid: string | null;
    firstname: string;
    middlename: string | null;
    lastname: string;
    email: string;
    profile_pic: string | null;
    full_name: string;
    course_code: string | null;
    coursedesc: string | null;
    yearlevel: string | null;
}

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
    schedules?: unknown[];
}

interface APIResponse {
    error?: string;
    message?: string;
    data?: APIStudent[];
}

interface PageProps extends SharedData {}

export default function StudentsIndex() {
    const getInitials = useInitials();
    const { auth, apiServerUrl } = usePage<PageProps>().props;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        sy: '',
        semester: '',
        course: '',
        yearlevel: '',
        section: '',
    });
    const [allStudents, setAllStudents] = useState<APIStudent[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery);
    const [itemsPerPage, setItemsPerPage] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);

    // Simple function to fetch students
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError(null);
        setAllStudents([]);

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
            const apiUrl = `${apiServerUrl}/api/hive/get-students`;
            const responseData = await apiFetch(apiUrl, ssoToken);

            // Extract data array from response
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

            setAllStudents(studentsArray);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : 'Failed to fetch students';
            setError(errorMessage);
            setAllStudents([]);
        } finally {
            setLoading(false);
        }
    }, [auth.user?.sso_token, apiServerUrl]);

    // Fetch students on mount
    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    // Filter and search students
    const filteredStudents = useMemo(() => {
        if (!Array.isArray(allStudents)) return [];

        let filtered = allStudents;

        // Apply filters
        if (filters.sy && filters.sy.trim() !== '') {
            filtered = filtered.filter(
                (student) => student.sydesc === filters.sy,
            );
        }
        if (filters.semester && filters.semester.trim() !== '') {
            filtered = filtered.filter(
                (student) => student.semesterdesc === filters.semester,
            );
        }
        if (filters.course && filters.course.trim() !== '') {
            filtered = filtered.filter(
                (student) => student.course_code === filters.course,
            );
        }
        if (filters.yearlevel && filters.yearlevel.trim() !== '') {
            filtered = filtered.filter(
                (student) => student.yearlevel === filters.yearlevel,
            );
        }
        if (filters.section && filters.section.trim() !== '') {
            filtered = filtered.filter(
                (student) => student.section_name === filters.section,
            );
        }

        // Apply search query
        if (debouncedSearch.trim() !== '') {
            const query = debouncedSearch.toLowerCase();
            filtered = filtered.filter(
                (student) =>
                    student.fullname?.toLowerCase().includes(query) ||
                    student.email?.toLowerCase().includes(query) ||
                    student.rid?.toLowerCase().includes(query) ||
                    student.course_code?.toLowerCase().includes(query) ||
                    student.section_name?.toLowerCase().includes(query),
            );
        }

        return filtered;
    }, [allStudents, filters, debouncedSearch]);

    // Pagination
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

    // Reset to first page when filters or search change
    useEffect(() => {
        setCurrentPage(1);
    }, [filters, debouncedSearch, itemsPerPage]);

    // Extract available filter options from all students
    const availableSchoolYears = useMemo(() => {
        if (!Array.isArray(allStudents)) return [];

        const years = new Set<string>();
        allStudents.forEach((student) => {
            if (student.sydesc && student.sydesc.trim() !== '') {
                years.add(student.sydesc);
            }
        });
        return Array.from(years).sort().reverse();
    }, [allStudents]);

    const availableSemesters = useMemo(() => {
        if (!Array.isArray(allStudents)) return [];

        const semesters = new Set<string>();
        allStudents.forEach((student) => {
            if (student.semesterdesc && student.semesterdesc.trim() !== '') {
                semesters.add(student.semesterdesc);
            }
        });
        return Array.from(semesters).sort();
    }, [allStudents]);

    const availableCourses = useMemo(() => {
        if (!Array.isArray(allStudents)) return [];

        const courses = new Set<string>();
        allStudents.forEach((student) => {
            if (student.course_code && student.course_code.trim() !== '') {
                courses.add(student.course_code);
            }
        });
        return Array.from(courses).sort();
    }, [allStudents]);

    const availableYearLevels = useMemo(() => {
        if (!Array.isArray(allStudents)) return [];

        const levels = new Set<string>();
        allStudents.forEach((student) => {
            if (student.yearlevel && student.yearlevel.trim() !== '') {
                levels.add(student.yearlevel);
            }
        });
        return Array.from(levels).sort();
    }, [allStudents]);

    const availableSections = useMemo(() => {
        if (!Array.isArray(allStudents)) return [];

        const sections = new Set<string>();
        allStudents.forEach((student) => {
            if (student.section_name && student.section_name.trim() !== '') {
                sections.add(student.section_name);
            }
        });
        return Array.from(sections).sort();
    }, [allStudents]);

    const handleFilterChange = (
        filterType: 'sy' | 'semester' | 'course' | 'yearlevel' | 'section',
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
            course: '',
            yearlevel: '',
            section: '',
        });
        setSearchQuery('');
    };

    const retryFetch = () => {
        fetchStudents();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Students" />
            <div className="min-h-full bg-white dark:bg-gray-950">

                {/* Header */}
                <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8" style={{ background: PORTAL_GRADIENT }}>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow-300/80">
                                Teacher Portal
                            </p>
                            <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
                                Students
                            </h1>
                            <p className="mt-1 text-sm text-blue-200/50">
                                {loading ? 'Loading...' : `${allStudents.length} students across your sections`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 py-12 dark:border-gray-800">
                        <Loader2 className="h-7 w-7 animate-spin text-gray-300 dark:text-gray-600" />
                        <span className="mt-3 text-sm text-gray-400">Loading students...</span>
                    </div>
                )}

                {/* Error */}
                {error && !loading && (
                    <div className="flex flex-col items-center gap-4 rounded-xl border border-red-200 bg-red-50 py-10 text-center dark:border-red-800 dark:bg-red-900/10">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
                        <Button variant="outline" onClick={retryFetch} className="border-red-300 text-red-600 hover:bg-red-50">
                            <Loader2 className="mr-2 h-4 w-4" /> Try Again
                        </Button>
                    </div>
                )}

                {/* Filters */}
                {!loading && !error && allStudents.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        {availableSchoolYears.length > 0 && (
                            <Select value={filters.sy && filters.sy.trim() !== '' ? filters.sy : 'all'} onValueChange={(v) => handleFilterChange('sy', v)}>
                                <SelectTrigger className="w-36"><SelectValue placeholder="School Year" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All School Years</SelectItem>
                                    {availableSchoolYears.map((sy) => <SelectItem key={sy} value={sy}>{sy}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        {availableSemesters.length > 0 && (
                            <Select value={filters.semester && filters.semester.trim() !== '' ? filters.semester : 'all'} onValueChange={(v) => handleFilterChange('semester', v)}>
                                <SelectTrigger className="w-36"><SelectValue placeholder="Semester" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Semesters</SelectItem>
                                    {availableSemesters.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        {availableCourses.length > 0 && (
                            <Select value={filters.course && filters.course.trim() !== '' ? filters.course : 'all'} onValueChange={(v) => handleFilterChange('course', v)}>
                                <SelectTrigger className="w-36"><SelectValue placeholder="Course" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Courses</SelectItem>
                                    {availableCourses.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        {availableYearLevels.length > 0 && (
                            <Select value={filters.yearlevel && filters.yearlevel.trim() !== '' ? filters.yearlevel : 'all'} onValueChange={(v) => handleFilterChange('yearlevel', v)}>
                                <SelectTrigger className="w-36"><SelectValue placeholder="Year Level" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Year Levels</SelectItem>
                                    {availableYearLevels.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        {availableSections.length > 0 && (
                            <Select value={filters.section && filters.section.trim() !== '' ? filters.section : 'all'} onValueChange={(v) => handleFilterChange('section', v)}>
                                <SelectTrigger className="w-36"><SelectValue placeholder="Section" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sections</SelectItem>
                                    {availableSections.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                        {(filters.sy || filters.semester || filters.course || filters.yearlevel || filters.section || searchQuery) && filteredStudents.length > 0 && (
                            <Button variant="ghost" size="sm" onClick={clearFilters}>
                                <X className="mr-2 h-4 w-4" /> Clear
                            </Button>
                        )}
                    </div>
                )}

                {/* Students Table */}
                {!loading && !error && allStudents.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative max-w-sm flex-1">
                                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Search students..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                                {searchQuery && (
                                    <button type="button" onClick={() => setSearchQuery('')} className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                                        <X className="h-4 w-4 text-gray-400" />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400">Show:</span>
                                <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {[5, 10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <span className="text-sm text-gray-400">entries</span>
                            </div>
                        </div>

                        {filteredStudents.length > 0 ? (
                            <>
                                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Student ID</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Section</TableHead>
                                                <TableHead>Course</TableHead>
                                                <TableHead>Year Level</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedStudents.map((student) => (
                                                <TableRow key={student.id}>
                                                    <TableCell className="font-mono text-sm">{student.rid || `ID: ${student.id}`}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarImage
                                                                    src={student.profile_pic ? `http://aims.citycollege.edu.ph/${student.profile_pic}` : undefined}
                                                                    alt={student.fullname}
                                                                />
                                                                <AvatarFallback>{getInitials(student.fullname || '')}</AvatarFallback>
                                                            </Avatar>
                                                            <span className="font-medium text-gray-900 dark:text-white">{student.fullname}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell><span className="text-sm text-gray-400">{student.email}</span></TableCell>
                                                    <TableCell><Badge variant="outline" className="text-xs">{student.section_name || 'Unassigned'}</Badge></TableCell>
                                                    <TableCell><Badge variant="outline" className="text-xs">{student.course_code || 'N/A'}</Badge></TableCell>
                                                    <TableCell><span className="text-sm">{student.yearlevel || 'N/A'}</span></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-gray-400">
                                            Showing {startIndex + 1}–{Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>Previous</Button>
                                            <span className="text-sm text-gray-400">Page {currentPage} of {totalPages}</span>
                                            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 py-12 text-center dark:border-gray-800">
                                <Users className="h-8 w-8 text-gray-200 dark:text-gray-700" />
                                <p className="text-sm text-gray-400">No students match the selected filters.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && allStudents.length === 0 && (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-gray-100 py-12 text-center dark:border-gray-800">
                        <Users className="h-8 w-8 text-gray-200 dark:text-gray-700" />
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No students found</p>
                            <p className="mt-0.5 text-xs text-gray-400">No students are assigned to your sections.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={retryFetch}>
                            <Loader2 className="mr-2 h-4 w-4" /> Refresh
                        </Button>
                    </div>
                )}

                </div>
            </div>
        </AppLayout>
    );
}
