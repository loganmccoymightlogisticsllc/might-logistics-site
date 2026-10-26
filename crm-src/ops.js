/* ===== OPS: change log, carrier vetting, quotes + lane rates, load documents, notifications ===== */
var LOGX=[],lclk=0,NR={},NTF=[];
function stamp(){lclk+=2;var m=9*60+38+lclk;return TODAY+'T'+('0'+Math.floor(m/60)).slice(-2)+':'+('0'+m%60).slice(-2)}
function lg(type,txt,accId,loadId){LOGX.push({t:stamp(),by:S.me,type:type,txt:txt,acc:accId||'',ld:loadId||''})}
function nfy(to,txt,v,id){NTF.push({to:to,txt:txt,v:v,id:id||'',k:'n'+NTF.length,lvl:'i'})}
function ldg(id){return LOAD.filter(function(l){return l.id===id})[0]}
function avg(a){return a.length?a.reduce(function(s,x){return s+x},0)/a.length:0}
function fdt(t){var d=t.slice(0,10),h=parseInt(t.slice(11,13),10),m=t.slice(14,16);return fd(d).replace(/, \d{4}$/,'')+', '+((h%12)||12)+':'+m+(h<12?' AM':' PM')}
function carriers(){return ACC.filter(function(a){return a.type==='Carrier'})}
function dstr(n){return '$'+n.toFixed(2)}

/* ---------- carrier vetting ---------- */
var VETSET={minAuto:750000,minCargo:100000,minAge:90,warn:30};
var VET={
a1:{auth:'Active',since:'2024-03-12',auto:{amt:1000000,exp:'2027-02-10'},cargo:{amt:100000,exp:'2027-02-10'},safety:'Not rated',oos:false,chk:'2026-10-23'},
a2:{auth:'Active',since:'2021-06-22',auto:{amt:1000000,exp:'2027-04-30'},cargo:{amt:150000,exp:'2027-04-30'},safety:'Satisfactory',oos:false,chk:'2026-10-23'},
a3:{auth:'Active',since:'2022-09-05',auto:{amt:1000000,exp:'2027-01-15'},cargo:{amt:100000,exp:'2026-11-05'},safety:'Satisfactory',oos:false,chk:'2026-10-23'},
a4:{auth:'Active',since:'2026-08-02',auto:{amt:1000000,exp:'2027-08-01'},cargo:{amt:100000,exp:'2027-08-01'},safety:'Not rated',oos:false,chk:'2026-10-23'},
a5:{auth:'Active',since:'2019-11-18',auto:{amt:1000000,exp:'2027-03-09'},cargo:{amt:250000,exp:'2027-03-09'},safety:'Satisfactory',oos:false,chk:'2026-10-23'},
a11:{auth:'Active',since:'2023-02-27',auto:{amt:1000000,exp:'2026-10-21'},cargo:{amt:100000,exp:'2027-01-20'},safety:'Satisfactory',oos:false,chk:'2026-10-23'},
a12:{auth:'Active',since:'2026-09-15',auto:{amt:1000000,exp:'2026-11-02'},cargo:{amt:100000,exp:'2026-11-02'},safety:'Not rated',oos:false,chk:'2026-10-23'}};
function vet(id){var a=acc(id);if(!a||a.type!=='Carrier')return null;var v=VET[id],why=[],soon=null;
 if(!v)return{res:'Review',why:[{l:'w',t:'Not vetted yet. Add the insurance certificate and run a check.'}],soon:null,v:null};
 if(v.auth!=='Active')why.push({l:'f',t:'Operating authority is '+v.auth.toLowerCase()});
 if(v.oos)why.push({l:'f',t:'Carrier is out of service'});
 if(v.safety==='Unsatisfactory')why.push({l:'f',t:'Safety rating is unsatisfactory'});
 if(v.safety==='Conditional')why.push({l:'w',t:'Safety rating is conditional'});
 [['auto','Auto liability',VETSET.minAuto],['cargo','Cargo insurance',VETSET.minCargo]].forEach(function(k){var i=v[k[0]],dl=dd(TODAY,i.exp);
  if(dl<0)why.push({l:'f',t:k[1]+' expired '+fd(i.exp)});else if(dl<=VETSET.warn)why.push({l:'w',t:k[1]+' expires in '+dl+' day'+(dl===1?'':'s')+' ('+fd(i.exp)+')'});
  if(i.amt<k[2])why.push({l:'f',t:k[1]+' is '+usd(i.amt)+', under your '+usd(k[2])+' minimum'});if(soon===null||dl<soon)soon=dl});
 var age=dd(v.since,TODAY);if(age<VETSET.minAge)why.push({l:'w',t:'Operating authority is only '+age+' days old'});
 var res=why.some(function(w){return w.l==='f'})?'Blocked':why.length?'Review':'Pass';return{res:res,why:why,soon:soon,v:v,age:age}}
function vpill(r){return '<span class="pill '+({Pass:'p-ok',Review:'p-warn',Blocked:'p-bad'}[r]||'p-idle')+'">'+r+'</span>'}
function canVet(){return me().r!=='Sales'}
function vetCard(a){var r=vet(a.id);if(!r)return '';var v=r.v;
 return '<div class="card" style="margin-bottom:16px"><header><h2>Carrier vetting</h2>'+vpill(r.res)+'</header><div class="pad">'
 +(r.why.length?'<ul class="why">'+r.why.map(function(w){return '<li class="'+w.l+'">'+esc(w.t)+'</li>'}).join('')+'</ul>':'<div class="sub" style="margin-bottom:8px">Authority, insurance and safety all meet your rules.</div>')
 +(v?'<div class="kv" style="margin:10px 0"><div><span>Authority</span>'+esc(v.auth)+' · '+r.age+' days old</div><div><span>Auto liability</span>'+usd(v.auto.amt)+' until '+fd(v.auto.exp)+'</div><div><span>Cargo</span>'+usd(v.cargo.amt)+' until '+fd(v.cargo.exp)+'</div><div><span>Safety rating</span>'+esc(v.safety)+'</div><div><span>Last checked</span>'+fd(v.chk)+'</div></div>':'')
 +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" data-a="vins" data-v="'+a.id+'">Update insurance</button><button class="btn" type="button" data-a="vchk" data-v="'+a.id+'">Re-check now</button></div>'
 +'<div class="sub" style="margin-top:10px;font-size:12px">Sample data. The live system checks FMCSA and the insurance certificate on file every night.</div></div></div>'}
