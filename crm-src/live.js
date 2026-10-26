/* ===== LIVE MODE: real logins and the real database (Supabase). Replaces the sample data. ===== */
window.LIVE=true;
var SB_URL=window.MIGHT_SB_URL||'__SB_URL__',SB_KEY=window.MIGHT_SB_KEY||'__SB_KEY__';
var SB=window.__SB_MOCK||(window.supabase?window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true}}):null);
var RLABEL={admin:'Admin',broker:'Broker',dispatcher:'Dispatcher',sales:'Sales'};
var INBOX=[],TEAM=[],ME_ID=null;
/* wipe every bit of sample data */
[ACC,CON,OPP,LOAD,ACT,LEAD,U,QT,LOGX,NTF].forEach(function(a){a.length=0});Object.keys(VET).forEach(function(k){delete VET[k]});
(function(){var d=new Date();TODAY=d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)})();

var _usr=usr;usr=function(id){if(id==='sys')return{n:'Website (automatic)',r:'System'};return _usr(id)};
function d10(s){return s?String(s).slice(0,10):''}
function money(n){return n==null?0:+n}
function errMsg(e){var m=(e&&(e.message||e.details))||'Something went wrong.';return m.replace(/^.*?ERROR:\s*/,'')}
async function all(tbl,sel,order){var out=[],from=0,step=1000;for(;;){var r=await SB.from(tbl).select(sel||'*').order(order||'id').range(from,from+step-1);if(r.error)throw r.error;out=out.concat(r.data||[]);if(!r.data||r.data.length<step)break;from+=step}return out}

