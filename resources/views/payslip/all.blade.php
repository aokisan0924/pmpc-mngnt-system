<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; }
.payslip-page { page-break-after: always; }
.payslip-page:last-child { page-break-after: auto; }
</style>
</head>
<body>
@foreach($payslips as $data)
<div class="payslip-page">
    @include('payslip.single', ['data' => $data, 'settings' => $settings])
</div>
@endforeach
</body>
</html>