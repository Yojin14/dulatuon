import { PORTAL_GRADIENT, SectionHeader } from '@/components/dashboards/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useDebounce } from '@/hooks/use-debounce';
import { useInitials } from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import { formatDate } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Mail,
    MailCheck,
    MoreHorizontal,
    PencilLine,
    Search,
    Shield,
    Trash2,
    UserCheck,
    UserX,
    Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SweetAlertResult } from 'sweetalert2';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'User Management', href: '/admin/users' },
];

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    is_active: boolean;
    has_class_management: boolean;
    avatar?: string;
    email_verified_at?: string;
    created_at: string;
    approved_at?: string;
}

interface UserStats {
    total_users: number;
    active_users: number;
    inactive_users: number;
    admins: number;
    teachers: number;
    students: number;
}

interface PageProps extends SharedData {
    users: {
        data: User[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    stats: UserStats;
    activeTab: string;
    filters: { search?: string; tab?: string };
}

type SwalModule = typeof import('sweetalert2').default;

let swalPromise: Promise<SwalModule> | null = null;
const getSwal = (): Promise<SwalModule> => {
    if (!swalPromise) {
        swalPromise = import('sweetalert2').then((m) => m.default);
    }
    return swalPromise;
};

const PARTIAL_RELOAD_KEYS = ['users', 'stats', 'activeTab', 'filters'];

const FILTER_OPTIONS: { value: string; label: string }[] = [
    { value: 'all', label: 'All Users' },
    { value: 'students', label: 'Students' },
    { value: 'teachers', label: 'Teachers' },
];

const FILTER_LABEL: Record<string, string> = {
    all: 'All Users',
    students: 'Students',
    teachers: 'Teachers',
};

export default function AdminUsersIndex() {
    const {
        users = {
            data: [],
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: 0,
        },
        stats = {
            total_users: 0,
            active_users: 0,
            inactive_users: 0,
            admins: 0,
            teachers: 0,
            students: 0,
        },
        activeTab,
        filters = {},
    } = usePage<PageProps>().props;

    const getInitials = useInitials();
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [currentTab, setCurrentTab] = useState(activeTab || 'all');
    const debouncedSearch = useDebounce(searchTerm);
    const didMountRef = useRef(false);
    const currentTabRef = useRef(currentTab);
    currentTabRef.current = currentTab;

    const navigate = useCallback((params: Record<string, string>) => {
        router.get('/admin/users', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: PARTIAL_RELOAD_KEYS,
        });
    }, []);

    useEffect(() => {
        if (!didMountRef.current) {
            didMountRef.current = true;
            return;
        }
        navigate({
            tab: currentTabRef.current,
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
        });
    }, [debouncedSearch, navigate]);

    const handleFilterChange = useCallback(
        (tab: string) => {
            setCurrentTab(tab);
            navigate({ tab, ...(searchTerm ? { search: searchTerm } : {}) });
        },
        [navigate, searchTerm],
    );

    const handlePageChange = useCallback(
        (page: number) => {
            navigate({
                tab: currentTab,
                page: String(page),
                ...(searchTerm ? { search: searchTerm } : {}),
            });
        },
        [navigate, currentTab, searchTerm],
    );

    const handleChangeRole = useCallback(async (user: User, role: string) => {
        const Swal = await getSwal();
        const result: SweetAlertResult = await Swal.fire({
            title: 'Change Role?',
            html: `Change <strong>${user.name}</strong>'s role to <strong>${role}</strong>?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1e3a8a',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Change',
        });
        if (!result.isConfirmed) {
            return;
        }
        router.put(
            `/admin/users/${user.id}`,
            { role },
            {
                preserveScroll: true,
                onSuccess: () =>
                    Swal.fire({
                        title: 'Updated!',
                        text: `Role changed to ${role}.`,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                    }),
                onError: () =>
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to update role.',
                        icon: 'error',
                    }),
            },
        );
    }, []);

    const handleToggleStatus = useCallback(async (user: User) => {
        const Swal = await getSwal();
        const action = user.is_active ? 'Deactivate' : 'Activate';
        const result = await Swal.fire({
            title: `${action} User?`,
            html: `${action} <strong>${user.name}</strong>?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#1e3a8a',
            cancelButtonColor: '#6b7280',
            confirmButtonText: `Yes, ${action}`,
        });
        if (!result.isConfirmed) {
            return;
        }
        router.post(
            `/admin/users/${user.id}/toggle-status`,
            {},
            {
                preserveScroll: true,
                onSuccess: () =>
                    Swal.fire({
                        title: 'Done!',
                        text: `${user.name} has been ${action.toLowerCase()}d.`,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                    }),
                onError: () =>
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to update status.',
                        icon: 'error',
                    }),
            },
        );
    }, []);

    const handleDelete = useCallback(async (user: User) => {
        const Swal = await getSwal();
        const result = await Swal.fire({
            title: 'Delete User?',
            html: `Permanently delete <strong>${user.name}</strong>? This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Delete',
        });
        if (!result.isConfirmed) {
            return;
        }
        router.delete(`/admin/users/${user.id}`, {
            preserveScroll: true,
            onSuccess: () =>
                Swal.fire({
                    title: 'Deleted!',
                    text: `${user.name} has been removed.`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                }),
            onError: () =>
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to delete user.',
                    icon: 'error',
                }),
        });
    }, []);

    const handleSendMessage = useCallback(async (user: User) => {
        const Swal = await getSwal();
        const result = await Swal.fire({
            title: `Message ${user.name}`,
            html: `
                <div class="text-left space-y-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                        <input id="swal-subject" class="swal2-input" placeholder="Enter subject" style="margin:0;width:100%" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea id="swal-message" class="swal2-textarea" placeholder="Enter message" style="margin:0;width:100%"></textarea>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonColor: '#1e3a8a',
            confirmButtonText: 'Send',
            preConfirm: () => {
                const subject = (
                    document.getElementById('swal-subject') as HTMLInputElement
                )?.value;
                const message = (
                    document.getElementById(
                        'swal-message',
                    ) as HTMLTextAreaElement
                )?.value;
                if (!subject || !message) {
                    Swal.showValidationMessage('Please fill in both fields');
                    return false;
                }
                return { subject, message };
            },
        });
        if (!result.isConfirmed || !result.value) {
            return;
        }
        router.post(`/admin/users/${user.id}/send-message`, result.value, {
            preserveScroll: true,
            onSuccess: () =>
                Swal.fire({
                    title: 'Sent!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                }),
            onError: () =>
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to send message.',
                    icon: 'error',
                }),
        });
    }, []);

    const handleToggleClassManagement = useCallback(
        async (user: User) => {
            const Swal = await getSwal();
            const isGranting = !user.has_class_management;
            const result = await Swal.fire({
                title: isGranting
                    ? 'Grant Class Management?'
                    : 'Revoke Class Management?',
                html: isGranting
                    ? `Grant <strong>${user.name}</strong> class management privileges?`
                    : `Revoke class management privileges from <strong>${user.name}</strong>?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: isGranting ? '#1e3a8a' : '#dc2626',
                cancelButtonColor: '#6b7280',
                confirmButtonText: isGranting ? 'Yes, Grant' : 'Yes, Revoke',
            });
            if (!result.isConfirmed) {
                return;
            }
            router.post(
                `/admin/users/${user.id}/toggle-permission`,
                { permission: 'class_management', tab: currentTab },
                {
                    preserveScroll: true,
                    onSuccess: () =>
                        Swal.fire({
                            title: isGranting
                                ? 'Privilege Granted!'
                                : 'Privilege Revoked',
                            text: isGranting
                                ? `${user.name} can now manage classes.`
                                : `${user.name} can no longer manage classes.`,
                            icon: 'success',
                            timer: 2000,
                            showConfirmButton: false,
                        }),
                    onError: () =>
                        Swal.fire({
                            title: 'Error',
                            text: 'Failed to update permission.',
                            icon: 'error',
                        }),
                },
            );
        },
        [currentTab],
    );

    const handleVerifyEmail = useCallback(async (user: User) => {
        const Swal = await getSwal();
        const result = await Swal.fire({
            title: 'Verify Email?',
            html: `Manually verify the email for <strong>${user.name}</strong>?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#16a34a',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Yes, Verify',
        });
        if (!result.isConfirmed) {
            return;
        }
        router.post(
            `/admin/users/${user.id}/verify-email`,
            {},
            {
                preserveScroll: true,
                onFinish: () =>
                    Swal.fire({
                        title: 'Email Verified!',
                        text: `${user.name}'s email has been verified.`,
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                    }),
                onError: () =>
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to verify email.',
                        icon: 'error',
                    }),
            },
        );
    }, []);

    const getRoleBadge = useCallback((role: string): string => {
        const map: Record<string, string> = {
            admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            teacher:
                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            student:
                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        };
        return map[role] ?? 'bg-gray-100 text-gray-800';
    }, []);

    const columns = useMemo<DataTableColumn<User>[]>(() => {
        const userCol: DataTableColumn<User> = {
            key: 'user',
            header: 'User',
            cell: (u) => (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={u.avatar} />
                        <AvatarFallback className="bg-blue-100 text-xs text-blue-800">
                            {getInitials(u.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <p className="font-medium text-blue-900 dark:text-white">
                                {u.name}
                            </p>
                            {u.email_verified_at && (
                                <UserCheck
                                    className="h-3.5 w-3.5 text-green-500"
                                    aria-label="Email verified"
                                />
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {u.email}
                        </p>
                    </div>
                </div>
            ),
        };

        const roleCol: DataTableColumn<User> = {
            key: 'role',
            header: 'Role',
            cell: (u) => (
                <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={getRoleBadge(u.role)}>{u.role}</Badge>
                    {u.role === 'teacher' && u.has_class_management && (
                        <span
                            title="Class Management Privilege"
                            className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        >
                            <PencilLine className="h-3 w-3" />
                            Manages Classes
                        </span>
                    )}
                </div>
            ),
        };

        const statusCol: DataTableColumn<User> = {
            key: 'status',
            header: 'Status',
            cell: (u) => (
                <Badge
                    className={
                        u.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }
                >
                    {u.is_active ? 'Active' : 'Inactive'}
                </Badge>
            ),
        };

        const dateCol: DataTableColumn<User> = {
            key: 'date',
            header: 'Joined',
            cell: (u) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(u.created_at)}
                </span>
            ),
        };

        const actionsCol: DataTableColumn<User> = {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            cell: (u) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="text-xs text-gray-500">
                            Change Role
                        </DropdownMenuLabel>
                        {['admin', 'teacher', 'student']
                            .filter((r) => r !== u.role)
                            .map((r) => (
                                <DropdownMenuItem
                                    key={r}
                                    onClick={() => handleChangeRole(u, r)}
                                >
                                    <Shield className="mr-2 h-4 w-4" />
                                    Make{' '}
                                    {r.charAt(0).toUpperCase() + r.slice(1)}
                                </DropdownMenuItem>
                            ))}
                        {u.role === 'teacher' && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-gray-500">
                                    Privileges
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() =>
                                        handleToggleClassManagement(u)
                                    }
                                >
                                    <PencilLine className="mr-2 h-4 w-4 text-blue-600" />
                                    <span>
                                        {u.has_class_management
                                            ? 'Revoke'
                                            : 'Grant'}{' '}
                                        Class Management
                                    </span>
                                    {u.has_class_management && (
                                        <span className="ml-auto text-xs font-medium text-green-600">
                                            Active
                                        </span>
                                    )}
                                </DropdownMenuItem>
                            </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => handleVerifyEmail(u)}
                            disabled={!!u.email_verified_at}
                        >
                            <MailCheck
                                className={`mr-2 h-4 w-4 ${u.email_verified_at ? 'text-green-500' : 'text-gray-400'}`}
                            />
                            {u.email_verified_at
                                ? 'Email Verified'
                                : 'Verify Email'}
                            {u.email_verified_at && (
                                <span className="ml-auto text-xs font-medium text-green-600">
                                    Done
                                </span>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(u)}>
                            {u.is_active ? (
                                <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Deactivate
                                </>
                            ) : (
                                <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Activate
                                </>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSendMessage(u)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Message
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-red-600 focus:bg-red-50 focus:text-red-700"
                            onClick={() => handleDelete(u)}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        };

        return [userCol, roleCol, statusCol, dateCol, actionsCol];
    }, [
        getInitials,
        getRoleBadge,
        handleChangeRole,
        handleToggleClassManagement,
        handleVerifyEmail,
        handleToggleStatus,
        handleSendMessage,
        handleDelete,
    ]);

    const emptyState = useMemo(
        () => (
            <div className="flex flex-col items-center gap-2 text-gray-400">
                <Users className="h-10 w-10" />
                <p>No users found</p>
            </div>
        ),
        [],
    );

    const rowKey = useCallback((u: User) => u.id, []);

    const pagination = useMemo(
        () => ({
            currentPage: users.current_page,
            lastPage: users.last_page,
            perPage: users.per_page,
            total: users.total,
            onPageChange: handlePageChange,
        }),
        [
            users.current_page,
            users.last_page,
            users.per_page,
            users.total,
            handlePageChange,
        ],
    );

    const sectionTitle = FILTER_LABEL[currentTab] ?? 'All Users';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Management" />
            <div className="min-h-full bg-white dark:bg-gray-950">
                <div
                    className="px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8"
                    style={{ background: PORTAL_GRADIENT }}
                >
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[11px] font-semibold tracking-[0.2em] text-yellow-300/80 uppercase">
                                Admin Portal
                            </p>
                            <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
                                User Management
                            </h1>
                            <p className="mt-1 text-sm text-blue-200/50">
                                Manage accounts, roles, and permissions.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8 lg:px-8">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
                            <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                                Total Users
                            </p>
                            <p className="mt-3 text-3xl font-bold text-gray-900 sm:mt-4 sm:text-4xl dark:text-white">
                                {stats.total_users}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                {stats.active_users} active
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
                            <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                                Admins
                            </p>
                            <p className="mt-3 text-3xl font-bold text-gray-900 sm:mt-4 sm:text-4xl dark:text-white">
                                {stats.admins}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                Platform managers
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
                            <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                                Teachers
                            </p>
                            <p className="mt-3 text-3xl font-bold text-gray-900 sm:mt-4 sm:text-4xl dark:text-white">
                                {stats.teachers}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                Active instructors
                            </p>
                        </div>

                        <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
                            <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">
                                Students
                            </p>
                            <p className="mt-3 text-3xl font-bold text-gray-900 sm:mt-4 sm:text-4xl dark:text-white">
                                {stats.students}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                                Enrolled learners
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                                placeholder="Search by name or email…"
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select
                            value={currentTab}
                            onValueChange={handleFilterChange}
                        >
                            <SelectTrigger className="w-full sm:w-56">
                                <SelectValue placeholder="Filter users" />
                            </SelectTrigger>
                            <SelectContent>
                                {FILTER_OPTIONS.map((opt) => (
                                    <SelectItem
                                        key={opt.value}
                                        value={opt.value}
                                    >
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-4">
                        <SectionHeader title={sectionTitle} />
                        <DataTable<User>
                            columns={columns}
                            data={users.data}
                            rowKey={rowKey}
                            emptyState={emptyState}
                            pagination={pagination}
                        />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