/* ---------- read everything this person is allowed to see ---------- */
async function hydrate(){
 var prof=await all('profiles','*');U.length=0;prof.forEach(function(p){U.push({id:p.id,n:p.full_name,r:RLABEL[p.role]||p.role,active:p.active})});
 var me0=U.filter(function(u){return u.id===ME_ID})[0];if(!me0)throw new Error('Your login is not set up yet. Ask an admin to add you.');S.me=ME_ID;
 var ad=me0.r==='Admin';
 var a=await all('accounts');ACC.length=0;a.forEach(function(x){ACC.push({id:x.id,n:x.name,type:x.type,mc:x.mc||'',dot:x.dot||'',city:x.city?(x.state?x.city+', '+x.state:x.city):(x.state||''),_c:x.city||'',_s:x.state||'',ph:x.phone||'',trucks:x.trucks||0,eq:x.equipment||'',since:d10(x.created_at)})});
 var c=await all('contacts');CON.length=0;c.forEach(function(x){CON.push([x.account_id,x.name,x.role||'',x.email||'',x.phone||''])});
 var o=await all('opportunities');OPP.length=0;o.forEach(function(x){OPP.push({id:x.id,acc:x.account_id,dept:x.dept,name:x.name,stage:x.stage,owner:x.owner_id,created:d10(x.created_at),src:x.source||'',amt:0})});
 if(ad){(await all('opp_money','*','opportunity_id')).forEach(function(m){var p=OPP.filter(function(q){return q.id===m.opportunity_id})[0];if(p)p.amt=money(m.est_monthly_profit)})}
 var l=await all('loads');LOAD.length=0;l.forEach(function(x){LOAD.push({id:x.id,acc:x.account_id,opp:x.opportunity_id,dept:x.dept,by:x.created_by,o:x.origin,d:x.destination,mi:x.miles||0,pu:x.pickup_date||d10(x.created_at),st:x.status,car:x.carrier_id,inv:x.invoice_status,pay:x.pay_status,rev:0,pf:0,docs:{}})});
 var lm={};LOAD.forEach(function(q){lm[q.id]=q});
 if(ad){(await all('load_money','*','load_id')).forEach(function(m){var q=lm[m.load_id];if(q){q.rev=money(m.revenue);q.pf=money(m.profit)}})}
 (await all('load_docs')).forEach(function(m){var q=lm[m.load_id];if(q)q.docs[m.kind]={f:m.file_name||'file',by:m.uploaded_by,d:d10(m.uploaded_at),path:m.file_path}});
 var t=await all('activities');ACT.length=0;t.forEach(function(x){ACT.push({acc:x.account_id,dept:x.dept,by:x.by_user,type:x.type,date:d10(x.created_at),txt:x.body})});
 if(me0.r!=='Dispatcher'&&me0.r!=='Sales'){var q=await all('quotes');QT.length=0;q.forEach(function(x){QT.push({id:x.id,opp:x.opportunity_id,acc:x.account_id,by:x.owner_id,o:x.origin,d:x.destination,mi:x.miles||0,rate:+x.rate_per_mile,sent:x.sent_on,last:x.last_touch,fu:x.followups,st:x.status,why:x.lost_reason})})}
 if(me0.r!=='Sales'){var v=await all('carrier_vetting','*','account_id');Object.keys(VET).forEach(function(k){delete VET[k]});v.forEach(function(x){VET[x.account_id]={auth:x.authority_status||'Active',since:x.authority_since||'2000-01-01',auto:{amt:money(x.auto_amount),exp:x.auto_expires||'1970-01-01'},cargo:{amt:money(x.cargo_amount),exp:x.cargo_expires||'1970-01-01'},safety:x.safety_rating||'Not rated',oos:!!x.out_of_service,chk:x.checked_on||TODAY}})}
 if(me0.r==='Sales'||ad){var ld=await all('leads');LEAD.length=0;ld.forEach(function(x){LEAD.push({id:x.id,kind:x.kind,co:x.company,owner:x.contact_name||'',title:x.contact_title||'Owner',phone:x.phone||'',web:x.website||'',ind:x.industry||'',city:x.city?(x.state?x.city+', '+x.state:x.city):'',emp:x.employees||0,fit:x.fit||0,agent:x.agent_id,st:x.status,asg:x.assigned_on,mc:x.mc||'',age:'',trucks:0,acct:x.account_id})})}
 (await all('app_settings','*','key')).forEach(function(x){if(x.key==='vetting'){var j=x.value;VETSET.minAuto=j.minAuto;VETSET.minCargo=j.minCargo;VETSET.minAge=j.minAgeDays;VETSET.warn=j.warnDays}if(x.key==='quote_followup'){QSET.days=x.value.days;QSET.max=x.value.max}});
 if(me0.r!=='Sales'){var ib=await all('intake_submissions');INBOX.length=0;ib.forEach(function(x){INBOX.push(x)});INBOX.sort(function(a,b){return a.created_at<b.created_at?1:-1})}
 if(ad){var lr=await SB.from('audit_log').select('*').order('at',{ascending:false}).limit(1500);if(lr.error)throw lr.error;LOGX.length=0;(lr.data||[]).forEach(function(r){var e=describe(r);if(e)LOGX.push(e)});LOGX.sort(function(a,b){return a.t<b.t?-1:1})}
 $('#me').innerHTML='';
 var w=$('#whoami');if(w)w.innerHTML='<b>'+esc(me0.n)+'</b> <span class="pill p-idle">'+me0.r+'</span> <button class="btn" type="button" data-a="pw">Password</button> <button class="btn" type="button" data-a="out">Sign out</button>';
}
function lt(at){var d=new Date(at);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2)+'T'+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}
function aname(id){var a=acc(id);return a?a.n:'an account'}
function describe(r){var n=r.new_row||{},o=r.old_row||{},ch=r.changes||{},T=r.table_name,A=r.action,e={t:lt(r.at),by:r.actor||'sys',type:'Activity',txt:'',acc:'',ld:''},id=r.record_id;
 function f(k){return ch[k]?ch[k].from+' to '+ch[k].to:''}
 if(T==='accounts'){e.type='Account';e.acc=id;e.txt=A==='INSERT'?'Created '+(n.type||'').toLowerCase()+' account "'+n.name+'"':A==='DELETE'?'Deleted account "'+o.name+'"':'Edited account "'+(n.name||'')+'": '+Object.keys(ch).join(', ')}
 else if(T==='contacts'){e.type='Account';e.acc=(n.account_id||o.account_id);e.txt=(A==='INSERT'?'Added contact ':A==='DELETE'?'Removed contact ':'Edited contact ')+(n.name||o.name)}
 else if(T==='opportunities'){e.type='Stage';e.acc=n.account_id||o.account_id;e.txt=A==='INSERT'?'Opened "'+n.name+'" ('+n.dept+')':A==='DELETE'?'Deleted opportunity "'+o.name+'"':ch.stage?'Moved "'+n.name+'" from '+f('stage'):'Edited opportunity "'+n.name+'": '+Object.keys(ch).join(', ')}
 else if(T==='opp_money'){e.type='Rate';e.txt='Changed estimated monthly profit on an opportunity'+(ch.est_monthly_profit?': '+f('est_monthly_profit'):'')}
 else if(T==='loads'){e.type='Load';e.ld=id;e.acc=n.account_id||o.account_id;
  if(A==='INSERT')e.txt='Created load '+id+': '+n.origin+' to '+n.destination;
  else if(A==='DELETE')e.txt='Deleted load '+id;
  else if(ch.invoice_status){e.type='Invoice';e.txt='Load '+id+' invoice: '+f('invoice_status')}
  else if(ch.pay_status){e.type='Invoice';e.txt='Carrier payment on '+id+': '+f('pay_status')}
  else if(ch.status)e.txt='Load '+id+' status: '+f('status');else e.txt='Edited load '+id+': '+Object.keys(ch).join(', ')}
 else if(T==='load_money'){e.type='Rate';e.ld=r.record_id;var L=LOAD.filter(function(x){return x.id===id})[0];e.acc=L?L.acc:'';e.txt=A==='INSERT'?'Set rate on '+id+': revenue '+usd(n.revenue)+', profit '+usd(n.profit):'Edited rate on '+id+': '+(ch.revenue?'revenue '+usd(ch.revenue.from)+' to '+usd(ch.revenue.to)+' ':'')+(ch.profit?'profit '+usd(ch.profit.from)+' to '+usd(ch.profit.to):'')}
 else if(T==='load_docs'){e.type='Document';e.ld=n.load_id||o.load_id;var L2=LOAD.filter(function(x){return x.id===e.ld})[0];e.acc=L2?L2.acc:'';e.txt=(A==='INSERT'?'Uploaded ':A==='DELETE'?'Removed ':'Replaced ')+({rc:'rate confirmation',bol:'bill of lading',pod:'proof of delivery'}[n.kind||o.kind])+' '+(n.file_name||o.file_name||'')+' on load '+e.ld}
 else if(T==='quotes'){e.type='Quote';e.acc=n.account_id||o.account_id;e.txt=A==='INSERT'?'Sent quote '+id+' to '+aname(n.account_id)+': '+n.origin+' to '+n.destination+' at $'+(+n.rate_per_mile).toFixed(2)+' per mile':ch.status?'Quote '+id+': '+f('status')+(n.lost_reason?' ('+n.lost_reason+')':''):ch.followups?'Followed up on quote '+id+', follow-up '+n.followups:'Edited quote '+id}
 else if(T==='carrier_vetting'){e.type='Carrier check';e.acc=id;e.txt=(A==='INSERT'?'Added vetting for ':'Updated vetting for ')+aname(id)+(n.auto_expires?': auto expires '+n.auto_expires+', cargo expires '+n.cargo_expires:'')}
 else if(T==='app_settings'){e.type='Settings';e.txt='Changed setting "'+id+'"'}
 else if(T==='profiles'){e.type='Settings';e.txt=A==='INSERT'?'Added staff member '+n.full_name+' ('+n.role+')':ch.role?'Changed '+n.full_name+'\'s role: '+f('role'):ch.active?(n.active?'Reactivated ':'Deactivated ')+n.full_name:'Edited staff profile '+(n.full_name||'')}
 else if(T==='leads'){e.type='Leads';e.txt=A==='INSERT'?'Added lead "'+n.company+'"':ch.status?'Lead "'+n.company+'": '+f('status'):'Edited lead "'+(n.company||o.company)+'"'}
 else if(T==='prospect_runs'){e.type='Prospecting';e.txt='Ran a prospecting pull'}
 else if(T==='intake_submissions'){e.type='Intake';e.txt=A==='INSERT'?'New website submission: '+n.kind+(n.fields&&n.fields.company?' from '+n.fields.company:''):ch.status?'Website submission ('+n.kind+') marked '+n.status:'Edited website submission'}
 else if(T==='activities'){e.type='Activity';e.acc=n.account_id||o.account_id;e.txt='Logged a '+String(n.type||'').toLowerCase()+' on '+aname(e.acc)+': '+String(n.body||'').slice(0,90)}
 else if(T==='dnc_numbers'){e.type='Leads';e.txt='Do-not-call list: '+A+' '+id}
 else e.txt=A+' on '+T;
 return e}