function mVetIns(id){var a=acc(id),v=VET[id]||{auto:{amt:1000000,exp:''},cargo:{amt:100000,exp:''},since:TODAY,auth:'Active',safety:'Not rated',oos:false};
 return '<form class="form" id="fvi" data-id="'+id+'"><h2>Update insurance</h2><div class="sub">'+esc(a.n)+'. Enter what the new certificate says.</div>'
 +'<div class="row2"><label for="via">Auto liability amount<input id="via" inputmode="numeric" value="'+v.auto.amt+'" required></label><label for="vie">Auto expires<input id="vie" type="date" value="'+v.auto.exp+'" required></label></div>'
 +'<div class="row2"><label for="vca">Cargo amount<input id="vca" inputmode="numeric" value="'+v.cargo.amt+'" required></label><label for="vce">Cargo expires<input id="vce" type="date" value="'+v.cargo.exp+'" required></label></div>'
 +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn" type="button" data-a="mclose">Cancel</button><button class="btn pri" type="submit">Save and re-check</button></div></form>'}
function carV(){var L=carriers().map(function(a){return{a:a,r:vet(a.id)}}),n={Pass:0,Review:0,Blocked:0},ex=0;L.forEach(function(x){n[x.r.res]++;if(x.r.soon!==null&&x.r.soon>=0&&x.r.soon<=VETSET.warn)ex++});
 var ord={Blocked:0,Review:1,Pass:2};L.sort(function(x,y){return ord[x.r.res]-ord[y.r.res]||(x.r.soon===null?999:x.r.soon)-(y.r.soon===null?999:y.r.soon)});
 var rows=L.map(function(x){var v=x.r.v,a=x.a;return '<tr class="row" data-a="acct" data-v="'+a.id+'"><td style="min-width:170px"><b>'+esc(a.n)+'</b><div class="sub">MC '+a.mc+'</div></td><td>'+vpill(x.r.res)+'</td><td style="white-space:normal;min-width:220px">'+(x.r.why.length?x.r.why.map(function(w){return '<div class="why-i '+w.l+'">'+esc(w.t)+'</div>'}).join(''):'<span class="sub">All clear</span>')+'</td><td style="white-space:nowrap">'+(v?fd(v.auto.exp):'')+'</td><td style="white-space:nowrap">'+(v?fd(v.cargo.exp):'')+'</td><td>'+(v?esc(v.safety):'')+'</td><td style="white-space:nowrap">'+(v?fd(v.chk):'Never')+'</td><td><div style="display:flex;gap:6px;flex-wrap:wrap;min-width:150px"><button class="btn" type="button" data-a="vins" data-v="'+a.id+'">Update insurance</button><button class="btn" type="button" data-a="vchk" data-v="'+a.id+'">Re-check</button></div></td></tr>'}).join('');
 var rules=adm()?'<div class="card" style="margin-bottom:16px"><header><h2>Vetting rules</h2><span class="sub">Admin only. Starting values, change them to match your policy.</span></header><div class="pad form"><div class="rg">'
 +'<label>Minimum auto liability<input data-o="vs" data-k="minAuto" inputmode="numeric" value="'+VETSET.minAuto+'"></label><label>Minimum cargo<input data-o="vs" data-k="minCargo" inputmode="numeric" value="'+VETSET.minCargo+'"></label><label>New authority (days under)<input data-o="vs" data-k="minAge" inputmode="numeric" value="'+VETSET.minAge+'"></label><label>Warn before expiry (days)<input data-o="vs" data-k="warn" inputmode="numeric" value="'+VETSET.warn+'"></label></div>'
 +'<div class="sub" style="margin-top:8px">Blocked = a carrier cannot be put on a new load (admin can override with a reason, and it is logged). Review = allowed after you confirm you looked at the warning.</div></div></div>':'';
 return '<h1>Carriers</h1><div class="sub">Authority, insurance and safety for every carrier. Checked before any load is assigned.</div>'
 +'<div class="grid g4" style="margin:14px 0"><div class="card tile"><span>Pass</span><b style="color:var(--ok)">'+n.Pass+'</b></div><div class="card tile"><span>Review</span><b style="color:var(--warn)">'+n.Review+'</b></div><div class="card tile"><span>Blocked</span><b style="color:var(--bad)">'+n.Blocked+'</b></div><div class="card tile"><span>Insurance ending in '+VETSET.warn+' days</span><b>'+ex+'</b></div></div>'
 +rules+'<div class="card"><div class="tw"><table><thead><tr><th>Carrier</th><th>Status</th><th>Why</th><th>Auto expires</th><th>Cargo expires</th><th>Safety</th><th>Checked</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></div>'
 +'<div class="sub" style="margin-top:10px;font-size:12px">Sample data. The live system checks FMCSA and the insurance certificate on file every night, and alerts you here and by email.</div>'}
function carField(a){var h='<div id="nlcw">';
 if(a.type==='Carrier')return h+'<label>Hauled by<input value="'+esc(a.n)+' (this account)" disabled></label><div id="nlv">'+vetBox(a.id)+'</div></div>';
 var cs=carriers();return h+'<label for="nlc">Hauled by (carrier)<select id="nlc"><option value="">Choose a carrier</option>'+cs.map(function(c){var r=vet(c.id);return '<option value="'+c.id+'">'+esc(c.n)+' — '+r.res+'</option>'}).join('')+'</select></label><div id="nlv"></div></div>'}
function vetBox(id){var r=id?vet(id):null;if(!r)return '';if(r.res==='Pass')return '<div class="vb ok">&#10003; '+esc(acc(id).n)+' passes vetting.</div>';
 var h='<div class="vb '+(r.res==='Blocked'?'bad':'warn')+'"><b>'+(r.res==='Blocked'?'Blocked':'Review needed')+'</b><ul class="why">'+r.why.map(function(w){return '<li class="'+w.l+'">'+esc(w.t)+'</li>'}).join('')+'</ul>';
 if(r.res==='Review')h+='<label class="ck"><input type="checkbox" id="nlk"> I looked at this and want to continue</label>';
 if(r.res==='Blocked')h+=adm()?'<label>Admin override: why is this okay?<input id="nlr" placeholder="Reason (saved in the change log)"></label>':'<div class="sub">You cannot put this carrier on a load. Ask an admin, or update the insurance if a new certificate arrived.</div>';
 return h+'</div>'}
function loadGate(a){var cid=a.type==='Carrier'?a.id:($('#nlc')?$('#nlc').value:'');
 if(!cid){toast('Choose which carrier is hauling this load.');return{ok:false}}var r=vet(cid),note='';
 if(r.res==='Blocked'){var why=$('#nlr')?$('#nlr').value.trim():'';if(!adm()||!why){toast(adm()?'Type a reason to override.':'This carrier is blocked. Ask an admin.');return{ok:false}}note='ADMIN OVERRIDE of blocked carrier: '+why;lg('Carrier check','Override: put blocked carrier '+acc(cid).n+' on a load. Reason: '+why+'. Problems: '+r.why.map(function(w){return w.t}).join('; '),cid)}
 else if(r.res==='Review'){if(!$('#nlk')||!$('#nlk').checked){toast('Tick the box to confirm you reviewed the warning.');return{ok:false}}note='warning confirmed'}
 return{ok:true,car:cid,note:note}}

/* ---------- load documents + billing ---------- */
var DOCT=[['rc','Rate confirmation'],['bol','Bill of lading'],['pod','Proof of delivery']];
function req(l){return l.st==='Booked'?['rc']:l.st==='Shipped'?['rc','bol']:['rc','bol','pod']}
function missing(l){return req(l).filter(function(k){return !(l.docs&&l.docs[k])})}
var CARS=['a2','a5','a3','a1'];
LOAD.forEach(function(l,i){var age=dd(l.pu,TODAY),h=((i+3)*2654435761>>>0)%100;l.docs={};
 l.car=acc(l.acc).type==='Carrier'?l.acc:CARS[i%CARS.length];
 l.docs.rc={f:'RateCon-'+l.id+'.pdf',by:l.by,d:addDays(l.pu,-2)};
 if(l.st!=='Booked')l.docs.bol={f:'BOL-'+l.id+'.pdf',by:l.by,d:l.pu};
 if(l.st==='Delivered'&&!(age>=3&&age<=21&&h<30))l.docs.pod={f:'POD-'+l.id+'.pdf',by:l.by,d:addDays(l.pu,Math.max(1,Math.round(l.mi/500)+1))};
 l.inv=(l.st!=='Delivered'||!l.docs.pod)?'Not ready':age>35?'Paid':age>12?'Invoiced':'Ready';
 l.pay=(l.dept==='Brokerage'&&l.inv==='Paid')?'Released':'Held'});
function docPill(l){var m=missing(l);if(!m.length)return '<span class="pill p-ok">Complete</span>';return '<span class="pill '+(l.st==='Delivered'&&m.indexOf('pod')>-1?'p-bad':'p-warn')+'">Missing '+m.map(function(k){return k.toUpperCase()}).join(', ')+'</span>'}
function invPill(l){return '<span class="pill '+({'Not ready':'p-idle',Ready:'p-warn',Invoiced:'p-brk',Paid:'p-ok'}[l.inv]||'p-idle')+'">'+l.inv+'</span>'}
function canTouch(l){return me().r!=='Sales'&&canLoad(l)}
window.loadsV2=function(){var f=S.lf||'all',L=LOAD.filter(canLoad).sort(function(a,b){return a.pu<b.pu?1:a.pu>b.pu?-1:0}),hid=LOAD.length-L.length;
 var F={all:['All',function(){return true}],nopod:['Missing POD',function(l){return l.st==='Delivered'&&!l.docs.pod}],ready:['Ready to invoice',function(l){return l.inv==='Ready'}]};
 var chips=Object.keys(F).map(function(k){return '<button class="chip" type="button" aria-pressed="'+(f===k)+'" data-a="lf" data-v="'+k+'">'+F[k][0]+' ('+L.filter(F[k][1]).length+')</button>'}).join('');
 var V=L.filter(F[f][1]).slice(0,200);
 return '<h1>Loads</h1><div class="sub">'+(hid?hid+' loads from other departments are hidden from you.':'Every load across the company.')+' Click a load to see its documents.</div><div class="tools"><div class="chips">'+chips+'</div></div><div class="card"><div class="tw"><table><thead><tr><th>Load</th><th>Dept</th><th>Account</th><th>Lane</th><th class="num">Miles</th><th>Pickup</th><th>Status</th><th>Documents</th><th>Invoice</th><th>Created by</th>'+(adm()?'<th class="num">Revenue</th><th class="num">Profit</th>':'')+'</tr></thead><tbody>'
 +(V.map(function(l){return '<tr class="row" data-a="load" data-v="'+l.id+'"><td class="mono">'+l.id+'</td><td>'+dpill(l.dept)+'</td><td>'+esc(acc(l.acc).n)+'</td><td>'+esc(l.o)+' to '+esc(l.d)+'</td><td class="num">'+l.mi+'</td><td style="white-space:nowrap">'+fd(l.pu)+'</td><td>'+l.st+'</td><td>'+docPill(l)+'</td><td>'+invPill(l)+'</td><td>'+esc(usr(l.by).n)+'</td>'+(adm()?'<td class="num">'+usd(l.rev)+'</td><td class="num">'+usd(l.pf)+'</td>':'')+'</tr>'}).join('')||'<tr><td colspan="12" class="empty">Nothing here.</td></tr>')+'</tbody></table></div></div>'}
function stepsR(l){var s=['Booked','Shipped','Delivered'],i=s.indexOf(l.st);return '<div class="path" role="group" aria-label="Load status">'+s.map(function(x,k){return '<button type="button" class="'+(k<i?'done':k===i?'cur':'')+'" data-a="lst" data-id="'+l.id+'" data-v="'+x+'"'+(canTouch(l)?'':' disabled')+'>'+(k<i?'&#10003; ':'')+x+'</button>'}).join('')+'</div>'}
window.loadDV=function(){var l=ldg(S.id);if(!l||!canLoad(l))return '<div class="card"><div class="empty">You do not have access to this load.</div></div>';var a=acc(l.acc),car=l.car?acc(l.car):null,r=car?vet(car.id):null,tch=canTouch(l);
 var dr=DOCT.map(function(d){var x=l.docs[d[0]],need=req(l).indexOf(d[0])>-1;return '<div class="dr"><div style="min-width:0"><b>'+d[1]+'</b><div class="sub" style="font-size:12.5px">'+(x?esc(x.f)+' · '+esc(usr(x.by).n)+' · '+fd(x.d):(need?'<span style="color:var(--bad);font-weight:600">Missing</span>':'Not needed yet'))+'</div></div><div style="display:flex;gap:6px">'+(tch?'<button class="btn'+(x||!need?'':' pri')+'" type="button" data-a="dup" data-id="'+l.id+'" data-v="'+d[0]+'">'+(x?'Replace':'Upload')+'</button>':'')+(x&&adm()?'<button class="btn" type="button" data-a="ddel" data-id="'+l.id+'" data-v="'+d[0]+'">Remove</button>':'')+'</div></div>'}).join('');
 var pod=!!l.docs.pod,can1=tch&&l.st==='Delivered'&&pod&&l.inv==='Not ready';
 var bill='<div class="dr"><div><b>Invoice</b><div class="sub" style="font-size:12.5px">'+invPill(l)+(l.inv==='Not ready'?' '+(l.st!=='Delivered'?'Waiting for delivery.':!pod?'Waiting for the proof of delivery.':''):'')+'</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">'
 +(l.inv==='Not ready'&&tch?'<button class="btn pri" type="button" data-a="inv" data-id="'+l.id+'" data-v="Ready"'+(can1?'':' disabled')+'>Mark ready to invoice</button>':'')
 +(l.inv==='Ready'&&adm()?'<button class="btn pri" type="button" data-a="inv" data-id="'+l.id+'" data-v="Invoiced">Mark invoiced</button>':'')
 +(l.inv==='Invoiced'&&adm()?'<button class="btn pri" type="button" data-a="inv" data-id="'+l.id+'" data-v="Paid">Mark paid</button>':'')+'</div></div>';
 if(l.dept==='Brokerage'){var okp=(l.inv==='Invoiced'||l.inv==='Paid')&&pod;bill+='<div class="dr"><div><b>Carrier payment</b><div class="sub" style="font-size:12.5px"><span class="pill '+(l.pay==='Released'?'p-ok':'p-idle')+'">'+l.pay+'</span> '+(l.pay==='Held'?'Released after the shipper invoice is out and the POD is in.':'')+'</div></div>'+(adm()&&l.pay==='Held'?'<button class="btn pri" type="button" data-a="pay" data-id="'+l.id+'"'+(okp?'':' disabled')+'>Release payment</button>':'')+'</div>'}
 var money=adm()?'<div class="card" style="margin-bottom:16px"><header><h2>Money (admin only)</h2><button class="btn" type="button" data-a="erate" data-id="'+l.id+'">Edit rate</button></header><div class="pad"><div class="kv"><div><span>Revenue</span>'+usd(l.rev)+'</div><div><span>Profit</span>'+usd(l.pf)+'</div><div><span>Per mile</span>'+(l.mi&&l.rev?dstr(l.rev/l.mi):'')+'</div></div><div class="sub" style="margin-top:8px">Every rate change is saved in the change log with the old and new numbers.</div></div></div>':'';
 return '<div class="sub" style="font-size:11px;text-transform:uppercase;letter-spacing:.08em">Load · '+l.dept+'</div><h1 class="mono" style="font-size:1.5rem">'+l.id+'</h1><div class="sub" style="margin-bottom:14px">'+esc(l.o)+' to '+esc(l.d)+' · '+l.mi+' miles · pickup '+fd(l.pu)+'</div>'+stepsR(l)
 +'<div class="grid g2"><div><div class="card" style="margin-bottom:16px"><header><h2>Documents</h2>'+docPill(l)+'</header><div class="pad">'+dr+'</div></div><div class="card" style="margin-bottom:16px"><header><h2>Billing</h2></header><div class="pad">'+bill+'</div></div></div>'
 +'<div>'+money+'<div class="card"><header><h2>Details</h2></header><div class="pad"><div class="kv"><div><span>Account</span><a href="#" data-a="acct" data-v="'+a.id+'" style="color:var(--brand);font-weight:600">'+esc(a.n)+'</a></div><div><span>Hauled by</span>'+(car?'<a href="#" data-a="acct" data-v="'+car.id+'" style="color:var(--brand);font-weight:600">'+esc(car.n)+'</a>'+(r?'<div>'+vpill(r.res)+'</div>':''):'Not set')+'</div><div><span>Created by</span>'+esc(usr(l.by).n)+'</div><div><span>Department</span>'+l.dept+'</div></div></div></div></div></div>'}
function mDoc(id,k){var d=DOCT.filter(function(x){return x[0]===k})[0];return '<form class="form" id="fdoc" data-id="'+id+'" data-k="'+k+'"><h2>'+d[1]+'</h2><div class="sub">For load '+id+'. Pick the scan or PDF.</div><label for="dfile">File<input id="dfile" type="file" accept=".pdf,image/*" required></label><div class="sub" style="margin-top:8px;font-size:12px">The prototype saves only the file name. The live system stores the file itself.</div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn" type="button" data-a="mclose">Cancel</button><button class="btn pri" type="submit">Save</button></div></form>'}
function mRate(id){var l=ldg(id);return '<form class="form" id="frate" data-id="'+id+'"><h2>Edit rate</h2><div class="sub">Load '+id+'. The change is saved in the change log.</div><div class="row2"><label for="rr">Revenue ($)<input id="rr" inputmode="numeric" value="'+Math.round(l.rev)+'" required></label><label for="rp">Profit ($)<input id="rp" inputmode="numeric" value="'+Math.round(l.pf)+'" required></label></div><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn" type="button" data-a="mclose">Cancel</button><button class="btn pri" type="submit">Save</button></div></form>'}

/* ---------- quotes + lane rates ---------- */
var QSET={days:2,max:3};
var QT=[
{id:'Q-1041',opp:'o9',acc:'a8',by:'u2',o:'Dallas, TX',d:'Atlanta, GA',mi:780,rate:2.55,sent:'2026-10-21',last:'2026-10-21',fu:0,st:'Sent'},
{id:'Q-1042',opp:'o9',acc:'a8',by:'u2',o:'Dallas, TX',d:'Kansas City, MO',mi:500,rate:2.70,sent:'2026-10-22',last:'2026-10-22',fu:0,st:'Sent'},
{id:'Q-1043',opp:'o11',acc:'a10',by:'u2',o:'Austin, TX',d:'Phoenix, AZ',mi:1010,rate:3.40,sent:'2026-10-23',last:'2026-10-23',fu:0,st:'Sent'},
{id:'Q-1038',opp:'o8',acc:'a7',by:'u3',o:'Houston, TX',d:'Memphis, TN',mi:585,rate:2.62,sent:'2026-10-19',last:'2026-10-21',fu:1,st:'Sent'},
{id:'Q-1035',opp:'o10',acc:'a9',by:'u3',o:'Fort Worth, TX',d:'Little Rock, AR',mi:330,rate:2.85,sent:'2026-10-14',last:'2026-10-20',fu:3,st:'Sent'},
{id:'Q-1031',opp:'o7',acc:'a6',by:'u2',o:'McAllen, TX',d:'Dallas, TX',mi:510,rate:2.48,sent:'2026-10-09',last:'2026-10-11',fu:1,st:'Won'},
{id:'Q-1029',opp:'o8',acc:'a7',by:'u3',o:'San Antonio, TX',d:'Laredo, TX',mi:155,rate:3.10,sent:'2026-10-06',last:'2026-10-10',fu:2,st:'Lost',why:'Price'},
{id:'Q-1024',opp:'o10',acc:'a9',by:'u3',o:'Memphis, TN',d:'Chicago, IL',mi:530,rate:2.58,sent:'2026-09-28',last:'2026-09-29',fu:1,st:'Won'},
{id:'Q-1019',opp:'o7',acc:'a6',by:'u2',o:'Oklahoma City, OK',d:'Denver, CO',mi:680,rate:2.66,sent:'2026-09-20',last:'2026-09-24',fu:2,st:'Lost',why:'No reply'}];
var qn=1044;
function qDue(q){return q.st==='Sent'&&dd(q.last,TODAY)>=QSET.days}
function laneStats(){var from=addDays(TODAY,-90),m={};LOAD.forEach(function(l){if(l.dept!=='Brokerage'||l.pu<from||!l.mi||!l.rev)return;var k=l.o+'|'+l.d,x=m[k]=m[k]||{o:l.o,d:l.d,mi:l.mi,n:0,rs:[],cs:[],last:''};x.n++;x.rs.push(l.rev/l.mi);x.cs.push((l.rev-l.pf)/l.mi);if(l.pu>x.last)x.last=l.pu});
 return Object.keys(m).map(function(k){var x=m[k];x.avg=avg(x.rs);x.lo=Math.min.apply(0,x.rs);x.hi=Math.max.apply(0,x.rs);x.cost=avg(x.cs);x.mg=x.avg?(x.avg-x.cost)/x.avg:0;return x}).sort(function(a,b){return b.n-a.n})}
function laneHint(o,d){var s=laneStats().filter(function(x){return x.o.toLowerCase()===o.toLowerCase()&&x.d.toLowerCase()===d.toLowerCase()})[0];return s}
function qBy(){return me().r==='Broker'&&S.qm!==false}
function qtV(){var f=S.qf||'due',m=me(),all=QT.filter(function(q){return !qBy()||q.by===S.me});
 if(f==='rates')return qHead(all,f)+rateT();
 var F={due:['Needs follow-up',function(q){return qDue(q)}],open:['Open',function(q){return q.st==='Sent'}],Won:['Won',function(q){return q.st==='Won'}],Lost:['Lost',function(q){return q.st==='Lost'}]};
 var L=all.filter(F[f]?F[f][1]:F.due[1]).sort(function(a,b){return a.last<b.last?-1:1});
 var rows=L.map(function(q){var qu=dd(q.last,TODAY),due=qDue(q),nxt=q.st!=='Sent'?'':!due?'Follow up in '+(QSET.days-qu)+' day'+(QSET.days-qu===1?'':'s'):q.fu>=QSET.max?'Close it out or mark lost':'Follow up #'+(q.fu+1);var h=laneHint(q.o,q.d);var cmp=h?(q.rate>=h.avg?'above':'below'):'';
  return '<tr><td class="mono">'+q.id+'</td><td style="min-width:130px"><a href="#" data-a="acct" data-v="'+q.acc+'" style="color:var(--brand);font-weight:600">'+esc(acc(q.acc).n)+'</a></td><td style="min-width:190px">'+esc(q.o)+' to '+esc(q.d)+'<div class="sub">'+q.mi+' miles</div></td><td class="num">'+dstr(q.rate)+'/mi<div class="sub">'+usd(q.rate*q.mi)+'</div></td><td style="white-space:nowrap">'+fd(q.sent)+'</td><td>'+(q.st==='Sent'?'<span class="pill '+(due?'p-warn':'p-idle')+'">'+qu+' day'+(qu===1?'':'s')+' quiet</span>':'<span class="pill '+(q.st==='Won'?'p-ok':'p-bad')+'">'+q.st+(q.why?': '+esc(q.why):'')+'</span>')+'<div class="sub">'+q.fu+' follow-up'+(q.fu===1?'':'s')+' so far</div></td><td>'+esc(usr(q.by).n)+'</td><td style="white-space:normal;min-width:130px">'+(due?'<b>'+nxt+'</b>':'<span class="sub">'+nxt+'</span>')+'</td><td>'+(q.st==='Sent'?'<div style="display:flex;gap:6px;flex-wrap:wrap;min-width:120px"><button class="btn'+(due?' pri':'')+'" type="button" data-a="qfu" data-v="'+q.id+'">Followed up</button><button class="btn" type="button" data-a="qwon" data-v="'+q.id+'">Won</button><button class="btn" type="button" data-a="qlost" data-v="'+q.id+'">Lost</button></div>':'')+'</td></tr>'}).join('');
 return qHead(all,f)+'<div class="card"><div class="tw"><table><thead><tr><th>Quote</th><th>Account</th><th>Lane</th><th class="num">Rate</th><th>Sent</th><th>Status</th><th>Broker</th><th>Next step</th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="9" class="empty">'+(f==='due'?'Nothing needs a follow-up today.':'Nothing here.')+'</td></tr>')+'</tbody></table></div></div>'}
