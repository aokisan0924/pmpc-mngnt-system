<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Access denied — PMPC Employee Management System</title>
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
        @keyframes denyShake {
            0%,100% { transform: translateX(0); }
            15% { transform: translateX(-6px); }
            30% { transform: translateX(6px); }
            45% { transform: translateX(-4px); }
            60% { transform: translateX(4px); }
            75% { transform: translateX(-2px); }
            90% { transform: translateX(2px); }
        }
        .icon-chip.shake { animation: denyShake 0.5s ease; }
        .icon-chip svg { transition: filter 0.2s ease; }
        .icon-chip:hover svg { filter: drop-shadow(0 0 6px rgba(255,107,129,0.6)); }
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
    <div class="glow" style="background:#FF6B81;"></div>

    <div class="card">
        <div class="icon-chip" style="background:rgba(255,107,129,0.14);" id="icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FF6B81" stroke-width="1.7">
                <rect x="5" y="11" width="14" height="9" rx="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8 11V7a4 4 0 018 0v4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <p class="code" style="color:#FF6B81;">403</p>
        <h1>Access denied</h1>
        <p class="msg">You don't have permission to view this page. If you think this is a mistake, contact your administrator — or if you're signed in to the wrong account, sign out and try again.</p>
        <div class="actions">
            <a href="/" class="btn btn-primary">Go home</a>
            <form method="POST" action="/logout" style="display:inline;">
                @csrf
                <button type="submit" class="btn btn-ghost">Sign out</button>
            </form>
        </div>
        <div class="brand"><b>PMPC Employee Management System</b> · People's Multi-Purpose Cooperative</div>
    </div>

    <script>
        (function () {
            var card = document.querySelector('.card');
            var icon = document.getElementById('icon');

            function shake() {
                icon.classList.remove('shake');
                void icon.offsetWidth;
                icon.classList.add('shake');
            }

            // "Denied" shake once on load
            setTimeout(shake, 400);
            // Click the lock to shake it again
            icon.addEventListener('click', shake);

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