# Builds crm/index.html (the live staff app) from the sources in this folder.
# Usage: python3 crm-src/build_live.py   (run from the repo root)
import re, os
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda n: open(os.path.join(here, n), encoding='utf-8').read()
SB_URL = 'https://wgtryggabrcctpwyavqe.supabase.co'
SB_KEY = 'sb_publishable_3nUoDYzDXDZ-pRvS94vvbw_4gysEc6r'   # publishable key: safe to ship in the page
b = rd('might-crm.base.html')
def rep(a, c):
    global b
    assert b.count(a) == 1, a[:60]
    b = b.replace(a, c)
rep('<title>Might CRM</title>', '<title>Might CRM</title>\n<meta name="robots" content="noindex,nofollow">')
rep('<span class="th"><label for="me" class="sub" style="color:#8FA3C2">Viewing as</label><select id="me"></select></span>', '<span class="th" hidden><select id="me"></select></span><span id="whoami" class="th"></span>')
rep("usr(OPP.filter(function(o){return o.acc===a.id})[0].owner).n", "((OPP.filter(function(o){return o.acc===a.id})[0]||{}).owner?usr(OPP.filter(function(o){return o.acc===a.id})[0].owner).n:'')")
rep('log:window.logV,load:window.loadDV}', 'log:window.logV,load:window.loadDV,inbox:window.inboxV,team:window.teamV}')
login = '''<div id="login"><form id="lgf" class="lgbox"><div class="lglogo"><svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true"><polygon points="20,2 36,11 36,29 20,38 4,29 4,11" fill="#0D1D34" stroke="#3B8CFF" stroke-width="2"/><path d="M12 27V13l8 9 8-9v14" fill="none" stroke="#FFB020" stroke-width="3" stroke-linejoin="round"/></svg><b>MIGHT CRM</b></div><h1>Sign in</h1><label for="lge">Email<input id="lge" type="email" required autocomplete="username"></label><label for="lgp">Password<input id="lgp" type="password" required autocomplete="current-password"></label><button id="lgb" class="btn pri" type="submit">Sign in</button><div id="lgmsg" role="alert"></div><div class="sub" style="font-size:12px">Staff only. Ask an admin if you need access.</div></form></div>
'''
rep('<div id="np" hidden', login + '<div id="np" hidden')
rep('<script>\n(function(){', '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>\n<script>\n(function(){')
live = rd('live.js').replace('__SB_URL__', SB_URL).replace('__SB_KEY__', SB_KEY)
css = rd('reports.css') + rd('themes.css') + rd('ops.css') + '''
#login{position:fixed;inset:0;z-index:200;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:16px}
#login[hidden]{display:none}
.lgbox{background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:26px;width:min(380px,100%);display:flex;flex-direction:column;gap:12px}
.lgbox h1{margin:0;font-size:1.4rem}.lgbox label{display:block;font-size:12.5px;font-weight:600;color:var(--muted)}
.lgbox input{display:block;width:100%;margin-top:4px;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:10px;color:var(--ink)}
.lglogo{display:flex;align-items:center;gap:10px;font-weight:700;letter-spacing:.06em}
#lgmsg{color:var(--bad);min-height:1.2em;font-size:13px}
#whoami{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
'''
b = b.replace('/*REPORTS*/', rd('ops.js') + '\n' + rd('pros.js') + '\n' + rd('reports.js') + '\n' + live).replace('</style>', css + '</style>', 1)
os.makedirs(os.path.join(here, '..', 'crm'), exist_ok=True)
open(os.path.join(here, '..', 'crm', 'index.html'), 'w', encoding='utf-8').write(b)
print('built crm/index.html', len(b))
