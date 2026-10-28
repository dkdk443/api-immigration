import { AUD, CAST, CODE_FL, DAYS, FLAWS, ISS, JWT_FL, KEYS, MAX_TRUST, TOOLS, TORDER, kidsFor } from '../data/world';
import { sprite } from '../data/sprites';
import { ENDINGS, INTRO } from '../data/story';
import { LEARN, RECAP } from '../data/learn';
import { $, $opt, BEST_KEY, SAVE_KEY, diffHTML, esc, hhmm, pickOne, reduceMotion, restartAnim, rnd, s256, store, typeText, wait } from '../lib/util';
import { app, freshState } from '../app';
import type { Case, CaseKind, Choice, FlawKey, Mark, Row, Save, ToolKey, Verdict } from '../types';
import { FLAW_ROW, ROW_FLAW, buildDay, explain, makeCase } from './cases';
import { tutAllow, tutEnd, tutEvent, tutHide, tutOnCase } from './tutorial';
import { revealAfter, runDialogue, stopDialogue } from '../ui/dialogue';
import { stopCine } from '../ui/cine';
import { refreshStart, show } from '../ui/start';

let shiftRaf = 0;

/* 訪問者のひとこと */
function reaction(c: Case, kind: Verdict, choice: Choice){
  if(c.phantom) return app.state?.report ? 'チッ…記録されたか。' : '（フフ…気づかれなかったな）';
  if(c.fridge){
    if(c.flaw===null) return kind==='good' ? 'ありがとうございます！また来ますね！' : 'えっ、なんでですか…？';
    return kind==='bad' ? 'やったー、通れた！（いいのかな…）' : 'うう…出直してきます…';
  }
  if(c.flaw===null) return choice==='OK' ? pickOne(['ありがとうございます！','助かります。','よし、手続き完了。']) : pickOne(['えっ、ちゃんとしたトークンなのに…','そんな…','困ります…']);
  return choice==='OK' ? pickOne(['（しめしめ…）','（ふう、バレなかった）','どうも〜。']) : pickOne(['くっ…','出直してきます…','あれ、ダメでしたか…']);
}

