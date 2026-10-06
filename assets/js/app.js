fetch('data/data.json').then(r=>{
  if(!r.ok)throw new Error('HTTP '+r.status+' при загрузке data/data.json — проверьте, что файл лежит в папке data и закоммичен');
  return r.json();
}).then(d=>{window.DATA=d;init();}).catch(err=>{
  document.querySelector('main').innerHTML=
    `<div class="panel" style="margin:40px auto;max-width:720px;text-align:center">
       <h2>Не удалось загрузить данные сайта</h2>
       <p style="font-family:monospace;word-break:break-all">${err.message}</p>
       <p class="note">Откройте DevTools (F12) → вкладки Console и Network, пришлите руководителю первую красную строку и статусы файлов.</p>
     </div>`;
});

const CHR_INTERVAL=8000;
const CHR_AUTOSTART=false;
let chrIndex=0, chrTimer=null, chrAuto=false;
let pplList=[], pplIndex=0;

function init(){
  document.getElementById('author').textContent=DATA.meta.author;
  document.getElementById('mentor').textContent=DATA.meta.mentor;
  renderChronicle(); renderPeople('all'); initMap(); initPostcard(); renderQuiz(); renderAbout();
  document.querySelectorAll('.ppl-filters button').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.ppl-filters button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); renderPeople(b.dataset.f);
  });
  document.addEventListener('keydown',ev=>{
    if(!document.getElementById('chronicle').classList.contains('active'))return;
    if(ev.key==='ArrowRight'){stopChrAuto();chrSelect(Math.min(chrIndex+1,DATA.chronicle.length-1));}
    if(ev.key==='ArrowLeft'){stopChrAuto();chrSelect(Math.max(chrIndex-1,0));}
  });
  window.addEventListener('hashchange',router);
  router();
}
const esc=s=>(s||'').replace(/</g,'&lt;');
const srcLink=s=>s?` <a href="${s}" target="_blank" rel="noopener">[источник]</a>`:'';

function router(){
  const views=['home','chronicle','people','memory','postcard','quiz','about'];
  const id=(location.hash||'#home').slice(1);
  const target=views.includes(id)?id:'home';
  if(target!=='chronicle')stopChrAuto();
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===target));
  document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('on',a.dataset.view===target));
  if(target==='chronicle'&&CHR_AUTOSTART)startChrAuto();
  if(target==='memory'&&window.__map)setTimeout(()=>window.__map.invalidateSize(),60);
  window.scrollTo({top:0});
}

/* ── Хроника ── */
function renderChronicle(){
  const ribbon=document.getElementById('chr-ribbon');
  ribbon.innerHTML=DATA.chronicle.map((e,i)=>{
    const dark=i===DATA.chronicle.length-1;
    return (dark?'<span class="chr-gap" aria-hidden="true"></span>':'')+
      `<button type="button" class="chr-point${dark?' chr-point--dark':''}" data-i="${i}">
        <span class="chr-date">${esc(e.date)}</span>
        <svg class="chr-star" viewBox="0 0 100 100" aria-hidden="true"><use href="#star5"/></svg>
        <span class="chr-short">${esc(e.short||e.title)}</span>
      </button>`;
  }).join('');
  document.getElementById('chr-motifs').innerHTML=DATA.chronicle.map((e,i)=>
    `<svg class="chr-motif" data-i="${i}" viewBox="0 0 200 200"><use href="#motif-${e.motif||'dawn'}"/></svg>`).join('');
  ribbon.querySelectorAll('.chr-point').forEach(b=>b.onclick=()=>{stopChrAuto();chrSelect(+b.dataset.i);});
  document.getElementById('chr-auto').onclick=()=>chrAuto?stopChrAuto():startChrAuto();
  chrSelect(0);
}
function chrSelect(i){
  chrIndex=i;
  const e=DATA.chronicle[i], dark=i===DATA.chronicle.length-1;
  document.querySelectorAll('.chr-point').forEach(p=>p.classList.toggle('on',+p.dataset.i===i));
  document.querySelectorAll('.chr-motif').forEach(m=>m.classList.toggle('on',+m.dataset.i===i));
  const d=document.getElementById('chr-detail');
  d.classList.toggle('mourning',dark);
  d.innerHTML=`<svg class="chr-detail-motif" viewBox="0 0 200 200" aria-hidden="true"><use href="#motif-${e.motif||'dawn'}"/></svg>
    <div class="chr-detail-in">
    <div class="chr-detail-date">${esc(e.date)}</div>
    <h3>${esc(e.title)}</h3>
    <p>${esc(e.text)}${srcLink(e.src)}</p></div>`;
  const act=document.querySelector(`.chr-point[data-i="${i}"]`);
  if(act)act.scrollIntoView({block:'nearest',inline:'center',behavior:'smooth'});
}
function runProgress(){
  const bar=document.getElementById('chr-progress');
  bar.style.transition='none';bar.style.width='0';
  requestAnimationFrame(()=>{bar.style.transition=`width ${CHR_INTERVAL}ms linear`;bar.style.width='100%';});
}
function startChrAuto(){
  chrAuto=true;
  const b=document.getElementById('chr-auto');b.textContent='⏸ Пауза';b.classList.add('playing');
  tick();
}
function tick(){
  clearTimeout(chrTimer);runProgress();
  chrTimer=setTimeout(()=>{chrSelect((chrIndex+1)%DATA.chronicle.length);tick();},CHR_INTERVAL);
}
function stopChrAuto(){
  chrAuto=false;clearTimeout(chrTimer);
  const b=document.getElementById('chr-auto');if(b){b.textContent='▶ Автопоказ';b.classList.remove('playing');}
  const bar=document.getElementById('chr-progress');if(bar){bar.style.transition='none';bar.style.width='0';}
}

