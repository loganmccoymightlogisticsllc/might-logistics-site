/* ====== REPORTS (admin) ====== */
(function(){
function pad(n){return ('0'+n).slice(-2)}
var RS=424242;function rr(){RS=(RS*1103515245+12345)&0x7fffffff;return RS/0x7fffffff}
function pick(a){return a[Math.floor(rr()*a.length)]}
function wpick(a){var x=rr(),c=0;for(var i=0;i<a.length;i++){c+=a[i][1];if(x<c)return a[i][0]}return a[a.length-1][0]}
function dow(s){return new Date(s+'T12:00:00Z').getUTCDay()}
function isoMs(ms){return new Date(ms).toISOString().slice(0,10)}
function msOf(s){return new Date(s+'T12:00:00Z').getTime()}
function wkStart(s){var d=dow(s);return addDays(s,-(d===0?6:d-1))}
function monStart(s){return s.slice(0,8)+'01'}
function monEnd(s){var y=+s.slice(0,4),m=+s.slice(5,7);return isoMs(Date.UTC(y,m,0,12))}
function qStart(s){var m=+s.slice(5,7),q=Math.floor((m-1)/3)*3+1;return s.slice(0,5)+pad(q)+'-01'}
function addMonths(s,n){var y=+s.slice(0,4),m=+s.slice(5,7)-1+n;return isoMs(Date.UTC(y+Math.floor(m/12),((m%12)+12)%12,1,12))}
/* ---- history: calls and emails per person, weekdays, last 100 days ---- */
var ACTR=[],LEADH=[],OUTS=[['No answer',.38],['Voicemail',.22],['Callback',.08],['Interested',.08],['Not interested',.17],['Wrong number',.04],['Do not call',.03]];
var NAMES=['Longview Express','Cedar Mile','Blue Ridge','Northstar','Prairie Dog','Red River','Iron Horse','Summit','Delta','Mustang','Eagle','Heartland','Gulf Coast','Lone Star','Cedar'],STS=['TX','GA','TN','OK','LA','FL','MN','IL','OH','NC','MO','AL'];
(function(){
 var cfg={Sales:[[24,34],[10,20]],Broker:[[8,14],[8,14]],Dispatcher:[[6,11],[4,9]]};
 for(var k=100;k>=0;k--){var d=addDays(TODAY,-k),w=dow(d);if(w===0||w===6)continue;
  U.forEach(function(u){var c=cfg[u.r];if(!c)return;var nc=c[0][0]+Math.floor(rr()*(c[0][1]-c[0][0])),ne=c[1][0]+Math.floor(rr()*(c[1][1]-c[1][0])),dept=DEPT[u.r],i;
   for(i=0;i<nc;i++){var out=u.r==='Sales'?wpick(OUTS):wpick([['Connected',.7],['No answer',.15],['Voicemail',.15]]),ok=out==='Connected'||out==='Interested'||out==='Callback';
    ACTR.push({type:'Call',dept:dept,user:u.n,role:u.r,acct:u.r==='Sales'?'(cold lead)':pick(ACC).n,date:d,out:out,dur:ok?2+Math.floor(rr()*11):0})}
   for(i=0;i<ne;i++)ACTR.push({type:'Email',dept:dept,user:u.n,role:u.r,acct:u.r==='Sales'?'(cold lead)':pick(ACC).n,date:d,out:rr()<(u.r==='Sales'?.09:.2)?'Replied':'Sent',dur:0})});
  var ags=U.filter(function(u){return u.r==='Sales'}),per=12;
  ags.forEach(function(u){for(var j=0;j<per;j++){var st=wpick([['No answer',.34],['Voicemail',.2],['Callback',.08],['Interested',.045],['Sent to dispatch',.005],['Not interested',.2],['Wrong number',.06],['Do not call',.03],['New',.04]]);
   LEADH.push({co:pick(NAMES)+' '+pick(['Trucking','Transport','Freight','Hauling'])+' '+pick(['LLC','Inc']),agent:u.n,asg:d,status:st,calls:st==='New'?0:1+Math.floor(rr()*3),conv:st==='Sent to dispatch'?1:0,intr:(st==='Interested'||st==='Sent to dispatch')?1:0,mcage:1+Math.floor(rr()*6),state:pick(STS),trucks:1+Math.floor(rr()*4)})}})}
 ACT.forEach(function(a){ACTR.push({type:a.type,dept:a.dept,user:usr(a.by).n,role:usr(a.by).r,acct:acc(a.acc).n,date:a.date,out:'',dur:0})});
})();
/* ---- datasets ---- */
var DS={
 loads:{n:'Loads',df:'pu',rows:function(){return LOAD.map(function(l){var a=acc(l.acc);return {id:l.id,dept:l.dept,acct:a.n,atype:a.type,opp:opp(l.opp).name,by:usr(l.by).n,o:l.o,d:l.d,lane:l.o+' to '+l.d,so:l.o.split(', ')[1]||'',mi:l.mi,pu:l.pu,st:l.st,rev:l.rev,pf:l.pf,rpm:l.mi?l.rev/l.mi:0,mg:l.rev?l.pf/l.rev:0}})},
  f:[['id','Load number','s'],['dept','Department','s'],['acct','Account','s'],['atype','Account type','s'],['opp','Opportunity','s'],['by','Created by','s'],['o','Pickup city','s'],['d','Drop-off city','s'],['lane','Lane','s'],['so','Pickup state','s'],['st','Status','s'],['pu','Pickup date','d'],['mi','Miles','n'],['rev','Revenue','m'],['pf','Profit','m'],['rpm','Revenue per mile','r'],['mg','Margin','p']]},
 opps:{n:'Opportunities',df:'created',rows:function(){return OPP.map(function(o){var a=acc(o.acc);return {name:o.name,acct:a.n,atype:a.type,dept:o.dept,stage:o.stage,phase:o.stage==='Active'?'Active':o.stage==='Closed lost'?'Lost':'Open pipeline',owner:usr(o.owner).n,created:o.created,src:o.src.indexOf('Sales:')===0?'Sales cold call':o.src,by:o.src.indexOf('Sales:')===0?o.src.slice(7):'',age:dd(o.created,TODAY),amt:o.amt}})},
  f:[['name','Opportunity','s'],['acct','Account','s'],['atype','Account type','s'],['dept','Department','s'],['stage','Stage','s'],['phase','Phase','s'],['owner','Owner','s'],['src','Source','s'],['by','Sourced by (sales)','s'],['created','Created date','d'],['age','Age (days)','n'],['amt','Est. monthly profit','m']]},
 acts:{n:'Calls, emails and activity',df:'date',rows:function(){return ACTR.map(function(a){return {type:a.type,dept:a.dept,user:a.user,role:a.role,acct:a.acct,date:a.date,out:a.out||'(none)',dur:a.dur,conn:(a.out==='Connected'||a.out==='Interested'||a.out==='Callback')?1:0,rep:a.out==='Replied'?1:0}})},
  f:[['type','Activity type','s'],['dept','Department','s'],['user','Person','s'],['role','Role','s'],['acct','Account','s'],['out','Outcome','s'],['date','Date','d'],['dur','Call minutes','n'],['conn','Reached a person','b'],['rep','Got a reply','b']]},
 leads:{n:'Sales leads',df:'asg',rows:function(){return LEADH.map(function(l){return {co:l.co,agent:l.agent,asg:l.asg,status:l.status,calls:l.calls,conv:l.conv,intr:l.intr,sv:l.conv?'Yes':'No',mcage:l.mcage,state:l.state,trucks:l.trucks}})},
  f:[['co','Company','s'],['agent','Agent','s'],['status','Status','s'],['state','State','s'],['sv','Sent to dispatch','s'],['asg','Assigned date','d'],['calls','Calls made','n'],['mcage','MC age (days)','n'],['trucks','Trucks','n'],['intr','Interested','b'],['conv','Sent to dispatch (1/0)','b']]},
 accts:{n:'Accounts',df:'since',rows:function(){return ACC.map(function(a){var ls=LOAD.filter(function(l){return l.acc===a.id}),ds=[];OPP.forEach(function(o){if(o.acc===a.id&&ds.indexOf(o.dept)<0)ds.push(o.dept)});return {n:a.n,type:a.type,st:a.city.split(', ')[1]||'',depts:ds.join(' + '),nd:ds.length,since:a.since,trucks:a.trucks,loads:ls.length,rev:ls.reduce(function(s,l){return s+l.rev},0),pf:ls.reduce(function(s,l){return s+l.pf},0),opps:OPP.filter(function(o){return o.acc===a.id}).length}})},
  f:[['n','Account','s'],['type','Type','s'],['st','State','s'],['depts','Departments','s'],['since','Company since','d'],['nd','Departments (count)','n'],['trucks','Trucks','n'],['loads','Loads','n'],['opps','Opportunities','n'],['rev','Revenue','m'],['pf','Profit','m']]}};
Object.keys(DS).forEach(function(k){DS[k].m={};DS[k].f.forEach(function(f){DS[k].m[f[0]]={k:f[0],l:f[1],t:f[2]}})});
var NUMT={n:1,m:1,b:1,p:1,r:1};
var PRE=[['all','All time'],['today','Today'],['yday','Yesterday'],['week','This week'],['lweek','Last week'],['month','This month'],['lmonth','Last month'],['q','This quarter'],['lq','Last quarter'],['ytd','This year'],['l7','Last 7 days'],['l30','Last 30 days'],['l90','Last 90 days'],['custom','Custom range']];
function rangeOf(p,f,t){var T=TODAY;switch(p){case'today':return[T,T];case'yday':return[addDays(T,-1),addDays(T,-1)];case'week':return[wkStart(T),addDays(wkStart(T),6)];case'lweek':return[addDays(wkStart(T),-7),addDays(wkStart(T),-1)];case'month':return[monStart(T),monEnd(T)];case'lmonth':var lm=addMonths(monStart(T),-1);return[lm,monEnd(lm)];case'q':var qs=qStart(T);return[qs,monEnd(addMonths(qs,2))];case'lq':var lq=addMonths(qStart(T),-3);return[lq,monEnd(addMonths(lq,2))];case'ytd':return[T.slice(0,4)+'-01-01',T.slice(0,4)+'-12-31'];case'l7':return[addDays(T,-6),T];case'l30':return[addDays(T,-29),T];case'l90':return[addDays(T,-89),T];case'custom':return[f||'0000-01-01',t||'9999-12-31'];default:return null}}
function pname(p){return(PRE.filter(function(x){return x[0]===p})[0]||[0,'All time'])[1]}
function fmtD(s){return fd(s)}
function bucket(v,mode){if(!v)return '';if(mode==='day')return v;if(mode==='week')return wkStart(v);return v.slice(0,7)}
function blabel(v,mode){if(!v)return '(blank)';if(mode==='day')return fd(v);if(mode==='week')return 'Week of '+new Date(v+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});return new Date(v+'-01T12:00:00Z').toLocaleDateString('en-US',{month:'short',year:'numeric',timeZone:'UTC'})}
function gdefs(ds){var o=[];ds.f.forEach(function(f){if(f[2]==='s')o.push([f[0],f[1]]);else if(f[2]==='d'){o.push([f[0]+'@day',f[1]+' (day)']);o.push([f[0]+'@week',f[1]+' (week)']);o.push([f[0]+'@month',f[1]+' (month)'])}});return o}
function gval(r,g){var p=g.split('@');return p[1]?bucket(r[p[0]],p[1]):String(r[p[0]]==null?'':r[p[0]])}
function glab(g,v){var p=g.split('@');return p[1]?blabel(v,p[1]):(v===''?'(blank)':v)}
function fpass(r,f,M){var m=M[f.f];if(!m||f.v===''||f.v==null)return true;var x=r[f.f],v=f.v,t=m.t;
 if(t==='s'){x=String(x).toLowerCase();v=String(v).toLowerCase();return f.o==='eq'?x===v:f.o==='ne'?x!==v:x.indexOf(v)>-1}
 if(t==='d'){return f.o==='ge'?x>=v:x<v}
 x=+x;v=parseFloat(v);if(isNaN(v))return true;return f.o==='eq'?x===v:f.o==='ne'?x!==v:f.o==='gt'?x>v:f.o==='ge'?x>=v:f.o==='lt'?x<v:x<=v}
function agg(rows,mm,M){if(mm.a==='count')return rows.length;var f=mm.f;if(mm.a==='dc'){var s={};rows.forEach(function(r){s[r[f]]=1});return Object.keys(s).length}
 var xs=rows.map(function(r){return +r[f]||0});if(!xs.length)return 0;if(mm.a==='sum')return xs.reduce(function(a,b){return a+b},0);if(mm.a==='avg')return xs.reduce(function(a,b){return a+b},0)/xs.length;if(mm.a==='min')return Math.min.apply(null,xs);return Math.max.apply(null,xs)}
function fmtv(mm,v,M){var t=mm.a==='count'||mm.a==='dc'?'n':(M[mm.f]||{}).t;if(mm.a==='count'||mm.a==='dc')return Math.round(v).toLocaleString('en-US');
 if(t==='m')return usd(v);if(t==='r')return '$'+v.toFixed(2);if(t==='p')return (v*100).toFixed(1)+'%';if(t==='b')return mm.a==='avg'?(v*100).toFixed(1)+'%':Math.round(v).toLocaleString('en-US');
 return mm.a==='avg'?v.toFixed(1):Math.round(v).toLocaleString('en-US')}
function mlabel(mm,M){var a={count:'Record count',sum:'Sum of ',avg:'Average ',min:'Min ',max:'Max ',dc:'Distinct '};if(mm.a==='count')return 'Record count';var l=(M[mm.f]||{}).l||mm.f;return mm.a==='b'?l:(a[mm.a]+l)}
function runR(c){var ds=DS[c.ds],M=ds.m,rg=rangeOf(c.rp,c.rf,c.rt),all=ds.rows(),rows=all.filter(function(r){if(rg){var v=r[c.df];if(!v||v<rg[0]||v>rg[1])return false}return(c.fl||[]).every(function(f){return fpass(r,f,M)})});
 var out={rows:rows,n:rows.length,rg:rg,lines:[],tot:null};if(!c.g1){out.detail=true;return out}
 var ms=c.ms&&c.ms.length?c.ms:[{a:'count'}],map={},keys=[];
 rows.forEach(function(r){var k=gval(r,c.g1);if(!map[k]){map[k]=[];keys.push(k)}map[k].push(r)});
 var sortKey=function(a,b){if(c.g1.indexOf('@')>-1)return a<b?-1:1;return a<b?-1:a>b?1:0};
 var ent=keys.map(function(k){return{k:k,rows:map[k],vals:ms.map(function(m){return agg(map[k],m,M)})}});
 if(c.so==='asc')ent.sort(function(a,b){return a.vals[0]-b.vals[0]});else if(c.so==='lab'||c.g1.indexOf('@')>-1)ent.sort(function(a,b){return sortKey(a.k,b.k)});else ent.sort(function(a,b){return b.vals[0]-a.vals[0]});
 if(c.top>0&&c.g1.indexOf('@')<0)ent=ent.slice(0,c.top);
 ent.forEach(function(e){out.lines.push({lvl:1,label:glab(c.g1,e.k),vals:e.vals,n:e.rows.length});
  if(c.g2){var m2={},k2=[];e.rows.forEach(function(r){var k=gval(r,c.g2);if(!m2[k]){m2[k]=[];k2.push(k)}m2[k].push(r)});var e2=k2.map(function(k){return{k:k,rows:m2[k],vals:ms.map(function(m){return agg(m2[k],m,M)})}});e2.sort(function(a,b){return c.g2.indexOf('@')>-1?sortKey(a.k,b.k):b.vals[0]-a.vals[0]});e2.forEach(function(x){out.lines.push({lvl:2,label:glab(c.g2,x.k),vals:x.vals,n:x.rows.length})})}});
 out.ms=ms;out.tot=ms.map(function(m){return agg(rows,m,M)});return out}
function csvQ(v){v=String(v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
/* ---- state ---- */
var R={tab:'dash',cfg:null,saved:[],dr:'l30',nm:'',msg:''};
try{R.saved=JSON.parse(localStorage.getItem('might.crm.reports')||'[]')}catch(e){R.saved=[]}
function persist(){try{localStorage.setItem('might.crm.reports',JSON.stringify(R.saved))}catch(e){}}
function blank(){return{nm:'New report',ds:'loads',df:'pu',rp:'l30',rf:'',rt:'',fl:[],g1:'',g2:'',ms:[{a:'count'}],cols:['id','dept','acct','lane','pu','rev','pf'],so:'val',top:0,chart:true,sf:'',sd:'desc'}}
function C(o){var b=blank();for(var k in o)b[k]=o[k];return b}
var LIB=[['Sales',[
 ['Lead conversion by agent',{ds:'leads',df:'asg',rp:'month',g1:'agent',ms:[{a:'count'},{a:'sum',f:'intr'},{a:'sum',f:'conv'},{a:'avg',f:'intr'}]}],
 ['Cold-call outcomes',{ds:'acts',df:'date',rp:'l30',fl:[{f:'type',o:'eq',v:'Call'},{f:'dept',o:'eq',v:'Sales'}],g1:'out',ms:[{a:'count'},{a:'avg',f:'dur'}]}],
 ['Calls by agent and week',{ds:'acts',df:'date',rp:'l30',fl:[{f:'type',o:'eq',v:'Call'},{f:'dept',o:'eq',v:'Sales'}],g1:'user',g2:'date@week',ms:[{a:'count'},{a:'sum',f:'conn'}]}],
 ['Leads by status and agent',{ds:'leads',df:'asg',rp:'l30',g1:'status',g2:'agent',ms:[{a:'count'}]}],
 ['Leads sent to dispatch by month',{ds:'leads',df:'asg',rp:'all',g1:'asg@month',ms:[{a:'count'},{a:'sum',f:'conv'},{a:'sum',f:'intr'}]}]]],
['Pipeline',[
 ['Pipeline by stage and department',{ds:'opps',df:'created',rp:'all',g1:'dept',g2:'stage',ms:[{a:'count'},{a:'sum',f:'amt'}]}],
 ['Opportunities by source',{ds:'opps',df:'created',rp:'all',g1:'src',ms:[{a:'count'},{a:'sum',f:'amt'}]}],
 ['Open opportunities, oldest first',{ds:'opps',df:'created',rp:'all',fl:[{f:'phase',o:'eq',v:'Open pipeline'}],cols:['name','acct','dept','stage','owner','age','amt'],sf:'age',sd:'desc'}]]],
['Dispatch',[
 ['Dispatch revenue by dispatcher',{ds:'loads',df:'pu',rp:'l30',fl:[{f:'dept',o:'eq',v:'Dispatch'}],g1:'by',ms:[{a:'count'},{a:'sum',f:'rev'},{a:'sum',f:'mi'}]}],
 ['Dispatch revenue by client and month',{ds:'loads',df:'pu',rp:'ytd',fl:[{f:'dept',o:'eq',v:'Dispatch'}],g1:'acct',g2:'pu@month',ms:[{a:'count'},{a:'sum',f:'rev'}]}],
 ['Loads per dispatch client',{ds:'loads',df:'pu',rp:'l90',fl:[{f:'dept',o:'eq',v:'Dispatch'}],g1:'acct',ms:[{a:'count'},{a:'avg',f:'mi'},{a:'sum',f:'rev'}]}]]],
['Brokerage',[
 ['Brokerage profit by shipper',{ds:'loads',df:'pu',rp:'l90',fl:[{f:'dept',o:'eq',v:'Brokerage'}],g1:'acct',ms:[{a:'count'},{a:'sum',f:'rev'},{a:'sum',f:'pf'},{a:'avg',f:'mg'}]}],
 ['Margin by lane',{ds:'loads',df:'pu',rp:'all',fl:[{f:'dept',o:'eq',v:'Brokerage'}],g1:'lane',ms:[{a:'count'},{a:'avg',f:'rpm'},{a:'avg',f:'mg'}]}],
 ['Broker profit by month',{ds:'loads',df:'pu',rp:'ytd',fl:[{f:'dept',o:'eq',v:'Brokerage'}],g1:'by',g2:'pu@month',ms:[{a:'count'},{a:'sum',f:'pf'}]}]]],
['Finance and KPIs',[
 ['Revenue and profit by month',{ds:'loads',df:'pu',rp:'all',g1:'pu@month',g2:'dept',ms:[{a:'count'},{a:'sum',f:'rev'},{a:'sum',f:'pf'}]}],
 ['Top 10 accounts by profit',{ds:'loads',df:'pu',rp:'all',g1:'acct',top:10,ms:[{a:'sum',f:'pf'},{a:'sum',f:'rev'},{a:'count'}]}],
 ['Profit by pickup state',{ds:'loads',df:'pu',rp:'l90',g1:'so',ms:[{a:'sum',f:'pf'},{a:'count'}]}]]],
['Calls and emails',[
 ['Calls and emails by person this week',{ds:'acts',df:'date',rp:'week',fl:[{f:'type',o:'ne',v:'Stage'}],g1:'user',g2:'type',ms:[{a:'count'},{a:'sum',f:'conn'},{a:'sum',f:'rep'}]}],
 ['Email replies by department',{ds:'acts',df:'date',rp:'l30',fl:[{f:'type',o:'eq',v:'Email'}],g1:'dept',ms:[{a:'count'},{a:'sum',f:'rep'},{a:'avg',f:'rep'}]}],
 ['Daily activity',{ds:'acts',df:'date',rp:'l30',fl:[{f:'type',o:'ne',v:'Stage'},{f:'type',o:'ne',v:'Load'}],g1:'date@day',g2:'type',ms:[{a:'count'}]}]]],
['Accounts',[
 ['Accounts worked by more than one department',{ds:'accts',df:'since',rp:'all',fl:[{f:'nd',o:'ge',v:'2'}],cols:['n','type','depts','loads','rev','pf'],sf:'pf',sd:'desc'}],
 ['Accounts by type and state',{ds:'accts',df:'since',rp:'all',g1:'type',g2:'st',ms:[{a:'count'},{a:'sum',f:'pf'}]}]]]];
/* ---- builder UI ---- */
function opt(list,val,mk){return list.map(function(x){var v=mk?mk(x)[0]:x[0],l=mk?mk(x)[1]:x[1];return '<option value="'+esc(v)+'"'+(String(v)===String(val)?' selected':'')+'>'+esc(l)+'</option>'}).join('')}
function opsFor(t){return t==='s'?[['eq','is'],['ne','is not'],['ct','contains']]:t==='d'?[['ge','on or after'],['lt','before']]:[['eq','='],['ne','≠'],['gt','>'],['ge','≥'],['lt','<'],['le','≤']]}
function distinct(c,f){var s={},rs=DS[c.ds].rows();rs.forEach(function(r){s[r[f]]=1});var k=Object.keys(s);return k.length<=40?k.sort():[]}
function builderL(c){var ds=DS[c.ds],M=ds.m,gd=gdefs(ds),nums=ds.f.filter(function(f){return NUMT[f[2]]}),dates=ds.f.filter(function(f){return f[2]==='d'}),grouped=!!c.g1;
 var h='<div class="card"><div class="rp-sec"><h3>Report</h3><div class="rp-row"><input type="text" data-r="nm" value="'+esc(c.nm)+'" aria-label="Report name"></div><div class="rp-row"><label class="sub" for="r-ds">Report type</label><select id="r-ds" data-r="ds">'+opt(Object.keys(DS),c.ds,function(k){return[k,DS[k].n]})+'</select></div></div>';
 h+='<div class="rp-sec"><h3>Date range</h3><div class="rp-row"><select data-r="df" aria-label="Date field">'+opt(dates,c.df,function(f){return[f[0],'By '+f[1].toLowerCase()]})+'</select></div><div class="rp-row"><select data-r="rp" aria-label="Range">'+opt(PRE,c.rp)+'</select></div>'+(c.rp==='custom'?'<div class="rp-row" style="grid-template-columns:1fr 1fr"><input type="date" data-r="rf" value="'+esc(c.rf)+'" aria-label="From"><input type="date" data-r="rt" value="'+esc(c.rt)+'" aria-label="To"></div>':'')+'</div>';
 h+='<div class="rp-sec"><h3>Filters <button class="lnk" type="button" data-r="addf">+ Add</button></h3>'+(c.fl.length?c.fl.map(function(f,i){var m=M[f.f]||ds.f[0]&&M[ds.f[0][0]],t=m.t,dv=t==='s'?distinct(c,f.f):[];
  return '<div class="rp-row f3"><select data-r="ff" data-i="'+i+'" aria-label="Field">'+opt(ds.f,f.f)+'</select><select data-r="fo" data-i="'+i+'" aria-label="Operator">'+opt(opsFor(t),f.o)+'</select><input '+(t==='d'?'type="date"':'type="text"')+' data-r="fv" data-i="'+i+'" value="'+esc(f.v)+'" '+(dv.length?'list="dl'+i+'" ':'')+'aria-label="Value">'+(dv.length?'<datalist id="dl'+i+'">'+dv.map(function(x){return '<option value="'+esc(x)+'">'}).join('')+'</datalist>':'')+'<button class="x" type="button" data-r="delf" data-i="'+i+'" aria-label="Remove filter">&times;</button></div>'}).join(''):'<div class="sub">No filters.</div>')+'</div>';
 h+='<div class="rp-sec"><h3>Group by</h3><div class="rp-row"><select data-r="g1" aria-label="Group rows by"><option value="">None (list the records)</option>'+opt(gd,c.g1)+'</select></div>'+(c.g1?'<div class="rp-row"><select data-r="g2" aria-label="Then by"><option value="">Then by: nothing</option>'+opt(gd,c.g2)+'</select></div>':'')+'</div>';
 if(grouped){h+='<div class="rp-sec"><h3>Measures <button class="lnk" type="button" data-r="addm">+ Add</button></h3>'+c.ms.map(function(m,i){return '<div class="rp-row m2"><select data-r="ma" data-i="'+i+'" aria-label="Calculation">'+opt([['count','Count'],['sum','Sum'],['avg','Average'],['min','Min'],['max','Max'],['dc','Distinct count']],m.a)+'</select>'+(m.a==='count'?'<span class="sub" style="align-self:center">of records</span>':'<select data-r="mf" data-i="'+i+'" aria-label="Field">'+opt(m.a==='dc'?ds.f.filter(function(f){return f[2]==='s'}):nums,m.f)+'</select>')+'<button class="x" type="button" data-r="delm" data-i="'+i+'" aria-label="Remove">&times;</button></div>'}).join('')+'</div>';
  h+='<div class="rp-sec"><h3>Display</h3><div class="rp-row"><select data-r="so" aria-label="Sort">'+opt([['val','Sort: first measure, high to low'],['asc','Sort: first measure, low to high'],['lab','Sort: by name or date']],c.so)+'</select></div><div class="rp-row m2" style="grid-template-columns:1fr 90px"><span class="sub" style="align-self:center">Show only the top (0 = all)</span><input type="number" min="0" data-r="top" value="'+c.top+'" aria-label="Top N"></div><label class="tg" style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-r="chart"'+(c.chart?' checked':'')+'> Show a chart</label></div>'}
 else{h+='<div class="rp-sec"><h3>Columns</h3>'+ds.f.map(function(f){return '<label style="display:flex;gap:8px;align-items:center;margin:3px 0"><input type="checkbox" data-r="col" data-k="'+f[0]+'"'+(c.cols.indexOf(f[0])>-1?' checked':'')+'> '+esc(f[1])+'</label>'}).join('')+'</div><div class="rp-sec"><h3>Sort</h3><div class="rp-row" style="grid-template-columns:1fr 100px"><select data-r="sf" aria-label="Sort by">'+opt(ds.f.filter(function(f){return c.cols.indexOf(f[0])>-1}),c.sf,function(f){return[f[0],f[1]]}).replace('<option','<option value=""></option><option')+'</select><select data-r="sd" aria-label="Direction">'+opt([['desc','High to low'],['asc','Low to high']],c.sd)+'</select></div></div>'}
 return h+'</div>'}
function outR(c){var ds=DS[c.ds],M=ds.m,o=runR(c),rg=o.rg,h='',head='<div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><div><h2>'+esc(c.nm)+'</h2><div class="sub">'+esc(ds.n)+' · '+(rg?(c.rp==='custom'||rg[0]===rg[1]?fmtD(rg[0])+(rg[0]===rg[1]?'':' to '+fmtD(rg[1])):pname(c.rp)+' ('+fmtD(rg[0])+' to '+fmtD(rg[1])+')'):'All time')+' · <b style="color:var(--ink)">'+o.n.toLocaleString('en-US')+'</b> records</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="button" data-r="csv">Copy as CSV</button><button class="btn pri" type="button" data-r="save">Save report</button></div></div>';
 h+='<div class="card" style="margin-bottom:16px"><div class="pad">'+head+(R.msg?'<div class="sub" style="margin-top:8px">'+esc(R.msg)+'</div>':'')+'</div></div>';
 if(o.detail){var cols=ds.f.filter(function(f){return c.cols.indexOf(f[0])>-1}),rows=o.rows.slice();if(c.sf){var t=M[c.sf].t;rows.sort(function(a,b){var x=a[c.sf],y=b[c.sf];if(NUMT[t]){x=+x;y=+y}return(x<y?-1:x>y?1:0)*(c.sd==='asc'?1:-1)})}
  var fm=function(f,v){return f[2]==='m'?usd(v):f[2]==='r'?'$'+(+v).toFixed(2):f[2]==='p'?(v*100).toFixed(1)+'%':f[2]==='d'?fmtD(v):f[2]==='b'?(v?'Yes':'No'):f[2]==='n'?Number(v).toLocaleString('en-US'):esc(v)};
  h+='<div class="card"><div class="tw"><table><thead><tr>'+cols.map(function(f){return '<th'+(NUMT[f[2]]?' class="num"':'')+'>'+esc(f[1])+'</th>'}).join('')+'</tr></thead><tbody>'+rows.slice(0,200).map(function(r){return '<tr>'+cols.map(function(f){return '<td'+(NUMT[f[2]]?' class="num"':'')+'>'+fm(f,r[f[0]])+'</td>'}).join('')+'</tr>'}).join('')+(rows.length?'':'<tr><td colspan="'+(cols.length||1)+'" class="empty">No records match.</td></tr>')+(rows.length&&cols.some(function(f){return f[2]==='m'||f[2]==='n'})?'<tr class="tot">'+cols.map(function(f,i){if(f[2]==='m'||(f[2]==='n'&&f[0]!=='age'))return '<td class="num">'+fm(f,rows.reduce(function(s,r){return s+(+r[f[0]]||0)},0))+'</td>';return '<td>'+(i===0?'Total ('+rows.length+')':'')+'</td>'}).join('')+'</tr>':'')+'</tbody></table></div>'+(rows.length>200?'<div class="pad sub">Showing the first 200 of '+rows.length.toLocaleString('en-US')+'. Narrow the filters or copy the CSV for everything.</div>':'')+'</div>';return h}
 var ms=o.ms,top=o.lines.filter(function(l){return l.lvl===1});
 if(c.chart&&top.length){var vals=top.map(function(l){return l.vals[0]}),mx=Math.max.apply(null,vals.concat([1])),isT=c.g1.indexOf('@')>-1;
  h+='<div class="card" style="margin-bottom:16px"><header><h2>'+esc(mlabel(ms[0],M))+' by '+esc((gdefs(ds).filter(function(g){return g[0]===c.g1})[0]||[0,''])[1].toLowerCase())+'</h2></header><div class="pad">'+(isT?'<div class="vb">'+top.slice(-18).map(function(l){return '<div title="'+esc(l.label)+': '+esc(fmtv(ms[0],l.vals[0],M))+'"><span>'+esc(fmtv(ms[0],l.vals[0],M))+'</span><i style="height:'+Math.max(2,Math.round(l.vals[0]/mx*120))+'px"></i><span>'+esc(l.label.replace('Week of ',''))+'</span></div>'}).join('')+'</div>':top.slice(0,15).map(function(l){return '<div class="hb"><span title="'+esc(l.label)+'">'+esc(l.label)+'</span><span><i style="width:'+Math.max(1,Math.round(l.vals[0]/mx*100))+'%;display:block"></i></span><b>'+esc(fmtv(ms[0],l.vals[0],M))+'</b></div>'}).join(''))+'</div></div>'}
 h+='<div class="card"><div class="tw"><table><thead><tr><th>'+esc((gdefs(ds).filter(function(g){return g[0]===c.g1})[0]||[0,'Group'])[1])+(c.g2?' › '+esc((gdefs(ds).filter(function(g){return g[0]===c.g2})[0]||[0,''])[1]):'')+'</th>'+ms.map(function(m){return '<th class="num">'+esc(mlabel(m,M))+'</th>'}).join('')+'</tr></thead><tbody>'+o.lines.map(function(l){return '<tr class="'+(c.g2&&l.lvl===1?'g1':l.lvl===2?'g2':'')+'"><td>'+esc(l.label)+' <span class="sub" style="font-weight:400">('+l.n.toLocaleString('en-US')+')</span></td>'+l.vals.map(function(v,i){return '<td class="num">'+esc(fmtv(ms[i],v,M))+'</td>'}).join('')+'</tr>'}).join('')+(o.lines.length?'':'<tr><td colspan="'+(ms.length+1)+'" class="empty">No records match.</td></tr>')+(o.lines.length?'<tr class="tot"><td>Grand total ('+o.n.toLocaleString('en-US')+')</td>'+o.tot.map(function(v,i){return '<td class="num">'+esc(fmtv(ms[i],v,M))+'</td>'}).join('')+'</tr>':'')+'</tbody></table></div></div>';
 return h}
function csvOf(c){var ds=DS[c.ds],M=ds.m,o=runR(c),L=[];if(o.detail){var cols=ds.f.filter(function(f){return c.cols.indexOf(f[0])>-1});L.push(cols.map(function(f){return csvQ(f[1])}).join(','));o.rows.forEach(function(r){L.push(cols.map(function(f){return csvQ(r[f[0]])}).join(','))})}
 else{L.push([csvQ('Group')].concat(o.ms.map(function(m){return csvQ(mlabel(m,M))})).join(','));o.lines.forEach(function(l){L.push([csvQ((l.lvl===2?'   ':'')+l.label)].concat(l.vals.map(function(v,i){return csvQ(fmtv(o.ms[i],v,M))})).join(','))});L.push([csvQ('Grand total')].concat(o.tot.map(function(v,i){return csvQ(fmtv(o.ms[i],v,M))})).join(','))}return L.join('\n')}
/* ---- dashboard ---- */
function kp(rg){var inR=function(d){return !rg||(d>=rg[0]&&d<=rg[1])},L=LOAD.filter(function(l){return inR(l.pu)}),A=ACTR.filter(function(a){return inR(a.date)}),LD=LEADH.filter(function(l){return inR(l.asg)}),sum=function(a,f){return a.reduce(function(s,x){return s+x[f]},0)},calls=A.filter(function(a){return a.type==='Call'}),em=A.filter(function(a){return a.type==='Email'});
 return {loads:L.length,rev:sum(L,'rev'),pf:sum(L,'pf'),mg:sum(L,'rev')?sum(L,'pf')/sum(L,'rev'):0,calls:calls.length,emails:em.length,conn:calls.length?calls.filter(function(a){return a.out==='Connected'||a.out==='Interested'||a.out==='Callback'}).length/calls.length:0,rep:em.length?em.filter(function(a){return a.out==='Replied'}).length/em.length:0,lead:LD.length,intr:sum(LD,'intr'),sent:sum(LD,'conv'),opps:OPP.filter(function(o){return inR(o.created)}).length,L:L,A:A,LD:LD}}
function tile(l,v,p,fmt,inv){var d='';if(p!=null){var ch=p===0?(v===0?0:1):(v-p)/Math.abs(p),cl=Math.abs(ch)<.005?'fl':(ch>0)!==!!inv?'up':'dn';d='<div class="dl '+cl+'">'+(Math.abs(ch)<.005?'No change':(ch>0?'▲ ':'▼ ')+Math.min(999,Math.abs(ch)*100).toFixed(0)+'%')+' <span class="sub" style="font-weight:400">vs previous</span></div>'}return '<div class="card tile"><span>'+l+'</span><b>'+fmt(v)+'</b>'+d+'</div>'}
function dashV(){var rg=rangeOf(R.dr),pv=null;if(rg){var n=dd(rg[0],rg[1])+1;pv=[addDays(rg[0],-n),addDays(rg[0],-1)]}var k=kp(rg),q=pv?kp(pv):null,g=function(f){return q?q[f]:null},ni=function(v){return Math.round(v).toLocaleString('en-US')},pc=function(v){return (v*100).toFixed(1)+'%'};
 var h='<div class="tools" style="margin-top:0"><label class="sub" for="dr">Date range</label><select id="dr" data-r="dr" class="btn" style="padding:7px 10px">'+opt(PRE.filter(function(p){return p[0]!=='custom'}),R.dr)+'</select><span class="sub">'+(rg?fmtD(rg[0])+' to '+fmtD(rg[1]):'Since the start')+(pv?' · compared with '+fmtD(pv[0])+' to '+fmtD(pv[1]):'')+'</span></div>';
 h+='<div class="grid g3" style="margin-bottom:16px">'+tile('Revenue',k.rev,g('rev'),usd)+tile('Profit',k.pf,g('pf'),usd)+tile('Margin',k.mg,g('mg'),pc)+tile('Loads',k.loads,g('loads'),ni)+tile('Calls',k.calls,g('calls'),ni)+tile('Emails sent',k.emails,g('emails'),ni)+tile('Calls that reached a person',k.conn,g('conn'),pc)+tile('Email reply rate',k.rep,g('rep'),pc)+tile('Leads assigned',k.lead,g('lead'),ni)+tile('Leads interested',k.intr,g('intr'),ni)+tile('Sent to dispatch',k.sent,g('sent'),ni)+tile('New opportunities',k.opps,g('opps'),ni)+'</div>';
 function bars(rows,f2,sec){var mx=Math.max.apply(null,rows.map(function(r){return r[1]}).concat([1]));return rows.map(function(r){return '<div class="hb"><span>'+esc(r[0])+'</span><span><i class="'+(sec?'b2':'')+'" style="width:'+Math.max(1,Math.round(r[1]/mx*100))+'%"></i></span><b>'+esc(f2(r[1]))+'</b></div>'}).join('')||'<div class="sub">No data in this range.</div>'}
 var by=function(rows,key,val){var m={};rows.forEach(function(r){m[r[key]]=(m[r[key]]||0)+(val?r[val]:1)});return Object.keys(m).map(function(x){return[x,m[x]]}).sort(function(a,b){return b[1]-a[1]})};
 var pfD=by(k.L,'dept','pf'),callU=by(k.A.filter(function(a){return a.type==='Call'}),'user'),emU=by(k.A.filter(function(a){return a.type==='Email'}),'user'),stg={};OPP.forEach(function(o){if(o.stage==='Closed lost')return;var key=o.dept+': '+o.stage;stg[key]=(stg[key]||0)+1});
 var fun=[['Leads assigned',k.lead],['Interested',k.intr],['Sent to dispatch',k.sent]];
 h+='<div class="grid g2" style="margin-bottom:16px"><div class="card"><header><h2>Profit by department</h2><button class="lnk" type="button" data-r="open" data-i="rev">Open report</button></header><div class="pad">'+bars(pfD,usd)+'</div></div><div class="card"><header><h2>Sales lead funnel</h2><button class="lnk" type="button" data-r="open" data-i="lead">Open report</button></header><div class="pad">'+bars(fun,ni)+'</div></div></div>'
 +'<div class="grid g2"><div class="card"><header><h2>Calls by person</h2><button class="lnk" type="button" data-r="open" data-i="calls">Open report</button></header><div class="pad">'+bars(callU,ni)+'</div></div><div class="card"><header><h2>Emails sent by person</h2></header><div class="pad">'+bars(emU,ni,1)+'</div></div></div>'
 +'<div class="card" style="margin-top:16px"><header><h2>Open pipeline by stage right now</h2><button class="lnk" type="button" data-r="open" data-i="pipe">Open report</button></header><div class="pad">'+bars(Object.keys(stg).map(function(x){return[x,stg[x]]}).sort(function(a,b){return a[0]<b[0]?-1:1}),ni)+'</div></div>';return h}
function libV(){var h='<div class="lib">';LIB.forEach(function(f,fi){h+='<h3>'+f[0]+'</h3><div class="grid g3" style="gap:8px">'+f[1].map(function(r,ri){return '<button class="rc" type="button" data-r="lib" data-i="'+fi+'-'+ri+'"><b>'+esc(r[0])+'</b><div class="sub" style="font-size:12px;margin-top:2px">'+esc(DS[r[1].ds].n)+' · '+pname(r[1].rp||'l30')+'</div></button>'}).join('')+'</div>'});
 h+='<h3>My saved reports</h3>'+(R.saved.length?'<div class="grid g3" style="gap:8px">'+R.saved.map(function(r,i){return '<div class="rc" style="display:flex;justify-content:space-between;gap:8px;align-items:center"><button class="lnk" type="button" data-r="sv" data-i="'+i+'" style="text-align:left">'+esc(r.nm)+'</button><button class="x" type="button" data-r="delsv" data-i="'+i+'" aria-label="Delete saved report">&times;</button></div>'}).join('')+'</div>':'<div class="sub">Nothing saved yet. Build a report and press Save report.</div>')+'</div>';return h}
function repV(){var tabs=[['dash','Dashboard'],['lib','Report library'],['build','Report builder']];
 var h='<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-end"><div><h1>Reports</h1><div class="sub">Admin only. Every number from every department, in any range. Sample data.</div></div><div class="chips">'+tabs.map(function(t){return '<button class="chip" type="button" aria-pressed="'+(R.tab===t[0])+'" data-r="tab" data-i="'+t[0]+'">'+t[1]+'</button>'}).join('')+'</div></div><div style="height:14px"></div>';
 if(R.tab==='dash')h+=dashV();else if(R.tab==='lib')h+=libV();else{if(!R.cfg)R.cfg=C({});h+='<div class="rl"><div id="rleft">'+builderL(R.cfg)+'</div><div id="rout">'+outR(R.cfg)+'</div></div>'}return h}
window.repV=repV;
function redraw(){S.view='reports';render()}
function runOnly(){var o=$('#rout');if(o)o.innerHTML=outR(R.cfg)}
function fixCfg(c){var ds=DS[c.ds];if(!ds.m[c.df])c.df=ds.df;c.fl=c.fl.filter(function(f){return ds.m[f.f]});if(c.g1&&!gdefs(ds).some(function(g){return g[0]===c.g1}))c.g1='';if(c.g2&&!gdefs(ds).some(function(g){return g[0]===c.g2}))c.g2='';if(!c.g1)c.g2='';var nums=ds.f.filter(function(f){return NUMT[f[2]]});c.ms=c.ms.filter(function(m){return m.a==='count'||ds.m[m.f]}).map(function(m){if(m.a!=='count'&&m.a!=='dc'&&!NUMT[ds.m[m.f].t])m.f=nums[0]?nums[0][0]:'';if(m.a!=='count'&&!m.f)m.f=nums[0]?nums[0][0]:'';return m});if(!c.ms.length)c.ms=[{a:'count'}];c.cols=c.cols.filter(function(k){return ds.m[k]});if(!c.cols.length)c.cols=ds.f.slice(0,5).map(function(f){return f[0]});if(c.sf&&!ds.m[c.sf])c.sf=''}
document.addEventListener('click',function(e){var t=e.target.closest('[data-r]');if(!t||S.view!=='reports')return;var a=t.dataset.r,i=t.dataset.i,c=R.cfg;
 if(t.tagName==='SELECT'||t.tagName==='INPUT'||t.tagName==='OPTION')return;
 if(a==='tab'){R.tab=i;R.msg='';redraw()}
 else if(a==='lib'){var p=i.split('-'),r=LIB[+p[0]][1][+p[1]];R.cfg=C(JSON.parse(JSON.stringify(r[1])));R.cfg.nm=r[0];fixCfg(R.cfg);R.tab='build';R.msg='';redraw()}
 else if(a==='open'){var m={rev:'Revenue and profit by month',lead:'Lead conversion by agent',calls:'Calls and emails by person this week',pipe:'Pipeline by stage and department'},nm=m[i],f;LIB.forEach(function(x){x[1].forEach(function(r){if(r[0]===nm)f=r})});R.cfg=C(JSON.parse(JSON.stringify(f[1])));R.cfg.nm=f[0];if(i==='lead'||i==='calls'||i==='rev'){R.cfg.rp=R.dr;}fixCfg(R.cfg);R.tab='build';redraw()}
 else if(a==='sv'){R.cfg=C(JSON.parse(JSON.stringify(R.saved[+i])));R.tab='build';redraw()}
 else if(a==='delsv'){R.saved.splice(+i,1);persist();redraw()}
 else if(a==='addf'){var ds=DS[c.ds],f0=ds.f[0];c.fl.push({f:f0[0],o:'eq',v:''});redraw()}
 else if(a==='delf'){c.fl.splice(+i,1);redraw()}
 else if(a==='addm'){var nm2=DS[c.ds].f.filter(function(f){return NUMT[f[2]]})[0];c.ms.push({a:'sum',f:nm2?nm2[0]:''});redraw()}
 else if(a==='delm'){c.ms.splice(+i,1);if(!c.ms.length)c.ms=[{a:'count'}];redraw()}
 else if(a==='csv'){var txt=csvOf(c);var done=function(ok){R.msg=ok?'CSV copied. Paste it into Excel or Google Sheets.':'Could not copy automatically. Select the table and copy it.';runOnly()};try{navigator.clipboard.writeText(txt).then(function(){done(true)},function(){done(false)})}catch(x){done(false)}}
 else if(a==='save'){var cp=JSON.parse(JSON.stringify(c));var ix=R.saved.findIndex(function(x){return x.nm===cp.nm});if(ix>-1)R.saved[ix]=cp;else R.saved.push(cp);persist();R.msg='Saved as "'+cp.nm+'". Find it in the Report library.';runOnly()}});
document.addEventListener('change',function(e){var t=e.target,a=t.dataset&&t.dataset.r;if(!a||S.view!=='reports')return;var c=R.cfg,i=+t.dataset.i;
 if(a==='dr'){R.dr=t.value;redraw();return}
 if(!c)return;
 if(a==='ds'){c.ds=t.value;c.df=DS[c.ds].df;c.fl=[];c.g1='';c.g2='';c.ms=[{a:'count'}];c.cols=DS[c.ds].f.slice(0,6).map(function(f){return f[0]});c.sf='';fixCfg(c);redraw()}
 else if(a==='df'){c.df=t.value;redraw()}
 else if(a==='rp'){c.rp=t.value;if(c.rp==='custom'&&!c.rf){c.rf=addDays(TODAY,-29);c.rt=TODAY}redraw()}
 else if(a==='rf'||a==='rt'){c[a]=t.value;runOnly()}
 else if(a==='ff'){c.fl[i].f=t.value;c.fl[i].o=opsFor(DS[c.ds].m[t.value].t)[0][0];c.fl[i].v='';redraw()}
 else if(a==='fo'){c.fl[i].o=t.value;runOnly()}
 else if(a==='g1'){c.g1=t.value;if(!c.g1)c.g2='';redraw()}
 else if(a==='g2'){c.g2=t.value;redraw()}
 else if(a==='ma'){c.ms[i].a=t.value;fixCfg(c);redraw()}
 else if(a==='mf'){c.ms[i].f=t.value;runOnly()}
 else if(a==='so'){c.so=t.value;runOnly()}
 else if(a==='chart'){c.chart=t.checked;runOnly()}
 else if(a==='col'){var k=t.dataset.k,ix=c.cols.indexOf(k);if(t.checked&&ix<0)c.cols.push(k);if(!t.checked&&ix>-1)c.cols.splice(ix,1);if(!c.cols.length)c.cols=[k];redraw()}
 else if(a==='sf'||a==='sd'){c[a]=t.value;runOnly()}});
document.addEventListener('input',function(e){var t=e.target,a=t.dataset&&t.dataset.r;if(!a||S.view!=='reports'||!R.cfg)return;var c=R.cfg;
 if(a==='nm'){c.nm=t.value}else if(a==='fv'){c.fl[+t.dataset.i].v=t.value;runOnly()}else if(a==='top'){c.top=Math.max(0,parseInt(t.value,10)||0);runOnly()}});
})();