/* ===================== rendering ===================== */
function rowsFor(c: Case){
  const day = app.state!.day+1, rows: Row[] = [];
  const R = (key: string, label: string, val: string, rule: string, tool?: ToolKey | null) => rows.push({key, label, val, rule, tool});
  if(c.kind==='jwt'){
    const p = c.pay, bank = !!c.ep.bank;
    R('iss', '発行者 iss', p.iss, ISS, 'LOUPE');
    R('aud', '宛先 aud', p.aud, AUD, 'LOUPE');
    R('alg', 'アルゴリズム alg', c.hdr.alg, day >= 6 && bank ? 'PS256 か ES256（金融API）' : 'RS256 のみ');
    if(day >= 3) R('typ', '種類 typ', c.hdr.typ, 'at+jwt のみ');
    if(day >= 2) R('kid', '鍵 kid', c.hdr.kid, kidsFor(day).join(' / '));
    if(day >= 2) R('sig', '署名', c.sig ? c.sig.slice(0, 18) + '…' : '（署名なし）', 'スキャナーで一致を確認', 'SCAN');
    if(day >= 2) R('scope', 'スコープ scope', p.scope === undefined ? '（なし）' : p.scope, `${c.ep.m} ${c.ep.p} には ${c.ep.s}`);
    if(day >= 5) R('role', 'ロール role', p.role || '（なし）', c.ep.admin ? '管理者機能は admin のみ' : 'この機能はロール不問');
    if(day >= 5) R('tenant', 'テナント tenant', p.tenant || '（なし）', c.ep.tenant ? `URLのテナント ${c.ep.tenant} と一致` : 'このURLはテナント不問');
    R('exp', '有効期限 exp', hhmm(p.exp), `現在時刻 ${hhmm(c.now)} より後`);
    if(day >= 3) R('cnf', '持ち主 cnf.jkt', c.jkt || '（なし）', bank && day >= 6 ? 'DPoPの鍵と一致（金融APIは必須）' : 'あれば、DPoPの鍵と一致', c.reqJkt ? 'DPOP' : null);
  } else {
    const r = c.req, l = c.led;
    R('client', 'client_id', r.client_id, `台帳：${l.client_id}`, 'LOUPE');
    R('redirect', 'redirect_uri', r.redirect_uri, `台帳：${l.redirect_uri}`, 'LOUPE');
    R('pkce', 'PKCE', `verifier ${r.code_verifier.slice(0, 14)}…`, `台帳の challenge ${l.code_challenge.slice(0, 14)}…`, 'HASH');
    R('method', '方式 method', l.method, 'S256 のみ');
    R('status', 'コードの状態', l.status, '未使用のものだけ');
  }
  return rows;
}
function infoLine(c: Case){
  if(c.kind==='jwt'){
    const p = c.pay;
    let s = `sub ${p.sub} ・ iat ${hhmm(p.iat)}`;
    if(p.email) s += ` ・ email ${p.email}`;
    if(p.nonce) s += ` ・ nonce ${p.nonce}`;
    return s;
  }
  return `grant_type ${c.req.grant_type} ・ code ${c.req.code}`;
}
function renderCase(c: Case){
  const state = app.state!;
  $('avatar').innerHTML = `<span style="color:${c.fridge ? CAST.fridge.lc : 'var(--text)'}">${sprite(c.client.sp, 66, 48)}</span>`;
  $('client').textContent = c.client.nm;
  $('say').textContent = c.say;
  $('now').textContent = hhmm(c.now);
  $('ticket').innerHTML = `<div class="tl"><span>リクエスト</span><b>${c.ep.m} ${esc(c.ep.p)}</b></div><div class="tl"><span>User-Agent</span><b>${esc(c.ua)}</b></div>${c.kind==='jwt' && c.reqJkt ? '<div class="tl"><span>DPoP証明</span><b>あり</b></div>' : ''}`;
  const rows = rowsFor(c);
  state.rows = rows;
  state.marks = {};
  const head = c.kind==='jwt' ? ['項目','トークンの値','本日の規則'] : ['項目','提出された値','規則・局の台帳'];
  $('sheet').innerHTML = `<div class="thead"><span>${head[0]}</span><span>${head[1]}</span><span>${head[2]}</span><span>判定</span><span>道具</span></div>` +
    rows.map((r, i) => `<div class="row" id="row-${r.key}" style="--dl:${200 + i*45}ms">
      <span class="lb">${r.label}</span>
      <span class="val">${esc(r.val)}</span>
      <span class="rule">${esc(r.rule)}</span>
      <span class="mk"><button class="mkb ok" data-k="${r.key}" data-m="ok" aria-label="${esc(r.label)} は問題なし">✓</button><button class="mkb ng" data-k="${r.key}" data-m="ng" aria-label="${esc(r.label)} が怪しい">？</button></span>
      <span class="tl">${r.tool ? `<button class="tbtn" data-t="${r.tool}">${TOOLS[r.tool].nm} <kbd>${TOOLS[r.tool].key}</kbd></button>` : ''}</span>
      <div class="res" hidden></div>
    </div>`).join('') +
    `<div class="info">そのほかの記載：${esc(infoLine(c))}</div><div id="stampSlot"></div>`;
  document.querySelectorAll<HTMLElement>('.mkb').forEach(b => b.addEventListener('click', () => mark(b.dataset.k!, b.dataset.m as Mark)));
  document.querySelectorAll<HTMLElement>('.tbtn').forEach(b => b.addEventListener('click', () => useTool(b.dataset.t as ToolKey)));
  $('approveBtn').innerHTML = c.kind==='code' ? 'トークン発行 <small>200 OK ／ A</small>' : '許可 <small>200 OK ／ A</small>';
  renderReasons(c.kind);
  updateMarks();
  setReport(false);
}
function mark(k: string, m: Mark){
  const state = app.state;
  if(!state || state.phase!=='play') return;
  state.marks[k] = state.marks[k]===m ? undefined : m;
  updateMarks();
  if(state.tut && state.marks[k]) tutEvent(`mark:${k}:${m}`);
}
function updateMarks(){
  const state = app.state!;
  const rows = state.rows;
  let n = 0; const ng: Row[] = [];
  rows.forEach(r => {
    const m = state.marks[r.key];
    if(m) n++;
    if(m==='ng') ng.push(r);
    const el = $opt('row-' + r.key); if(!el) return;
    el.classList.toggle('flag', m==='ng');
    el.querySelectorAll<HTMLElement>('.mkb').forEach(b => b.classList.toggle('on', b.dataset.m===m));
  });
  const cands = new Set(ng.map(r => ROW_FLAW[r.key]).filter(Boolean));
  document.querySelectorAll<HTMLElement>('.rsn').forEach(b => b.classList.toggle('cand', cands.has(b.dataset.f as FlawKey)));
  const names = [...cands].map(f => FLAWS[f].nm);
  $('summary').innerHTML = `チェック ${n}／${rows.length}　怪しい ${ng.length}件` + (names.length ? `<br>候補：<b>${names.join('、')}</b>` : '<br>全部 ✓ なら許可、怪しければ「？」');
}
function renderTools(){
  const state = app.state!;
  document.querySelectorAll<HTMLButtonElement>('.tbtn').forEach(b => {
    const used = !!state.used[b.dataset.t as ToolKey];
    b.classList.toggle('used', used); b.disabled = state.phase!=='play' || used;
  });
}
/** 拒否の理由として選べる手口。数字キーの並びと同じ */
export function reasonList(kind: CaseKind): FlawKey[] { return (kind==='code' ? CODE_FL : JWT_FL).filter(f => FLAWS[f].d <= app.state!.day+1); }
function renderReasons(kind: CaseKind){
  $('reasons').innerHTML = reasonList(kind).map((f, i) => `<button class="rsn" data-f="${f}"><span class="n">${KEYS[i]}</span><span>${FLAWS[f].nm}</span><span class="c">${FLAWS[f].code}</span></button>`).join('');
  document.querySelectorAll<HTMLElement>('.rsn').forEach(b => b.addEventListener('click', () => decide(b.dataset.f as FlawKey)));
}
function topbar(){
  const state = app.state!;
  $('tDay').textContent = state.tut ? '訓練' : String(state.day+1);
  $('tCount').textContent = `${state.idx}/${state.list.length}`;
  $('tScore').textContent = state.score.toLocaleString();
  $('tRep').textContent = String(state.reports);
  $('tTrust').innerHTML = Array.from({length:MAX_TRUST}, (_, i) => i < state.trust ? '◆' : '<span class="off">◆</span>').join('');
  $('tTrust').setAttribute('aria-label', `信頼度 ${state.trust}`);
}
export function setReport(on: boolean){
  app.state!.report = on;
  $('reportBtn').setAttribute('aria-pressed', on ? 'true' : 'false');
  $('reportBtn').firstChild!.textContent = on ? '通報する（もう一度押すと取り消し） ' : 'ファントムとして通報する ';
}
export function toggleReport(){
  const state = app.state;
  if(!state || state.phase!=='play') return;
  setReport(!state.report);
  if(state.tut) tutEvent('report:' + state.report);
}

