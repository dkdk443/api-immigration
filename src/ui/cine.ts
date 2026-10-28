import { CAST } from '../data/world';
import { SP } from '../data/sprites';
import { logLines, type Scene } from '../data/story';
import { $, $opt, esc, reduceMotion, restartAnim, typeText } from '../lib/util';
import type { Typer } from '../types';

/* ===================== prologue cinematic ===================== */
const NARR = {nm:'', lc:'#BDB6A6'};
let cine: {scenes: Scene[]; si: number; li: number; onDone?: () => void; active: boolean; typer: Typer | null} | null = null;
export const cineActive = () => !!cine && cine.active;
export function stopCine(){
  if(!cine) return;
  cine.active = false; cine = null; $('cine').hidden = true; $('cineStage').innerHTML = '';
}

export function runCine(scenes: Scene[], onDone?: () => void){
  cine = {scenes, si:0, li:0, onDone, active:true, typer:null};
  $('cine').hidden = false;
  showScene();
}
function showScene(){
  if(!cine) return;
  const sc = cine.scenes[cine.si], st = $('cineStage');
  restartAnim(st, 'fade');
  const ph = SP.phantom;
  if(sc.scene==='log') st.innerHTML = `<div class="log"><div class="logscroll">${logLines()}</div></div><div class="flashR"></div><div class="alertTag">不正アクセスを検知</div>`;
  else if(sc.scene==='phantom') st.innerHTML = `<div class="noise"></div><div class="glitch"><svg viewBox="0 0 11 8" shape-rendering="crispEdges" aria-hidden="true"><path d="${ph}" fill="currentColor"/></svg><svg class="g1" viewBox="0 0 11 8" shape-rendering="crispEdges" aria-hidden="true"><path d="${ph}" fill="currentColor"/></svg><svg class="g2" viewBox="0 0 11 8" shape-rendering="crispEdges" aria-hidden="true"><path d="${ph}" fill="currentColor"/></svg></div>`;
  else if(sc.scene==='chief') st.innerHTML = `<div class="comm"><div class="h"><span>緊急通信</span><span>鷹野局長</span></div><div class="b"><svg viewBox="0 0 11 8" shape-rendering="crispEdges" aria-hidden="true"><path d="${SP.chief}" fill="currentColor"/></svg></div></div>`;
  else st.innerHTML = `<div class="ttl">${[...(sc.text ?? '')].map((ch, i) => `<span style="--d:${i*70}ms">${ch===' ' ? '&nbsp;' : esc(ch)}</span>`).join('')}</div><div class="tstamp">${esc(sc.stamp)}</div>`;
  cine.li = 0;
  setTimeout(() => { if(cine && cine.active && cine.scenes[cine.si]===sc) showCineLine(); }, reduceMotion() ? 0 : (sc.scene==='title' ? 1500 : 650));
}
function showCineLine(){
  if(!cine) return;
  const [who, text] = cine.scenes[cine.si].lines[cine.li];
  const p = who ? CAST[who] : NARR;
  $('cineCap').style.setProperty('--c', p.lc);
  $('cineNm').textContent = p.nm;
  $('cineMore').hidden = true;
  cine.typer = typeText($('cineTx'), text, 36, () => { const m = $opt('cineMore'); if(m) m.hidden = false; });
}
export function cineAdvance(){
  if(!cine || !cine.active) return;
  if(!cine.typer){ return; }
  if(!cine.typer.done){ cine.typer.finish(); return; }
  cine.li++;
  const sc = cine.scenes[cine.si];
  if(cine.li < sc.lines.length){ showCineLine(); return; }
  cine.si++;
  if(cine.si >= cine.scenes.length){ cineEnd(); return; }
  cine.typer = null; $('cineTx').textContent = ''; $('cineNm').textContent = ''; $('cineMore').hidden = true;
  showScene();
}
export function cineEnd(){
  if(!cine || !cine.active) return;
  cine.active = false;
  if(cine.typer) cine.typer.finish();
  $('cine').hidden = true; $('cineStage').innerHTML = '';
  const cb = cine.onDone; cine = null;
  if(cb) cb();
}

export function initCine(){
  $('cine').addEventListener('click', e => { if((e.target as Element).closest('#cineSkip')) return; cineAdvance(); });
  $('cineSkip').addEventListener('click', e => { e.stopPropagation(); cineEnd(); });
}