function qHead(all,f){var F=[['due','Needs follow-up',all.filter(qDue).length],['open','Open',all.filter(function(q){return q.st==='Sent'}).length],['Won','Won',all.filter(function(q){return q.st==='Won'}).length],['Lost','Lost',all.filter(function(q){return q.st==='Lost'}).length],['rates','Lane rates','']];
 return '<h1>Quotes</h1><div class="sub">A quote that goes quiet is lost money. After '+QSET.days+' days the system puts it on your list.</div><div class="tools"><div class="chips">'+F.map(function(x){return '<button class="chip" type="button" aria-pressed="'+(f===x[0])+'" data-a="qf" data-v="'+x[0]+'">'+x[1]+(x[2]!==''?' ('+x[2]+')':'')+'</button>'}).join('')+'</div><div class="chips" style="margin-left:auto">'+(me().r==='Broker'?'<button class="chip" type="button" aria-pressed="'+qBy()+'" data-a="qm">Only mine</button>':'')+'<button class="btn pri" type="button" data-a="newq">New quote</button></div></div>'
 +(adm()?'<div class="card" style="margin-bottom:14px"><div class="pad form" style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap"><b style="padding-bottom:8px">Follow-up rules (admin)</b><label style="margin:0">Remind after (days)<input data-o="qs" data-k="days" inputmode="numeric" value="'+QSET.days+'" style="width:90px"></label><label style="margin:0">Up to (follow-ups)<input data-o="qs" data-k="max" inputmode="numeric" value="'+QSET.max+'" style="width:90px"></label></div></div>':'')}