/* ===================== tools ===================== */
const TOOL_ROWS: Record<ToolKey, string[]> = {LOUPE:['iss','aud','client','redirect'], SCAN:['sig'], DPOP:['cnf'], HASH:['pkce']};
export function useTool(k: ToolKey){
  const state = app.state;
  if(!state || state.phase!=='play') return;
  const t = TOOLS[k];
  if(t.d > state.day+1 || state.used[k]) return;
  const targets = TOOL_ROWS[k].map(key => $opt('row-' + key)).filter(r => r !== null);
  if(!targets.length) return;
  state.used[k] = true;
  renderTools();
  if(state.tut) setTimeout(() => tutEvent('tool:' + k), k==='LOUPE' ? 750 : 0);
  const c = state.cur!;
  targets.forEach(row => { const r = row.querySelector<HTMLElement>('.res')!; r.hidden = false; r.className = 'res busy'; r.textContent = k==='SCAN' ? '照合中…' : k==='DPOP' ? '訪問者に鍵の証明を求めています…' : k==='HASH' ? '計算中…' : '拡大して比較中…'; });
  if(k==='SCAN'){ const row = $opt('row-sig'); if(row){ const ln = document.createElement('div'); ln.className = 'scanline'; row.appendChild(ln); setTimeout(() => ln.remove(), 1200); } }
  const delay = k==='SCAN' ? 1100 : k==='DPOP' ? 900 : 700;
  setTimeout(async () => {
    if(!app.state || app.state.cur!==c || app.state.phase!=='play') return;
    const out = await toolResult(k, c);
    Object.entries(out).forEach(([key, html]) => { const row = $opt('row-' + key); if(!row) return; const r = row.querySelector<HTMLElement>('.res')!; r.className = 'res'; r.innerHTML = html; });
  }, delay);
}
async function toolResult(k: ToolKey, c: Case): Promise<Record<string, string>> {
  if(k==='LOUPE'){
    if(c.kind==='jwt') return {iss:'規則と比較：' + diffHTML(c.pay.iss, ISS), aud:'規則と比較：' + diffHTML(c.pay.aud, AUD)};
    return {client:'台帳と比較：' + diffHTML(c.req.client_id, c.led.client_id), redirect:'台帳と比較：' + diffHTML(c.req.redirect_uri, c.led.redirect_uri)};
  }
  if(c.kind==='code'){
    if(k!=='HASH') return {};
    const h = await s256(c.req.code_verifier);
    return {pkce:`S256(verifier)：${diffHTML(h, c.led.code_challenge)}<br>台帳の challenge：<span class="diff">${esc(c.led.code_challenge)}</span>`};
  }
  if(k==='SCAN'){
    const allowed = c.ep.bank ? ['PS256','ES256'] : ['RS256'];
    let h;
    if(c.hdr.alg==='none') h = '<span class="ng">署名がありません</span>';
    else if(!kidsFor(app.state!.day+1).includes(c.hdr.kid)) h = `<span class="ng">kid「${esc(c.hdr.kid)}」の公開鍵が信頼リストにありません</span>`;
    else if(!allowed.includes(c.hdr.alg)) h = `<span class="ng">${esc(c.hdr.alg)} はこの窓口で照合できません</span>`;
    else h = c.sigOk ? '<span class="ok">✔ 署名は一致しました</span>' : '<span class="ng">✖ 署名が一致しません（改ざん）</span>';
    return {sig:h};
  }
  if(k==='DPOP'){
    return {cnf:`訪問者が示した鍵：<span class="diff">${esc(c.reqJkt)}</span>　／　cnf.jkt：<span class="diff">${esc(c.jkt || '（なし）')}</span>`};
  }
  return {};
}

