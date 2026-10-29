<?php

declare(strict_types=1);

return [
    'genmdse' => [
        'token' => env('WORKFORCE_GENMDSE_TOKEN'),
        'employee_ids' => array_values(array_unique(array_map(
            'intval',
            array_filter(
                array_map('trim', explode(',', (string) env('WORKFORCE_GENMDSE_EMPLOYEE_IDS', ''))),
                fn (string $id): bool => ctype_digit($id) && (int) $id > 0,
            ),
        ))),
    ],
];