function rateT(){var L=laneStats(),a=adm();
 return '<div class="card"><header><h2>What shippers paid, last 90 days</h2><span class="sub">Brokered loads only</span></header><div class="tw"><table><thead><tr><th>Lane</th><th class="num">Loads</th><th class="num">Average / mile</th><th class="num">Low to high</th><th>Last booked</th>'+(a?'<th class="num">Carrier cost / mile</th><th class="num">Margin</th>':'')+'</tr></thead><tbody>'
 +L.map(function(x){return '<tr><td>'+esc(x.o)+' to '+esc(x.d)+'<div class="sub">'+x.mi+' miles</div></td><td class="num">'+x.n+'</td><td class="num"><b>'+dstr(x.avg)+'</b></td><td class="num">'+dstr(x.lo)+' to '+dstr(x.hi)+'</td><td style="white-space:nowrap">'+fd(x.last)+'</td>'+(a?'<td class="num">'+dstr(x.cost)+'</td><td class="num">'+Math.round(x.mg*100)+'%</td>':'')+'</tr>'}).join('')+'</tbody></table></div></div>'
 +'<div class="sub" style="margin-top:10px;font-size:12px">'+(a?'You see carrier cost and margin because you are an admin.':'This shows what shippers paid. Carrier cost and margin are admin-only.')+' Sample data from the loads in this prototype.</div>'}
