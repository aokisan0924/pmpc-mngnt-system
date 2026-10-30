<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\AlwaysPresentAttendanceFiller;
use Illuminate\Console\Command;

class FillAlwaysPresentDtrCommand extends Command
{
    protected $signature = 'dtr:fill-always-present';

    protected $description = 'Write standard 8-12 / 1-5 punches for always-present employees on workdays with no DTR row';

    public function handle(AlwaysPresentAttendanceFiller $filler): void
    {
        $this->info('Created '.$filler->fill().' DTR rows.');
    }
}