/* ── Люди ── */
function renderPeople(f){
  pplList=DATA.people.filter(p=>f==='all'||p.tag===f);
  const grid=document.getElementById('ppl-grid');
  grid.innerHTML=pplList.length?pplList.map((p,i)=>`
    <button type="button" class="ppl-card" data-i="${i}" title="${esc(p.name)}">
      ${p.img?`<img src="${p.img}" alt="${esc(p.name)}">`:`<div class="ppl-ph"></div>`}
      <div class="ppl-card-body"><h3>${esc(p.name)}</h3></div>
    </button>`).join(''):`<p class="note">По выбранному фильтру карточек нет.</p>`;
  grid.querySelectorAll('.ppl-card').forEach(b=>b.onclick=()=>pplSelect(+b.dataset.i));
  pplSelect(0);
}
function pplSelect(i){
  if(!pplList.length){document.getElementById('ppl-detail').innerHTML='';return;}
  pplIndex=Math.max(0,Math.min(i,pplList.length-1));
  document.querySelectorAll('.ppl-card').forEach(c=>c.classList.toggle('on',+c.dataset.i===pplIndex));
  const p=pplList[pplIndex], bio=p.bio||p.text;
  document.getElementById('ppl-detail').innerHTML=`
    <div class="ppl-detail-row">
      ${p.img?`<img class="ppl-detail-portrait" src="${p.img}" alt="${esc(p.name)}">`:`<div class="ppl-detail-ph"></div>`}
      <div class="ppl-detail-in">
        <h3>${esc(p.name)}</h3>
        <div class="ppl-y">${esc(p.years)} • ${esc(p.status)}</div>
        <p>${esc(bio)}</p>
        ${p.src?`<p><a href="${p.src}" target="_blank" rel="noopener">[источник]</a></p>`:''}
      </div>
    </div>`;
  document.getElementById('ppl-detail').scrollTop=0;
}

/* ── Карта ── */
function initMap(){
  if(!DATA.memorials.length){document.getElementById('map').outerHTML='<p class="note">Карта наполняется.</p>';return;}
  const map=L.map('map').setView(DATA.map.center||[52.258,30.395],11);
  window.__map=map;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
  DATA.memorials.forEach(m=>L.marker(m.coords).addTo(map)
    .bindPopup(`<strong>${esc(m.name)}</strong><br>${esc(m.text)}${m.src?`<br><a href="${m.src}" target="_blank">источник</a>`:''}`));
}

