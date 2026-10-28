import type { Typer } from '../types';

/** id で要素を取る。マークアップにある前提の要素だけに使う */
export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
/** 描き替えで消えているかもしれない要素 */
export const $opt = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
export const rnd = (a: number, b: number) => a + Math.floor(Math.random()*(b-a+1));
export const pickOne = <T>(a: readonly T[]): T => a[Math.floor(Math.random()*a.length)];
export const hhmm = (m: number) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(((m%60)+60)%60).padStart(2,'0')}`;
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const b64 = (n: number) => Array.from({length:n}, () => B64[rnd(0,63)]).join('');
export const thumb = () => b64(8) + '…';
export function esc(s: unknown){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c as '&']); }
export function shuffle<T>(a: T[]){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
/** PKCE の S256。crypto.subtle が使えない環境（非HTTPS）では、それらしい値で代用する */
export async function s256(v: string){
  try{
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
    let s = ''; new Uint8Array(buf).forEach(b => s += String.fromCharCode(b));
    return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }catch{
    let h = 2166136261; let out = '';
    for(let r=0;r<43;r++){ for(const ch of v + r){ h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } out += B64[(h>>>0)%64]; }
    return out;
  }
}
/** 共通の先頭と末尾を除いた、違う部分だけを <mark> で囲む */
export function diffHTML(got: string, want: string){
  if(got===want) return `<span class="diff">${esc(got)}</span> <span class="ok">一致</span>`;
  let p = 0; while(p < got.length && p < want.length && got[p]===want[p]) p++;
  let s = 0; while(s < got.length-p && s < want.length-p && got[got.length-1-s]===want[want.length-1-s]) s++;
  const mid = got.slice(p, got.length - s);
  return `<span class="diff">${esc(got.slice(0,p))}<mark>${esc(mid) || '＿'}</mark>${esc(got.slice(got.length - s))}</span> <span class="ng">不一致</span>`;
}
export const store = {
  get<T>(k: string, d: T): T { try{ const v = localStorage.getItem(k); return v==null ? d : JSON.parse(v) as T; }catch{ return d; } },
  set(k: string, v: unknown){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch{ /* 保存できなくても遊べる */ } },
  del(k: string){ try{ localStorage.removeItem(k); }catch{ /* 同上 */ } }
};
export const SAVE_KEY = 'api-immig-save', BEST_KEY = 'api-immig-best';

export const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const wait = (ms: number) => new Promise(r => setTimeout(r, reduceMotion() ? 0 : ms));
/** アニメーションをやり直すため、クラスを外して reflow させてから付け直す */
export function restartAnim(el: HTMLElement, cls: string){ el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

/** 1文字ずつ表示する。句読点で少し間を置く */
export function typeText(el: HTMLElement, text: string, speed: number, onDone?: () => void): Typer {
  let i = 0, timer = 0, done = false;
  const ctl: Typer = {
    get done(){ return done; },
    finish(){
      if(done) return; done = true; clearTimeout(timer);
      el.textContent = text; el.classList.remove('typing');
      if(onDone) onDone();
    }
  };
  if(reduceMotion() || !speed){ ctl.finish(); return ctl; }
  el.textContent = ''; el.classList.add('typing');
  const step = () => {
    i++; el.textContent = text.slice(0, i);
    if(i >= text.length){ ctl.finish(); return; }
    const ch = text[i-1];
    timer = setTimeout(step, '。！？…'.includes(ch) ? speed*7 : '、'.includes(ch) ? speed*3 : speed);
  };
  timer = setTimeout(step, speed);
  return ctl;
}
