(function(){
var f=document.getElementById('obf');if(!f)return;
var steps=[].slice.call(f.querySelectorAll('.ob-step')),cur=0,max=0,KEY='might_carrier_draft_v1';
var $=function(i){return document.getElementById(i)},nxt=$('obn'),bk=$('obb'),side=$('obs');
side.innerHTML=steps.map(function(s,i){return '<li><button type="button" data-i="'+i+'">'+s.getAttribute('data-t')+'</button></li>'}).join('');
function val(el){return (el.value||'').trim()}
function setErr(wrap,msg){wrap.classList.toggle('bad',!!msg);var e=wrap.querySelector('.ob-err');if(e){e.textContent=msg||''}}
function checkField(el){var w=el.closest('.ob-f'),v=val(el),m='';
 if(el.type==='file'){if(el.hasAttribute('data-req')&&!el.files.length)m='Please attach this document.';else if(el.files.length&&el.files[0].size>10*1024*1024)m='File is over 10 MB. Please send a smaller file.';setErr(el.closest('.ob-f'),m);return !m}
 if(el.hasAttribute('data-req')&&!v)m='Required';
 else if(v){var n=el.name;
  if(n==='mc'&&!/^\d{4,8}$/.test(v.replace(/^mc[-\s]*/i,'')))m='Enter the MC number, 4 to 8 digits';
  else if(n==='dot'&&!/^\d{4,8}$/.test(v))m='Enter the USDOT number, 4 to 8 digits';
  else if(el.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))m='Enter a valid email';
  else if(el.type==='tel'&&v.replace(/\D/g,'').length<10)m='Enter a 10 digit phone number';
  else if(/zip$/.test(n)&&!/^\d{5}(-\d{4})?$/.test(v))m='Enter a 5 digit ZIP';
  else if(n==='coiexp'&&el.type==='date'){var d=new Date(v+'T00:00:00'),t=new Date();t.setHours(0,0,0,0);if(d<t)m='This certificate has expired'}}
 setErr(w,m);return !m}
function groupErr(id,wrapSel,ok,msg){var e=$(id);if(!e)return;e.textContent=ok?'':msg;e.classList.toggle('show',!ok);e.parentNode.classList.toggle('bad',!ok)}
function validate(i){var s=steps[i],ok=true,first=null;
 [].slice.call(s.querySelectorAll('input[data-req],select[data-req]')).forEach(function(el){if(el.type==='checkbox'){var g=el.closest('.ob-agree');var c=el.checked;var e=g.querySelector('.ob-err');e.textContent=c?'':'Please confirm to continue';e.classList.toggle('show',!c);if(!c){ok=false;first=first||el}return}
  if(!checkField(el)){ok=false;first=first||el}});
 [].slice.call(s.querySelectorAll('input:not([data-req]):not([type=checkbox]):not([type=radio]):not([type=file])')).forEach(function(el){if(val(el)&&!checkField(el)){ok=false;first=first||el}});
 if(i===1){var q=f.querySelectorAll('[name=equip]:checked').length>0;groupErr('e-equip',0,q,'Pick at least one equipment type');var r=f.querySelectorAll('[name=regions]:checked').length>0;groupErr('e-regions',0,r,'Pick where you run');if(!q||!r){ok=false;first=first||f.querySelector(q?'[name=regions]':'[name=equip]')}}
 if(i===2){var cf=f.querySelector('[name=coi]');if(cf&&!checkField(cf)){ok=false;first=first||cf}}
 if(i===3){var pm=f.querySelector('[name=paymethod]:checked');groupErr('e-paymethod',0,!!pm,'Choose how you get paid');if(!pm){ok=false;first=first||f.querySelector('[name=paymethod]')}
  if(pm&&pm.value==='Factoring company'){['fname','fphone','femail'].forEach(function(n){var el=f.querySelector('[name='+n+']');if(!val(el)){setErr(el.closest('.ob-f'),'Required for factoring');ok=false;first=first||el}else if(!checkField(el)){ok=false;first=first||el}});var nf=f.querySelector('[name=noa]');if(!nf.files.length){setErr(nf.closest('.ob-f'),'Attach your notice of assignment');ok=false;first=first||nf}}}
 if(i===4){var sf=f.querySelector('[name=safety]:checked');groupErr('e-safety',0,!!sf,'Please answer');if(!sf){ok=false;first=first||f.querySelector('[name=safety]')}}
 if(first&&first.focus){first.focus({preventScroll:false})}
 return ok}
function show(i,scroll){cur=i;max=Math.max(max,i);steps.forEach(function(s,k){s.hidden=k!==i});
 [].slice.call(side.children).forEach(function(li,k){li.className=k===i?'on':(k<max||k<i?'done':'')});
 $('obbar').style.width=((i+1)/steps.length*100)+'%';$('obc').textContent='Step '+(i+1)+' of '+steps.length+': '+steps[i].getAttribute('data-t');
 bk.hidden=i===0;nxt.textContent=i===steps.length-1?'Submit onboarding':'Continue';if(i===steps.length-1)review();
 if(scroll!==false){var t=$('obc');t.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}}
function all(n){return [].map.call(f.querySelectorAll('[name='+n+']:checked'),function(x){return x.value})}
function g(n){var el=f.querySelector('[name='+n+']');return el?val(el):''}
function fl(n){var el=f.querySelector('[name='+n+']');return el&&el.files.length?el.files[0].name:''}
function model(){return [
 ['Company and authority',0,[['Company',g('company')+(g('dba')?' (DBA '+g('dba')+')':'')],['MC / USDOT','MC '+g('mc').replace(/^mc[-\s]*/i,'')+' / DOT '+g('dot')],['Business type',g('entype')],['Years in business',g('years')],['Address',[g('addr'),g('city'),g('state'),g('zip')].filter(Boolean).join(', ')],['Dispatch contact',g('cname')+' | '+g('cphone')+' | '+g('cemail')],['After-hours',g('aphone')]]],
 ['Equipment and lanes',1,[['Equipment',all('equip').join(', ')],['Trucks / trailers',g('trucks')+(g('trailers')?' / '+g('trailers'):'')],['Runs',all('regions').join(', ')],['Preferred states',all('states').join(', ')],['Capabilities',all('caps').join(', ')]]],
 ['Insurance and documents',2,[['Insurance',g('ins')+(g('agent')?' | Agent '+g('agent'):'')+(g('agphone')?' '+g('agphone'):'')+(g('agemail')?' '+g('agemail'):'')],['Auto liability',g('liab')],['Cargo',g('cargo')],['COI expires',g('coiexp')],['COI file',fl('coi')],['W-9 file',fl('w9')],['Authority letter',fl('authority')],['NOA file',fl('noa')]]],
 ['Payment',3,[['Paid by',all('paymethod').join('')],['Factoring',all('paymethod')[0]==='Factoring company'?[g('fname'),g('fcontact'),g('fphone'),g('femail')].filter(Boolean).join(' | '):''],['Remit-to',[g('rname'),g('raddr'),g('rcity'),g('rstate'),g('rzip')].filter(Boolean).join(', ')],['Terms',g('terms')]]],
 ['References and safety',4,[1,2,3].map(function(i){return ['Reference '+i,[g('r'+i+'co'),g('r'+i+'n'),g('r'+i+'ph'),g('r'+i+'em')].filter(Boolean).join(' | ')]}).concat([['Accidents / OOS',all('safety').join('')+(g('safetyx')?': '+g('safetyx'):'')]])]]}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function review(){$('obrev').innerHTML='<div class="ob-rev">'+model().map(function(sec){return '<div class="ob-rv"><h4>'+sec[0]+'<button type="button" data-edit="'+sec[1]+'">Edit</button></h4><dl>'+sec[2].filter(function(r){return r[1]}).map(function(r){return '<dt>'+r[0]+'</dt><dd>'+esc(r[1])+'</dd>'}).join('')+'</dl></div>'}).join('')+'</div>'}
function text(){return model().map(function(sec){return sec[0].toUpperCase()+'\n'+sec[2].filter(function(r){return r[1]}).map(function(r){return '  '+r[0]+': '+r[1]}).join('\n')}).join('\n\n')+'\n\nSIGNED: '+g('sig')+', '+g('title')+' ('+new Date().toLocaleDateString('en-US')+')'}
/* draft saving (text fields only, never files) */
function save(){try{var o={};[].forEach.call(f.elements,function(el){if(!el.name||el.type==='file'||el.name==='_gotcha'||el.name==='agree'||el.name==='sig')return;if(el.type==='checkbox'||el.type==='radio'){if(el.checked)(o[el.name]=o[el.name]||[]).push(el.value)}else if(el.value)o[el.name]=el.value});localStorage.setItem(KEY,JSON.stringify({o:o,s:cur}));$('obsv').textContent='Draft saved on this device'}catch(e){}}
function restore(){try{var d=JSON.parse(localStorage.getItem(KEY)||'null');if(!d)return;[].forEach.call(f.elements,function(el){if(!el.name||!(el.name in d.o))return;var v=d.o[el.name];if(el.type==='checkbox'||el.type==='radio')el.checked=v.indexOf(el.value)>-1;else if(typeof v==='string')el.value=v});$('obsv').textContent='Restored your saved draft. Re-attach your documents.'}catch(e){}}
function cond(){var fac=all('paymethod')[0]==='Factoring company';$('obfac').hidden=!fac;var sx=all('safety')[0]==='Yes, I will explain';$('obsx').hidden=!sx;
 var nf=f.querySelector('[name=noa]').closest('.ob-f').querySelector('.ob-fl');nf.querySelector('.rq')&&nf.querySelector('.rq').remove();if(fac)nf.insertAdjacentHTML('beforeend',' <b class="rq" aria-hidden="true">*</b>');
 $('obfn').textContent=fac?'You chose factoring: attach the notice of assignment from your factor.':''}
f.addEventListener('change',function(e){var el=e.target;if(el.type==='file'){var d=el.closest('.ob-drop'),n=d.querySelector('.ob-fn');d.classList.toggle('has',!!el.files.length);n.textContent=el.files.length?el.files[0].name+' ('+Math.max(1,Math.round(el.files[0].size/1024))+' KB)':'No file chosen';checkField(el)}
 if(el.name==='agree'){var ae=el.closest('.ob-agree').querySelector('.ob-err');ae.textContent=el.checked?'':'Please confirm to continue';ae.classList.toggle('show',!el.checked)}
 if(el.name==='paymethod'||el.name==='safety')cond();
 if(el.name==='equip')groupErr('e-equip',0,all('equip').length>0,'');if(el.name==='regions')groupErr('e-regions',0,all('regions').length>0,'');
 if(el.name==='regions'&&el.value==='Nationwide (48 states)'&&el.checked){}
 if(el.type!=='file'&&el.tagName!=='INPUT'||el.type==='checkbox'||el.type==='radio'||el.type==='date')save()});
f.addEventListener('input',function(e){var w=e.target.closest('.ob-f');if(w&&w.classList.contains('bad'))checkField(e.target)});
f.addEventListener('blur',function(e){var el=e.target;if(el.matches&&el.matches('.ob-f input:not([type=file]):not([type=checkbox]),.ob-f select')){if(val(el)||el.hasAttribute('data-req')&&el.dataset.t)checkField(el);save()}},true);
f.addEventListener('click',function(e){var b=e.target.closest('[data-edit]');if(b){show(+b.getAttribute('data-edit'))}});
side.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var i=+b.getAttribute('data-i');if(i<=max&&i!==cur)show(i)});
bk.addEventListener('click',function(){if(cur>0)show(cur-1)});
f.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'&&e.target.type!=='submit'&&e.target.type!=='button'){e.preventDefault();nxt.click()}});
nxt.addEventListener('click',function(){
 if(cur<steps.length-1){if(validate(cur)){save();show(cur+1)}return}
 for(var i=0;i<steps.length-1;i++){if(!validate(i)){show(i,false);validate(i);return}}
 if(!validate(cur))return;submit()});