/* ===================== flow ===================== */
export function newGame(){
  store.del(SAVE_KEY);
  app.state = freshState();
  dayIntro(0);
}
export function continueGame(){
  const s = store.get<Save | null>(SAVE_KEY, null);
  if(!s) return newGame();
  app.state = freshState(s);
  dayIntro(s.day);
}

function dayIntro(d: number){
  const state = app.state!;
  state.day = d; state.phase = 'notice';
  const info = DAYS[d], I = INTRO[d];
  const toolNew = TORDER.filter(k => TOOLS[k].d === d+1).map(k => TOOLS[k]);
  $('noticeBox').innerHTML = `<p class="from">DAY ${d+1}　朝の通達</p>
    <div class="news"><b>${I.news[0]}</b><span>${I.news[1]}</span></div>
    <h2>DAY ${d+1}　${info.title}</h2>
    <div id="vnSlot"></div>
    <div id="after" hidden>
      <div class="recap"><h3>EPISODE ${String(d+1).padStart(2,'0')} で学ぶこと</h3><p>${LEARN[d].why}</p><div class="rfoot"><span class="bk">${RECAP[d].ch}</span><button class="rbtn" data-learn="${d}">詳しく読む ▶</button></div></div>
      <ul>${I.items.map(l => `<li><b>${l[0]}</b>${l[1]}</li>`).join('')}${toolNew.map(t => `<li><b>新しい審査ツール：${t.nm}（${t.key}）</b>${t.desc}</li>`).join('')}</ul>
      <p>訪問者は${info.n}名、勤務時間は${Math.floor(info.sec/60)}分${info.sec%60 ? info.sec%60 + '秒' : ''}。</p>
      <button class="btn ink" id="goBtn">勤務開始 <kbd>Enter</kbd></button>
    </div>`;
  show('notice');
  $('goBtn').addEventListener('click', startDay);
  runDialogue($('vnSlot'), I.lines, () => revealAfter('goBtn'));
}
function startDay(){
  const state = app.state!;
  if(state.phase!=='notice') return;
  const d = state.day;
  state.phase = 'loading';
  state.list = buildDay(d); state.idx = 0;
  state.clock = 9*60;
  state.dayStats = {ok:0, n:0, miss:0, score0:state.score, rep:0, phantoms:state.list.filter(s => s.phantom).length, phCaught:0};
  state.shiftLen = DAYS[d].sec*1000;
  state.shiftEnd = performance.now() + state.shiftLen;
  $('shift').style.visibility = '';
  show('game');
  nextCase().then(runShift);
}
function runShift(){
  cancelAnimationFrame(shiftRaf);
  const tick = () => {
    const state = app.state;
    if(!state || !['play','feedback','loading'].includes(state.phase)) return;
    if($<HTMLDialogElement>('quitDlg').open){ shiftRaf = requestAnimationFrame(tick); return; }
    const left = Math.max(0, state.shiftEnd - performance.now());
    const r = left/state.shiftLen;
    $('shiftBar').style.transform = `scaleX(${r})`;
    $('shift').classList.toggle('low', r < .2);
    const s = Math.ceil(left/1000);
    $('tShift').textContent = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
    if(left<=0 && state.phase==='play'){ endDay(true); return; }
    shiftRaf = requestAnimationFrame(tick);
  };
  shiftRaf = requestAnimationFrame(tick);
}
export async function nextCase(){
  const state = app.state!;
  state.phase = 'loading';
  state.clock += rnd(12, 34);
  const c = state.tut ? state.tut.cases[state.idx].make() : await makeCase(state.day+1, state.list[state.idx], state.clock);
  if(app.state!==state) return;
  state.cur = c; state.used = {}; state.t0 = performance.now();
  state.phase = 'play';
  renderCase(c); topbar();
  const av = $('avatarBox'); av.className = 'avatar'; void av.offsetWidth; av.classList.add('enter');
  restartAnim($('ticket'), 'drop');
  if(state.sayTyper) state.sayTyper.finish();
  $('say').textContent = '';
  setTimeout(() => { if(app.state && app.state.cur===c) app.state.sayTyper = typeText($('say'), c.say, 30); }, reduceMotion() ? 0 : 380);
  $('fb').hidden = true;
  $<HTMLButtonElement>('approveBtn').disabled = false; $('approveBtn').classList.remove('right');
  $<HTMLButtonElement>('reportBtn').disabled = false;
  renderTools();
  if(state.tut) tutOnCase();
}