/* ---------- write helpers: save, then re-read so every screen matches the database ---------- */
async function run(fn,okMsg,closeModal){try{await fn();if(closeModal!==false)modal(null);await hydrate();render();if(okMsg)toast(okMsg)}catch(e){toast(errMsg(e))}}
function must(r){if(r&&r.error)throw r.error;return r}
function addAct(acct,dept,type,body){return SB.from('activities').insert({account_id:acct,dept:dept,type:type,body:body}).then(must)}
function rr(list,key){var n=(rr[key]=(rr[key]||0)+1)-1;return list.length?list[n%list.length]:null}
function staff(role){return U.filter(function(u){return u.r===role&&u.active!==false})}
function lcls(){return Math.random()}
function pickOwner(dept){var l=staff(dept==='Dispatch'?'Dispatcher':'Broker'),cnt={};OPP.filter(function(o){return o.dept===dept&&o.stage!=='Closed lost'}).forEach(function(o){cnt[o.owner]=(cnt[o.owner]||0)+1});l.sort(function(a,b){return(cnt[a.id]||0)-(cnt[b.id]||0)});return l[0]||null}

var CLICK={
 stage:function(t){var o=opp(t.dataset.id),v=t.dataset.v;if(!o||!canEdit(o)||o.stage===v)return;return run(async function(){must(await SB.from('opportunities').update({stage:v}).eq('id',o.id));await addAct(o.acc,o.dept,'Stage','Moved "'+o.name+'" from '+o.stage+' to '+v)},'Stage changed to '+v,false)},
 lst:function(t){var l=ldg(t.dataset.id),v=t.dataset.v;if(!l||!canTouch(l)||l.st===v)return;var up={status:v};if(v!=='Delivered'&&l.inv==='Ready')up.invoice_status='Not ready';return run(async function(){must(await SB.from('loads').update(up).eq('id',l.id));await addAct(l.acc,l.dept,'Load','Load '+l.id+' marked '+v.toLowerCase())},'Load '+l.id+' is now '+v.toLowerCase()+'.',false)},
 inv:function(t){var l=ldg(t.dataset.id),v=t.dataset.v;if(!l)return;if(v==='Ready'){if(!(canTouch(l)&&l.st==='Delivered'&&l.docs.pod)){toast('Needs the proof of delivery first.');return}}else if(!adm())return;return run(async function(){must(await SB.from('loads').update({invoice_status:v}).eq('id',l.id))},'Invoice: '+v+'.',false)},
 pay:function(t){var l=ldg(t.dataset.id);if(!l||!adm())return;return run(async function(){must(await SB.from('loads').update({pay_status:'Released'}).eq('id',l.id))},'Carrier payment released.',false)},
 ddel:function(t){var l=ldg(t.dataset.id),k=t.dataset.v;if(!l||!adm())return;return run(async function(){must(await SB.from('load_docs').delete().eq('load_id',l.id).eq('kind',k));if(l.inv==='Ready')must(await SB.from('loads').update({invoice_status:'Not ready'}).eq('id',l.id))},'Document removed.',false)},
 vchk:function(t){var id=t.dataset.v;return run(async function(){must(await SB.from('carrier_vetting').upsert({account_id:id,checked_on:TODAY},{onConflict:'account_id'}))},'Re-checked. In the live system this also pulls from FMCSA nightly.',false)},
 qfu:function(t){var q=QT.filter(function(x){return x.id===t.dataset.v})[0];if(!q)return;return run(async function(){must(await SB.from('quotes').update({followups:q.fu+1,last_touch:TODAY}).eq('id',q.id))},'Follow-up saved. Next reminder in '+QSET.days+' days.',false)},
 qwon:function(t){var q=QT.filter(function(x){return x.id===t.dataset.v})[0];if(!q)return;var o=opp(q.opp);return run(async function(){must(await SB.from('quotes').update({status:'Won',last_touch:TODAY}).eq('id',q.id));if(o&&(o.stage==='Prospect'||o.stage==='Quoted')){must(await SB.from('opportunities').update({stage:'Active'}).eq('id',o.id))}},'Won. The opportunity is now Active.',false)},
 snofit:function(t){var id=t.dataset.v;return run(async function(){must(await SB.from('leads').update({status:'Not a fit'}).eq('id',id))},'Marked not a fit.',false)},
 convert:function(t){return convLead(t.dataset.v,'Carrier')},
 sconv:function(t){return convLead(t.dataset.v,'Shipper')},
 pull:function(){toast('Needs a business-data provider first (Apollo or similar). The button comes alive once one is connected.')},
 out:function(){SB.auth.signOut().then(function(){location.reload()})},
 pw:function(){modal('<form class="form" id="fpw"><h2>Change password</h2><div class="sub">At least 12 characters.</div><label for="pw1">New password<input id="pw1" type="password" minlength="12" autocomplete="new-password" required></label><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn" type="button" data-a="mclose">Cancel</button><button class="btn pri" type="submit">Save</button></div></form>')},
 newacct:function(){modal(mNewAcct())},
 inb:function(t){S.ibf=t.dataset.v;render()},
 inbo:function(t){inboxOpen(t.dataset.v)},
 ifile:function(t){openFile(t.dataset.v,t.dataset.b)},
 ist:function(t){var id=t.dataset.id,v=t.dataset.v;return run(async function(){must(await SB.from('intake_submissions').update({status:v,handled_by:ME_ID}).eq('id',id))},'Marked '+v+'.')},
 imk:function(t){return fromIntake(t.dataset.v)},
 tnew:function(){modal(mNewUser())},
 tedit:function(t){modal(mEditUser(t.dataset.v))},
 team:function(){}
};
function convLead(id,kind){var l=LEAD.filter(function(x){return x.id===id})[0];if(!l||l.st==='Converted')return;
 return run(async function(){
  var parts=(l.city||'').split(', '),city=parts[0]||'',st=parts[1]||'';
  var a=must(await SB.from('accounts').insert({name:l.co,type:kind,mc:l.mc||null,city:city,state:st,phone:l.phone,equipment:kind==='Shipper'?l.ind:'Dry van',trucks:kind==='Carrier'?(l.trucks||null):null}).select().single()).data;
  must(await SB.from('contacts').insert({account_id:a.id,name:l.owner||'Contact (name not yet known)',role:l.title||'Owner',phone:l.phone}));
  var dept=kind==='Carrier'?'Dispatch':'Brokerage',ow=pickOwner(dept),me0=me();
  must(await SB.from('opportunities').insert({account_id:a.id,dept:dept,name:l.co+(kind==='Carrier'?': dispatch services':': freight'),stage:STG[dept][0],owner_id:ow?ow.id:null,sourced_by:ME_ID,source:'Sales: '+usr(l.agent).n}));
  must(await SB.from('leads').update({status:'Converted',account_id:a.id}).eq('id',id));
  await addAct(a.id,'Sales','Call','Cold call. Contact agreed to talk about '+(kind==='Carrier'?'dispatch.':'shipping freight.'));
  window.__conv=a.id},'Converted. Account, contact and a '+(kind==='Carrier'?'Dispatch':'Brokerage')+' opportunity were created.',false).then(function(){if(window.__conv){var x=window.__conv;window.__conv=null;go('acct',x)}})}