function done(html){f.hidden=true;$('obbar').style.width='100%';$('obc').textContent='Submitted';var o=$('obok');o.innerHTML=html;o.hidden=false;try{localStorage.removeItem(KEY)}catch(e){}o.scrollIntoView({block:'start'});o.setAttribute('tabindex','-1');o.focus({preventScroll:true})}
function submit(){var EP=window.MIGHT_FORM_ENDPOINT||'',note=$('obnote'),subj='Carrier Onboarding: '+g('company')+' (MC '+g('mc').replace(/^mc[-\s]*/i,'')+')',txt=text();
 var files=['coi','w9','authority','noa'].map(function(n){return fl(n)}).filter(Boolean);
 if(!EP){
  var body=txt.length>1700?txt.slice(0,1700)+'\n...(continued: see full details on the page you submitted)':txt;
  done('<h3>One last step: send your packet</h3><p>Online submission is not switched on yet, so your email app should open with your details filled in. Press send, and <b>attach these files</b> to that email:</p><ul>'+(files.length?files.map(function(n){return '<li>'+esc(n)+'</li>'}).join(''):'<li>Your certificate of insurance and W-9</li>')+'</ul><p>Email app did not open? Copy your details below and send them to <b>info@mightlogistics.com</b>, or call (201) 377-7043.</p><textarea id="obt" rows="10" readonly>'+esc(txt)+'</textarea><div class="acts"><button class="btn" type="button" id="obcp">Copy details</button><a class="btn dark" id="obml" href="#">Open email again</a></div><p class="note" id="obcn"></p>');
  var href='mailto:info@mightlogistics.com?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);$('obml').href=href;
  $('obcp').addEventListener('click',function(){var t=$('obt');var ok=function(){$('obcn').textContent='Copied.'};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t.value).then(ok,function(){t.select();$('obcn').textContent='Press Ctrl+C to copy.'});else{t.select();$('obcn').textContent='Press Ctrl+C to copy.'}});
  location.href=href;return}
 var d=new FormData(f);d.append('_subject',subj);d.append('summary',txt);nxt.disabled=true;nxt.textContent='Sending...';
 fetch(EP,{method:'POST',body:d,headers:{'Accept':'application/json'}}).then(function(r){if(!r.ok)throw 0;
  done('<h3>Thanks, we got your packet</h3><p>A carrier rep will verify your authority and insurance and contact you at '+esc(g('cemail'))+'. Approval usually follows once your references check out.</p><p>Questions? Call (201) 377-7043.</p>')}).catch(function(){nxt.disabled=false;nxt.textContent='Submit onboarding';note.textContent='Something went wrong sending your packet. Please try again, or call (201) 377-7043 or email info@mightlogistics.com.'})}
restore();cond();show(0,false);
})();
