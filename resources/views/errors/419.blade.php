<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Session expired — PMPC Employee Management System</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; }
        body {
            font-family: 'Inter', Arial, sans-serif;
            background: #06090D;
            color: #E7F1EE;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            overflow: hidden;
            position: relative;
        }
        .hud-grid {
            position: fixed; inset: 0;
            background-image:
                linear-gradient(rgba(139,124,246,0.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(139,124,246,0.05) 1px, transparent 1px);
            background-size: 34px 34px;
            animation: gridDrift 16s linear infinite;
            pointer-events: none;
        }
        @keyframes gridDrift { from { background-position: 0 0; } to { background-position: 60px 60px; } }
        .glow {
            position: fixed;
            top: -18rem; left: 50%; transform: translateX(-50%);
            width: 34rem; height: 34rem;
            border-radius: 50%;
            filter: blur(120px);
            opacity: 0.18;
            pointer-events: none;
        }
        .card {
            position: relative;
            z-index: 1;
            max-width: 460px;
            width: 100%;
            text-align: center;
            background: rgba(14,20,27,0.72);
            border: 1px solid #1F2C35;
            border-radius: 24px;
            backdrop-filter: blur(20px);
            padding: 48px 36px 36px;
            animation: fadeSlideUp 0.5s ease-out both;
            transform-style: preserve-3d;
            transition: transform 0.25s ease;
            will-change: transform;
        }
        .card::before {
            content: '';
            position: absolute; inset: 0;
            border-radius: 24px;
            background: radial-gradient(280px circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.06), transparent 60%);
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }
        .card:hover::before { opacity: 1; }
        @keyframes fadeSlideUp { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
        .icon-chip {
            width: 56px; height: 56px;
            border-radius: 16px;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 20px;
            cursor: pointer;
        }
        .clock-hand {
            transform-origin: 12px 12px;
            animation: tick 60s steps(60) infinite;
        }
        @keyframes tick { to { transform: rotate(360deg); } }
        .icon-chip:hover .clock-hand { animation-duration: 2s; }
        .code {
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            font-size: 64px;
            line-height: 1;
            letter-spacing: -0.02em;
            margin-bottom: 6px;
        }
        h1 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 19px;
            font-weight: 600;
            color: #E7F1EE;
            margin-bottom: 10px;
        }
        p.msg {
            font-size: 13.5px;
            line-height: 1.6;
            color: #83979C;
            margin-bottom: 28px;
        }
        .actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .btn {
            display: inline-flex; align-items: center; justify-content: center;
            gap: 6px;
            padding: 10px 20px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            border: none;
            transition: filter 0.15s ease, background 0.15s ease, transform 0.15s ease;
            font-family: inherit;
            position: relative;
            overflow: hidden;
        }
        .btn:active { transform: scale(0.96); }
        .btn .ripple {
            position: absolute;
            border-radius: 50%;
            background: rgba(255,255,255,0.35);
            transform: translate(-50%, -50%) scale(0);
            animation: rippleOut 0.6s ease-out forwards;
            pointer-events: none;
        }
        @keyframes rippleOut { to { transform: translate(-50%, -50%) scale(1); opacity: 0; } }
        .btn-primary {
            background: #8B7CF6;
            color: #0A0714;
        }
        .btn-primary:hover { filter: brightness(1.1); }
        .btn-ghost {
            background: rgba(255,255,255,0.03);
            color: #83979C;
            border: 1px solid #1F2C35;
        }
        .btn-ghost:hover { color: #E7F1EE; background: rgba(255,255,255,0.06); }
        .brand {
            margin-top: 28px;
            padding-top: 20px;
            border-top: 1px solid #1F2C35;
            font-size: 10.5px;
            color: #4C5C61;
            letter-spacing: 0.03em;
        }
        .brand b { color: #83979C; }
    </style>
</head>
<body>
    <div class="hud-grid"></div>
    <div class="glow" style="background:#FFC168;"></div>

    <div class="card">
        <div class="icon-chip" style="background:rgba(255,193,104,0.14);">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFC168" stroke-width="1.7">
                <circle cx="12" cy="12" r="8.5" stroke-linecap="round"/>
                <path d="M12 8v4" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
                <line class="clock-hand" x1="12" y1="12" x2="12" y2="5.7" stroke-linecap="round" stroke-width="1.3"/>
            </svg>
        </div>
        <p class="code" style="color:#FFC168; font-size:44px;">Session expired</p>
        <h1 style="margin-top:8px;">Your page timed out</h1>
        <p class="msg">For your security, we sign you out after a period of inactivity. Reload the page and try your last action again.</p>
        <div class="actions">
            <button onclick="window.location.reload()" class="btn btn-primary">Reload page</button>
            <a href="/" class="btn btn-ghost">Go home</a>
        </div>
        <div class="brand"><b>PMPC Employee Management System</b> · People's Multi-Purpose Cooperative</div>
    </div>

    <script>
        (function () {
            var card = document.querySelector('.card');

            // Cursor-reactive tilt + spotlight
            card.addEventListener('mousemove', function (e) {
                var r = card.getBoundingClientRect();
                var x = e.clientX - r.left, y = e.clientY - r.top;
                card.style.setProperty('--x', x + 'px');
                card.style.setProperty('--y', y + 'px');
                var rx = ((y / r.height) - 0.5) * -6;
                var ry = ((x / r.width) - 0.5) * 6;
                card.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg)';
            });
            card.addEventListener('mouseleave', function () {
                card.style.transform = 'perspective(800px) rotateX(0) rotateY(0)';
            });

            // Button ripple on click
            document.querySelectorAll('.btn').forEach(function (btn) {
                btn.addEventListener('click', function (e) {
                    var r = btn.getBoundingClientRect();
                    var ripple = document.createElement('span');
                    var size = Math.max(r.width, r.height) * 1.6;
                    ripple.className = 'ripple';
                    ripple.style.width = ripple.style.height = size + 'px';
                    ripple.style.left = (e.clientX - r.left) + 'px';
                    ripple.style.top = (e.clientY - r.top) + 'px';
                    btn.appendChild(ripple);
                    setTimeout(function () { ripple.remove(); }, 600);
                });
            });
        })();
    </script>
</body>
</html>