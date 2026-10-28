import { DAYS, FLAWS, LOGLINE, TOOLS, TORDER } from '../data/world';
import { LEARN, TOOLDOC } from '../data/learn';
import { $ } from '../lib/util';

/* ===================== learning modal ===================== */
let learnIdx = 0, learnMode: 'ep' | 'tool' = 'ep';
const dlg = () => $<HTMLDialogElement>('learnDlg');
function openAt(i: number){ if(learnMode === 'tool') openTool(i); else openLearn(i); }

export function openTool(i: number){
  learnMode = 'tool';
  learnIdx = Math.max(0, Math.min(TORDER.length - 1, i));
  const k = TORDER[learnIdx], t = TOOLS[k], doc = TOOLDOC[k];
  const d = dlg();
  d.style.setProperty('--c', '#E8B53A');
  $('lnPrev').textContent = '◀ 前の道具'; $('lnNext').textContent = '次の道具 ▶';
  $('lnHead').innerHTML = `<div class="no"><small>TOOL</small>${t.g}</div><h2 id="lnTitle">${t.nm}</h2><p class="lg">${t.desc}</p><div class="chips"><span class="chip tool">DAY ${t.d} で支給</span><span class="chip">キーボード：${t.key}</span></div>`;
  $('lnBody').innerHTML = `
    <div class="lnsec"><h3>何ができる？</h3><p class="lnwhy">${doc.what}</p></div>
    <div class="lnsec"><h3>ゲームでの使い方</h3><p class="lnwhy">${doc.how}</p></div>
    <div class="lnsec"><h3>見抜ける手口</h3><div class="lnflaws">${doc.flaws.map(f => `<span>${FLAWS[f].nm}（${FLAWS[f].code}）</span>`).join('')}</div></div>
    <div class="lnsec"><h3>現実のシステムでは</h3><p class="lnwhy">${doc.real}</p></div>
    <div class="lnsec"><h3>『セキュアAPI』で読むなら</h3><ul class="lnbook">${doc.book.map(b => `<li>${b}</li>`).join('')}</ul></div>`;
  $('lnBody').scrollTop = 0;
  $<HTMLButtonElement>('lnPrev').disabled = learnIdx === 0;
  $<HTMLButtonElement>('lnNext').disabled = learnIdx === TORDER.length - 1;
  if(!d.open) d.showModal();
  $('lnClose').focus({preventScroll:true});
}
export function openLearn(i: number){
  learnMode = 'ep';
  $('lnPrev').textContent = '◀ 前のエピソード'; $('lnNext').textContent = '次のエピソード ▶';
  learnIdx = Math.max(0, Math.min(DAYS.length - 1, i));
  const day = DAYS[learnIdx], L = LEARN[learnIdx];
  const d = dlg();
  d.style.setProperty('--c', day.col);
  $('lnHead').innerHTML = `<div class="no"><small>EPISODE</small>${String(learnIdx+1).padStart(2,'0')}</div><h2 id="lnTitle">${day.title}</h2><p class="lg">${LOGLINE[learnIdx]}</p><div class="chips"><span class="chip">訪問者 ${day.n}名</span><span class="chip tool">支給される道具：${L.tool}</span></div>`;
  $('lnBody').innerHTML = `
    <div class="lnsec"><h3>なぜ大事？</h3><p class="lnwhy">${L.why}</p></div>
    <div class="lnsec"><h3>この日に確かめること</h3><div class="lnitems">${L.items.map(it => `<div class="lnitem"><b>${it[0]}</b><p>${it[1]}${it[2] ? `<span class="trap">${it[2]}</span>` : ''}</p></div>`).join('')}</div></div>
    <div class="lnsec"><h3>『セキュアAPI』で読むなら</h3><ul class="lnbook">${L.book.map(b => `<li>${b}</li>`).join('')}</ul></div>`;
  $('lnBody').scrollTop = 0;
  $<HTMLButtonElement>('lnPrev').disabled = learnIdx === 0;
  $<HTMLButtonElement>('lnNext').disabled = learnIdx === DAYS.length - 1;
  if(!d.open){ d.showModal(); }
  $('lnClose').focus({preventScroll:true});
}
export const learnOpen = () => dlg().open;

export function initLearn(){
  $('lnPrev').addEventListener('click', () => openAt(learnIdx - 1));
  $('lnNext').addEventListener('click', () => openAt(learnIdx + 1));
  $('lnClose').addEventListener('click', () => dlg().close());
  dlg().addEventListener('click', e => { if(e.target === dlg()) dlg().close(); });
  dlg().addEventListener('keydown', e => {
    const max = (learnMode === 'tool' ? TORDER.length : DAYS.length) - 1;
    if(e.key === 'ArrowLeft' && learnIdx > 0){ e.preventDefault(); openAt(learnIdx - 1); }
    if(e.key === 'ArrowRight' && learnIdx < max){ e.preventDefault(); openAt(learnIdx + 1); }
  });
  $('learnAll').addEventListener('click', () => openLearn(0));
  $('noticeBox').addEventListener('click', e => { const b = (e.target as Element).closest<HTMLElement>('[data-learn]'); if(b) openLearn(Number(b.dataset.learn)); });
}