export function decide(choice: Choice){
  const state = app.state;
  if(!state || state.phase!=='play') return;
  if(state.tut && !tutAllow(choice)) return;
  state.phase = 'feedback';
  const c = state.cur!;
  const secs = (performance.now() - state.t0)/1000;
  state.total++; state.dayStats.n++;
  const truth = c.flaw;
  let kind: Verdict, title: string, pts = 0;
  const flawNm = truth ? FLAWS[truth].nm : '';
  if(choice==='OK' && truth===null){ kind='good'; title = c.kind==='code' ? '正しい判定！トークンを発行しました' : '正しい判定！入国を許可しました'; }
  else if(choice!=='OK' && truth!==null && choice===truth){ kind='good'; title=`正しい判定！「${flawNm}」で拒否`; }
  else if(choice!=='OK' && truth!==null){ kind='half'; title=`拒否は正解。でも理由は「${flawNm}」`; }
  else if(choice==='OK'){ kind='bad'; title=`不正な訪問者を通してしまった（${flawNm}）`; }
  else { kind='bad'; title='正しい訪問者を追い返してしまった'; }

  if(kind==='good'){ pts = 100 + Math.max(0, Math.round((30 - secs)*4)); state.correct++; state.dayStats.ok++; }
  else if(kind==='half'){ pts = 40; state.half++; }
  else { state.trust--; state.dayStats.miss++; state.misses.push({c, choice, day:state.day+1}); }

  let phLine = '';
  if(c.phantom){
    state.phantomsSeen++;
    if(state.report){ state.reports++; state.dayStats.phCaught++; pts += 150; phLine = 'ファントムを通報した！セキュリティチームが追跡を開始（+150）'; }
    else phLine = `いまの訪問者はファントムだった…（User-Agent：${esc(c.ua)}）`;
  } else if(state.report){
    state.falseReports++; pts -= 100;
    phLine = c.decoy ? `誤通報…「${esc(c.ua)}」は実在する普通のソフトウェア。綴りをよく見よう（-100）` : '誤通報…この訪問者はファントムではなかった（-100）';
  }
  state.score = Math.max(0, state.score + pts);
  state.idx++;

  const code = choice==='OK' ? '200 OK' : `${FLAWS[choice].code}　${FLAWS[choice].nm}`;
  $('stampSlot').innerHTML = `<div class="stamp ${choice==='OK' ? 'ok' : 'ng'}"><b>${choice==='OK' ? (c.kind==='code' ? '発行' : '許可') : '拒否'}</b><span>${code}</span>${state.report ? '<span class="rep">通報済み</span>' : ''}</div>`;
  const fr = truth ? $opt('row-' + FLAW_ROW[truth]) : null;
  if(fr){
    const caught = choice!=='OK';
    fr.classList.add(caught ? 'found' : 'missed');
    fr.querySelector('.val')!.insertAdjacentHTML('beforeend', `<span class="rtag">${caught ? (kind==='good' ? '見抜いた！拒否の根拠' : 'ここが本当の根拠') : '見落とし'}</span>`);
  }
  if(c.flaw==='SIG' && !state.used.SCAN){ const r = $opt('row-sig'); if(r){ const x = r.querySelector<HTMLElement>('.res')!; x.hidden = false; x.className = 'res'; x.innerHTML = '<span class="ng">✖ 署名が一致しません（改ざん）</span>'; } }
  restartAnim($('sheet'), 'thud');
  if(state.sayTyper) state.sayTyper.finish();
  state.leave = choice==='OK' ? 'leaveL' : 'leaveR';
  if(c.phantom && state.report) $('avatarBox').classList.add('caught');
  const rline = reaction(c, kind, choice);
  setTimeout(() => { if(app.state && app.state.cur===c && app.state.phase!=='loading') app.state.sayTyper = typeText($('say'), rline, 30); }, reduceMotion() ? 0 : 260);

  $<HTMLButtonElement>('approveBtn').disabled = true; $<HTMLButtonElement>('reportBtn').disabled = true;
  document.querySelectorAll<HTMLButtonElement>('.rsn, .tbtn, .mkb').forEach(b => b.disabled = true);
  if(truth===null) $('approveBtn').classList.add('right');
  else { const rb = document.querySelector(`.rsn[data-f="${truth}"]`); if(rb) rb.classList.add('right'); }

  let tip = '';
  if(c.flaw==='SIG' && !state.used.SCAN) tip = '<p>ヒント：署名スキャナーを使えば見抜けました。</p>';
  if(c.flaw==='PKCE' && !state.used.HASH) tip = '<p>ヒント：ハッシュ計算機で code_verifier を計算すれば見抜けました。</p>';
  if(c.flaw==='DPOP' && c.variant==='mismatch' && !state.used.DPOP) tip = '<p>ヒント：DPoP尋問で鍵の指紋を確認すれば見抜けました。</p>';
  if((c.flaw==='ISS' || c.flaw==='AUD' || c.flaw==='REDIRECT') && kind!=='good' && !state.used.LOUPE) tip = '<p>ヒント：照合ルーペなら、違う文字が赤く表示されます。</p>';
  const last = state.idx >= state.list.length;
  const fb = $('fb');
  fb.className = 'fb ' + kind;
  fb.innerHTML = `<h3>${title}</h3>${pts ? `<span class="pts">${pts > 0 ? '+' : ''}${pts}</span>` : ''}
    ${phLine ? `<p class="phl">${phLine}</p>` : ''}
    <p>${explain(c)}</p>${tip}
    <button class="btn" id="nextBtn">${state.trust<=0 ? '局長室へ' : last ? '本日の勤務終了' : '次の訪問者'} <kbd>Enter</kbd></button>`;
  fb.hidden = false;
  topbar();
  if(kind==='bad') restartAnim($('tTrust'), 'hit');
  $('nextBtn').addEventListener('click', advance);
  $('nextBtn').focus({preventScroll:true});
  if(state.tut){ $('nextBtn').firstChild!.textContent = last ? '訓練を終える ' : '次の訪問者 '; tutEvent('decide:' + choice); }
  if(window.innerWidth <= 1020) fb.scrollIntoView({block:'nearest', behavior:'smooth'});
}

