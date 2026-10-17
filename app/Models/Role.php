<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    protected $fillable = ['slug', 'name', 'description', 'is_system'];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    public function permissions(): HasMany
    {
        return $this->hasMany(RolePermission::class);
    }

    public function permissionList(): array
    {
        return $this->permissions()->pluck('permission')->toArray();
    }

    public function syncPermissions(array $permissions): void
    {
        $this->permissions()->delete();
        if (! empty($permissions)) {
            $this->permissions()->createMany(
                array_map(fn($p) => ['permission' => $p], array_unique($permissions))
            );
        }
    }
}
