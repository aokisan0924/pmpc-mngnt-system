<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\RecurringTaskGenerator;
use Illuminate\Console\Command;

class GenerateRecurringTasks extends Command
{
    protected $signature = 'tasks:generate-recurring';

    protected $description = 'Create the next copies of repeating tasks whose time has come';

    public function handle(RecurringTaskGenerator $generator): int
    {
        $this->info($generator->run().' task(s) created.');

        return self::SUCCESS;
    }
}