var SUBMIT={
 fno:async function(a){var d=$('#nod').value,ow=adm()?$('#noo').value:S.me;if(adm()){var r=usr(ow).r;if(d==='Brokerage'&&r!=='Broker'){var b=pickOwner('Brokerage');ow=b?b.id:ow}if(d==='Dispatch'&&r!=='Dispatcher'){var p=pickOwner('Dispatch');ow=p?p.id:ow}}
  var nm=$('#non').value.trim()||a.n;return run(async function(){must(await SB.from('opportunities').insert({account_id:a.id,dept:d,name:nm,stage:STG[d][0],owner_id:ow,source:'Existing account'}));await addAct(a.id,d,'Stage','Opened a new '+d+' opportunity on this account')},d+' opportunity added to '+a.n+'. See the banner.')},
 fnl:async function(a){var gate=window.loadGate(a);if(!gate.ok)return;var op=opp($('#nlo').value);if(!op)return;var mi=parseInt($('#nlm').value.replace(/\D/g,''),10)||null,o1=$('#nlf').value.trim(),d1=$('#nlt').value.trim(),pu=$('#nld').value||TODAY;
  return run(async function(){var id=must(await SB.rpc('next_load_id',{p_dept:op.dept})).data;must(await SB.from('loads').insert({id:id,account_id:a.id,opportunity_id:op.id,dept:op.dept,origin:o1,destination:d1,miles:mi,pickup_date:pu,carrier_id:gate.car}));await addAct(a.id,op.dept,'Load','Created load '+id+': '+o1+' to '+d1+(gate.note?' ('+gate.note+')':''));if(gate.note&&/OVERRIDE/.test(gate.note))await addAct(a.id,op.dept,'Note','Carrier vetting override: '+gate.note);window.__nl=id},'Load created.')},
 fna:async function(a){var dp=adm()?$('#nad').value:DEPT[me().r],ty=$('#nat').value,tx=$('#nax').value.trim();return run(async function(){must(await SB.from('activities').insert({account_id:a.id,dept:dp,type:ty,body:tx}))},'Activity saved.')},
 fvi:async function(){var f=$('#fvi'),c=f.dataset.id,n=function(s){return parseInt(String($(s).value).replace(/\D/g,''),10)||0};
  var row={account_id:c,auto_amount:n('#via'),auto_expires:$('#vie').value,cargo_amount:n('#vca'),cargo_expires:$('#vce').value,checked_on:TODAY};return run(async function(){must(await SB.from('carrier_vetting').upsert(row,{onConflict:'account_id'}))},'Insurance saved and re-checked.')},
 fdoc:async function(){var f=$('#fdoc'),l=ldg(f.dataset.id),k=f.dataset.k,fl=$('#dfile').files[0];if(!l||!fl)return;
  return run(async function(){var path=l.id+'/'+k+'-'+Date.now()+'-'+fl.name.replace(/[^A-Za-z0-9._-]+/g,'_').slice(-80);must(await SB.storage.from('load-docs').upload(path,fl,{contentType:fl.type||'application/pdf'}));must(await SB.from('load_docs').upsert({load_id:l.id,kind:k,file_path:path,file_name:fl.name,uploaded_by:ME_ID,uploaded_at:new Date().toISOString()},{onConflict:'load_id,kind'}))},'Document saved.')},
 frate:async function(){var f=$('#frate'),l=ldg(f.dataset.id),r=parseInt($('#rr').value.replace(/\D/g,''),10),p=parseInt($('#rp').value.replace(/\D/g,''),10);if(!l||!adm()||isNaN(r)||isNaN(p))return;return run(async function(){must(await SB.from('load_money').upsert({load_id:l.id,revenue:r,profit:p},{onConflict:'load_id'}))},'Rate saved and logged.')},
 fnq:async function(){var o=opp($('#qo').value);if(!o)return;var vals={o:$('#qf1').value.trim(),d:$('#qt1').value.trim(),mi:parseInt($('#qm1').value.replace(/\D/g,''),10)||null,r:parseFloat($('#qr1').value)||0};
  return run(async function(){var id=must(await SB.rpc('next_quote_id')).data;must(await SB.from('quotes').insert({id:id,opportunity_id:o.id,account_id:o.acc,owner_id:adm()?o.owner:ME_ID,origin:vals.o,destination:vals.d,miles:vals.mi,rate_per_mile:vals.r}));if(o.stage==='Prospect')must(await SB.from('opportunities').update({stage:'Quoted'}).eq('id',o.id));S.qf='open'},'Quote saved. You will be reminded in '+QSET.days+' days.')},
 fql:async function(){var f=$('#fql'),id=f.dataset.id,why=$('#ql').value;return run(async function(){must(await SB.from('quotes').update({status:'Lost',lost_reason:why,last_touch:TODAY}).eq('id',id))},'Marked lost.')},
 fpw:async function(){var p=$('#pw1').value;if(p.length<12){toast('Use at least 12 characters.');return}try{must(await SB.auth.updateUser({password:p}));modal(null);toast('Password changed.')}catch(e){toast(errMsg(e))}},
 fna2:async function(){var v=function(i){return $(i).value.trim()};if(!v('#xn')){toast('Enter a company name.');return}
  return run(async function(){var a=must(await SB.from('accounts').insert({name:v('#xn'),type:$('#xt').value,mc:v('#xm')||null,dot:v('#xd')||null,city:v('#xc')||null,state:v('#xs').toUpperCase()||null,phone:v('#xp')||null,trucks:parseInt(v('#xk'),10)||null,equipment:v('#xe')||null}).select().single()).data;if(v('#xcn'))must(await SB.from('contacts').insert({account_id:a.id,name:v('#xcn'),role:v('#xcr')||null,email:v('#xce')||null,phone:v('#xp')||null}));window.__conv=a.id},'Account created.').then(function(){if(window.__conv){var x=window.__conv;window.__conv=null;go('acct',x)}})},
 fusr:async function(){var v=function(i){return $(i).value.trim()};var b={email:v('#ue'),full_name:v('#un'),role:$('#ur').value,password:$('#up').value};if(b.password.length<12){toast('Password needs at least 12 characters.');return}
  try{await teamApi('POST',b);modal(null);await loadTeam();render();toast(b.full_name+' can now sign in.')}catch(e){toast(errMsg(e))}},
 fuse:async function(){var f=$('#fuse'),b={id:f.dataset.id,role:$('#er').value,active:$('#ea').value==='1'};if($('#ep').value)b.password=$('#ep').value;if(b.password&&b.password.length<12){toast('Password needs at least 12 characters.');return}
  try{await teamApi('PATCH',b);modal(null);await loadTeam();await hydrate();render();toast('Saved.')}catch(e){toast(errMsg(e))}}
};
var SUBMAP={fno:'fno',fnl:'fnl',fna:'fna',fvi:'fvi',fdoc:'fdoc',frate:'frate',fnq:'fnq',fql:'fql',fpw:'fpw',fnacct:'fna2',fusr:'fusr',fuse:'fuse'};
document.addEventListener('click',function(e){var t=e.target.closest('[data-a]');if(!t)return;var a=t.dataset.a;if(CLICK[a]){e.preventDefault();e.stopImmediatePropagation();CLICK[a](t)}},true);
document.addEventListener('submit',function(e){var id=e.target.id,k=SUBMAP[id];if(!k)return;e.preventDefault();e.stopImmediatePropagation();SUBMIT[k](S.view==='acct'?acc(S.id):null)},true);
document.addEventListener('change',function(e){var t=e.target,o=t.dataset&&t.dataset.o;if(o!=='vs'&&o!=='qs')return;e.stopImmediatePropagation();if(!adm())return;var n=Math.max(1,parseInt(String(t.value).replace(/\D/g,''),10)||0),k=t.dataset.k;
 if(o==='vs')VETSET[k]=n;else QSET[k]=n;var val=o==='vs'?{minAuto:VETSET.minAuto,minCargo:VETSET.minCargo,minAgeDays:VETSET.minAge,warnDays:VETSET.warn}:{days:QSET.days,max:QSET.max};
 run(async function(){must(await SB.from('app_settings').upsert({key:o==='vs'?'vetting':'quote_followup',value:val}))},'Saved.',false)},true);

