<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 20px 24px 18px; }

        * { box-sizing: border-box; }
        body { color: #16221f; font-family: DejaVu Sans, sans-serif; font-size: 9px; line-height: 1.35; }
        table { border-collapse: collapse; width: 100%; }

        .document-header { border-bottom: 1px solid #b7d8cf; margin-bottom: 14px; padding: 0 0 11px; }
        .header-bar { background: #0f6e56; height: 5px; margin-bottom: 10px; }
        .brand-name { color: #0f6e56; font-size: 12px; font-weight: bold; letter-spacing: .2px; }
        .brand-address { color: #5b6c66; font-size: 8px; margin-top: 2px; }
        .document-title { color: #15231f; font-size: 17px; font-weight: bold; letter-spacing: 1.4px; text-align: right; }
        .document-subtitle { color: #62736d; font-size: 8px; letter-spacing: .7px; text-align: right; text-transform: uppercase; }

        .section-label { color: #60736c; font-size: 7.5px; font-weight: bold; letter-spacing: .9px; margin: 0 0 5px; text-transform: uppercase; }
        .employee-card { background: #f3f8f6; border: 1px solid #c9e1da; margin-bottom: 12px; }
        .employee-card td { border-right: 1px solid #d8e9e3; padding: 8px 10px; vertical-align: top; }
        .employee-card td:last-child { border-right: 0; }
        .field-label { color: #6f807a; font-size: 7px; font-weight: bold; letter-spacing: .65px; text-transform: uppercase; }
        .field-value { color: #17241f; font-size: 10px; font-weight: bold; margin-top: 3px; }

        .summary { border: 1px solid #d4e5df; margin-bottom: 14px; }
        .summary td { border-right: 1px solid #dcebe6; padding: 8px 6px; text-align: center; width: 20%; }
        .summary td:last-child { border-right: 0; }
        .summary-value { color: #0f6e56; font-size: 15px; font-weight: bold; }
        .summary-label { color: #687a74; font-size: 7.5px; margin-top: 2px; text-transform: uppercase; }
        .summary-late { color: #b45309; }
        .summary-absent { color: #b91c1c; }
        .summary-half { color: #8b5a17; }

        .dtr-table { border: 1px solid #b8d2ca; margin-bottom: 15px; }
        .dtr-table thead { display: table-header-group; }
        .dtr-table thead tr { background: #0f6e56; color: #ffffff; }
        .dtr-table th { border-right: 1px solid rgba(255,255,255,.22); font-size: 7.5px; font-weight: bold; letter-spacing: .45px; padding: 7px 5px; text-align: center; text-transform: uppercase; }
        .dtr-table th:last-child { border-right: 0; }
        .dtr-table td { border-right: 1px solid #e1ece8; border-top: 1px solid #e1ece8; font-size: 8.5px; padding: 5px; text-align: center; vertical-align: middle; }
        .dtr-table td:last-child { border-right: 0; }
        .dtr-table tbody tr:nth-child(even) { background: #f8fbfa; }
        .dtr-table tbody tr.weekend { background: #f1f5f3; color: #7b8984; }
        .date-cell { font-weight: bold; text-align: left !important; }
        .time-cell { color: #263a34; font-family: DejaVu Sans Mono, monospace; }
        .hours-cell { font-family: DejaVu Sans Mono, monospace; font-weight: bold; }
        .status-badge { border-radius: 10px; display: inline-block; font-size: 7.5px; font-weight: bold; line-height: 1; padding: 3px 5px; white-space: nowrap; }
        .badge-on_time { background: #e4f5ee; color: #0a684e; }
        .badge-late, .badge-undertime, .badge-half_day, .badge-in_progress { background: #fff2d6; color: #9a5808; }
        .badge-absent { background: #fde8e8; color: #a82e2e; }
        .badge-rest_day { background: #e8edeb; color: #66756f; }

        .signature-section { margin-top: 4px; page-break-inside: avoid; }
        .signature-table td { padding: 0 9px; text-align: center; vertical-align: bottom; width: 33.33%; }
        .signature-space { height: 28px; }
        .signature-line { border-top: 1px solid #556760; padding-top: 4px; }
        .signature-name { color: #1e302a; font-size: 9px; font-weight: bold; }
        .signature-role { color: #6d7d77; font-size: 7.5px; margin-top: 2px; }
        .footer { border-top: 1px solid #d9e5e1; color: #7a8984; font-size: 7px; margin-top: 15px; padding-top: 7px; text-align: center; }
    </style>
</head>
<body>
    <div class="document-header">
        <div class="header-bar"></div>
        <table>
            <tr>
                <td style="width:60%; vertical-align:top;">
                    <div class="brand-name">{{ $settings['coop_name'] }}</div>
                    <div class="brand-address">{{ $settings['coop_address'] }}</div>
                </td>
                <td style="width:40%; vertical-align:bottom;">
                    <div class="document-title">DAILY TIME RECORD</div>
                    <div class="document-subtitle">Attendance record for {{ $month }}</div>
                </td>
            </tr>
        </table>
    </div>

    <p class="section-label">Employee information</p>
    <table class="employee-card">
        <tr>
            <td style="width:34%;">
                <div class="field-label">Employee name</div>
                <div class="field-value">{{ $employee->full_name }}</div>
            </td>
            <td style="width:18%;">
                <div class="field-label">Employee ID</div>
                <div class="field-value">{{ $employee->employee_id }}</div>
            </td>
            <td style="width:24%;">
                <div class="field-label">Department</div>
                <div class="field-value">{{ $employee->department ?: '-' }}</div>
            </td>
            <td style="width:24%;">
                <div class="field-label">Position</div>
                <div class="field-value">{{ $employee->position ?: '-' }}</div>
            </td>
        </tr>
    </table>

    <p class="section-label">Monthly attendance summary</p>
    <table class="summary">
        <tr>
            <td><div class="summary-value">{{ $summary['days_present'] }}</div><div class="summary-label">Days present</div></td>
            <td><div class="summary-value summary-late">{{ $summary['days_late'] }}</div><div class="summary-label">Late arrivals</div></td>
            <td><div class="summary-value summary-absent">{{ $summary['days_absent'] }}</div><div class="summary-label">Absences</div></td>
            <td><div class="summary-value summary-half">{{ $summary['half_days'] }}</div><div class="summary-label">Half days</div></td>
            <td><div class="summary-value">{{ number_format($summary['hours_rendered'], 2) }}<span style="font-size:9px;">h</span></div><div class="summary-label">Hours rendered</div></td>
        </tr>
    </table>

    <p class="section-label">Daily attendance details</p>
    <table class="dtr-table">
        <thead>
            <tr>
                <th style="text-align:left; width:17%;">Date</th>
                <th style="width:7%;">Day</th>
                <th style="width:13%;">AM In</th>
                <th style="width:13%;">AM Out</th>
                <th style="width:13%;">PM In</th>
                <th style="width:13%;">PM Out</th>
                <th style="width:10%;">Hours</th>
                <th style="width:14%;">Status</th>
            </tr>
        </thead>
        <tbody>
            @foreach($calendar as $row)
                <tr class="{{ $row['is_weekend'] ? 'weekend' : '' }}">
                    <td class="date-cell">{{ $row['date']->format('M d, Y') }}</td>
                    <td>{{ $row['day_name'] }}</td>
                    <td class="time-cell">{{ $row['am_time_in'] ? substr($row['am_time_in'], 0, 5) : '-' }}</td>
                    <td class="time-cell">{{ $row['am_time_out'] ? substr($row['am_time_out'], 0, 5) : '-' }}</td>
                    <td class="time-cell">{{ $row['pm_time_in'] ? substr($row['pm_time_in'], 0, 5) : '-' }}</td>
                    <td class="time-cell">{{ $row['pm_time_out'] ? substr($row['pm_time_out'], 0, 5) : '-' }}</td>
                    <td class="hours-cell">{{ $row['hours'] ? number_format($row['hours'], 2) : '-' }}</td>
                    <td><span class="status-badge badge-{{ $row['status'] }}">{{ ucfirst(str_replace('_', ' ', $row['status'])) }}</span></td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <div class="signature-section">
        <p class="section-label">Certification and approval</p>
        <table class="signature-table">
            <tr><td colspan="3" class="signature-space"></td></tr>
            <tr>
                <td><div class="signature-line"><div class="signature-name">{{ $employee->full_name }}</div><div class="signature-role">Employee</div></div></td>
                <td><div class="signature-line"><div class="signature-name">{{ $settings['signatory_1_name'] ?: '____________________' }}</div><div class="signature-role">{{ $settings['signatory_1_role'] ?: 'Verified by' }}</div></div></td>
                <td><div class="signature-line"><div class="signature-name">{{ $settings['signatory_2_name'] ?: '____________________' }}</div><div class="signature-role">{{ $settings['signatory_2_role'] ?: 'Approved by' }}</div></div></td>
            </tr>
        </table>
    </div>

    <div class="footer">Generated by PMPC WorkForce on {{ now('Asia/Manila')->format('F d, Y h:i A') }} | Official attendance record</div>
</body>
</html>