export function advance(){
  const state = app.state;
  if(!state || state.phase!=='feedback') return;
  if(state.tut){
    tutHide();
    if(state.idx >= state.list.length){ state.phase = 'over'; tutEnd(); return; }
  }
  if(state.trust<=0){ finish(false); return; }
  const timeUp = performance.now() >= state.shiftEnd;
  if(state.idx >= state.list.length || timeUp){ endDay(timeUp && state.idx < state.list.length); return; }
  state.phase = 'loading';
  const av = $('avatarBox'); av.classList.remove('enter'); av.classList.add(state.leave || 'leaveR');
  $('fb').hidden = true;
  wait(430).then(() => { if(app.state && app.state.phase==='loading') nextCase(); });
  if(window.innerWidth <= 1020) window.scrollTo({top:0, behavior:'smooth'});
}

function endDay(timeUp: boolean){
  const state = app.state!;
  state.phase = 'notice';
  cancelAnimationFrame(shiftRaf);
  const d = state.day, st = state.dayStats;
  const left = Math.max(0, Math.round((state.shiftEnd - performance.now())/1000));
  const bonus = timeUp ? 0 : left*5;
  state.score += bonus;
  const isLast = d === DAYS.length-1;
  const chief = st.miss===0 ? '見事な仕事ぶりだ。明日も頼む。' : st.miss<=1 ? 'おおむね良好。油断するなよ。' : 'ミスが多いぞ。規則をよく読むように。';
  const ph = st.phCaught===st.phantoms ? 'ファントムの通報、助かった。足取りが少しずつ見えてきた。'
    : st.phCaught>0 ? 'ファントムを一部取り逃がしたようだ。User-Agent をよく見てくれ。'
    : 'どうやら今日もファントムが来ていたらしい…。User-Agent を確認しているか？';
  if(!isLast){
    const save: Save = {day:d+1, score:state.score, trust:state.trust, total:state.total, correct:state.correct, half:state.half, reports:state.reports, phantomsSeen:state.phantomsSeen, falseReports:state.falseReports};
    store.set(SAVE_KEY, save);
  }
  $('noticeBox').innerHTML = `<p class="from">DAY ${d+1}　勤務報告</p>
    <h2>${timeUp ? '終業時間になった' : '本日の審査完了'}</h2>
    <div class="stats">
      <div><b>${st.n}／${state.list.length}</b>審査した人数</div>
      <div><b>${st.ok}</b>完全正解</div>
      <div><b>${st.miss}</b>ミス</div>
      <div><b>${st.phCaught}／${st.phantoms}</b>ファントム通報</div>
      <div><b>+${(state.score - st.score0).toLocaleString()}</b>本日の得点${bonus ? `（早上がり +${bonus}）` : ''}</div>
    </div>
    <div id="vnSlot"></div>
    <div id="after" hidden>
      <div class="recap"><h3>本日の学び　EPISODE ${String(d+1).padStart(2,'0')}</h3><ul>${RECAP[d].pts.map(x => `<li>${x}</li>`).join('')}</ul><div class="rfoot"><span class="bk">${RECAP[d].ch}</span><button class="rbtn" data-learn="${d}">詳しく読む ▶</button></div></div>
      ${isLast ? '' : '<p class="best" style="color:var(--inkSub)">進み具合を保存しました。タイトル画面の「つづきから」で再開できます。</p>'}
      <button class="btn ink" id="goBtn">${isLast ? '最終日の結末へ' : `DAY ${d+2} へ`} <kbd>Enter</kbd></button>
    </div>`;
  show('notice');
  $('goBtn').addEventListener('click', () => { if(isLast) finish(true); else dayIntro(d+1); });
  const endLines: [ 'chief' | 'senpai', string ][] = [['chief', chief], ['chief', ph]];
  if(st.phCaught > 0) endLines.push(['senpai', pickOne(['通報ナイス！ User-Agent、ちゃんと見てたんだね。','ファントムの尻尾、つかめてきたね！'])]);
  else endLines.push(['senpai', 'ドンマイ。User-Agent の「数字まじりの綴り」がポイントだよ。']);
  runDialogue($('vnSlot'), endLines, () => revealAfter('goBtn'));
}

