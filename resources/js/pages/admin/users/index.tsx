import { SectionHeader } from '@/components/dashboards/shared';
import { PageHeader } from '@/components/page-header';
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
import { alertDialog, confirmDialog, formDialog } from '@/lib/dialog';
import { toast } from '@/lib/toast';
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
    useEffect(() => {
        currentTabRef.current = currentTab;
    }, [currentTab]);

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
        const confirmed = await confirmDialog({
            title: 'Change role?',
            description: `${user.name} will become a ${role}.`,
            confirmLabel: 'Change role',
        });
        if (!confirmed) {
            return;
        }
        router.put(
            `/admin/users/${user.id}`,
            { role },
            {
                preserveScroll: true,
                onSuccess: () => toast(`Role changed to ${role}.`, 'success'),
                onError: () =>
                    alertDialog({
                        title: 'Could not change role',
                        description: 'Please try again.',
                        tone: 'error',
                    }),
            },
        );
    }, []);

    const handleToggleStatus = useCallback(async (user: User) => {
        const action = user.is_active ? 'Deactivate' : 'Activate';
        const confirmed = await confirmDialog({
            title: `${action} ${user.name}?`,
            description: user.is_active
                ? 'They will not be able to log in until reactivated.'
                : 'They will be able to log in again.',
            confirmLabel: action,
            tone: user.is_active ? 'danger' : 'default',
        });
        if (!confirmed) {
            return;
        }
        router.post(
            `/admin/users/${user.id}/toggle-status`,
            {},
            {
                preserveScroll: true,
                onSuccess: () =>
                    toast(
                        `${user.name} has been ${action.toLowerCase()}d.`,
                        'success',
                    ),
                onError: () =>
                    alertDialog({
                        title: 'Could not update status',
                        description: 'Please try again.',
                        tone: 'error',
                    }),
            },
        );
    }, []);

    const handleDelete = useCallback(async (user: User) => {
        const confirmed = await confirmDialog({
            title: `Delete ${user.name}?`,
            description:
                "Their account and progress are removed permanently. This can't be undone.",
            confirmLabel: 'Delete user',
            tone: 'danger',
        });
        if (!confirmed) {
            return;
        }
        router.delete(`/admin/users/${user.id}`, {
            preserveScroll: true,
            onSuccess: () => toast(`${user.name} has been removed.`, 'success'),
            onError: () =>
                alertDialog({
                    title: 'Could not delete user',
                    description: 'Please try again.',
                    tone: 'error',
                }),
        });
    }, []);

    const handleSendMessage = useCallback(async (user: User) => {
        const values = await formDialog({
            title: `Message ${user.name}`,
            confirmLabel: 'Send',
            fields: [
                {
                    name: 'subject',
                    label: 'Subject',
                    placeholder: 'What is this about?',
                },
                {
                    name: 'message',
                    label: 'Message',
                    placeholder: 'Write your message',
                    multiline: true,
                },
            ],
        });
        if (!values) {
            return;
        }
        router.post(
            `/admin/users/${user.id}/send-message`,
            { subject: values.subject, message: values.message },
            {
                preserveScroll: true,
                onSuccess: () => toast('Message sent.', 'success'),
                onError: () =>
                    alertDialog({
                        title: 'Could not send message',
                        description: 'Please try again.',
                        tone: 'error',
                    }),
            },
        );
    }, []);

    const handleToggleClassManagement = useCallback(
        async (user: User) => {
            const isGranting = !user.has_class_management;
            const confirmed = await confirmDialog({
                title: isGranting
                    ? 'Grant class management?'
                    : 'Revoke class management?',
                description: isGranting
                    ? `${user.name} will be able to manage classes.`
                    : `${user.name} will no longer be able to manage classes.`,
                confirmLabel: isGranting ? 'Grant' : 'Revoke',
                tone: isGranting ? 'default' : 'danger',
            });
            if (!confirmed) {
                return;
            }
            router.post(
                `/admin/users/${user.id}/toggle-permission`,
                { permission: 'class_management', tab: currentTab },
                {
                    preserveScroll: true,
                    onSuccess: () =>
                        toast(
                            isGranting
                                ? `${user.name} can now manage classes.`
                                : `${user.name} can no longer manage classes.`,
                            'success',
                        ),
                    onError: () =>
                        alertDialog({
                            title: 'Could not update permission',
                            description: 'Please try again.',
                            tone: 'error',
                        }),
                },
            );
        },
        [currentTab],
    );

    const handleVerifyEmail = useCallback(async (user: User) => {
        const confirmed = await confirmDialog({
            title: 'Verify email?',
            description: `Mark ${user.name}'s email as verified without the email link.`,
            confirmLabel: 'Verify',
        });
        if (!confirmed) {
            return;
        }
        router.post(
            `/admin/users/${user.id}/verify-email`,
            {},
            {
                preserveScroll: true,
                onFinish: () =>
                    toast(`${user.name}'s email is verified.`, 'success'),
                onError: () =>
                    alertDialog({
                        title: 'Could not verify email',
                        description: 'Please try again.',
                        tone: 'error',
                    }),
            },
        );
    }, []);

    const getRoleBadge = useCallback((role: string): string => {
        const map: Record<string, string> = {
            admin: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            teacher:
                'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
            student:
                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        };
        return map[role] ?? 'bg-muted text-foreground';
    }, []);

    const columns = useMemo<DataTableColumn<User>[]>(() => {
        const userCol: DataTableColumn<User> = {
            key: 'user',
            header: 'User',
            cell: (u) => (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={u.avatar} />
                        <AvatarFallback className="bg-violet-100 text-xs text-violet-800">
                            {getInitials(u.name)}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <p className="font-medium text-violet-900 dark:text-white">
                                {u.name}
                            </p>
                            {u.email_verified_at && (
                                <UserCheck
                                    className="h-3.5 w-3.5 text-green-500"
                                    aria-label="Email verified"
                                />
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
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
                            : 'bg-muted text-muted-foreground dark:text-muted-foreground'
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
                <span className="text-sm text-muted-foreground">
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
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
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
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                    Privileges
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                    onClick={() =>
                                        handleToggleClassManagement(u)
                                    }
                                >
                                    <PencilLine className="mr-2 h-4 w-4 text-violet-600" />
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
                                className={`mr-2 h-4 w-4 ${u.email_verified_at ? 'text-green-500' : 'text-muted-foreground'}`}
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
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
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
            <div className="min-h-full pb-10">
                <PageHeader
                    title="Users"
                    description="Accounts, roles and access for everyone on Dulatuon."
                />

                <div className="mx-auto w-full max-w-[1600px] space-y-8 px-5 py-8 sm:px-8">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        <div className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
                            <p className="text-sm font-bold text-muted-foreground">
                                Total Users
                            </p>
                            <p className="mt-3 text-3xl font-bold text-foreground sm:mt-4 sm:text-4xl dark:text-white">
                                {stats.total_users}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {stats.active_users} active
                            </p>
                        </div>

                        <div className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
                            <p className="text-sm font-bold text-muted-foreground">
                                Admins
                            </p>
                            <p className="mt-3 text-3xl font-bold text-foreground sm:mt-4 sm:text-4xl dark:text-white">
                                {stats.admins}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Platform managers
                            </p>
                        </div>

                        <div className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
                            <p className="text-sm font-bold text-muted-foreground">
                                Teachers
                            </p>
                            <p className="mt-3 text-3xl font-bold text-foreground sm:mt-4 sm:text-4xl dark:text-white">
                                {stats.teachers}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Active instructors
                            </p>
                        </div>

                        <div className="rounded-3xl border bg-card p-5 shadow-panel sm:p-6">
                            <p className="text-sm font-bold text-muted-foreground">
                                Students
                            </p>
                            <p className="mt-3 text-3xl font-bold text-foreground sm:mt-4 sm:text-4xl dark:text-white">
                                {stats.students}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Enrolled learners
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
