<?php

namespace App\Console\Commands;

use App\Models\Enrollment;
use Illuminate\Console\Command;

class SyncStudentProgress extends Command
{
    /**
     * @var string
     */
    protected $signature = 'progress:sync';

    /**
     * @var string
     */
    protected $description = 'Recalculate every enrollment\'s stored progress with the current rules (materials plus cleared games)';

    public function handle(): int
    {
        $count = 0;
        Enrollment::query()->with('user')->chunkById(200, function ($enrollments) use (&$count): void {
            foreach ($enrollments as $enrollment) {
                $enrollment->recalculateProgress();
                $count++;
            }
        });

        $this->info("Recalculated progress for {$count} enrollments.");

        return self::SUCCESS;
    }
}
