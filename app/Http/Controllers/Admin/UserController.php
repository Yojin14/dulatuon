<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserNotification;
use App\Models\UserPermission;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $tab = $request->get('tab', 'all');

        $query = User::query()->where('id', '!=', $request->user()->id);

        match ($tab) {
            'students' => $query->where('status', 'approved')->where('role', 'student'),
            'teachers' => $query->where('status', 'approved')->where('role', 'teacher'),
            default => $query->where('status', 'approved'),
        };

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query
            ->select(['id', 'name', 'email', 'role', 'status', 'is_active', 'avatar', 'email_verified_at', 'created_at', 'approved_at'])
            ->with('userPermissions:id,user_id,permission')
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        $users->getCollection()->transform(fn (User $user): array => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
            'is_active' => $user->is_active,
            'avatar' => $user->avatar,
            'email_verified_at' => $user->email_verified_at,
            'created_at' => $user->created_at,
            'approved_at' => $user->approved_at,
            'has_class_management' => $user->userPermissions->contains('permission', 'class_management'),
        ]);

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'stats' => fn (): array => $this->userStats(),
            'activeTab' => $tab,
            'filters' => $request->only(['search', 'tab']),
        ]);
    }

    /**
     * Aggregate user counts in a single query. Wrapped behind a lazy Inertia
     * prop so it is skipped entirely during search/filter partial reloads.
     *
     * @return array{total_users:int, active_users:int, inactive_users:int, admins:int, teachers:int, students:int}
     */
    private function userStats(): array
    {
        $row = User::where('status', 'approved')
            ->selectRaw('COUNT(*) as total_users')
            ->selectRaw('COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users')
            ->selectRaw('COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_users')
            ->selectRaw("COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins")
            ->selectRaw("COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teachers")
            ->selectRaw("COUNT(CASE WHEN role = 'student' THEN 1 END) as students")
            ->first();

        return [
            'total_users' => (int) $row->total_users,
            'active_users' => (int) $row->active_users,
            'inactive_users' => (int) $row->inactive_users,
            'admins' => (int) $row->admins,
            'teachers' => (int) $row->teachers,
            'students' => (int) $row->students,
        ];
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'in:admin,teacher,student'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => $validated['role'],
            'status' => 'approved',
            'is_active' => true,
            'approved_at' => now(),
            'approved_by' => $request->user()->id,
        ]);

        $user->markEmailAsVerified();

        return back()->with('success', "{$validated['name']} has been created and approved.");
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'role' => ['required', 'in:admin,teacher,student'],
        ]);

        $previousRole = $user->role;
        $user->update($validated);

        if ($previousRole !== $validated['role']) {
            UserNotification::notify(
                $user->id,
                'role_assigned',
                'Your role was updated',
                "An administrator changed your role to {$validated['role']}.",
                '/dashboard',
                ['role' => $validated['role'], 'previous_role' => $previousRole],
            );
        }

        return back()->with('success', "{$user->name}'s role updated to {$validated['role']}.");
    }

    public function destroy(User $user)
    {
        $user->delete();

        return back()->with('success', 'User has been deleted.');
    }

    public function toggleStatus(Request $request, User $user)
    {
        $user->update(['is_active' => ! $user->is_active]);

        $state = $user->is_active ? 'activated' : 'deactivated';

        return back()->with('success', "{$user->name} has been {$state}.");
    }

    public function sendMessage(Request $request, User $user)
    {
        $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string'],
        ]);

        // TODO: implement actual mail/notification sending
        return back()->with('success', "Message sent to {$user->name}.");
    }

    public function verifyEmail(Request $request, User $user)
    {
        if ($user->email_verified_at) {
            return redirect()->route('admin.users.index', $request->only(['tab', 'search', 'page']))
                ->with('info', "{$user->name}'s email is already verified.");
        }

        $user->markEmailAsVerified();

        return redirect()->route('admin.users.index', $request->only(['tab', 'search', 'page']))
            ->with('success', "{$user->name}'s email has been manually verified.");
    }

    public function togglePermission(Request $request, User $user)
    {
        $request->validate([
            'permission' => ['required', 'string'],
        ]);

        $permission = $request->input('permission');

        $existing = UserPermission::where('user_id', $user->id)
            ->where('permission', $permission)
            ->first();

        if ($existing) {
            $existing->delete();
            $state = 'revoked';
        } else {
            UserPermission::create(['user_id' => $user->id, 'permission' => $permission]);
            $state = 'granted';
        }

        $label = \App\Http\Controllers\Admin\RolesController::ALL_PERMISSIONS[$permission] ?? $permission;

        $granted = $state === 'granted';
        UserNotification::notify(
            $user->id,
            $granted ? 'permission_granted' : 'permission_revoked',
            $granted ? "{$label} granted" : "{$label} revoked",
            $granted
                ? "You have been granted the {$label} privilege."
                : "Your {$label} privilege has been revoked.",
            $granted && $permission === 'class_management' ? '/class-management' : '/dashboard',
            ['permission' => $permission],
        );

        return redirect()->route('admin.users.index', $request->only(['tab', 'search', 'page']))
            ->with('success', "{$label} permission {$state} for {$user->name}.");
    }
}