/* ── Открытка ── */
const PC_COVER='assets/img/cover.png';
function drawCoverFit(ctx,img,W,H,posY){
  const ir=img.naturalWidth/img.naturalHeight, cr=W/H;
  let sw,sh;
  if(ir>cr){sh=img.naturalHeight;sw=sh*cr;}else{sw=img.naturalWidth;sh=sw/cr;}
  const sx=(img.naturalWidth-sw)/2, sy=(img.naturalHeight-sh)*(posY||0.35);
  ctx.drawImage(img,sx,sy,sw,sh,0,0,W,H);
}
function wrapCenter(ctx,text,cx,y,maxW,lh,maxLines){
  const words=text.split(' ');let line='';const lines=[];
  for(const w of words){const t=line?line+' '+w:w;
    if(ctx.measureText(t).width>maxW&&line){lines.push(line);line=w;}else line=t;}
  lines.push(line);
  if(lines.length>maxLines){lines.length=maxLines;lines[maxLines-1]+='…';}
  lines.forEach((l,i)=>ctx.fillText(l,cx,y+i*lh));
}
function initPostcard(){
  const cv=document.getElementById('pc-canvas'),ctx=cv.getContext('2d');
  const cover=new Image();cover.src=PC_COVER;
  const setLS=v=>{if('letterSpacing' in ctx)ctx.letterSpacing=v;};
  document.getElementById('pc-make').onclick=async()=>{
    const to=document.getElementById('pc-to').value.trim(),
          txt=document.getElementById('pc-text').value.trim(),
          from=document.getElementById('pc-from').value.trim();
    if(!txt){alert('Введите текст благодарности');return;}
    try{await Promise.all([
      document.fonts.load('600 42px Caveat'),
      document.fonts.load('600 32px "Golos Text"'),
      document.fonts.load('40px Georgia')
    ]);}catch(e){}
    const draw=()=>{
      const W=1200,H=675;
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);
      if(cover.complete&&cover.naturalWidth)drawCoverFit(ctx,cover,W,H,0.35);
      else{ctx.fillStyle='#241a10';ctx.fillRect(0,0,W,H);}
      let g=ctx.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'rgba(30,22,14,.62)');g.addColorStop(.5,'rgba(30,22,14,.42)');g.addColorStop(1,'rgba(15,11,7,.78)');
      ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
      /* фоновые детали: звезда-водяной знак, двойная рамка, марка */
      ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='rgba(216,178,106,.08)';ctx.font='300px "Golos Text"';ctx.fillText('★',985,400);ctx.restore();
      ctx.strokeStyle='rgba(216,178,106,.65)';ctx.lineWidth=2;ctx.strokeRect(24,24,W-48,H-48);
      ctx.strokeStyle='rgba(216,178,106,.35)';ctx.lineWidth=1;ctx.strokeRect(32,32,W-64,H-64);
      ctx.save();ctx.translate(1035,60);ctx.rotate(-0.06);
      ctx.fillStyle='rgba(245,240,230,.92)';ctx.fillRect(0,0,104,124);
      ctx.strokeStyle='rgba(30,22,14,.55)';ctx.setLineDash([5,4]);ctx.lineWidth=2;ctx.strokeRect(-6,-6,116,136);ctx.setLineDash([]);
      ctx.fillStyle='#7a4f2c';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='28px "Golos Text"';ctx.fillText('★',52,42);
      ctx.font='600 15px "Golos Text"';ctx.fillText('ПОЧТА',52,78);ctx.fillText('1943',52,98);
      ctx.restore();
      /* шапка */
      ctx.textAlign='center';ctx.textBaseline='alphabetic';
      ctx.fillStyle='#d8b26a';setLS('6px');
      ctx.font='600 32px "Golos Text"';
      ctx.fillText('ПОМНИМ. ГОРДИМСЯ. БЛАГОДАРИМ.',W/2,118);
      setLS('0px');
      ctx.strokeStyle='rgba(216,178,106,.5)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(W/2-260,138);ctx.lineTo(W/2+260,138);ctx.stroke();
      /* кому */
      ctx.fillStyle='#e8d9b8';ctx.font='500 24px "Golos Text"';
      ctx.fillText(to||'Защитникам Отечества',W/2,186);
      /* слова благодарности — крупно */
      ctx.fillStyle='#f6efe2';ctx.font='40px Georgia,serif';
      wrapCenter(ctx,txt,W/2,262,920,52,5);
      /* от кого — как на фронтовом письме */
      ctx.textAlign='left';
      ctx.fillStyle='rgba(216,178,106,.85)';setLS('3px');
      ctx.font='600 15px "Golos Text"';ctx.fillText('ОТ КОГО',92,560);setLS('0px');
      ctx.fillStyle='#f0e6d2';ctx.font='600 42px Caveat,cursive';
      ctx.fillText(from||'Учащийся Речицкого районного лицея',92,606);
      ctx.strokeStyle='rgba(216,178,106,.4)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(90,618);ctx.lineTo(660,618);ctx.stroke();
      ctx.textAlign='right';ctx.fillStyle='rgba(232,217,184,.75)';setLS('2px');
      ctx.font='500 15px "Golos Text"';ctx.fillText('Речица • 2026 • Связь поколений',W-92,612);setLS('0px');
      /* показ */
      const prev=document.getElementById('pc-preview');
      if(prev){prev.src=cv.toDataURL('image/png');prev.classList.add('show');}
      document.getElementById('pc-save').hidden=false;
    };
    if(cover.complete&&cover.naturalWidth)draw();else cover.onload=draw;
  };
  document.getElementById('pc-save').onclick=()=>{
    const a=document.createElement('a');a.download='otkrytka-1943.png';a.href=cv.toDataURL('image/png');a.click();
  };
}

