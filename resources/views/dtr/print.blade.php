<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 10px; color: #111; padding: 24px; }

        .header { text-align: center; margin-bottom: 16px; }
        .header .coop-name { font-size: 13px; font-weight: bold; color: #0F6E56; }
        .header .address   { font-size: 9px; color: #555; margin-top: 2px; }
        .header .doc-title { font-size: 15px; font-weight: bold; margin: 10px 0 4px; text-transform: uppercase; letter-spacing: 1px; }
        .header .period    { font-size: 10px; color: #444; }

        .employee-info { display: flex; justify-content: space-between; margin-bottom: 14px; padding: 10px 14px; background: #f5f9f7; border: 0.5px solid #c5ddd7; border-radius: 6px; }
        .employee-info .field { display: flex; flex-direction: column; gap: 2px; }
        .employee-info .label { font-size: 8px; text-transform: uppercase; color: #777; letter-spacing: .5px; }
        .employee-info .value { font-size: 11px; font-weight: bold; color: #111; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        thead tr { background: #0F6E56; color: #fff; }
        thead th { padding: 6px 8px; text-align: center; font-size: 9px; text-transform: uppercase; letter-spacing: .4px; }
        thead th.left { text-align: left; }
        tbody tr { border-bottom: 0.5px solid #e8eeed; }
        tbody tr:nth-child(even) { background: #f9fbfb; }
        tbody tr.weekend { background: #f0f5f4; color: #888; }
        tbody tr.absent td { color: #cc4444; }
        tbody tr.late td.status-cell { color: #d97706; font-weight: bold; }
        tbody tr.on_time td.status-cell { color: #0F6E56; font-weight: bold; }
        tbody td { padding: 5px 8px; text-align: center; font-size: 9.5px; }
        tbody td.left { text-align: left; }
        tbody td.mono { font-family: 'Courier New', monospace; }

        .status-badge { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 8.5px; font-weight: bold; }
        .badge-on_time  { background: #e6f7f1; color: #0F6E56; }
        .badge-late     { background: #fef3cd; color: #b45309; }
        .badge-undertime{ background: #e0eeff; color: #1d4ed8; }
        .badge-half_day { background: #ede9fe; color: #5b21b6; }
        .badge-absent   { background: #fee2e2; color: #b91c1c; }
        .badge-rest_day { background: #f3f4f6; color: #6b7280; }

        .summary { display: flex; gap: 10px; margin-bottom: 18px; }
        .summary-card { flex: 1; padding: 8px 10px; border: 0.5px solid #c5ddd7; border-radius: 6px; text-align: center; background: #f5f9f7; }
        .summary-card .s-val { font-size: 16px; font-weight: bold; color: #0F6E56; }
        .summary-card .s-label { font-size: 8px; color: #666; margin-top: 1px; }

        .signatures { display: flex; justify-content: space-between; margin-top: 24px; }
        .sig-block { text-align: center; width: 28%; }
        .sig-line { border-top: 0.5px solid #333; margin-top: 28px; margin-bottom: 3px; }
        .sig-name { font-weight: bold; font-size: 10px; }
        .sig-role { font-size: 8.5px; color: #666; }

        .footer { margin-top: 18px; text-align: center; font-size: 8px; color: #aaa; border-top: 0.5px solid #ddd; padding-top: 8px; }
    </style>
</head>
<body>

    <div class="header">
        <div class="coop-name">{{ $settings['coop_name'] }}</div>
        <div class="address">{{ $settings['coop_address'] }}</div>
        <div class="doc-title">Daily Time Record</div>
        <div class="period">{{ $month }}</div>
    </div>

    <div class="employee-info">
        <div class="field">
            <span class="label">Employee name</span>
            <span class="value">{{ $employee->full_name }}</span>
        </div>
        <div class="field">
            <span class="label">Employee ID</span>
            <span class="value">{{ $employee->employee_id }}</span>
        </div>
        <div class="field">
            <span class="label">Department</span>
            <span class="value">{{ $employee->department ?? '—' }}</span>
        </div>
        <div class="field">
            <span class="label">Position</span>
            <span class="value">{{ $employee->position ?? '—' }}</span>
        </div>
    </div>

    {{-- Summary cards --}}
    <div class="summary">
        <div class="summary-card">
            <div class="s-val">{{ $summary['days_present'] }}</div>
            <div class="s-label">Days present</div>
        </div>
        <div class="summary-card">
            <div class="s-val" style="color:#b45309">{{ $summary['days_late'] }}</div>
            <div class="s-label">Days late</div>
        </div>
        <div class="summary-card">
            <div class="s-val" style="color:#b91c1c">{{ $summary['days_absent'] }}</div>
            <div class="s-label">Days absent</div>
        </div>
        <div class="summary-card">
            <div class="s-val" style="color:#5b21b6">{{ $summary['half_days'] }}</div>
            <div class="s-label">Half days</div>
        </div>
        <div class="summary-card">
            <div class="s-val">{{ $summary['hours_rendered'] }}h</div>
            <div class="s-label">Hours rendered</div>
        </div>
    </div>

    {{-- DTR table --}}
    <table>
        <thead>
            <tr>
                <th class="left" style="width:60px">Date</th>
                <th style="width:30px">Day</th>
                <th style="width:65px">AM In</th>
                <th style="width:65px">AM Out</th>
                <th style="width:65px">PM In</th>
                <th style="width:65px">PM Out</th>
                <th style="width:45px">Hours</th>
                <th style="width:70px">Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($calendar as $row)
            <tr class="{{ $row['is_weekend'] ? 'weekend' : $row['status'] }}">
                <td class="left mono">{{ $row['date']->format('M d, Y') }}</td>
                <td>{{ $row['day_name'] }}</td>
                <td class="mono">{{ $row['am_time_in']  ? substr($row['am_time_in'],  0, 5) : '—' }}</td>
                <td class="mono">{{ $row['am_time_out'] ? substr($row['am_time_out'], 0, 5) : '—' }}</td>
                <td class="mono">{{ $row['pm_time_in']  ? substr($row['pm_time_in'],  0, 5) : '—' }}</td>
                <td class="mono">{{ $row['pm_time_out'] ? substr($row['pm_time_out'], 0, 5) : '—' }}</td>
                <td class="mono">{{ $row['hours'] ? number_format($row['hours'], 2) : '—' }}</td>
                <td class="status-cell">
                    <span class="status-badge badge-{{ $row['status'] }}">
                        {{ ucfirst(str_replace('_', ' ', $row['status'])) }}
                    </span>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    {{-- Signatures --}}
    <div class="signatures">
        <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-name">{{ $employee->full_name }}</div>
            <div class="sig-role">Employee</div>
        </div>
        <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-name">{{ $settings['signatory_1_name'] }}</div>
            <div class="sig-role">{{ $settings['signatory_1_role'] }}</div>
        </div>
        <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-name">{{ $settings['signatory_2_name'] }}</div>
            <div class="sig-role">{{ $settings['signatory_2_role'] }}</div>
        </div>
    </div>

    <div class="footer">
        Generated by PMPC WorkForce · {{ now()->format('F d, Y h:i A') }}
    </div>

</body>
</html>