/* ---------- screens that only exist in live mode ---------- */
function mNewAcct(){return '<form class="form" id="fnacct"><h2>New account</h2><div class="sub">A carrier or shipper. Add the first contact now or later.</div><div class="row2"><label for="xn">Company name<input id="xn" required></label><label for="xt">Type<select id="xt"><option>Shipper</option><option>Carrier</option></select></label></div>'
 +'<div class="row2"><label for="xm">MC number<input id="xm" inputmode="numeric"></label><label for="xd">USDOT number<input id="xd" inputmode="numeric"></label></div><div class="row2"><label for="xc">City<input id="xc"></label><label for="xs">State<input id="xs" maxlength="2" placeholder="TX"></label></div>'
 +'<div class="row2"><label for="xp">Phone<input id="xp"></label><label for="xk">Trucks (carriers)<input id="xk" inputmode="numeric"></label></div><label for="xe">Equipment or what they ship<input id="xe"></label>'
 +'<div class="row2"><label for="xcn">First contact name<input id="xcn"></label><label for="xcr">Their role<input id="xcr" placeholder="Owner"></label></div><label for="xce">Contact email<input id="xce" type="email"></label>'
 +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn" type="button" data-a="mclose">Cancel</button><button class="btn pri" type="submit">Create account</button></div></form>'}
var _accs=accsV;accsV=function(){var h=_accs();var m=me().r;if(m==='Sales')return h;return h.replace('<div class="card"><div class="tw">','<div style="margin:0 0 12px"><button class="btn pri" type="button" data-a="newacct">New account</button></div><div class="card"><div class="tw">')};
var _home=homeV;homeV=function(){var h=_home();return h.replace(/<div class="card story"[\s\S]*?<\/div><\/div><\/div>(?=<div class="grid g2">)/,'')};
window.prosV=function(){return '<h1>Prospecting</h1><div class="card" style="margin-top:14px"><div class="pad"><b>Not connected yet</b><div class="sub" style="margin-top:6px">The one-button shipper and carrier pull needs a licensed business-data provider (Apollo or similar) and, for carriers, the Motus feed. Once one is chosen and connected, the button here pulls the businesses, filters them and splits them equally between your sales team. Everything it needs on the database side is already in place.</div></div></div>'};
function fieldRows(f){return Object.keys(f).filter(function(k){return f[k]!==''&&f[k]!=null}).map(function(k){return '<tr><td class="sub" style="white-space:nowrap">'+esc(k)+'</td><td style="white-space:normal">'+esc(f[k])+'</td></tr>'}).join('')}
var IBF=['New','In progress','Done','Spam'];
window.inboxV=function(){var f=S.ibf||'New',L=INBOX.filter(function(x){return f==='All'||x.status===f});
 var chips=IBF.concat(['All']).map(function(k){var n=INBOX.filter(function(x){return k==='All'||x.status===k}).length;return '<button class="chip" type="button" aria-pressed="'+(f===k)+'" data-a="inb" data-v="'+k+'">'+k+' ('+n+')</button>'}).join('');
 var rows=L.map(function(x){var fl=x.fields||{},who=fl.company||fl.name||'(no name)',sub=x.kind==='Quote Request'?(fl.origin||'?')+' to '+(fl.dest||'?'):[fl.mc?'MC '+fl.mc:'',fl.city,fl.state].filter(Boolean).join(' · ');
  return '<tr class="row" data-a="inbo" data-v="'+x.id+'"><td style="white-space:nowrap">'+fdt(lt(x.created_at))+'</td><td><span class="pill '+({'Quote Request':'p-brk','Dispatch Signup':'p-disp','Carrier Onboarding':'p-sal'}[x.kind])+'">'+x.kind+'</span></td><td><b>'+esc(who)+'</b><div class="sub">'+esc(sub)+'</div></td><td>'+esc(fl.email||fl.cemail||'')+'<div class="sub">'+esc(fl.phone||fl.cphone||'')+'</div></td><td class="num">'+((x.file_paths||[]).length||'')+'</td><td><span class="pill '+({New:'p-warn',Done:'p-ok',Spam:'p-bad'}[x.status]||'p-idle')+'">'+x.status+'</span></td></tr>'}).join('');
 return '<h1>Inbox</h1><div class="sub">Everything customers send through the website lands here, with their documents. Open one to turn it into an account and an opportunity.</div><div class="tools"><div class="chips">'+chips+'</div></div><div class="card"><div class="tw"><table><thead><tr><th>Received</th><th>Type</th><th>Who</th><th>Contact</th><th class="num">Files</th><th>Status</th></tr></thead><tbody>'+(rows||'<tr><td colspan="6" class="empty">Nothing here.</td></tr>')+'</tbody></table></div></div>'};
function inboxOpen(id){var x=INBOX.filter(function(y){return y.id===id})[0];if(!x)return;var fl=x.fields||{};
 var files=(x.file_paths||[]).map(function(p,i){return '<button class="btn" type="button" data-a="ifile" data-v="'+esc(p.path)+'" data-b="intake-files">Open '+esc(p.field.toUpperCase())+': '+esc(p.name)+'</button>'}).join(' ');
 var can=x.status!=='Done'&&(x.kind==='Quote Request'?(adm()||me().r==='Broker'):x.kind==='Dispatch Signup'?(adm()||me().r==='Dispatcher'):(adm()||me().r==='Broker'||me().r==='Dispatcher'));
 modal('<div style="max-height:78vh;overflow:auto"><h2 style="margin:0 0 4px">'+esc(fl.company||fl.name||x.kind)+'</h2><div class="sub" style="margin-bottom:10px">'+x.kind+' · '+fdt(lt(x.created_at))+'</div>'+(files?'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'+files+'</div>':'')
 +'<div class="tw"><table><tbody>'+fieldRows(fl)+'</tbody></table></div>'+(x.summary?'<details style="margin-top:10px"><summary>Full text as the visitor saw it</summary><pre style="white-space:pre-wrap;font-size:12px">'+esc(x.summary)+'</pre></details>':'')
 +'<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;margin-top:14px">'+(can?'<button class="btn pri" type="button" data-a="imk" data-v="'+x.id+'">Create account and opportunity</button>':'')
 +['In progress','Done','Spam'].filter(function(s){return s!==x.status}).map(function(s){return '<button class="btn" type="button" data-a="ist" data-id="'+x.id+'" data-v="'+s+'">Mark '+s+'</button>'}).join('')+'<button class="btn" type="button" data-a="mclose">Close</button></div></div>')}
async function openFile(path,bucket){try{var r=must(await SB.storage.from(bucket).createSignedUrl(path,300));var w=window.open(r.data.signedUrl,'_blank');if(!w)toast('Allow pop-ups to open the file.')}catch(e){toast(errMsg(e))}}
function num(s){var n=parseInt(String(s||'').replace(/\D/g,''),10);return isNaN(n)?null:n}
function fromIntake(id){var x=INBOX.filter(function(y){return y.id===id})[0];if(!x)return;var f=x.fields||{};
 return run(async function(){
  var kind=x.kind,name=(f.company||f.name||'Website lead').trim(),isCar=kind!=='Quote Request';
  var ex=ACC.filter(function(a){return a.n.toLowerCase()===name.toLowerCase()&&a.type===(isCar?'Carrier':'Shipper')})[0],a=ex;
  if(!a){a=must(await SB.from('accounts').insert({name:name,type:isCar?'Carrier':'Shipper',mc:(f.mc||'').replace(/\D/g,'')||null,dot:(f.dot||'').replace(/\D/g,'')||null,city:f.city||null,state:(f.state||'').toUpperCase().slice(0,2)||null,phone:f.phone||f.cphone||null,trucks:num(f.trucks),equipment:Array.isArray(f.equip)?f.equip.join(', '):(f.equip||null)}).select().single()).data;
   var cn=f.name||f.owner||f.cname||'',ce=f.email||f.cemail||'';if(cn||ce)must(await SB.from('contacts').insert({account_id:a.id,name:cn||'Contact',role:kind==='Quote Request'?'Requested a quote':'Owner',email:ce||null,phone:f.phone||f.cphone||null}))}
  var dept=kind==='Dispatch Signup'?'Dispatch':'Brokerage',ow=pickOwner(dept);
  var oname=kind==='Quote Request'?name+': '+(f.origin||'')+' to '+(f.dest||''):kind==='Dispatch Signup'?name+': dispatch services':name+': carrier relationship';
  must(await SB.from('opportunities').insert({account_id:a.id,dept:dept,name:oname,stage:STG[dept][0],owner_id:ow?ow.id:null,source:'Website: '+kind}));
  var note=kind==='Quote Request'?'Website quote request: '+[f.origin&&f.dest?f.origin+' to '+f.dest:'',f.equip,f.weight&&f.weight+' lbs',f.commodity,f.date&&'pickup '+f.date,f.notes].filter(Boolean).join(' · '):(kind+' received from the website. See the Inbox entry for documents.');
  await addAct(a.id,dept,'Note',note);
  must(await SB.from('intake_submissions').update({status:'Done',handled_by:ME_ID}).eq('id',id));window.__conv=a.id},'Created. The opportunity was assigned to '+'the teammate with the lightest load.',true).then(function(){if(window.__conv){var z=window.__conv;window.__conv=null;go('acct',z)}})}

/* ---------- team (admin) ---------- */
async function token(){var s=await SB.auth.getSession();return s.data&&s.data.session?s.data.session.access_token:''}
async function teamApi(method,body){var r=await fetch('/api/admin-users',{method:method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+await token()},body:body?JSON.stringify(body):undefined});var j=await r.json().catch(function(){return{}});if(!r.ok)throw new Error(j.error||'Request failed');return j}
async function loadTeam(){try{var j=await teamApi('GET');TEAM.length=0;(j.users||[]).forEach(function(u){TEAM.push(u)})}catch(e){TEAM.length=0;TEAM.err=errMsg(e)}}
window.teamV=function(){var rows=TEAM.map(function(u){return '<tr><td><b>'+esc(u.full_name||'')+'</b><div class="sub">'+esc(u.email||'')+'</div></td><td><span class="pill p-idle">'+(RLABEL[u.role]||u.role)+'</span></td><td>'+(u.active?'<span class="pill p-ok">Active</span>':'<span class="pill p-bad">Off</span>')+'</td><td style="white-space:nowrap">'+(u.last_sign_in_at?fdt(lt(u.last_sign_in_at)):'Never')+'</td><td class="num"><button class="btn" type="button" data-a="tedit" data-v="'+u.id+'">Edit</button></td></tr>'}).join('');
 return '<h1>Team</h1><div class="sub">Everyone who can sign in. Roles decide what each person can see, and the database enforces it.</div><div class="tools"><button class="btn pri" type="button" data-a="tnew">Add a teammate</button></div>'+(TEAM.err?'<div class="banner"><div>'+esc(TEAM.err)+'</div></div>':'')+'<div class="card"><div class="tw"><table><thead><tr><th>Person</th><th>Role</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="5" class="empty">No one yet.</td></tr>')+'</tbody></table></div></div><div class="sub" style="margin-top:10px;font-size:12px">Turning someone off blocks their sign-in immediately. Their past work and the change log stay.</div>'};