/* ── Викторина: один вопрос на экране ── */
let qIndex=0, qScore=0, qLock=false;
function renderQuiz(){ quizCard(); }
function quizSteps(){
  return `<div class="quiz-steps">${DATA.quiz.map((_,i)=>
    `<i class="${i<qIndex?'done':i===qIndex?'cur':''}"></i>`).join('')}</div>`;
}
function quizCard(){
  qLock=false;
  const q=DATA.quiz[qIndex];
  document.getElementById('quizbox').innerHTML=`
    <div class="quiz-wrap">
      <div class="quiz-card">
        <div class="quiz-head"><span class="quiz-num">Вопрос ${qIndex+1} / ${DATA.quiz.length}</span><span class="quiz-star">★</span></div>
        <h3 class="quiz-q">${esc(q.q)}</h3>
        <div class="quiz-opts">${q.a.map((v,j)=>
          `<button type="button" class="quiz-opt" data-j="${j}"><span class="quiz-letter">${String.fromCharCode(1040+j)}</span><span>${esc(v)}</span></button>`).join('')}</div>
      </div>
      ${quizSteps()}
    </div>`;
  document.querySelectorAll('.quiz-opt').forEach(b=>b.onclick=()=>quizAnswer(+b.dataset.j,b));
}
function quizAnswer(j,btn){
  if(qLock)return; qLock=true;
  const q=DATA.quiz[qIndex];
  const opts=document.querySelectorAll('.quiz-opt');
  opts.forEach(o=>o.disabled=true);
  opts[q.correct].classList.add('correct');
  if(j===q.correct)qScore++; else btn.classList.add('wrong');
  const cur=document.querySelectorAll('.quiz-steps i')[qIndex];
  if(cur)cur.classList.replace('cur','done');
  setTimeout(()=>{qIndex++; qIndex<DATA.quiz.length?quizCard():quizResult();},800);
}
function quizResult(){
  const n=DATA.quiz.length;
  const verdict=qScore>=9?'Отлично! Вы — хранитель памяти Речицкой земли.':
    qScore>=7?'Хорошо! Вы уверенно знаете историю освобождения края.':
    qScore>=5?'Неплохо. Загляните в «Хронику» — и результат вырастет.':
    'Откройте «Хронику» и «Людей» и попробуйте ещё раз: память любит повторение.';
  document.getElementById('quizbox').innerHTML=`
    <div class="quiz-wrap">
      <div class="quiz-card quiz-card--result">
        <div class="quiz-head"><span class="quiz-num">Результат</span><span class="quiz-star">★</span></div>
        <div class="quiz-score">${qScore}<small> / ${n}</small></div>
        <p class="quiz-verdict">${verdict}</p>
        <button type="button" id="quiz-restart">Пройти ещё раз</button>
      </div>
      <div class="quiz-steps">${DATA.quiz.map(()=>`<i class="done"></i>`).join('')}</div>
    </div>`;
  document.getElementById('quiz-restart').onclick=()=>{qIndex=0;qScore=0;quizCard();};
}

/* ── О проекте ── */
function renderAbout(){
  
  document.getElementById('sources').innerHTML='<strong>Источники:</strong> '+DATA.sources.map(s=>`<a href="${s}" target="_blank">${new URL(s).hostname}</a>`).join(' • ');
}