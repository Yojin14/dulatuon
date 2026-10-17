import { PORTAL_GRADIENT, SectionHeader } from '@/components/dashboards/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Edit,
    MoreHorizontal,
    Plus,
    Search,
    Settings,
    Shield,
    Trash2,
    Users,
} from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { useMemo, useState } from 'react';

interface Role {
    id: number;
    name: string;
    slug: string;
    description: string;
    usersCount: number;
    permissions: string[];
    createdAt: string;
    isSystem: boolean;
}

interface RoleStats {
    total_roles: number;
    total_users: number;
    total_permissions: number;
}

interface Props {
    roles: Role[];
    stats: RoleStats;
    allPermissions: Record<string, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Role Management', href: '/admin/roles' },
];

// ─── Create Role Modal ────────────────────────────────────────────────────────

function CreateRoleModal({
    open,
    onClose,
    allPermissions,
}: {
    open: boolean;
    onClose: () => void;
    allPermissions: Record<string, string>;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [permissions, setPermissions] = useState<string[]>([]);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const toggle = (perm: string) =>
        setPermissions((prev) =>
            prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
        );

    const reset = () => {
        setName('');
        setDescription('');
        setPermissions([]);
        setErrors({});
    };

    const submit = () => {
        if (!name.trim()) {
            setErrors({ name: 'Role name is required.' });
            return;
        }
        setProcessing(true);
        router.post(
            '/admin/roles',
            { name, description, permissions },
            {
                onSuccess: () => { reset(); onClose(); },
                onError: (e) => setErrors(e as Record<string, string>),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">
                        Create New Role
                    </DialogTitle>
                    <DialogDescription>
                        Define the role name, description, and assign permissions.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="cr-name">Role Name</Label>
                        <Input
                            id="cr-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Content Manager"
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500">{errors.name}</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="cr-desc">Description</Label>
                        <Textarea
                            id="cr-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of this role..."
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Permissions</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(allPermissions).map(([key, label]) => (
                                <label
                                    key={key}
                                    className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 p-2 hover:border-blue-400 dark:border-gray-700"
                                >
                                    <Checkbox
                                        checked={permissions.includes(key)}
                                        onCheckedChange={() => toggle(key)}
                                    />
                                    <span className="text-sm">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={processing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={submit}
                        disabled={processing || !name.trim()}
                        className="bg-blue-900 hover:bg-blue-800"
                    >
                        {processing ? 'Creating...' : 'Create Role'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Edit Role Modal ──────────────────────────────────────────────────────────

function EditRoleModal({
    role,
    onClose,
}: {
    role: Role | null;
    onClose: () => void;
}) {
    const [name, setName] = useState(role?.name ?? '');
    const [description, setDescription] = useState(role?.description ?? '');
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    if (!role) return null;

    const submit = () => {
        setProcessing(true);
        router.put(
            `/admin/roles/${role.id}`,
            { name, description },
            {
                onSuccess: () => onClose(),
                onError: (e) => setErrors(e as Record<string, string>),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">
                        Edit Role
                    </DialogTitle>
                    <DialogDescription>Update role name and description.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="er-name">Role Name</Label>
                        <Input
                            id="er-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        {errors.name && (
                            <p className="text-sm text-red-500">{errors.name}</p>
                        )}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="er-desc">Description</Label>
                        <Textarea
                            id="er-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                        />
                    </div>
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={onClose} disabled={processing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={submit}
                        disabled={processing || !name.trim()}
                        className="bg-blue-900 hover:bg-blue-800"
                    >
                        {processing ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Permissions Modal ────────────────────────────────────────────────────────

function PermissionsModal({
    role,
    onClose,
    allPermissions,
}: {
    role: Role | null;
    onClose: () => void;
    allPermissions: Record<string, string>;
}) {
    const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
    const [processing, setProcessing] = useState(false);

    if (!role) return null;

    const toggle = (perm: string) =>
        setPermissions((prev) =>
            prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
        );

    const submit = () => {
        setProcessing(true);
        router.put(
            `/admin/roles/${role.id}/permissions`,
            { permissions },
            {
                onSuccess: () => onClose(),
                onFinish: () => setProcessing(false),
            },
        );
    };

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-gray-900 dark:text-white">
                        Manage Permissions — {role.name}
                    </DialogTitle>
                    <DialogDescription>
                        Toggle which permissions this role has access to.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPermissions(Object.keys(allPermissions))}
                        >
                            Select All
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPermissions([])}
                        >
                            Clear All
                        </Button>
                        <span className="ml-auto text-sm text-gray-500">
                            {permissions.length} / {Object.keys(allPermissions).length} selected
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(allPermissions).map(([key, label]) => (
                            <label
                                key={key}
                                className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-200 p-2 hover:border-blue-400 dark:border-gray-700"
                            >
                                <Checkbox
                                    checked={permissions.includes(key)}
                                    onCheckedChange={() => toggle(key)}
                                />
                                <span className="text-sm">{label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={onClose} disabled={processing}>
                        Cancel
                    </Button>
                    <Button
                        onClick={submit}
                        disabled={processing}
                        className="bg-blue-900 hover:bg-blue-800"
                    >
                        {processing ? 'Saving...' : 'Save Permissions'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteRoleModal({
    role,
    onClose,
}: {
    role: Role | null;
    onClose: () => void;
}) {
    const [processing, setProcessing] = useState(false);

    if (!role) return null;

    const submit = () => {
        setProcessing(true);
        router.delete(`/admin/roles/${role.id}`, {
            onSuccess: () => onClose(),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-red-600">Delete Role</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete the{' '}
                        <span className="font-semibold">{role.name}</span> role?
                        {role.usersCount > 0 && (
                            <span className="mt-1 block text-amber-600">
                                {role.usersCount} user(s) with this role will be reassigned to Student.
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="pt-2">
                    <Button variant="outline" onClick={onClose} disabled={processing}>
                        Cancel
                    </Button>
                    <Button onClick={submit} disabled={processing} variant="destructive">
                        {processing ? 'Deleting...' : 'Delete Role'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminRolesIndex({ roles, stats, allPermissions }: Props) {
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [permRole, setPermRole] = useState<Role | null>(null);
    const [deleteRole, setDeleteRole] = useState<Role | null>(null);
    const debouncedSearch = useDebounce(search);

    const { props } = usePage<{ flash?: { success?: string } }>();
    const flash = (props as any).flash;

    const filtered = useMemo(
        () =>
            roles.filter(
                (r) =>
                    r.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                    r.description.toLowerCase().includes(debouncedSearch.toLowerCase()),
            ),
        [roles, debouncedSearch],
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Role Management" />

            <CreateRoleModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                allPermissions={allPermissions}
            />
            {editRole && (
                <EditRoleModal role={editRole} onClose={() => setEditRole(null)} />
            )}
            {permRole && (
                <PermissionsModal
                    role={permRole}
                    onClose={() => setPermRole(null)}
                    allPermissions={allPermissions}
                />
            )}
            {deleteRole && (
                <DeleteRoleModal role={deleteRole} onClose={() => setDeleteRole(null)} />
            )}

            <div className="min-h-full bg-white dark:bg-gray-950">

                {/* Header */}
                <div className="px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8" style={{ background: PORTAL_GRADIENT }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow-300/80">
                        Admin Portal
                    </p>
                    <h1 className="mt-1.5 text-xl font-bold text-white sm:text-2xl">
                        Role Management
                    </h1>
                    <p className="mt-1 text-sm text-blue-200/50">
                        Manage user roles and permissions across the platform
                    </p>
                </div>

                <div className="space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-8 lg:px-8">

                {/* Flash message */}
                {flash?.success && (
                    <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
                        {flash.success}
                    </div>
                )}

                {/* Toolbar */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <Input
                            placeholder="Search roles..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={() => setShowCreate(true)}
                        className="bg-blue-900 hover:bg-blue-800 sm:shrink-0"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Role
                    </Button>
                </div>

                {/* Roles Grid */}
                <div className="space-y-4">
                    <SectionHeader title="Roles" />
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {filtered.map((role) => (
                            <div
                                key={role.id}
                                className="group rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                                            <Shield className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                {role.name}
                                                {role.isSystem && (
                                                    <Badge
                                                        variant="outline"
                                                        className="border-blue-300 text-xs text-blue-700 dark:border-blue-700 dark:text-blue-400"
                                                    >
                                                        System
                                                    </Badge>
                                                )}
                                            </p>
                                            <p className="text-xs text-gray-400">{role.description}</p>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setEditRole(role)}>
                                                <Edit className="mr-2 h-4 w-4" />
                                                Edit Role
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => setPermRole(role)}>
                                                <Settings className="mr-2 h-4 w-4" />
                                                Edit Permissions
                                            </DropdownMenuItem>
                                            {!role.isSystem && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-red-600 focus:text-red-600"
                                                        onClick={() => setDeleteRole(role)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete Role
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="mt-4 space-y-3">
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3.5 w-3.5" />
                                            {role.usersCount.toLocaleString()} users
                                        </span>
                                        <span>Created {new Date(role.createdAt).toLocaleDateString()}</span>
                                    </div>

                                    <div>
                                        <div className="mb-1.5 flex items-center justify-between">
                                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                Permissions ({role.permissions.length})
                                            </p>
                                            <button
                                                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                                                onClick={() => setPermRole(role)}
                                            >
                                                Edit
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {role.permissions.length === 0 ? (
                                                <span className="text-xs text-gray-400">No permissions</span>
                                            ) : (
                                                role.permissions.map((p) => (
                                                    <Badge
                                                        key={p}
                                                        className="border-blue-200 bg-blue-50 text-xs text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                    >
                                                        {allPermissions[p] ?? p}
                                                    </Badge>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filtered.length === 0 && (
                            <div className="col-span-3 rounded-xl border border-gray-100 py-12 text-center text-sm text-gray-400 dark:border-gray-800">
                                No roles found matching your search.
                            </div>
                        )}
                    </div>
                </div>

                {/* Role Statistics */}
                <div className="space-y-4">
                    <SectionHeader title="Statistics" />
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                        <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Total Roles</p>
                            <p className="mt-3 text-3xl font-bold text-gray-900 sm:mt-4 sm:text-4xl dark:text-white">{stats.total_roles}</p>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Total Users</p>
                            <p className="mt-3 text-3xl font-bold text-gray-900 sm:mt-4 sm:text-4xl dark:text-white">{stats.total_users.toLocaleString()}</p>
                        </div>
                        <div className="col-span-2 rounded-xl border border-gray-100 bg-white p-4 sm:p-6 lg:col-span-1 dark:border-gray-800 dark:bg-gray-900">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Permissions</p>
                            <p className="mt-3 text-3xl font-bold text-gray-900 sm:mt-4 sm:text-4xl dark:text-white">{stats.total_permissions}</p>
                        </div>
                    </div>
                </div>

                </div>
            </div>
        </AppLayout>
    );
}
