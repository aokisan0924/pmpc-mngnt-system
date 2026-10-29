# Gen Mdse attendance integration

WorkForce remains the attendance source of truth. The optional API is disabled until both environment variables below are configured. It exposes attendance status and punch operations only; it does not expose payroll or compensation fields.

## Configuration

Set these values in the WorkForce server environment. Do not commit the token or put it in browser code.

```dotenv
WORKFORCE_GENMDSE_TOKEN=<random revocable secret>
WORKFORCE_GENMDSE_EMPLOYEE_IDS=<comma-separated numeric WorkForce employee IDs>
```

Use one high-entropy secret and list only employees whose Gen Mdse account mapping an administrator has verified. Missing or blank credentials deny every request. An empty employee list authorizes nobody. Employee records must exist, be active and be staff members.

Apply the attendance request-log migration through the normal reviewed deployment process before enabling the API. No employee mappings or production credentials are included in this repository.

## Endpoints

- `GET /api/integrations/genmdse/v1/employees/{employee}/attendance?month=YYYY-MM` returns the employee's name and ID, current punch state, expected slot, state version, monthly attendance rows, today's two-punch layout and fetch time. Each attendance row also includes `two_punch` evaluated against the schedule effective on that row's date, so a schedule change during the month does not relabel history. It does not create attendance rows.
- `POST /api/integrations/genmdse/v1/employees/{employee}/punch` accepts `request_id` (UUID), `expected_slot` and `expected_version`. WorkForce timestamps and saves the punch using the employee's saved schedule and existing attendance rules.

Send `Authorization: Bearer <token>` over HTTPS. Do not send an employee-supplied timestamp. A repeated request with the same ID and same employee/state payload returns its original response. Reusing an ID with a different payload or submitting stale state returns `409`; invalid input or an active absence notice returns `422`; missing credentials return `401`; an employee outside the active allowlist returns `403`. The API is limited to 60 requests per minute for each credential/employee pair.

## Rotation and rollout

To revoke access, remove the token or replace it with a new secret in the server environment, then restart/reload WorkForce configuration using the standard deployment procedure. Update the Gen Mdse server secret at the same time. Review the employee allowlist whenever mappings change. Do not reuse the credential for database access or other integrations.

Before enabling punch calls, verify each mapped employee and their actual assigned schedule, especially overnight shifts. Test reads and retries with fictional data. Production employee mappings and live acceptance remain separate rollout steps.