/** 6日間に登場するファントムの合計（DAY 1〜5 が1人ずつ、DAY 6 が2人） */
const TOTAL_PHANTOMS = 7;
function finish(survived: boolean){
  const state = app.state!;
  state.phase = 'over';
  cancelAnimationFrame(shiftRaf);
  store.del(SAVE_KEY);
  const acc = state.total ? state.correct/state.total : 0;
  const end = !survived ? ENDINGS.fired : state.reports >= 5 ? ENDINGS.arrest : state.reports >= 2 ? ENDINGS.escape : ENDINGS.unseen;
  let rank, name;
  if(!survived){ rank='C'; name='解雇…でも学びは残る'; }
  else if(acc>=.9 && state.reports>=5){ rank='S'; name='API入国審査局 長官候補'; }
  else if(acc>=.8){ rank='A'; name='主任審査官'; }
  else if(acc>=.6){ rank='B'; name='一人前の審査官'; }
  else { rank='C'; name='見習い審査官'; }
  const best = store.get<number>(BEST_KEY, 0), isBest = state.score > best;
  if(isBest) store.set(BEST_KEY, state.score);
  const misses = state.misses.slice(-12).map(m => {
    const c = m.c, truth = c.flaw ? FLAWS[c.flaw].nm : '問題なし（許可が正解）';
    const yours = m.choice==='OK' ? '許可' : `拒否：${FLAWS[m.choice].nm}`;
    return `<div class="miss">DAY ${m.day}　${c.ep.m} ${esc(c.ep.p)}（${esc(c.client.nm)}）<br>あなた：${yours}　正解：<b>${truth}</b><br>${explain(c)}</div>`;
  }).join('');
  $('noticeBox').innerHTML = `<p class="from">${survived ? '6日間の勤務を終えて' : '局長室に呼び出された'}</p>
    <h2>${end.t}</h2>
    <div id="vnSlot"></div>
    <div id="after" hidden>
    <div class="rank">${rank}</div>
    <p><b>${name}</b></p>
    <div class="stats">
      <div><b>${state.score.toLocaleString()}</b>スコア${isBest ? '（ハイスコア更新！）' : ''}</div>
      <div><b>${state.correct}／${state.total}</b>完全正解</div>
      <div><b>${Math.round(acc*100)}%</b>正答率</div>
      <div><b>${state.reports}／${survived ? TOTAL_PHANTOMS : state.phantomsSeen}</b>ファントム通報</div>
      <div><b>${state.falseReports}</b>誤通報</div>
    </div>
    <div class="row" style="margin-bottom:18px">
      <button class="btn ink" id="againBtn">もう一度はじめから</button>
      <button class="btn ghost" id="homeBtn" style="color:var(--ink); border-color:var(--inkSub)">タイトルへ</button>
    </div>
    ${misses ? `<p><b>見逃した訪問者のおさらい</b></p><div class="misslist">${misses}</div>` : '<p>ミスなし！トークン検証の勘所は完璧です。</p>'}
    </div>`;
  show('notice');
  $('againBtn').addEventListener('click', newGame);
  $('homeBtn').addEventListener('click', () => { stopDialogue(); app.state = null; refreshStart(); show('start'); });
  runDialogue($('vnSlot'), end.lines, () => revealAfter('againBtn'));
}