function mNewQ(){var os=OPP.filter(function(o){return o.dept==='Brokerage'&&canOpp(o)&&acc(o.acc).type==='Shipper'&&o.stage!=='Closed lost'});
 return '<form class="form" id="fnq"><h2>New quote</h2><div class="sub">Sent to a shipper. It goes on your follow-up list automatically.</div>'
 +'<label for="qo">Opportunity<select id="qo">'+os.map(function(o){return '<option value="'+o.id+'">'+esc(acc(o.acc).n)+' — '+esc(o.name.split(': ')[1]||o.name)+'</option>'}).join('')+'</select></label>'
 +'<div class="row2"><label for="qf1">Pickup<input id="qf1" list="qcity" required placeholder="Dallas, TX" autocomplete="off"></label><label for="qt1">Drop off<input id="qt1" list="qcity" required placeholder="Atlanta, GA" autocomplete="off"></label></div><datalist id="qcity">'+LAN.map(function(l){return '<option value="'+l[0]+'">'}).join('')+LAN.map(function(l){return '<option value="'+l[1]+'">'}).join('')+'</datalist>'
 +'<div class="row2"><label for="qm1">Miles<input id="qm1" inputmode="numeric" required placeholder="780"></label><label for="qr1">Rate per mile ($)<input id="qr1" inputmode="decimal" required placeholder="2.60"></label></div><div id="qh" class="vb info" style="margin-top:12px">Enter a lane to see what shippers paid on it.</div>'
 +'<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn" type="button" data-a="mclose">Cancel</button><button class="btn pri" type="submit">Save quote</button></div></form>'}
function qHint(){var o=$('#qf1')&&$('#qf1').value.trim(),d=$('#qt1')&&$('#qt1').value.trim(),r=parseFloat($('#qr1')&&$('#qr1').value),lm=LAN.filter(function(l){return l[0].toLowerCase()===(o||'').toLowerCase()&&l[1].toLowerCase()===(d||'').toLowerCase()})[0];
 if(lm&&!$('#qm1').value)$('#qm1').value=lm[2];var h=o&&d?laneHint(o,d):null,e=$('#qh');if(!e)return;
 if(!h){e.innerHTML='No brokered loads on this lane in the last 90 days.';return}
 e.innerHTML='Last 90 days: <b>'+h.n+' loads</b>, average <b>'+dstr(h.avg)+'/mi</b> (low '+dstr(h.lo)+', high '+dstr(h.hi)+').'+(r?' Your quote is <b>'+Math.abs(Math.round((r/h.avg-1)*100))+'% '+(r>=h.avg?'above':'below')+'</b> the average.':'')}
function mLost(id){return '<form class="form" id="fql" data-id="'+id+'"><h2>Mark quote lost</h2><div class="sub">'+id+'. Knowing why helps pricing.</div><label for="ql">Reason<select id="ql"><option>Price</option><option>No reply</option><option>Went with another broker</option><option>Load cancelled</option><option>Other</option></select></label><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px"><button class="btn" type="button" data-a="mclose">Cancel</button><button class="btn pri" type="submit">Mark lost</button></div></form>'}

