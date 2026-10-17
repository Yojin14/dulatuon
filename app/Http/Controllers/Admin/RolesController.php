<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RolesController extends Controller
{
    /**
     * All available permissions in the system.
     *
     * Each permission corresponds to a sidenav entry — granting it gives the
     * role access to that navigation item and its underlying feature area.
     */
    public const ALL_PERMISSIONS = [
        // Admin sidenav
        'analytics' => 'Analytics',
        'course_management' => 'Course Management',
        'user_management' => 'User Management',
        'role_management' => 'Role Management',

        // Teacher sidenav
        'assigned_class' => 'Assigned Class',
        'class_management' => 'Class Management',

        // Student sidenav
        'explore_courses' => 'Explore Courses',
        'my_course' => 'My Course',
        'my_progress' => 'My Progress',

        // Shared (teacher + student)
        'chat' => 'Chat',
    ];

    public function index(): Response
    {
        $counts = User::where('status', 'approved')
            ->selectRaw('role, COUNT(*) as count')
            ->groupBy('role')
            ->pluck('count', 'role');

        $roles = Role::with('permissions')
            ->orderBy('id')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'slug' => $role->slug,
                'name' => $role->name,
                'description' => $role->description ?? '',
                'isSystem' => $role->is_system,
                'usersCount' => (int) ($counts[$role->slug] ?? 0),
                'permissions' => $role->permissionList(),
                'createdAt' => $role->created_at->toISOString(),
            ])
            ->values();

        return Inertia::render('admin/roles/index', [
            'roles' => $roles,
            'allPermissions' => self::ALL_PERMISSIONS,
            'stats' => [
                'total_roles' => $roles->count(),
                'total_users' => User::where('status', 'approved')->count(),
                'total_permissions' => count(self::ALL_PERMISSIONS),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:60',
            'description' => 'nullable|string|max:255',
            'permissions' => 'array',
            'permissions.*' => 'string|in:'.implode(',', array_keys(self::ALL_PERMISSIONS)),
        ]);

        $slug = Str::slug($data['name'], '_');

        // Ensure slug uniqueness
        $base = $slug;
        $i = 1;
        while (Role::where('slug', $slug)->exists()) {
            $slug = "{$base}_{$i}";
            $i++;
        }

        $role = Role::create([
            'slug' => $slug,
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'is_system' => false,
        ]);

        $role->syncPermissions($data['permissions'] ?? []);

        return back()->with('success', "Role \"{$role->name}\" created.");
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:60',
            'description' => 'nullable|string|max:255',
        ]);

        $role->update([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
        ]);

        return back()->with('success', "Role \"{$role->name}\" updated.");
    }

    public function updatePermissions(Request $request, Role $role): RedirectResponse
    {
        $data = $request->validate([
            'permissions' => 'array',
            'permissions.*' => 'string|in:'.implode(',', array_keys(self::ALL_PERMISSIONS)),
        ]);

        $role->syncPermissions($data['permissions'] ?? []);

        return back()->with('success', "Permissions for \"{$role->name}\" updated.");
    }

    public function destroy(Role $role): RedirectResponse
    {
        if ($role->is_system) {
            return back()->withErrors(['error' => 'System roles cannot be deleted.']);
        }

        // Reassign users with this role to 'student'
        User::where('role', $role->slug)->update(['role' => 'student']);

        $name = $role->name;
        $role->delete();

        return back()->with('success', "Role \"{$name}\" deleted. Affected users reassigned to Student.");
    }
}