function roleOpts(sel){return ['admin','broker','dispatcher','sales'].map(function(r){return '<option value="'+r+'"'+(sel===r?' selected':'')+'>'+RLABEL[r]+'</option>'}).join('')}
function mNewUser(){return '<form class="form" id="fusr"><h2>Add a teammate</h2><div class="sub">They sign in with this email and password, then change it under Password.</div><label for="un">Full name<input id="un" required></label><label for="ue">Email<input id="ue" type="email" required></label><label for="ur">Role<select id="ur">'+roleOpts('broker')+'</select></label><label for="up">Temporary password (12+ characters)<input id="up" type="text" minlength="12" required autocomplete="off"></label><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn" type="button" data-a="mclose">Cancel</button><button class="btn pri" type="submit">Add</button></div></form>'}
function mEditUser(id){var u=TEAM.filter(function(x){return x.id===id})[0];if(!u)return '';return '<form class="form" id="fuse" data-id="'+id+'"><h2>'+esc(u.full_name)+'</h2><div class="sub">'+esc(u.email)+'</div><label for="er">Role<select id="er">'+roleOpts(u.role)+'</select></label><label for="ea">Status<select id="ea"><option value="1"'+(u.active?' selected':'')+'>Active</option><option value="0"'+(u.active?'':' selected')+'>Off (cannot sign in)</option></select></label><label for="ep">New temporary password (leave blank to keep)<input id="ep" type="text" autocomplete="off"></label><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn" type="button" data-a="mclose">Cancel</button><button class="btn pri" type="submit">Save</button></div></form>'}
var _tabs=tabsR;tabsR=function(){_tabs();var m=me(),h='';if(m.r==='Admin'||m.r==='Broker'||m.r==='Dispatcher')h+='<button type="button" data-a="go" data-v="inbox"'+(S.view==='inbox'?' aria-current="page"':'')+'>Inbox'+(INBOX.filter(function(x){return x.status==='New'}).length?' ('+INBOX.filter(function(x){return x.status==='New'}).length+')':'')+'</button>';
 var box=$('#tabs'),first=box.querySelector('button');if(h&&first)first.insertAdjacentHTML('afterend',h);if(m.r==='Admin')box.insertAdjacentHTML('beforeend','<button type="button" data-a="go" data-v="team"'+(S.view==='team'?' aria-current="page"':'')+'>Team</button>')};
