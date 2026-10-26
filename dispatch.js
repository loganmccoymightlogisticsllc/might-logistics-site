(function(){
var f=document.getElementById('dsf');if(!f)return;var $=function(i){return document.getElementById(i)};
function val(el){return (el.value||'').trim()}
function setErr(w,m){w.classList.toggle('bad',!!m);var e=w.querySelector('.ob-err');if(e)e.textContent=m||''}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function all(n){return [].map.call(f.querySelectorAll('[name='+n+']:checked'),function(x){return x.value})}
function g(n){var el=f.querySelector('[name='+n+']');return el?val(el):''}
function fl(n){var el=f.querySelector('[name='+n+']');return el&&el.files.length?el.files[0].name:''}
function check(el){var w=el.closest('.ob-f'),v=val(el),m='';
 if(el.type==='file'){if(el.files.length&&el.files[0].size>10*1024*1024)m='File is over 10 MB.';setErr(w,m);return !m}
 if(el.hasAttribute('data-req')&&!v)m='Required';
 else if(v){var n=el.name;
  if(n==='mc'&&!/^\d{4,8}$/.test(v.replace(/^mc[-\s]*/i,'')))m='Enter the MC number, 4 to 8 digits';
  else if(n==='dot'&&!/^\d{4,8}$/.test(v))m='Enter the USDOT number, 4 to 8 digits';
  else if(el.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))m='Enter a valid email';
  else if(el.type==='tel'&&v.replace(/\D/g,'').length<10)m='Enter a 10 digit phone number';
  else if(n==='coiexp'){var d=new Date(v+'T00:00:00'),t=new Date();t.setHours(0,0,0,0);if(d<t)m='This certificate has expired'}}
 setErr(w,m);return !m}
function grp(id,ok,msg){var e=$(id);e.textContent=ok?'':msg;e.classList.toggle('show',!ok);e.parentNode.classList.toggle('bad',!ok)}
function validate(){var ok=true,first=null;
 [].forEach.call(f.querySelectorAll('.ob-f input,.ob-f select'),function(el){if(el.type==='checkbox')return;if(el.hasAttribute('data-req')||val(el)||el.type==='file'){if(!check(el)){ok=false;first=first||el}}});
 var ag=f.querySelector('[name=agree]'),ae=ag.closest('.ob-agree').querySelector('.ob-err');ae.textContent=ag.checked?'':'Please confirm to continue';ae.classList.toggle('show',!ag.checked);if(!ag.checked){ok=false;first=first||ag}
 var q=all('equip').length>0;grp('e-equip',q,'Pick at least one equipment type');var r=all('regions').length>0;grp('e-regions',r,'Pick where you want to run');
 if(!q){ok=false;first=first||f.querySelector('[name=equip]')}if(!r){ok=false;first=first||f.querySelector('[name=regions]')}
 if(first&&first.focus){first.focus()}return ok}
function text(){var L=[['About you',[['Name',g('owner')],['Company',g('company')],['MC / USDOT','MC '+g('mc').replace(/^mc[-\s]*/i,'')+' / DOT '+g('dot')],['Phone',g('phone')],['Email',g('email')],['Best way to reach',all('contactpref').join('')]]],
 ['Truck',[['Trucks',g('trucks')],['Authority age',g('authage')],['Home base',[g('city'),g('state')].filter(Boolean).join(', ')],['Equipment',all('equip').join(', ')],['Drivers',all('drivers').join('')]]],
 ['How they run',[['Runs',all('regions').join(', ')],['Minimum rate/mi',g('minrpm')?'$'+g('minrpm'):''],['Finds loads now',g('current')],['Notes',g('notes')]]],
 ['Insurance and paperwork',[['Insurance',g('ins')],['Auto liability',g('liab')],['Cargo',g('cargo')],['COI expires',g('coiexp')],['Files',['coi','w9','authority'].map(fl).filter(Boolean).join(', ')],['Factoring',all('factoring').join('')+(g('fname')?': '+g('fname')+' '+g('fcontact'):'')]]]];
 return L.map(function(s){return s[0].toUpperCase()+'\n'+s[1].filter(function(r){return r[1]}).map(function(r){return '  '+r[0]+': '+r[1]}).join('\n')}).join('\n\n')+'\n\nSIGNED: '+g('sig')+' ('+new Date().toLocaleDateString('en-US')+')'}
function done(html){f.hidden=true;var o=$('dsok');o.innerHTML=html;o.hidden=false;o.setAttribute('tabindex','-1');o.scrollIntoView({block:'start'});o.focus({preventScroll:true})}
f.addEventListener('change',function(e){var el=e.target;
 if(el.type==='file'){var d=el.closest('.ob-drop'),n=d.querySelector('.ob-fn');d.classList.toggle('has',!!el.files.length);n.textContent=el.files.length?el.files[0].name+' ('+Math.max(1,Math.round(el.files[0].size/1024))+' KB)':'No file chosen';check(el)}
 if(el.name==='agree'){var ae=el.closest('.ob-agree').querySelector('.ob-err');ae.textContent=el.checked?'':'Please confirm to continue';ae.classList.toggle('show',!el.checked)}
 if(el.name==='factoring')$('dsfac').hidden=all('factoring')[0]!=='Yes';
 if(el.name==='equip')grp('e-equip',all('equip').length>0,'');if(el.name==='regions')grp('e-regions',all('regions').length>0,'')});
f.addEventListener('input',function(e){var w=e.target.closest('.ob-f');if(w&&w.classList.contains('bad'))check(e.target)});
f.addEventListener('submit',function(e){e.preventDefault();if(!validate())return;
 var EP=window.MIGHT_FORM_ENDPOINT||'',btn=$('dsn'),subj='Dispatch Signup: '+g('company')+' (MC '+g('mc').replace(/^mc[-\s]*/i,'')+')',txt=text(),files=['coi','w9','authority'].map(fl).filter(Boolean);
 if(!EP){var body=txt.length>1700?txt.slice(0,1700)+'\n...(continued: see the page you submitted)':txt;
  done('<h3>One last step: send your application</h3><p>Online submission is not switched on yet, press <b>Open email</b> below to send your details, or copy them. Press send'+(files.length?', and <b>attach these files</b>:</p><ul>'+files.map(function(n){return '<li>'+esc(n)+'</li>'}).join('')+'</ul><p>':'.</p><p>')+'No email app? Copy your details below and send them to <b>info@mightlogistics.com</b>, or call (201) 377-7043.</p><textarea id="dst" rows="10" readonly>'+esc(txt)+'</textarea><div class="acts"><button class="btn" type="button" id="dscp">Copy details</button><a class="btn dark" id="dsml" href="#">Open email</a></div><p class="note" id="dscn"></p>');
  var href='mailto:info@mightlogistics.com?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);$('dsml').href=href;
  $('dscp').addEventListener('click',function(){var t=$('dst'),ok=function(){$('dscn').textContent='Copied.'};if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t.value).then(ok,function(){t.select();$('dscn').textContent='Press Ctrl+C to copy.'});else{t.select();$('dscn').textContent='Press Ctrl+C to copy.'}});
  return}
 var d=new FormData(f);d.append('_subject',subj);d.append('summary',txt);btn.disabled=true;btn.textContent='Sending...';
 fetch(EP,{method:'POST',body:d,headers:{'Accept':'application/json'}}).then(function(r){if(!r.ok)throw 0;done('<h3>Thanks, we got your application</h3><p>A dispatcher will call or message you at '+esc(g('phone'))+'. Questions? Call (201) 377-7043.</p>')}).catch(function(){btn.disabled=false;btn.textContent='Submit application';$('dsnote').textContent='Something went wrong. Please call (201) 377-7043 or email info@mightlogistics.com.'})});
})();
