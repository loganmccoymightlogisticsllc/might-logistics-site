# Builds portal/index.html (the live shipper portal). Run from the repo root: python3 portal-src/build_portal.py
import os
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda n: open(os.path.join(here, n), encoding='utf-8').read()
SB_URL = 'https://wgtryggabrcctpwyavqe.supabase.co'
SB_KEY = 'sb_publishable_3nUoDYzDXDZ-pRvS94vvbw_4gysEc6r'   # publishable key: safe to ship in the page
html = '''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Might Shipper Portal</title><meta name="robots" content="noindex,nofollow">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>[hidden]{display:none!important}
''' + rd('portal.css') + '''
.lg .lgp{display:grid;gap:12px}.lnk{background:none;border:0;color:var(--brand);cursor:pointer;text-align:left;padding:0;font-size:.85rem}
#lgmsg{color:var(--bad);min-height:1.3em;font-size:.85rem;margin-top:6px}.lg .form input{width:100%}
</style></head><body>
''' + rd('symbols.svg') + '''
<div id="login"><div class="lg">
 <div class="brand"><svg><use href="#hex"/></svg><span><b>MIGHT</b><small>SHIPPER PORTAL</small></span></div>
 <form id="lgf" class="lgp"><h2>Sign in to track your freight</h2>
  <div class="form"><label for="lge">Email<input id="lge" type="email" required autocomplete="username"></label>
  <label for="lgp">Password<input id="lgp" type="password" required autocomplete="current-password"></label>
  <button id="lgb" class="btn pri" type="submit">Sign in</button></div>
  <button id="lgfp" class="lnk" type="button">Forgot password?</button>
  <div class="sub" style="font-size:.8rem">Need a login? Call (201) 377-7043 and we will set you up.</div></form>
 <form id="lgr" class="lgp" hidden><h2>Choose a new password</h2><div class="form"><label for="lgn">New password (12+ characters)<input id="lgn" type="password" minlength="12" required autocomplete="new-password"></label><button class="btn pri" type="submit">Save and sign in</button></div></form>
 <div id="lgmsg" role="alert"></div>
</div></div>
<div id="app" hidden>
 <div class="bar"><div class="in">
  <div class="brand"><svg><use href="#hex"/></svg><span><b>MIGHT</b><small>SHIPPER PORTAL</small></span></div>
  <nav class="tabs" id="tabs"></nav>
  <div class="who"><span id="who"></span><button id="out" type="button" data-a="out">Sign out</button></div>
 </div></div>
 <main class="wrap"><div class="head"><div><h1 id="ttl"></h1><p id="sub"></p></div><div id="act"></div></div><div id="view"></div></main>
</div>
<div id="drawer" class="drawer" hidden></div><div id="modal" class="modal" hidden></div><div id="toast" class="toast" hidden></div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js"></script>
<script>
''' + rd('portal.js').replace('__SB_URL__', SB_URL).replace('__SB_KEY__', SB_KEY) + '''
</script></body></html>
'''
os.makedirs(os.path.join(here, '..', 'portal'), exist_ok=True)
open(os.path.join(here, '..', 'portal', 'index.html'), 'w', encoding='utf-8').write(html)
print('built portal/index.html', len(html))