/* ===================== back to title ===================== */
export function askHome(){
  const d = $<HTMLDialogElement>('quitDlg');
  if(d.open) return;
  const state = app.state;
  let msg = 'タイトルに戻りますか？ 前日までの記録は、タイトルの「つづきから」で再開できます。';
  if(state && state.tut) msg = '訓練を中断して、タイトルに戻りますか？';
  else if(state && ['play','feedback','loading'].includes(state.phase)) msg = `DAY ${state.day+1} の勤務は途中で終わり、この日の審査結果は保存されません。前日までの記録は、タイトルの「つづきから」で再開できます。`;
  $('quitMsg').textContent = msg;
  if(state) state.pausedAt = performance.now();
  d.returnValue = '';
  d.showModal();
  $('quitCancel').focus();
}
function goHome(){
  cancelAnimationFrame(shiftRaf);
  tutHide();
  stopDialogue();
  stopCine();
  app.state = null;
  refreshStart();
  show('start');
  $('startBtn').focus();
}
export function initQuit(){
  const d = $<HTMLDialogElement>('quitDlg');
  d.addEventListener('close', () => {
    if(d.returnValue==='home'){ goHome(); return; }
    const state = app.state;
    if(state && state.pausedAt){
      const paused = performance.now() - state.pausedAt;
      if(isFinite(state.shiftEnd)) state.shiftEnd += paused;
      if(state.t0) state.t0 += paused;
      state.pausedAt = null;
    }
  });
  $('homeTop').addEventListener('click', askHome);
  $('homeNotice').addEventListener('click', askHome);
}