var _ok=window.okView;window.okView=function(v){var m=me();if(v==='inbox')return m.r==='Admin'||m.r==='Broker'||m.r==='Dispatcher';if(v==='team')return m.r==='Admin';return _ok(v)};
LT.push('Intake');
/* the team list loads when the Team tab opens */
var _go=go;go=function(v,id){if(v==='team'){loadTeam().then(function(){_go(v,id)});return}_go(v,id)};

/* ---------- sign in ---------- */
async function boot(){var box=$('#login'),msg=$('#lgmsg');
 function show(t){msg.textContent=t||''}
 if(!SB){show('Could not load the sign-in service. Check your connection and refresh.');return}
 async function enter(user){ME_ID=user.id;try{await hydrate();box.hidden=true;S.view='home';if(INBOX.length&&me().r!=='Sales'){}render()}catch(e){show(errMsg(e));await SB.auth.signOut()}}
 var s=await SB.auth.getSession();if(s.data&&s.data.session){await enter(s.data.session.user)}
 $('#lgf').addEventListener('submit',async function(ev){ev.preventDefault();show('');var b=$('#lgb');b.disabled=true;b.textContent='Signing in...';
  var r=await SB.auth.signInWithPassword({email:$('#lge').value.trim(),password:$('#lgp').value});b.disabled=false;b.textContent='Sign in';
  if(r.error){show('That email and password did not match.');return}await enter(r.data.user)})}
boot();
