import { CAST } from '../data/world';
import { sprite } from '../data/sprites';
import { $, $opt, restartAnim, typeText } from '../lib/util';
import type { CastKey, Talk, Typer } from '../types';

export function speech(who: CastKey, text: string){ const p = CAST[who]; return `<div class="line" style="--c:${p.c}"><span class="face">${sprite(p.sp, 44, 32)}<small>${p.nm}</small></span><p>${text}</p></div>`; }

/* 会話：1行ずつ表示し、クリック／Enter／Spaceで送る */
let vn: {i: number; lines: Talk[]; slot: HTMLElement; onDone?: () => void; active: boolean; typer: Typer | null} | null = null;
export const dialogueActive = () => !!vn && vn.active;
export function stopDialogue(){ if(vn){ vn.active = false; vn = null; } }

export function runDialogue(slot: HTMLElement, lines: Talk[], onDone?: () => void){
  vn = {i:0, lines, slot, onDone, active:true, typer:null};
  slot.innerHTML = `<div class="vn" id="vnBox" tabindex="0" aria-label="会話。クリックかEnterで次へ">
      <div class="pf" id="vnPf"></div>
      <div class="tx"><b class="nm" id="vnNm"></b><p id="vnTx" aria-live="polite"></p></div>
      <span class="more" id="vnMore" hidden>▼</span>
      <button class="vnskip" id="vnSkip">会話をスキップ</button>
    </div><p class="vnhint">クリック・Enter・Space で会話を進める</p>`;
  $('vnBox').addEventListener('click', e => { if((e.target as Element).id!=='vnSkip') vnAdvance(); });
  $('vnSkip').addEventListener('click', e => { e.stopPropagation(); vnEnd(); });
  vnShow();
  $('vnBox').focus({preventScroll:true});
}
function vnShow(){
  if(!vn) return;
  const [who, text] = vn.lines[vn.i];
  const p = CAST[who], box = $('vnBox');
  const changed = vn.i===0 || vn.lines[vn.i-1][0] !== who;
  box.style.setProperty('--c', p.lc);
  if(changed){
    $('vnPf').innerHTML = `<span class="pfi">${sprite(p.sp, 88, 64)}</span>`;
    restartAnim(box, 'swap');
  }
  $('vnNm').textContent = p.nm;
  $('vnMore').hidden = true;
  box.classList.add('talking');
  vn.typer = typeText($('vnTx'), text, 28, () => {
    const m = $opt('vnMore'); if(m) m.hidden = false;
    const b = $opt('vnBox'); if(b) b.classList.remove('talking');
  });
}
export function vnAdvance(){
  if(!vn || !vn.active) return;
  if(vn.typer && !vn.typer.done){ vn.typer.finish(); return; }
  vn.i++;
  if(vn.i >= vn.lines.length) vnEnd(); else vnShow();
}
function vnEnd(){
  if(!vn || !vn.active) return;
  vn.active = false;
  if(vn.typer) vn.typer.finish();
  vn.slot.innerHTML = `<div class="vnlog reveal-in">${vn.lines.map(l => speech(l[0], l[1])).join('')}</div>`;
  const cb = vn.onDone; vn = null;
  if(cb) cb();
}
/** 会話が終わったら、続きの説明とボタンを出す */
export function revealAfter(focusId: string){
  const a = $('after'); a.hidden = false; a.classList.add('reveal-in');
  const f = $opt(focusId); if(f) f.focus({preventScroll:true});
}
