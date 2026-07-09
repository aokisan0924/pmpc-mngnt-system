<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 10px;
    color: #1a1a1a;
    -webkit-font-smoothing: antialiased;
  }
  .page { padding: 32px 36px; max-width: 100%; }

  /* ============ Header ============ */
  .header {
    display:flex; justify-content:space-between; align-items:center;
    margin-bottom:20px; padding-bottom:16px;
    border-bottom: 2px solid #0F6E56;
  }
  .coop-block { display:flex; align-items:center; gap:10px; }
  .coop-mark {
    width:34px; height:34px; border-radius:8px;
    background: linear-gradient(135deg,#0F6E56,#0A4C3B);
    display:flex; align-items:center; justify-content:center;
    color:#fff; font-size:14px; font-weight:bold; flex-shrink:0;
  }
  .coop-name { font-size:13.5px; font-weight:700; color:#0F6E56; letter-spacing:.2px; }
  .coop-addr { font-size:8.3px; color:#6b7280; margin-top:2px; }
  .payslip-label { text-align:right; }
  .payslip-label .title {
    font-size:17px; font-weight:800; color:#111827; letter-spacing:1.5px;
  }
  .payslip-label .month {
    font-size:9.5px; color:#0F6E56; font-weight:600; margin-top:3px;
    text-transform:uppercase; letter-spacing:.4px;
  }

  /* ============ Employee info ============ */
  .emp-info {
    display:flex; flex-wrap:wrap;
    margin-bottom:12px; border:1px solid #e5eae8; border-radius:8px;
    overflow:hidden; background:#fbfdfc;
  }
  .emp-field {
    flex:1; min-width:110px; padding:9px 14px;
    border-right:1px solid #e5eae8; border-bottom:1px solid #e5eae8;
  }
  .emp-field:last-child { border-right:none; }
  .ef-label {
    font-size:7.5px; text-transform:uppercase; color:#8a8f8d;
    letter-spacing:.5px; margin-bottom:3px; font-weight:600;
  }
  .ef-value { font-size:10.5px; font-weight:700; color:#111827; }

  .confidential {
    text-align:center; font-size:7.8px; color:#9ca3af; font-style:italic;
    margin-bottom:14px;
  }

  /* ============ Two-column layout ============ */
  .cols { display:flex; gap:14px; margin-bottom:14px; }
  .col { flex:1; }

  /* ============ Earnings / deduction tables ============ */
  .section-title {
    font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.6px;
    color:#fff; background:#0F6E56; padding:6px 12px; border-radius:6px 6px 0 0;
    display:flex; align-items:center; gap:6px;
  }
  .section-title.ded { background:#3730A3; }

  table.items {
    width:100%; border-collapse:collapse;
    border:1px solid #e5eae8; border-top:none; border-radius:0 0 6px 6px; overflow:hidden;
  }
  table.items td { padding:5px 12px; font-size:9.3px; border-bottom:1px solid #f0f3f2; }
  table.items tr:last-child td { border-bottom:none; }
  table.items td.label { color:#4b5563; }
  table.items td.amt { text-align:right; font-family:'Courier New',monospace; color:#111827; white-space:nowrap; }
  table.items td.amt.neg { color:#b91c1c; }
  table.items td.amt.muted { color:#5b6b67; font-size:8.8px; }

  table.items tr.subtotal td {
    background:#eef7f4; font-weight:700; font-size:9px; color:#0F6E56;
    border-top:1px solid #cfe4dd;
  }
  table.items tr.subtotal-ded td {
    background:#EEEDFC; font-weight:700; font-size:9px; color:#3730A3;
    border-top:1px solid #d3d0f5;
  }
  table.items tr.indent td.label { padding-left:20px; color:#6b7280; font-size:9px; }
  table.items tr.cutoff-header td {
    background:#f2f9f6; font-size:8.7px; font-weight:700; color:#0a4c3b;
    text-transform:uppercase; letter-spacing:.3px;
    display:flex; justify-content:space-between; align-items:center;
  }
  table.items tr.cutoff-header { display:table-row; }
  table.items tr.cutoff-header .days-tag {
    font-size:8px; font-weight:600; color:#0F6E56; background:#dcefe8;
    padding:1.5px 7px; border-radius:10px; text-transform:none; letter-spacing:0;
  }
  table.items tr.total-row td {
    font-weight:700; font-size:10.5px; padding:8px 12px;
  }

  /* ============ Net pay box ============ */
  .net-box {
    display:flex; justify-content:space-between; align-items:center;
    background: linear-gradient(135deg,#0F6E56,#0A4C3B);
    border-radius:8px; padding:14px 18px; margin-bottom:20px;
  }
  .net-box .net-label { font-size:10px; font-weight:600; color:rgba(255,255,255,0.85); text-transform:uppercase; letter-spacing:.6px; }
  .net-box .net-sub { font-size:8px; color:rgba(255,255,255,0.6); margin-top:2px; }
  .net-box .net-amount { font-size:19px; font-weight:800; color:#fff; font-family:'Courier New',monospace; }

  /* ============ Signatures ============ */
  .sigs { display:flex; justify-content:center; gap:60px; margin-top:24px; }
  .sig-block { text-align:center; width:220px; }
  .sig-img-wrap {
    height:38px; display:flex; align-items:flex-end; justify-content:center;
    margin-bottom:2px;
  }
  .sig-img-wrap img { max-height:36px; max-width:150px; object-fit:contain; }
  .sig-line { border-top:1px solid #9ca3af; margin-top:4px; margin-bottom:4px; }
  .sig-line.no-img { margin-top:34px; }
  .sig-name { font-size:9.5px; font-weight:700; color:#111827; }
  .sig-role { font-size:8.3px; color:#6b7280; margin-top:1px; }

  /* ============ Footer ============ */
  .footer {
    margin-top:16px; text-align:center; font-size:7.3px; color:#b0b5b3;
    border-top:1px solid #eef0ef; padding-top:8px;
  }
</style>
</head>
<body>
@php
    $d = $data;
    function p($n) { return number_format((float)$n, 2); }
@endphp
<div class="page">

    {{-- Header --}}
    <div class="header">
        <div class="coop-block">
            <div class="coop-mark">{{ strtoupper(substr($settings['coop_name'], 0, 1)) }}</div>
            <div>
                <div class="coop-name">{{ $settings['coop_name'] }}</div>
                <div class="coop-addr">{{ $settings['coop_address'] }}</div>
            </div>
        </div>
        <div class="payslip-label">
            <div class="title">PAYSLIP</div>
            <div class="month">{{ $d['month'] }}</div>
        </div>
    </div>

    {{-- Employee info --}}
    <div class="emp-info">
        <div class="emp-field">
            <div class="ef-label">Employee name</div>
            <div class="ef-value">{{ $d['employee']->full_name }}</div>
        </div>
        <div class="emp-field">
            <div class="ef-label">Employee ID</div>
            <div class="ef-value">{{ $d['employee']->employee_id }}</div>
        </div>
        <div class="emp-field">
            <div class="ef-label">Department</div>
            <div class="ef-value">{{ $d['employee']->department ?? '—' }}</div>
        </div>
        <div class="emp-field">
            <div class="ef-label">Position</div>
            <div class="ef-value">{{ $d['employee']->position ?? '—' }}</div>
        </div>
        <div class="emp-field">
            <div class="ef-label">Daily rate</div>
            <div class="ef-value">₱ {{ p($d['daily_rate']) }}</div>
        </div>
        <div class="emp-field" style="border-right:none">
            <div class="ef-label">Days worked</div>
            <div class="ef-value">{{ $d['total_days_worked'] ?? '—' }}</div>
        </div>
    </div>

    <div class="confidential">This payslip is confidential. Please do not share with unauthorized persons.</div>

    <div class="cols">

        {{-- Earnings --}}
        <div class="col">
            <div class="section-title">Earnings</div>
            <table class="items">
                {{-- 1st cutoff --}}
                @if($d['first_period'])
                <tr class="cutoff-header">
                    <td colspan="2">
                        1st cutoff &nbsp;·&nbsp; {{ $d['first_period'] }}
                        @if(isset($d['first_days_worked']))
                            <span class="days-tag">{{ $d['first_days_worked'] }} {{ Str::plural('day', $d['first_days_worked']) }}</span>
                        @endif
                    </td>
                </tr>
                <tr class="indent">
                    <td class="label">Basic pay</td>
                    <td class="amt">₱ {{ p($d['first_basic']) }}</td>
                </tr>
                @if($d['first_transpo'] > 0)
                <tr class="indent">
                    <td class="label">Transportation allowance</td>
                    <td class="amt">₱ {{ p($d['first_transpo']) }}</td>
                </tr>
                @endif
                @if($d['first_rep'] > 0)
                <tr class="indent">
                    <td class="label">Representation allowance</td>
                    <td class="amt">₱ {{ p($d['first_rep']) }}</td>
                </tr>
                @endif
                @if($d['first_quarterly'] > 0)
                <tr class="indent">
                    <td class="label">Quarterly allowance</td>
                    <td class="amt">₱ {{ p($d['first_quarterly']) }}</td>
                </tr>
                @endif
                @if($d['first_ot_weekday'] > 0)
                <tr class="indent">
                    <td class="label">Overtime (weekday)</td>
                    <td class="amt">₱ {{ p($d['first_ot_weekday']) }}</td>
                </tr>
                @endif
                @if($d['first_ot_weekend'] > 0)
                <tr class="indent">
                    <td class="label">Overtime (weekend)</td>
                    <td class="amt">₱ {{ p($d['first_ot_weekend']) }}</td>
                </tr>
                @endif
                <tr class="subtotal">
                    <td class="label">1st cutoff subtotal</td>
                    <td class="amt">₱ {{ p($d['first_gross']) }}</td>
                </tr>
                @endif

                {{-- 2nd cutoff --}}
                @if($d['second_period'])
                <tr class="cutoff-header">
                    <td colspan="2">
                        2nd cutoff &nbsp;·&nbsp; {{ $d['second_period'] }}
                        @if(isset($d['second_days_worked']))
                            <span class="days-tag">{{ $d['second_days_worked'] }} {{ Str::plural('day', $d['second_days_worked']) }}</span>
                        @endif
                    </td>
                </tr>
                <tr class="indent">
                    <td class="label">Basic pay</td>
                    <td class="amt">₱ {{ p($d['second_basic']) }}</td>
                </tr>
                @if($d['second_transpo'] > 0)
                <tr class="indent">
                    <td class="label">Transportation allowance</td>
                    <td class="amt">₱ {{ p($d['second_transpo']) }}</td>
                </tr>
                @endif
                @if($d['second_rep'] > 0)
                <tr class="indent">
                    <td class="label">Representation allowance</td>
                    <td class="amt">₱ {{ p($d['second_rep']) }}</td>
                </tr>
                @endif
                @if($d['second_quarterly'] > 0)
                <tr class="indent">
                    <td class="label">Quarterly allowance</td>
                    <td class="amt">₱ {{ p($d['second_quarterly']) }}</td>
                </tr>
                @endif
                @if($d['second_ot_weekday'] > 0)
                <tr class="indent">
                    <td class="label">Overtime (weekday)</td>
                    <td class="amt">₱ {{ p($d['second_ot_weekday']) }}</td>
                </tr>
                @endif
                @if($d['second_ot_weekend'] > 0)
                <tr class="indent">
                    <td class="label">Overtime (weekend)</td>
                    <td class="amt">₱ {{ p($d['second_ot_weekend']) }}</td>
                </tr>
                @endif
                <tr class="subtotal">
                    <td class="label">2nd cutoff subtotal</td>
                    <td class="amt">₱ {{ p($d['second_gross']) }}</td>
                </tr>
                @endif

                {{-- Total gross --}}
                <tr class="total-row" style="background:#e6f7f1;">
                    <td class="label" style="color:#085041;">Total gross pay</td>
                    <td class="amt" style="color:#085041;">₱ {{ p($d['total_gross']) }}</td>
                </tr>
            </table>
        </div>

        {{-- Deductions --}}
        <div class="col">
            <div class="section-title ded">Deductions</div>
            <table class="items">
                {{-- Government --}}
                <tr class="cutoff-header" style="background:#EEEDFC; color:#3730A3;">
                    <td colspan="2">Government deductions</td>
                </tr>
                <tr class="indent">
                    <td class="label">SSS</td>
                    <td class="amt neg">{{ $d['sss'] > 0 ? '(₱ '.p($d['sss']).')' : '—' }}</td>
                </tr>
                <tr class="indent">
                    <td class="label">PhilHealth</td>
                    <td class="amt neg">{{ $d['philhealth'] > 0 ? '(₱ '.p($d['philhealth']).')' : '—' }}</td>
                </tr>
                <tr class="indent">
                    <td class="label">Pag-IBIG</td>
                    <td class="amt neg">{{ $d['pagibig'] > 0 ? '(₱ '.p($d['pagibig']).')' : '—' }}</td>
                </tr>
                <tr class="indent">
                    <td class="label">Withholding tax</td>
                    <td class="amt neg">{{ $d['tax'] > 0 ? '(₱ '.p($d['tax']).')' : '—' }}</td>
                </tr>
                <tr class="subtotal-ded">
                    <td class="label">Government subtotal</td>
                    <td class="amt" style="color:#3730A3;">(₱ {{ p($d['govt_subtotal']) }})</td>
                </tr>

                {{-- Other --}}
                <tr class="cutoff-header" style="background:#fef9ee; color:#92400e;">
                    <td colspan="2">Other deductions</td>
                </tr>
                <tr class="indent">
                    <td class="label">Loan</td>
                    <td class="amt neg">{{ $d['loan'] > 0 ? '(₱ '.p($d['loan']).')' : '—' }}</td>
                </tr>
                <tr class="indent">
                    <td class="label">Cash advance</td>
                    <td class="amt neg">{{ $d['cash_advance'] > 0 ? '(₱ '.p($d['cash_advance']).')' : '—' }}</td>
                </tr>
                <tr class="indent">
                    <td class="label">Savings</td>
                    <td class="amt neg">{{ $d['savings'] > 0 ? '(₱ '.p($d['savings']).')' : '—' }}</td>
                </tr>
                <tr class="indent">
                    <td class="label">Capital contribution</td>
                    <td class="amt neg">{{ $d['capital_contribution'] > 0 ? '(₱ '.p($d['capital_contribution']).')' : '—' }}</td>
                </tr>
                @if($d['other'] > 0)
                <tr class="indent">
                    <td class="label">Other</td>
                    <td class="amt neg">(₱ {{ p($d['other']) }})</td>
                </tr>
                @endif
                <tr class="subtotal-ded">
                    <td class="label">Other subtotal</td>
                    <td class="amt" style="color:#3730A3;">(₱ {{ p($d['other_subtotal']) }})</td>
                </tr>

                {{-- Total deductions --}}
                <tr class="total-row" style="background:#fce8e8;">
                    <td class="label" style="color:#b91c1c;">Total deductions</td>
                    <td class="amt" style="color:#b91c1c;">(₱ {{ p($d['total_deductions']) }})</td>
                </tr>
            </table>
        </div>
    </div>

    {{-- Net pay --}}
    <div class="net-box">
        <div>
            <div class="net-label">Net pay</div>
            <div class="net-sub">{{ $d['month'] }}</div>
        </div>
        <span class="net-amount">₱ {{ p($d['net_pay']) }}</span>
    </div>

    {{-- Signatures --}}
    <div class="sigs">
        <div class="sig-block">
            @if(!empty($settings['signatory_1_signature']))
                <div class="sig-img-wrap">
                    <img src="{{ $settings['signatory_1_signature'] }}" alt="Signature">
                </div>
                <div class="sig-line"></div>
            @else
                <div class="sig-line no-img"></div>
            @endif
            <div class="sig-name">{{ $settings['signatory_1_name'] }}</div>
            <div class="sig-role">{{ $settings['signatory_1_role'] }}</div>
        </div>
        <div class="sig-block">
            @if(!empty($settings['signatory_2_signature']))
                <div class="sig-img-wrap">
                    <img src="{{ $settings['signatory_2_signature'] }}" alt="Signature">
                </div>
                <div class="sig-line"></div>
            @else
                <div class="sig-line no-img"></div>
            @endif
            <div class="sig-name">{{ $settings['signatory_2_name'] }}</div>
            <div class="sig-role">{{ $settings['signatory_2_role'] }}</div>
        </div>
    </div>

    <div class="footer">
        Generated by PMPC WorkForce · {{ now()->format('F d, Y h:i A') }}
        · This document is system-generated and valid without a wet signature.
    </div>

</div>
</body>
</html>