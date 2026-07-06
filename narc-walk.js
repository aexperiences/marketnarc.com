/* narc-walk — shared spoken walkthrough for the Narc document apps.
   Each app sets window.NARC_WALK (ordered steps) + optional window.NARC_APP (storage key)
   before loading this file. The module injects a "Walk me through it" button into the
   app's .inbar, speaks each question, listens, fills the field, then runs the app's decode().
   Also adds Add-to-home-screen + save/resume. On-device only; nothing is sent anywhere. */
(function(){
  "use strict";
  if (window.__narcWalkLoaded) return; window.__narcWalkLoaded = true;

  /* ---------- spoken number parsing ---------- */
  var SMALL={zero:0,oh:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fourty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
  var MAG={hundred:100,thousand:1000,million:1000000,k:1000,grand:1000};
  function words2num(text){
    if(!text) return null;
    var t=(' '+text.toLowerCase()+' ').replace(/[,$]/g,' ').replace(/\band\b/g,' ').replace(/-/g,' ');
    // if it already has digits, prefer them (handle "38,000" / "38000" / "80")
    var digitMatch=t.match(/\d[\d.]*/g);
    var hasWords=/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thir|four|fif|six|seven|eigh|nine|twenty|thirty|forty|fourty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|grand|zero)\b/.test(t);
    if(digitMatch && !hasWords){ return parseFloat(digitMatch.join('')); }
    // word parse
    var toks=t.trim().split(/\s+/); var cur=0,total=0,used=false;
    for(var i=0;i<toks.length;i++){ var w=toks[i];
      if(w in SMALL){ cur+=SMALL[w]; used=true; }
      else if(w==='hundred'){ cur=(cur||1)*100; used=true; }
      else if(w==='thousand'||w==='k'||w==='grand'){ total+=(cur||1)*1000; cur=0; used=true; }
      else if(w==='million'){ total+=(cur||1)*1000000; cur=0; used=true; }
      else if(/^\d[\d.]*$/.test(w)){ cur+=parseFloat(w); used=true; }
    }
    if(!used) return (digitMatch?parseFloat(digitMatch.join('')):null);
    return total+cur;
  }

  /* ---------- helpers ---------- */
  function $(id){return document.getElementById(id);}
  var STEPS = window.NARC_WALK || [];
  var LSK = 'narc_' + (window.NARC_APP || location.pathname.replace(/\W+/g,'_'));
  var DECODE = window.NARC_DECODE || 'decode';
  var noAutoDecode = !!window.NARC_NODECODE;

  /* ---------- save / resume (generic) ---------- */
  function fields(){ return Array.prototype.slice.call(document.querySelectorAll('input[id],select[id],textarea[id]')).filter(function(e){return e.type!=='button';}); }
  function saveState(){ try{ var d={}; fields().forEach(function(e){ d[e.id]=(e.type==='checkbox')?e.checked:e.value; }); localStorage.setItem(LSK,JSON.stringify(d)); }catch(e){} }
  function loadState(){ try{ var d=JSON.parse(localStorage.getItem(LSK)||'null'); if(!d)return false; var any=false; fields().forEach(function(e){ if(e.id in d){ if(e.type==='checkbox'){ if(d[e.id]){e.checked=true;any=true;} } else if(d[e.id]!==''&&d[e.id]!=null){ e.value=d[e.id]; any=true; } } }); return any; }catch(e){ return false; } }

  /* ---------- install ---------- */
  var _dfd=null;
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();_dfd=e;var b=$('nwinstall');if(b)b.style.display='inline-block';});
  function doInstall(){ if(_dfd){_dfd.prompt();_dfd.userChoice.then(function(){_dfd=null;var b=$('nwinstall');if(b)b.style.display='none';});} else { setLbl('Use your browser menu → Add to Home Screen'); } }

  /* ---------- walkthrough engine ---------- */
  var wi=0, walking=false, rec=null, retry=0;
  function speak(t,cb){ if(!('speechSynthesis'in window)){ if(cb)cb(); return; } try{speechSynthesis.cancel();}catch(e){} var u=new SpeechSynthesisUtterance(t); u.rate=1.0; u.onend=function(){if(cb)cb();}; u.onerror=function(){if(cb)cb();}; speechSynthesis.speak(u); }
  function setLbl(m){ var e=$('nwlbl'); if(e) e.textContent=m; }
  function kindOf(el,step){ if(step.kind)return step.kind; if(!el)return 'text'; if(el.type==='checkbox')return 'bool'; if(el.tagName==='SELECT')return 'select'; if(el.type==='number')return 'number'; return 'text'; }
  function start(){ if(walking){stop();return;} var SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR){ setLbl('Voice isn’t supported here — try Chrome, or just tap the answers.'); return; } walking=true; wi=0; retry=0; var b=$('nwbtn'); if(b){b.classList.add('rec'); b.innerHTML='◼ Stop the walkthrough';} step(); }
  function stop(){ walking=false; try{if(rec)rec.stop();}catch(e){} try{speechSynthesis.cancel();}catch(e){} rec=null; var b=$('nwbtn'); if(b){b.classList.remove('rec'); b.innerHTML='🎤 Walk me through it, out loud';} setLbl(''); }
  function step(){ if(!walking)return;
    if(wi>=STEPS.length){ finish(); return; }
    var s=STEPS[wi];
    if(s.end){ setLbl(''); speak(s.ask,function(){ stop(); }); walking=false; return; }
    var el=$(s.id);
    setLbl('Question '+(wi+1)+' of '+STEPS.length+' — listen, then answer out loud');
    if(el && el.scrollIntoView) el.scrollIntoView({behavior:'smooth',block:'center'});
    speak(s.ask,function(){ if(walking) listen(s,el); });
  }
  function finish(){ setLbl('Reading it now…'); speak("Thank you. Here's the read.",function(){ if(!noAutoDecode && typeof window[DECODE]==='function'){ try{window[DECODE]();}catch(e){} } }); stop(); }
  function listen(s,el){ var SR=window.SpeechRecognition||window.webkitSpeechRecognition; var r=new SR(); rec=r; var kind=kindOf(el,s);
    r.lang='en-US'; r.interimResults=false; r.maxAlternatives=1; r.continuous=(kind==='text'); var got='';
    r.onresult=function(e){ for(var i=e.resultIndex;i<e.results.length;i++){ if(e.results[i].isFinal) got+=e.results[i][0].transcript+' '; } if(kind!=='text'){ try{r.stop();}catch(e){} } };
    r.onerror=function(){};
    r.onend=function(){ if(!walking)return; got=got.trim(); var ok=true;
      if(!el){ ok=true; }
      else if(kind==='text'){ if(got){ el.value=(el.value?el.value+' ':'')+got; } }
      else if(kind==='number'){ var n=words2num(got); if(n!=null && !isNaN(n)){ el.value=n; } else ok=false; }
      else if(kind==='bool'){ var yes=/\b(yes|yeah|yep|yup|it does|it did|correct|true|sure|definitely|they do|they did|we do|i did|i do|uh huh)\b/i.test(got); var no=/\b(no|nope|nah|it doesn'?t|does not|did not|didn'?t|negative|not really|i don'?t think so)\b/i.test(got); if(yes||no){ el.checked=yes; } else ok=false; }
      else if(kind==='select'){ var m=null,opts=el.options; for(var j=0;j<opts.length;j++){ var kw=(opts[j].textContent||'').toLowerCase().split(/[ ,/]+/)[0]; if(got.toLowerCase().indexOf(opts[j].value.toLowerCase())>=0 || (kw && got.toLowerCase().indexOf(kw)>=0)){ m=opts[j].value; break; } } if(m!=null){ el.value=m; } else ok=false; }
      if(el){ try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){} } saveState();
      if(ok){ retry=0; wi++; step(); }
      else if(retry<1){ retry++; speak(kind==='bool'?"Sorry — was that a yes or a no?":"Sorry, I didn't catch that. "+s.ask, function(){ if(walking) listen(s,el); }); }
      else { retry=0; wi++; step(); }
    };
    try{ r.start(); }catch(e){ wi++; step(); }
  }
  window.narcWalkToggle=start;
  window.narcInstall=doInstall;

  /* ---------- mount button + label ---------- */
  function mount(){
    if(loadState()){ /* restored */ }
    fields().forEach(function(e){ e.addEventListener('input',saveState); e.addEventListener('change',saveState); });
    var css='#nwbtn{background:var(--mint,#5FE3C0);border:1px solid var(--mint,#5FE3C0);color:#0C2038;font-family:Lato,Inter,sans-serif;font-weight:900;font-size:13px;border-radius:999px;padding:9px 15px;cursor:pointer}'
      +'#nwbtn.rec{background:var(--bad,#E0725A);border-color:var(--bad,#E0725A);color:#2A0F0A;animation:nwp 1.3s infinite}'
      +'@keyframes nwp{0%,100%{box-shadow:0 0 0 0 rgba(224,114,90,.5)}50%{box-shadow:0 0 0 8px rgba(224,114,90,0)}}'
      +'#nwinstall{display:none;background:transparent;border:1px solid var(--sea,#8FC4BB);color:var(--sea,#8FC4BB);font-weight:800;font-size:12px;border-radius:999px;padding:9px 13px;cursor:pointer;margin-left:6px}'
      +'#nwlbl{color:var(--sea,#8FC4BB);font-size:11px;margin:6px 0 0;min-height:14px;text-align:center}';
    var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
    if(!STEPS.length) return;
    var bar=document.querySelector('.inbar');
    var btn=document.createElement('button'); btn.type='button'; btn.id='nwbtn'; btn.innerHTML='🎤 Walk me through it, out loud'; btn.onclick=start;
    var inst=document.createElement('button'); inst.type='button'; inst.id='nwinstall'; inst.innerHTML='↓ Add to home screen'; inst.onclick=doInstall;
    if(bar){ bar.insertBefore(inst, bar.firstChild); bar.insertBefore(btn, bar.firstChild); }
    else { var c=document.querySelector('.card')||$('report'); if(c&&c.parentNode){ var wrap=document.createElement('div'); wrap.style.textAlign='center'; wrap.style.margin='0 0 14px'; wrap.appendChild(btn); wrap.appendChild(inst); c.parentNode.insertBefore(wrap,c); } }
    var lbl=document.createElement('p'); lbl.id='nwlbl';
    var anchor=$('nstatus')||$('instatus')||bar; if(anchor&&anchor.parentNode){ anchor.parentNode.insertBefore(lbl, anchor.nextSibling); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',mount); else mount();
})();