/* ---------- notifications ---------- */
function notes(){var m=me(),r=[];
 if(m.r==='Broker'||adm())QT.filter(function(q){return qDue(q)&&(adm()||q.by===S.me)}).forEach(function(q){r.push({k:'q'+q.id+':'+q.fu,lvl:'w',t:'Follow up with '+acc(q.acc).n+' on quote '+q.id+' ('+dd(q.last,TODAY)+' days quiet)',v:'quotes',id:'due'})});
 if(m.r!=='Sales')carriers().forEach(function(c){var mine=adm()||(m.r==='Broker'&&OPP.some(function(o){return o.acc===c.id&&o.dept==='Brokerage'}))||(m.r==='Dispatcher'&&OPP.some(function(o){return o.acc===c.id&&o.dept==='Dispatch'&&o.owner===S.me}));if(!mine)return;var v=vet(c.id);
  if(v.res==='Blocked')r.push({k:'v'+c.id+':b:'+v.why.length,lvl:'f',t:c.n+' is blocked: '+v.why.filter(function(w){return w.l==='f'})[0].t,v:'acct',id:c.id});else if(v.res==='Review'&&v.why.length)r.push({k:'v'+c.id+':w:'+v.why.length,lvl:'w',t:c.n+': '+v.why[0].t,v:'acct',id:c.id})});
 if(m.r!=='Sales'){var np=LOAD.filter(function(l){return canLoad(l)&&l.st==='Delivered'&&!l.docs.pod});if(np.length)r.push({k:'pod:'+np.length,lvl:'w',t:np.length+' delivered load'+(np.length===1?' has':'s have')+' no proof of delivery. They cannot be invoiced.',v:'loads',id:'nopod'})}
 if(adm()){var rd=LOAD.filter(function(l){return l.inv==='Ready'}).length;if(rd)r.push({k:'rd:'+rd,lvl:'i',t:rd+' load'+(rd===1?' is':'s are')+' ready to invoice',v:'loads',id:'ready'});var rp=LOAD.filter(function(l){return l.dept==='Brokerage'&&l.pay==='Held'&&l.inv==='Invoiced'&&l.docs.pod}).length;if(rp)r.push({k:'rp:'+rp,lvl:'i',t:rp+' carrier payment'+(rp===1?' can':'s can')+' be released',v:'loads',id:'all'})}
 if(m.r==='Sales'){var nl=LEAD.filter(function(l){return l.agent===S.me&&l.st==='New'}).length;if(nl)r.push({k:'ld:'+nl,lvl:'i',t:nl+' lead'+(nl===1?'':'s')+' still not called',v:'leads',id:''})}
 NTF.filter(function(n){return n.to===S.me}).forEach(function(n){r.push(n)});return r}
function unread(){return notes().filter(function(n){return !NR[S.me+n.k]})}
function noteRow(n){var u=!NR[S.me+n.k];return '<button type="button" class="nt'+(u?' un':'')+'" data-a="note" data-k="'+esc(n.k)+'"><i class="dt '+n.lvl+'" aria-hidden="true"></i><span>'+esc(n.t)+'</span></button>'}
window.bellUp=function(){var n=unread().length,b=$('#bn');if(!b)return;b.hidden=!n;b.textContent=n>9?'9+':n;var p=$('#np');if(p&&!p.hidden)panel()};
function panel(){var L=notes();$('#np').innerHTML='<div class="nh"><b>Notifications</b><button class="btn" type="button" data-a="nread">Mark all read</button></div>'+(L.length?L.map(noteRow).join(''):'<div class="empty">Nothing needs you right now.</div>')+'<div class="nf">The live system also sends these by email or text.</div>'}
window.attnCard=function(){var L=notes().slice(0,6);return '<div class="card" style="margin-bottom:16px"><header><h2>Needs your attention</h2><span class="sub">'+notes().length+' item'+(notes().length===1?'':'s')+'</span></header><div class="pad" style="padding:6px 8px">'+(L.length?L.map(noteRow).join(''):'<div class="sub" style="padding:8px">Nothing needs you right now.</div>')+'</div></div>'}
window.okView=function(v){var m=me();if(v==='log')return adm();if(v==='carr')return m.r!=='Sales';if(v==='quotes')return m.r==='Broker'||adm();if(v==='load'){var l=ldg(S.id);return !!l&&canLoad(l)}return true};
window.vetCard=vetCard;window.carField=carField;window.loadGate=loadGate;window.carV=carV;window.qtV=qtV;window.lg=lg;window.nfy=nfy;

/* ---------- change log ---------- */
(function(){function sd(n,t,u,ty,tx,a,l){LOGX.push({t:addDays(TODAY,-n)+'T'+t,by:u,type:ty,txt:tx,acc:a||'',ld:l||''})}
 sd(1,'16:42','u2','Quote','Sent quote Q-1041 to Summit Auto Parts: Dallas, TX to Atlanta, GA at $2.55 per mile','a8');
 sd(1,'15:10','u4','Document','Uploaded proof of delivery POD-DL-26-0412.pdf on load DL-26-0412','a2','DL-26-0412');
 sd(1,'11:03','u1','Settings','Changed vetting rule: warn before expiry 21 days to 30 days');
 sd(2,'17:25','u3','Quote','Followed up on quote Q-1038 (Redline Industrial Supply), follow-up 1','a7');
 sd(2,'14:48','u5','Stage','Moved "Cimarron Freight: dispatch services" from Onboarding to Active','a2');
 sd(2,'10:12','u2','Load','Created load ML-26-1019: Houston, TX to Memphis, TN (585 mi)','a7','ML-26-1019');
 sd(2,'09:20','u1','Rate','Edited rate on ML-26-1011: revenue $1,610 to $1,690, profit $190 to $225','a7','ML-26-1011');
 sd(3,'16:05','u3','Invoice','Marked load ML-26-1008 ready to invoice','a9','ML-26-1008');
 sd(3,'13:31','u1','Invoice','Marked load ML-26-1008 invoiced','a9','ML-26-1008');
 sd(3,'09:46','u7','Account','Converted carrier lead "Cedar Mile Transport Inc" into an account and a Dispatch opportunity');
 sd(4,'15:55','u6','Carrier check','Updated insurance for Gulf Breeze Hauling: auto liability expires Nov 2, 2026','a12');
 sd(4,'12:20','u2','Quote','Marked quote Q-1031 won (Brazos Valley Foods)','a6');
 sd(4,'10:08','u8','Leads','Marked shipper lead "Crossroads Machine and Tool" as not a fit');
 sd(5,'17:02','u1','Prospecting','Pulled 612 shippers and assigned 498 equally to 4 agents');
 sd(5,'11:40','u3','Document','Replaced rate confirmation RateCon-ML-26-1002.pdf on load ML-26-1002','a10','ML-26-1002');
 sd(5,'09:15','u4','Activity','Logged a call on Pine Belt Trucking: asked for the new insurance certificate','a11');
 sd(6,'16:30','u2','Stage','Moved "Summit Auto Parts: parts runs" from Prospect to Quoted','a8');
 sd(6,'14:02','u1','Invoice','Released carrier payment on load ML-26-1004','a9','ML-26-1004');
 sd(6,'10:44','u5','Load','Marked load DL-26-0405 delivered','a5','DL-26-0405');
 sd(7,'15:20','u1','Settings','Changed quote follow-up rule: remind after 3 days to 2 days');
 sd(7,'09:05','u6','Stage','Moved "Rio Verde Transport: dispatch services" from Qualify to Onboarding','a4');
 sd(8,'13:12','u1','Carrier check','Override: put blocked carrier Delta Ridge Carriers on a load. Reason: insurer confirmed renewal by phone, certificate coming Monday.','a5');
 sd(9,'10:30','u3','Rate','Edited rate on ML-26-1006: revenue $1,380 to $1,420, profit $140 to $170','a10','ML-26-1006');
 sd(10,'16:48','u9','Leads','Marked shipper lead "Summit Paper Products LLC" as not a fit');
 LOGX.sort(function(a,b){return a.t<b.t?-1:1})})();
