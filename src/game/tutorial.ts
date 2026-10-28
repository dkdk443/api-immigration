import { AUD, CAST, ISS } from '../data/world';
import { sprite } from '../data/sprites';
import { EPILOGUE, PROLOGUE } from '../data/story';
import { $, SAVE_KEY, b64, reduceMotion, restartAnim, store, typeText } from '../lib/util';
import { app, freshState } from '../app';
import type { Choice, Client, Endpoint, FlawKey, TutCase, TutStep } from '../types';
import { newGame, nextCase } from './flow';
import { runCine } from '../ui/cine';
import { show } from '../ui/start';

/* ===================== guided tutorial ===================== */
interface TutOpts {
  flaw: FlawKey | null; now: number; exp: number; ep: Endpoint & {s: string}; client: Client; ua: string; say: string;
  iss?: string; aud?: string; sub?: string; phantom?: boolean; fridge?: boolean; steps: TutStep[];
}
function tutCase(o: TutOpts): TutCase {
  return {make(){
    app.state!.clock = o.now;
    return {kind:'jwt', ep:o.ep, now:o.now, hdr:{alg:'RS256', typ:'at+jwt', kid:'key-2026-a'},
      pay:{iss:o.iss || ISS, aud:o.aud || AUD, sub:o.sub || 'user_42', scope:o.ep.s, iat:o.now - 40, exp:o.exp},
      sig:b64(30), sigOk:true, jkt:null, reqJkt:null, variant:'', flaw:o.flaw,
      client:o.client, say:o.say, ua:o.ua, phantom:!!o.phantom, fridge:!!o.fridge, decoy:false};
  }, steps:o.steps};
}
const TUT_CASES = [
  tutCase({flaw:'EXP', now:600, exp:560, ep:{m:'GET', p:'/orders/1042', s:'orders:read'}, client:{nm:'訓練用ダミー', sp:'robot'}, ua:'TrainingBot/1.0', say:'へへ…注文を見せてもらおうか。',
    steps:[
      {t:'ticket', who:'senpai', text:'訓練開始！ まずはチケット。誰が、どのAPIに来たのかを確認するよ。', wait:'next'},
      {t:'sheet', who:'senpai', text:'これが照合表。左がトークンの値、右が今日の規則。1行ずつ見比べていくの。', wait:'next'},
      {t:'row-exp', who:'senpai', text:'exp を見て。有効期限は 09:20、いまは 10:00…。おかしいと思ったら、その行の「？」を押して！', wait:'mark:exp:ng'},
      {t:'reasons', who:'senpai', text:'候補が光ったね。「有効期限切れ」を選んで拒否！', wait:'decide:EXP'},
      {t:'fb', who:'phantom', text:'……チッ。期限切れくらいは見抜くか。', wait:'next'},
      {t:'fb', who:'senpai', text:'ナイス！ 藍色の枠が「拒否の根拠」。下のボタンで次の訪問者へ。', wait:'none'}
    ]}),
  tutCase({flaw:'ISS', now:625, exp:680, iss:'https://auth.examp1e.com', ep:{m:'POST', p:'/orders', s:'orders:write'}, client:{nm:'Webフロント', sp:'monitor'}, ua:'Mozilla/5.0 (Macintosh) Chrome/130', say:'新しい注文を作りたいです。',
    steps:[
      {t:'sheet', who:'senpai', text:'今度は一見まともそう…。でも油断しないで。', wait:'next'},
      {t:'tool-iss', who:'senpai', text:'iss の行にある「照合ルーペ」を押してみて。規則と1文字ずつ比べてくれるよ。', wait:'tool:LOUPE'},
      {t:'row-iss', who:'senpai', text:'赤い文字が見えた？ 「l（エル）」が「1（いち）」にすり替わってる！ 「発行者が違う」で拒否しよう。', wait:'decide:ISS'},
      {t:'fb', who:'phantom', text:'似たドメイン作戦も通じない、か……。', wait:'next'},
      {t:'fb', who:'senpai', text:'こういうのが一番こわいの。迷ったらルーペ！ 次へ進もう。', wait:'none'}
    ]}),
  tutCase({flaw:null, now:650, exp:700, ep:{m:'POST', p:'/orders', s:'orders:write'}, client:{nm:'IoT冷蔵庫レイゾウ', sp:'fridge'}, fridge:true, ua:'FridgeOS/2.0 (Reizo)', say:'牛乳が切れたので注文します！',
    steps:[
      {t:'sheet', who:'senpai', text:'常連の冷蔵庫、レイゾウくんだね。全部の行を規則と比べてみて。', wait:'next'},
      {t:'approveBtn', who:'senpai', text:'全部規則どおりなら「許可」。ちゃんとしたお客さんを通すのも、審査官の大事な仕事だよ。', wait:'decide:OK'},
      {t:'fb', who:'fridge', text:'ありがとうございます！ 牛乳、無事に注文できました！', wait:'next'},
      {t:'fb', who:'senpai', text:'正解！ 止めるだけじゃなく、正しい人を通すのも大事。次が最後だよ。', wait:'none'}
    ]}),
  tutCase({flaw:'AUD', now:672, exp:720, aud:'https://admin.example.com', ep:{m:'GET', p:'/users/me', s:'profile:read'}, client:{nm:'モバイルアプリ', sp:'phone'}, phantom:true, ua:'Mozilla/5.0 Ph4ntom-Kit/0.9', say:'自分のプロフィールを取りに来ました。',
    steps:[
      {t:'ticket', who:'senpai', text:'待って、User-Agent を見て。「Ph4ntom」…数字の4が混ざってる！', wait:'next'},
      {t:'reportBtn', who:'senpai', text:'ファントムだ！ まずは「通報する」をオンにして。', wait:'report:true'},
      {t:'row-aud', who:'senpai', text:'それから照合表。aud の宛先が…このAPIじゃない！ 「宛先が違う」で拒否！', wait:'decide:AUD'},
      {t:'fb', who:'phantom', text:'……記録されたか。面白い。', wait:'next'},
      {t:'fb', who:'senpai', text:'やったね、訓練はこれで全部！ 「訓練を終える」を押してね。', wait:'none'}
    ]})
];
export function startStory(){ runCine(PROLOGUE, () => startTutorial(true)); }
export function startTutorial(fromStory: boolean){
  store.del(SAVE_KEY);
  app.state = freshState({list:TUT_CASES.map(() => ({flaw:null})), phase:'loading', clock:600,
    dayStats:{ok:0, n:0, miss:0, score0:0, rep:0, phantoms:1, phCaught:0},
    tut:{cases:TUT_CASES, step:0, fromStory}});
  $('shift').style.visibility = 'hidden';
  show('game');
  $('tDay').textContent = '訓練';
  nextCase();
}
function tutStep(): TutStep | undefined {
  const state = app.state, t = state?.tut;
  if(!state || !t) return undefined;
  return t.cases[state.idx - (state.phase==='feedback' ? 1 : 0)]?.steps[t.step];
}
export function tutOnCase(){
  app.state!.tut!.step = 0;
  setTimeout(() => { if(app.state && app.state.tut && app.state.phase==='play') tutShow(); }, reduceMotion() ? 0 : 750);
}
function tutTarget(t: string){
  if(t==='tool-iss') return document.querySelector<HTMLElement>('#row-iss .tbtn');
  return document.getElementById(t);
}
let spotRaf = 0, spotEl: HTMLElement | null = null;
function tutShow(){
  const st = tutStep();
  if(!st){ tutHide(); return; }
  spotEl = tutTarget(st.t);
  if(spotEl) spotEl.scrollIntoView({block:'center', behavior: reduceMotion() ? 'auto' : 'smooth'});
  const p = CAST[st.who];
  const co = $('coach');
  co.hidden = false; co.style.setProperty('--c', p.lc);
  co.classList.remove('shake');
  $('coachFace').innerHTML = sprite(p.sp, 55, 40);
  $('coachNm').textContent = p.nm;
  $('coachNext').hidden = st.wait!=='next';
  typeText($('coachTx'), st.text, 24);
  $('spot').hidden = !spotEl;
  cancelAnimationFrame(spotRaf);
  const loop = () => {
    if(!spotEl || $('spot').hidden) return;
    const r = spotEl.getBoundingClientRect(), pad = 6, s = $('spot').style;
    s.top = `${r.top - pad}px`; s.left = `${r.left - pad}px`; s.width = `${r.width + pad*2}px`; s.height = `${r.height + pad*2}px`;
    const ch = co.offsetHeight, cw = co.offsetWidth, vw = window.innerWidth, vh = window.innerHeight;
    let top = r.bottom + 16;
    if(top + ch > vh - 10) top = r.top - ch - 16;
    if(top < 10) top = Math.min(vh - ch - 10, Math.max(10, r.top + 16));
    co.style.top = `${top}px`;
    co.style.left = `${Math.max(12, Math.min(vw - cw - 12, r.left))}px`;
    spotRaf = requestAnimationFrame(loop);
  };
  spotRaf = requestAnimationFrame(loop);
}
export function tutHide(){ cancelAnimationFrame(spotRaf); spotEl = null; $('spot').hidden = true; $('coach').hidden = true; }
export function tutNextShown(){ return !$('coach').hidden && !$('coachNext').hidden; }
export function tutEvent(evt: string){
  const st = tutStep();
  if(!st || st.wait!==evt) return;
  app.state!.tut!.step++;
  tutShow();
}
/** 訓練中は、案内どおりの判定だけを受け付ける */
export function tutAllow(choice: Choice){
  const st = tutStep();
  if(st && st.wait===`decide:${choice}`) return true;
  const co = $('coach');
  restartAnim(co, 'shake');
  if(!st || !st.wait.startsWith('decide:')) typeText($('coachTx'), 'あ、まだ判定しないで。まずは説明どおりに進めてみて。', 20);
  else typeText($('coachTx'), 'うーん、ちがうみたい。' + st.text, 20);
  return false;
}
export function tutEnd(){
  tutHide();
  runCine(EPILOGUE, () => newGame());
}
export function initTutorial(){
  $('coachNext').addEventListener('click', () => tutEvent('next'));
  $('coachSkip').addEventListener('click', () => { tutHide(); app.state = null; newGame(); });
}
