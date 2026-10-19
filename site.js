(function(){
function $(i){return document.getElementById(i)}
var y=$('y');if(y)y.textContent=new Date().getFullYear();
document.querySelectorAll('.card,.chips span,section h2,section .sub,section .tag').forEach(function(e){e.classList.add('rv')});
var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.12});
document.querySelectorAll('.rv').forEach(function(e){io.observe(e)});
var pb=$('pb');if(pb)addEventListener('scroll',function(){var h=document.body.scrollHeight-innerHeight;pb.style.width=(h>0?scrollY/h*100:0)+'%'},{passive:true});
var cn=document.querySelector('[data-count]');
if(cn){cn.textContent=0;var cio=new IntersectionObserver(function(es){if(es[0].isIntersecting){var n=0,iv=setInterval(function(){n+=2;cn.textContent=Math.min(n,48);if(n>=48)clearInterval(iv)},40);cio.disconnect()}});cio.observe(cn)}
var tf=$('tf');
if(tf)tf.addEventListener('submit',function(e){e.preventDefault();var n=$('tn').value.trim();if(!n)return;var li=document.querySelectorAll('#tl li');li.forEach(function(l){l.classList.remove('on')});$('tl').classList.add('show');$('n2').textContent='Sample preview for load '+n+'. Live tracking launches with the shipper portal.';li.forEach(function(l,i){setTimeout(function(){l.classList.add('on')},500*(i+1))})});
document.querySelectorAll('.links a').forEach(function(a){a.addEventListener('click',function(){$('lk').classList.remove('open')})});
var FORM_ENDPOINT=""; window.MIGHT_FORM_ENDPOINT=FORM_ENDPOINT; /* paste your Formspree form URL here, e.g. "https://formspree.io/f/abcdwxyz" */
var qf=$('qf');
if(qf){var qn=$('qn'),btn=qf.querySelector('button[type=submit]');
if(!FORM_ENDPOINT&&qn)qn.textContent='Submitting opens an email to info@mightlogistics.com with your details.';
qf.addEventListener('submit',function(e){e.preventDefault();var d=new FormData(qf);
var subj='Quote Request: '+d.get('origin')+' to '+d.get('dest');
if(!FORM_ENDPOINT){var l=[];d.forEach(function(v,k){if(v&&k!=='_gotcha')l.push(k.toUpperCase()+': '+v)});
location.href='mailto:info@mightlogistics.com?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(l.join('\n'));
qf.style.display='none';$('ok').style.display='block';return}
d.append('_subject',subj);btn.disabled=true;btn.textContent='Sending...';
fetch(FORM_ENDPOINT,{method:'POST',body:d,headers:{'Accept':'application/json'}}).then(function(r){
if(!r.ok)throw 0;qf.style.display='none';var ok=$('ok');ok.innerHTML='<h3>Thanks, we got it</h3><p>A broker will contact you shortly. For urgent freight, call (201) 377-7043.</p>';ok.style.display='block'})
.catch(function(){btn.disabled=false;btn.textContent='Submit Quote Request';if(qn)qn.textContent='Something went wrong. Please call (201) 377-7043 or email info@mightlogistics.com.'})})}
if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('svg').forEach(function(v){if(v.pauseAnimations)v.pauseAnimations()})}
})();

(function(){var V=window.MIGHT_VIDEOS||{};
function embed(u){var m=u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);if(m)return {t:'yt',id:m[1]};m=u.match(/vimeo\.com\/(?:video\/)?(\d+)/);if(m)return {t:'vi',id:m[1]};if(/\.(mp4|webm|mov)(\?.*)?$/i.test(u))return {t:'file',u:u};return null}
document.querySelectorAll('[data-vid]').forEach(function(sec){var u=V[sec.getAttribute('data-vid')];if(!u)return;var e=embed(u);if(!e)return;var box=sec.querySelector('.vbox');
 if(e.t==='file'){box.innerHTML='<video controls playsinline preload="metadata"></video>';var v=box.firstChild;v.src=e.u;v.poster=e.u.replace(/\.\w+$/,'.jpg')}
 else{var src=e.t==='yt'?'https://www.youtube-nocookie.com/embed/'+e.id+'?autoplay=1&rel=0':'https://player.vimeo.com/video/'+e.id+'?autoplay=1';
  var th=e.t==='yt'?'https://i.ytimg.com/vi/'+e.id+'/hqdefault.jpg':'';
  box.innerHTML='<button type="button" class="vplay" aria-label="Play video"'+(th?' style="background-image:url('+th+')"':'')+'><span></span></button>';
  box.firstChild.addEventListener('click',function(){box.innerHTML='<iframe src="'+src+'" title="Might Logistics video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe>'})}
 sec.hidden=false});
var hv=document.getElementById('hv');if(hv){if(V.hero){hv.poster=V.hero.replace(/\.\w+$/,'.jpg');hv.src=V.hero;hv.oncanplay=function(){hv.classList.add('on');hv.play()}}else{hv.remove()}}
})();