var LT=['Stage','Account','Load','Rate','Document','Invoice','Quote','Carrier check','Settings','Activity','Leads','Prospecting'];
function logRows(){var d=S.lgd||'7',u=S.lgu||'',t=S.lgt||'',q=(S.lgq||'').toLowerCase(),from=d==='today'?TODAY:d==='7'?addDays(TODAY,-7):'';
 return LOGX.filter(function(x){return(!from||x.t.slice(0,10)>=from)&&(!u||x.by===u)&&(!t||x.type===t)&&(!q||(x.txt+' '+usr(x.by).n+' '+(x.acc?acc(x.acc).n:'')+' '+x.ld).toLowerCase().indexOf(q)>-1)}).sort(function(a,b){return a.t<b.t?1:-1})}
window.logV=function(){var L=logRows(),all=LOGX,today=all.filter(function(x){return x.t.slice(0,10)===TODAY}).length,wk=all.filter(function(x){return x.t.slice(0,10)>=addDays(TODAY,-7)}).length,ppl={};all.filter(function(x){return x.t.slice(0,10)>=addDays(TODAY,-7)}).forEach(function(x){ppl[x.by]=1});
 var sens=all.filter(function(x){return x.type==='Rate'||x.type==='Settings'||/^Override/.test(x.txt)}).length;
 var rows=L.slice(0,300).map(function(x){var u=usr(x.by);return '<tr><td style="white-space:nowrap">'+fdt(x.t)+'</td><td style="white-space:nowrap"><b>'+esc(u.n==='You'?'You':u.n)+'</b><div class="sub">'+u.r+'</div></td><td><span class="pill '+({Rate:'p-warn',Settings:'p-warn','Carrier check':'p-warn',Invoice:'p-brk',Document:'p-idle',Quote:'p-brk',Load:'p-disp',Stage:'p-idle',Account:'p-sal',Leads:'p-sal',Prospecting:'p-sal',Activity:'p-idle'}[x.type]||'p-idle')+'">'+x.type+'</span></td><td style="white-space:normal;min-width:260px">'+esc(x.txt)+'</td><td style="white-space:nowrap">'+(x.ld&&ldg(x.ld)?'<a href="#" data-a="load" data-v="'+x.ld+'" class="mono" style="color:var(--brand)">'+x.ld+'</a>':x.ld&&x.acc?'<a href="#" data-a="acct" data-v="'+x.acc+'" style="color:var(--brand);font-weight:600">'+esc(acc(x.acc).n)+'</a> <span class="mono sub">'+x.ld+'</span>':x.acc?'<a href="#" data-a="acct" data-v="'+x.acc+'" style="color:var(--brand);font-weight:600">'+esc(acc(x.acc).n)+'</a>':'')+'</td></tr>'}).join('');
 var staff=U.filter(function(x){return x.r!=='Admin'}).concat([U[0]]);
 return '<h1>Change log</h1><div class="sub">Who did what, and when. Entries cannot be edited or deleted from here.</div>'
 +'<div class="grid g4" style="margin:14px 0"><div class="card tile"><span>Entries today</span><b>'+today+'</b></div><div class="card tile"><span>Last 7 days</span><b>'+wk+'</b></div><div class="card tile"><span>People active (7 days)</span><b>'+Object.keys(ppl).length+'</b></div><div class="card tile"><span>Rate, rule and override changes</span><b>'+sens+'</b></div></div>'
 +'<div class="tools"><div class="chips">'+[['today','Today'],['7','7 days'],['all','All time']].map(function(x){return '<button class="chip" type="button" aria-pressed="'+((S.lgd||'7')===x[0])+'" data-a="lgd" data-v="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>'
 +'<select data-o="lgu" aria-label="Person"><option value="">Everyone</option>'+staff.map(function(x){return '<option value="'+x.id+'"'+(S.lgu===x.id?' selected':'')+'>'+esc(x.n)+'</option>'}).join('')+'</select>'
 +'<select data-o="lgt" aria-label="Type"><option value="">All types</option>'+LT.map(function(x){return '<option'+(S.lgt===x?' selected':'')+'>'+x+'</option>'}).join('')+'</select>'
 +'<input id="lq" type="search" data-o="lgq" placeholder="Search the log" value="'+esc(S.lgq||'')+'" aria-label="Search the log" style="min-width:200px"><button class="btn" type="button" data-a="lgcsv" style="margin-left:auto">Copy as CSV</button></div>'
 +'<div class="card"><div class="tw"><table><thead><tr><th>When</th><th>Who</th><th>Type</th><th>What happened</th><th>Record</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5" class="empty">No entries match.</td></tr>')+'</tbody></table></div></div>'
 +'<div class="sub" style="margin-top:10px;font-size:12px">Showing '+Math.min(300,L.length)+' of '+L.length+'. Earlier entries are sample history; anything you do in this prototype is added at the top. In the live system the server writes the log, nobody can change it, and it covers sign-ins too.</div>'}
window.logAfter=function(){if(S.lgfocus){var e=$('#lq');if(e){e.focus();e.setSelectionRange(e.value.length,e.value.length)}}};

/* ---------- handlers ---------- */
function nav(n){NR[S.me+n.k]=1;if(n.v==='loads')S.lf=n.id||'all';if(n.v==='quotes')S.qf=n.id||'due';var p=$('#np');if(p)p.hidden=true;if(n.v==='acct'||n.v==='load')go(n.v,n.id);else go(n.v)}
function setStage(o,st){if(o.stage===st)return;lg('Stage','Moved "'+o.name+'" from '+o.stage+' to '+st,o.acc);ACT.push({acc:o.acc,dept:o.dept,by:S.me,type:'Stage',date:TODAY,txt:'Moved "'+o.name+'" from '+o.stage+' to '+st});o.stage=st}
document.addEventListener('click',function(e){if(!e.target.closest('#np,#bell')){var p=$('#np');if(p&&!p.hidden)p.hidden=true}
 var bt=e.target.closest('#bell');if(bt){var p2=$('#np');p2.hidden=!p2.hidden;if(!p2.hidden)panel();return}
 var t=e.target.closest('[data-a]');if(!t)return;var a=t.dataset.a,v=t.dataset.v,id=t.dataset.id;
 if(a==='load'){e.preventDefault();go('load',v)}
 else if(a==='lf'){S.lf=v;render()}
 else if(a==='note'){var n=notes().filter(function(x){return x.k===t.dataset.k})[0];if(n)nav(n)}
 else if(a==='nread'){notes().forEach(function(n){NR[S.me+n.k]=1});panel();bellUp()}
 else if(a==='vins'){modal(mVetIns(v))}
 else if(a==='vchk'){var c=VET[v];if(!c){VET[v]={auth:'Active',since:TODAY,auto:{amt:0,exp:TODAY},cargo:{amt:0,exp:TODAY},safety:'Not rated',oos:false,chk:TODAY}}else c.chk=TODAY;var r=vet(v);lg('Carrier check','Re-checked '+acc(v).n+': '+r.res+(r.why.length?' ('+r.why.map(function(w){return w.t}).join('; ')+')':''),v);toast(acc(v).n+': '+r.res);render()}
 else if(a==='dup'){modal(mDoc(id,v))}
 else if(a==='ddel'){var l=ldg(id),d=DOCT.filter(function(x){return x[0]===v})[0];if(l&&adm()){var f=l.docs[v];delete l.docs[v];if(l.inv!=='Paid'&&l.inv!=='Invoiced'&&!l.docs.pod)l.inv='Not ready';lg('Document','Removed '+d[1].toLowerCase()+' '+(f?f.f:'')+' from load '+id,l.acc,id);toast(d[1]+' removed.');render()}}
 else if(a==='lst'){var l2=ldg(id);if(!l2||!canTouch(l2)||l2.st===v)return;lg('Load','Marked load '+id+' '+v.toLowerCase()+' (was '+l2.st.toLowerCase()+')',l2.acc,id);l2.st=v;if(v!=='Delivered'&&l2.inv==='Ready')l2.inv='Not ready';toast('Load '+id+' is now '+v.toLowerCase()+'.');render()}
 else if(a==='inv'){var l3=ldg(id);if(!l3)return;if(v==='Ready'){if(!(canTouch(l3)&&l3.st==='Delivered'&&l3.docs.pod)){toast('Needs the proof of delivery first.');return}}else if(!adm())return;l3.inv=v;lg('Invoice',({Ready:'Marked load '+id+' ready to invoice',Invoiced:'Marked load '+id+' invoiced',Paid:'Marked load '+id+' paid by the shipper'})[v],l3.acc,id);toast('Invoice: '+v+'.');render()}
 else if(a==='pay'){var l4=ldg(id);if(!l4||!adm())return;if(!((l4.inv==='Invoiced'||l4.inv==='Paid')&&l4.docs.pod)){toast('Needs the invoice out and the POD in.');return}l4.pay='Released';lg('Invoice','Released carrier payment on load '+id,l4.acc,id);toast('Carrier payment released.');render()}
 else if(a==='erate'){if(adm())modal(mRate(id))}
 else if(a==='qf'){S.qf=v;render()}
 else if(a==='qm'){S.qm=!qBy();render()}
 else if(a==='newq'){modal(mNewQ())}
 else if(a==='qfu'){var q=QT.filter(function(x){return x.id===v})[0];if(!q)return;q.fu++;q.last=TODAY;lg('Quote','Followed up on quote '+q.id+' ('+acc(q.acc).n+'), follow-up '+q.fu,q.acc);toast('Follow-up saved. Next reminder in '+QSET.days+' days.');render()}
 else if(a==='qwon'){var q2=QT.filter(function(x){return x.id===v})[0];if(!q2)return;q2.st='Won';q2.last=TODAY;lg('Quote','Marked quote '+q2.id+' won ('+acc(q2.acc).n+')',q2.acc);var o=opp(q2.opp);if(o&&(o.stage==='Prospect'||o.stage==='Quoted'))setStage(o,'Active');toast('Won. The opportunity is now Active.');render()}
 else if(a==='qlost'){modal(mLost(v))}
 else if(a==='lgd'){S.lgd=v;S.lgfocus=false;render()}
 else if(a==='lgcsv'){var rows=logRows(),csv='When,Who,Type,What,Record\n'+rows.map(function(x){return [x.t.replace('T',' '),usr(x.by).n,x.type,x.txt,x.ld||(x.acc?acc(x.acc).n:'')].map(function(c){return '"'+String(c).replace(/"/g,'""')+'"'}).join(',')}).join('\n');try{navigator.clipboard.writeText(csv).then(function(){toast(rows.length+' rows copied.')},function(){toast('Could not copy here.')})}catch(er){toast('Could not copy here.')}}});
document.addEventListener('submit',function(e){var f=e.target,id=f.id;
 if(id==='fvi'){var c=f.dataset.id,old=VET[c],ex=old?old.auto.exp+'/'+old.cargo.exp:'none';if(!VET[c])VET[c]={auth:'Active',since:TODAY,safety:'Not rated',oos:false};var v=VET[c];v.auto={amt:parseInt($('#via').value.replace(/\D/g,''),10)||0,exp:$('#vie').value};v.cargo={amt:parseInt($('#vca').value.replace(/\D/g,''),10)||0,exp:$('#vce').value};v.chk=TODAY;var r=vet(c);
  lg('Carrier check','Updated insurance for '+acc(c).n+': auto expires '+fd(v.auto.exp)+', cargo expires '+fd(v.cargo.exp)+'. Result: '+r.res,c);modal(null);toast(acc(c).n+' is now: '+r.res);render()}
 else if(id==='fdoc'){var l=ldg(f.dataset.id),k=f.dataset.k,fl=$('#dfile').files[0],d=DOCT.filter(function(x){return x[0]===k})[0];if(!l||!fl)return;var had=!!l.docs[k];l.docs[k]={f:fl.name,by:S.me,d:TODAY};if(l.st==='Delivered'&&k==='pod'&&l.inv==='Not ready'){}lg('Document',(had?'Replaced ':'Uploaded ')+d[1].toLowerCase()+' '+fl.name+' on load '+l.id,l.acc,l.id);modal(null);toast(d[1]+' saved.'+(k==='pod'&&l.st==='Delivered'&&l.inv==='Not ready'?' You can mark it ready to invoice.':''));render()}
 else if(id==='frate'){var l5=ldg(f.dataset.id),nr=parseInt($('#rr').value.replace(/\D/g,''),10),np=parseInt($('#rp').value.replace(/\D/g,''),10);if(!l5||!adm()||isNaN(nr)||isNaN(np))return;lg('Rate','Edited rate on '+l5.id+': revenue '+usd(l5.rev)+' to '+usd(nr)+', profit '+usd(l5.pf)+' to '+usd(np),l5.acc,l5.id);l5.rev=nr;l5.pf=np;modal(null);toast('Rate saved and logged.');render()}
 else if(id==='fnq'){var o=opp($('#qo').value);if(!o)return;var q={id:'Q-'+(qn++),opp:o.id,acc:o.acc,by:adm()?o.owner:S.me,o:$('#qf1').value.trim(),d:$('#qt1').value.trim(),mi:parseInt($('#qm1').value.replace(/\D/g,''),10)||0,rate:parseFloat($('#qr1').value)||0,sent:TODAY,last:TODAY,fu:0,st:'Sent'};QT.push(q);lg('Quote','Sent quote '+q.id+' to '+acc(q.acc).n+': '+q.o+' to '+q.d+' at '+dstr(q.rate)+' per mile',q.acc);if(o.stage==='Prospect')setStage(o,'Quoted');modal(null);S.qf='open';toast('Quote '+q.id+' saved. You will be reminded in '+QSET.days+' days.');render()}
 else if(id==='fql'){var q3=QT.filter(function(x){return x.id===f.dataset.id})[0];if(!q3)return;q3.st='Lost';q3.why=$('#ql').value;q3.last=TODAY;lg('Quote','Marked quote '+q3.id+' lost ('+acc(q3.acc).n+'): '+q3.why,q3.acc);modal(null);toast('Marked lost.');render()}});
document.addEventListener('change',function(e){var t=e.target;if(t.id==='nlc'){$('#nlv').innerHTML=vetBox(t.value);return}
 var o=t.dataset&&t.dataset.o;if(!o)return;
 if(o==='vs'&&adm()){var n=parseInt(String(t.value).replace(/\D/g,''),10);if(isNaN(n)){t.value=VETSET[t.dataset.k];return}var old=VETSET[t.dataset.k];VETSET[t.dataset.k]=n;lg('Settings','Changed vetting rule "'+t.dataset.k+'": '+old+' to '+n);render()}
 else if(o==='qs'&&adm()){var n2=Math.max(1,parseInt(String(t.value).replace(/\D/g,''),10)||0),old2=QSET[t.dataset.k];QSET[t.dataset.k]=n2;lg('Settings','Changed quote follow-up rule "'+t.dataset.k+'": '+old2+' to '+n2);render()}
 else if(o==='lgu'){S.lgu=t.value;S.lgfocus=false;render()}else if(o==='lgt'){S.lgt=t.value;S.lgfocus=false;render()}});
document.addEventListener('input',function(e){var t=e.target;if(t.id==='lq'){S.lgq=t.value;S.lgfocus=true;render();return}if(t.id==='qf1'||t.id==='qt1'||t.id==='qr1'||t.id==='qm1')qHint()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){var p=$('#np');if(p&&!p.hidden){p.hidden=true;$('#bell').focus()}}});
