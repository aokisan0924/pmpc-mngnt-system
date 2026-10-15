<?php

return [
    /*
    | Employee IDs (not names, which HR can edit) of the super admins allowed to
    | correct, add or clear DTR entries during the final DTR check.
    */
    'dtr_correctors' => array_filter(array_map('trim', explode(',', (string) env('DTR_CORRECTOR_EMPLOYEE_IDS', 'EMP-0002')))),
];
