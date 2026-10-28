import { CAST, DAYS, LOGLINE, TOOLS, TORDER } from '../data/world';
import { SP, sprite } from '../data/sprites';
import { $, BEST_KEY, SAVE_KEY, store } from '../lib/util';
import type { Save } from '../types';
import { openLearn, openTool } from './learn';

export function show(id: 'start' | 'notice' | 'game'){ (['start','notice','game'] as const).forEach(s => $(s).hidden = s!==id); window.scrollTo(0,0); }

/* ===================== start page ===================== */
export function refreshStart(){
  const b = store.get<number>(BEST_KEY, 0);
  $('bestStart').innerHTML = b ? `ハイスコア<b>${b.toLocaleString()}</b>` : '';
  const s = store.get<Save | null>(SAVE_KEY, null);
  const cb = $('contBtn');
  if(s){ cb.hidden = false; cb.textContent = `つづきから　DAY ${s.day+1}`; } else cb.hidden = true;
  const castRole = {chief:'審査局のトップ', senpai:'頼れる先輩審査官', fridge:'常連のIoT冷蔵庫'};
  $('cast').innerHTML = (['chief','senpai','fridge'] as const).map(k => { const p = CAST[k]; return `<div class="pc" style="--c:${p.lc}">${sprite(p.sp, 44, 32)}<div><b>${p.nm}</b><span>${castRole[k]}</span></div></div>`; }).join('');
  if(!$('pghost').innerHTML) $('pghost').innerHTML = ['g1','g2','main'].map(c => `<svg class="${c}" viewBox="0 0 11 8" shape-rendering="crispEdges" aria-hidden="true"><path d="${SP.phantom}" fill="currentColor"/></svg>`).join('');
  $('toolsInfo').innerHTML = TORDER.map((k, i) => { const t = TOOLS[k]; return `<button class="gi" data-tool="${i}" aria-label="${t.nm}の詳しい説明を開く"><small>DAY ${t.d} で支給</small><span class="gg">${t.g}</span><b>${t.nm}</b><span>${t.desc}</span><span class="more3">詳しく ▶</span></button>`; }).join('');
  document.querySelectorAll<HTMLElement>('#toolsInfo .gi').forEach(b => b.addEventListener('click', () => openTool(Number(b.dataset.tool))));
  $('daysInfo').innerHTML = DAYS.map((d, i) => `<button class="ep" data-i="${i}" style="--c:${d.col}" aria-label="EPISODE ${i+1} ${d.title} の学べることを開く"><div class="no"><small>EPISODE</small>${String(i+1).padStart(2,'0')}</div><div><h3>${d.title}</h3><p class="log">${LOGLINE[i]}</p><p class="learn">学べること：${d.sum}</p></div><span class="meta">訪問者 ${d.n}名<span class="more2">詳しく ▶</span></span></button>`).join('');
  document.querySelectorAll<HTMLElement>('#daysInfo .ep').forEach(b => b.addEventListener('click', () => openLearn(Number(b.dataset.i))));
}
