import { ALL_SCOPES, AUD, BANK_EPS, CLIENTS, CODE_FL, DAYS, DECOY_UA, FLAWS, FRIDGE, FRIDGE_SCRIPT, ISS, JWT_FL, PHANTOM_UA, kidsFor } from '../data/world';
import type { Case, CaseCore, Client, CodeCase, Endpoint, FlawKey, JwtCase, Spec } from '../types';
import { b64, hhmm, pickOne, rnd, s256, shuffle, thumb } from '../lib/util';

/* ===================== case generation ===================== */
function endpointsFor(day: number){
  const t = () => `t-0${rnd(1,9)}`;
  const list: Endpoint[] = [];
  if(day >= 5){
    const t1 = t(), t2 = t();
    list.push({m:'GET', p:`/tenants/${t1}/orders/1042`, s:'orders:read', tenant:t1, say:'注文の中身を見せてください'});
    list.push({m:'POST', p:`/tenants/${t2}/orders`, s:'orders:write', tenant:t2, say:'新しい注文を作りたいです'});
  } else {
    list.push({m:'GET', p:'/orders/1042', s:'orders:read', say:'注文の中身を見せてください'});
    list.push({m:'POST', p:'/orders', s:'orders:write', say:'新しい注文を作りたいです'});
  }
  list.push({m:'GET', p:'/users/me', s:'profile:read', say:'自分のプロフィールを取りに来ました'});
  list.push({m:'PATCH', p:'/users/me', s:'profile:write', say:'ニックネームを変更したいです'});
  list.push({m:'DELETE', p:'/admin/users/88', s:'admin:users', admin:true, say:'規約違反のユーザーを削除します'});
  return list;
}
function chooseEp(day: number, spec: Spec): Endpoint {
  const eps = endpointsFor(day);
  const f = spec.flaw;
  if(spec.bank) return pickOne(BANK_EPS);
  if(f==='ROLE') return eps.find(e => e.admin)!;
  if(f==='TENANT') return pickOne(eps.filter(e => e.tenant));
  if(spec.fridge) return eps.find(e => e.m==='POST')!;
  if(day >= 6 && f===null && Math.random() < .35) return pickOne(BANK_EPS);
  if(f==='TYP') return pickOne(eps.filter(e => !e.admin));
  return pickOne(eps);
}

function makeJwt(day: number, spec: Spec, now: number): CaseCore<JwtCase> {
  const flaw = spec.flaw;
  const ep = chooseEp(day, spec);
  const kids = kidsFor(day);
  const extra = ALL_SCOPES.filter(s => s!==ep.s);
  const scopes = new Set([ep.s!]); if(Math.random() < .6) scopes.add(pickOne(extra));
  const iat = now - rnd(4, 30);
  const c: CaseCore<JwtCase> = {
    kind:'jwt', flaw, ep, now,
    hdr:{alg: ep.bank ? pickOne(['PS256','ES256']) : 'RS256', typ:'at+jwt', kid:pickOne(kids)},
    pay:{iss:ISS, aud:AUD, sub:`user_${rnd(10,99)}`, scope:[...scopes].join(' '), iat, exp:iat + 60},
    sig:b64(30), sigOk:true, jkt:null, reqJkt:null, variant:''
  };
  if(day >= 5){ c.pay.role = ep.admin ? 'admin' : pickOne(['member','member','admin']); c.pay.tenant = ep.tenant || `t-0${rnd(1,9)}`; }
  if(day >= 3 && (ep.bank || Math.random() < .6)){ c.jkt = thumb(); c.reqJkt = c.jkt; }
  switch(flaw){
    case 'ISS': c.pay.iss = pickOne(['https://auth.examp1e.com','https://auth.example.com.evil.net','https://login.other-idp.net','http://auth.example.com','https://auth-example.com']); break;
    case 'AUD': c.pay.aud = pickOne(['https://admin.example.com','https://api.partner-shop.net','https://api.example.org','https://api.example.com.attacker.io']); break;
    case 'ALG':
      if(ep.bank){ c.hdr.alg = 'RS256'; c.variant = 'bank'; }
      else if(Math.random() < .5){ c.hdr.alg = 'none'; c.sig = ''; c.variant = 'none'; }
      else { c.hdr.alg = 'HS256'; c.variant = 'hs'; }
      break;
    case 'EXP': c.pay.exp = now - pickOne([rnd(1,4), rnd(10,90)]); c.pay.iat = c.pay.exp - 60; break;
    case 'KID': c.hdr.kid = day >= 5 && Math.random() < .55 ? 'key-2026-a' : pickOne(['key-2023-old','attacker-key','kid-0000']); c.variant = c.hdr.kid==='key-2026-a' ? 'rotated' : ''; break;
    case 'SIG': c.sigOk = false; break;
    case 'SCOPE': {
      let sc = ep.s==='orders:write' ? 'orders:read' : ep.s==='profile:write' ? 'profile:read' : pickOne(extra);
      if(ep.admin) sc = 'profile:read orders:read';
      c.pay.scope = sc;
      if(ep.admin && c.pay.role) c.pay.role = 'admin';
      break;
    }
    case 'TYP': c.hdr.typ = 'JWT'; c.pay.nonce = 'n-' + b64(6); c.pay.email = 'neko@example.com'; delete c.pay.scope; c.jkt = null; c.reqJkt = null; break;
    case 'DPOP':
      if(ep.bank && Math.random() < .5){ c.jkt = null; c.reqJkt = thumb(); c.variant = 'nobind'; }
      else { if(!c.jkt){ c.jkt = thumb(); } let t = thumb(); while(t===c.jkt) t = thumb(); c.reqJkt = t; c.variant = 'mismatch'; }
      break;
    case 'ROLE': c.pay.role = 'member'; break;
    case 'TENANT': { let t = `t-0${rnd(1,9)}`; while(t===ep.tenant) t = `t-0${rnd(1,9)}`; c.pay.tenant = t; break; }
  }
  return c;
}

async function makeCode(spec: Spec, client: Client, now: number): Promise<CaseCore<CodeCase>> {
  const flaw = spec.flaw;
  const verifier = b64(43);
  const code = 'c_' + b64(12);
  const cid = client.cid!, cb = client.cb!;
  const c: CaseCore<CodeCase> = {
    kind:'code', flaw, now,
    ep:{m:'POST', p:'/oauth/token', say:'認可コードをトークンに交換したいです'},
    req:{grant_type:'authorization_code', client_id:cid, code, redirect_uri:cb, code_verifier:verifier},
    led:{client_id:cid, redirect_uri:cb, code_challenge:await s256(verifier), method:'S256', status:`未使用（${hhmm(now - rnd(1,4))} 発行）`, code},
    variant:''
  };
  switch(flaw){
    case 'PKCE': c.req.code_verifier = b64(43); break;
    case 'REDIRECT': {
      const opts = cb.startsWith('https://')
        ? [cb.replace('https://', 'http://'), cb.replace('.example.', '.examp1e.'), cb.replace(/(https:\/\/[^/]+)/, '$1.evil.net'), cb + '/../../steal']
        : [cb.replace(':/', '.evil:/'), 'https://evil.example.net/cb'];
      c.req.redirect_uri = pickOne(opts.filter(x => x!==cb));
      break;
    }
    case 'REUSE': c.led.status = `使用済み（${hhmm(now - rnd(2,30))} に交換）`; break;
    case 'PLAIN': c.led.method = 'plain'; c.led.code_challenge = verifier; break;
  }
  return c;
}

/** その日の訪問者の並び。新しい手口・正しい訪問者・冷蔵庫・ファントム・まぎらわしいUAを必ず含める */
export function buildDay(d: number): Spec[] {
  const day = d+1, n = DAYS[d].n;
  const all: FlawKey[] = [...JWT_FL, ...CODE_FL];
  const fl = all.filter(f => FLAWS[f].d <= day);
  const fresh = all.filter(f => FLAWS[f].d === day);
  const specs: Spec[] = fresh.map(f => ({flaw:f}));
  if(day===6){ specs.push({flaw:'ALG', bank:true}); specs.push({flaw:'DPOP', bank:true}); }
  const valid = day===1 ? 2 : 3;
  for(let i=0;i<valid;i++) specs.push({flaw:null});
  const fs = FRIDGE_SCRIPT[d];
  specs.push({flaw:fs.flaw, fridge:true, say:fs.say, bank:!!fs.bank, kind:fs.kind});
  const phantoms = day===6 ? 2 : 1;
  for(let i=0;i<phantoms;i++) specs.push({flaw:pickOne(fl.filter(f => f!=='REUSE')), phantom:true});
  if(day >= 3) specs.push({flaw:null, decoy:true});
  while(specs.length < n) specs.push({flaw:pickOne(fl)});
  while(specs.length > n){ const i = specs.findIndex(s => !s.fridge && !s.phantom && !s.decoy && s.flaw!==null && !fresh.includes(s.flaw)); if(i<0) break; specs.splice(i,1); }
  return shuffle(specs).map(s => {
    if(s.kind) return s;
    if(s.flaw) s.kind = FLAWS[s.flaw].k;
    else s.kind = (day >= 4 && !s.bank && Math.random() < .3) ? 'code' : 'jwt';
    return s;
  });
}

export async function makeCase(day: number, spec: Spec, now: number): Promise<Case> {
  const client: Client = spec.fridge ? FRIDGE : pickOne(CLIENTS);
  const core = spec.kind==='code' ? await makeCode(spec, client, now) : makeJwt(day, spec, now);
  return {
    ...core,
    client,
    say: spec.say || core.ep.say || '',
    ua: spec.phantom ? pickOne(PHANTOM_UA) : spec.decoy ? pickOne(DECOY_UA) : client.ua!,
    phantom: !!spec.phantom, fridge: !!spec.fridge, decoy: !!spec.decoy
  };
}

/* ===================== explanations ===================== */
export function explain(c: Case): string {
  if(c.flaw===null) return c.kind==='code'
    ? '台帳の記録と一致し、PKCEの検証も通りました。トークンを発行して問題ありません。'
    : c.ep.bank ? '金融APIの条件（PS256／ES256、送信者制約）も含めて、すべて規則どおりです。'
    : 'すべての項目が規則どおりの、正しいトークンでした。正規の利用者を追い返すと、サービスが使えなくなってしまいます。';
  if(c.kind==='code') switch(c.flaw){
    case 'PKCE': return 'code_verifier を SHA-256 で計算した値が、認可時に記録された code_challenge と一致しません。認可コードを盗んだ別人が交換しに来た可能性があります。PKCEはこれを防ぐ仕組みです（400 invalid_grant）。';
    case 'REDIRECT': return `redirect_uri（${c.req.redirect_uri}）が、認可時に記録されたものと一致しません。攻撃者のサイトへトークンを流そうとしている可能性があります。完全一致で確認します（400 invalid_grant）。`;
    case 'REUSE': return '認可コードは1回しか使えません。台帳ではすでに交換済みです。同じコードの再利用は、コードが盗まれているサインです（400 invalid_grant）。';
    case 'PLAIN': return 'code_challenge_method が plain です。plain では code_challenge が検証コードそのものなので、盗み見られると防げません。この局では S256 だけを許可しています（400）。';
    default: return '';
  }
  const p = c.pay;
  switch(c.flaw){
    case 'ISS': return `iss（${p.iss}）が信頼している発行者と一致しません。似たドメインや http に注意。発行者は文字列の完全一致で確認します（401）。`;
    case 'AUD': return `aud（${p.aud}）がこのAPI宛てではありません。別のAPI向けのトークンを使い回させないため、宛先は必ず確認します（401）。`;
    case 'ALG':
      if(c.variant==='bank') return '金融API（/bank/*）では、FAPI 2.0 の考え方に沿って PS256 か ES256 だけを許可しています。一般APIで使っている RS256 でも、金融APIでは受け付けません（401）。';
      if(c.variant==='none') return 'alg が none、つまり署名のないトークンです。誰でも自由に作れてしまうので受け付けません。許可するアルゴリズムはサーバー側で固定します（401）。';
      return 'このAPIが許可しているのは RS256 だけです。トークンに書かれた alg を信じて検証方法を切り替えると、公開鍵を共通鍵として悪用される「アルゴリズム混同」攻撃につながります（401）。';
    case 'EXP': return `exp（${hhmm(p.exp)}）が現在時刻（${hhmm(c.now)}）より前で、期限切れです。署名が正しくても、期限切れのトークンは受け付けません（401）。`;
    case 'KID': return c.variant==='rotated'
      ? 'key-2026-a は本日の鍵ローテーションで失効しました。昨日まで有効だった鍵でも、信頼する鍵の一覧（JWKS）から外れたら受け付けません（401）。'
      : `kid（${c.hdr.kid}）が、信頼する鍵の一覧（JWKS）にありません。知らない鍵で署名されたトークンは検証できないので拒否します（401）。`;
    case 'SIG': return '署名スキャナーで照合すると、署名が一致しません。中身が書き換えられています。見た目の項目がすべて正しくても、署名の検証は省略できません（401）。';
    case 'SCOPE': return `トークン自体は有効ですが、${c.ep.m} ${c.ep.p} に必要なスコープ「${c.ep.s}」がありません。本人確認はできていて権限だけが足りないので、401ではなく403です。`;
    case 'TYP': return 'これはIDトークンです（typ が JWT で、nonce や email を含み、scope がない）。IDトークンはログインした本人の情報をクライアントに伝えるためのもので、APIを呼ぶときはアクセストークン（typ: at+jwt）を使います（401）。';
    case 'DPOP': return c.variant==='nobind'
      ? '金融APIでは、トークンが送信者に結び付けられていること（送信者制約）が必須です。cnf のないトークンは、盗まれたらそのまま使われてしまいます（401）。'
      : `トークンに結び付けられた鍵（cnf.jkt: ${c.jkt}）と、訪問者がDPoPで示した鍵（${c.reqJkt}）が一致しません。漏洩したトークンを別人が使っている可能性があります（401）。`;
    case 'ROLE': return 'DELETE /admin/users/88 は、管理者ロール（admin）のユーザーだけが使える機能です。スコープはあってもユーザーのロールが member なので403です。スコープは「アプリに許された範囲」、ロールは「ユーザーの役割」で、別々に確認します（RBAC）。';
    case 'TENANT': return `リクエスト先はテナント ${c.ep.tenant} のデータですが、トークンの tenant は ${p.tenant} です。ユーザーとリソースの属性を突き合わせて判断する（ABAC）ことで、他テナントへのアクセスを防ぎます（403）。`;
    default: return '';
  }
}
/** 照合表の行と、その行が根拠になる手口 */
export const ROW_FLAW: Record<string, FlawKey> = {iss:'ISS', aud:'AUD', alg:'ALG', typ:'TYP', kid:'KID', sig:'SIG', scope:'SCOPE', role:'ROLE', tenant:'TENANT', exp:'EXP', cnf:'DPOP', redirect:'REDIRECT', pkce:'PKCE', method:'PLAIN', status:'REUSE'};
export const FLAW_ROW = Object.fromEntries(Object.entries(ROW_FLAW).map(([k, v]) => [v, k])) as Record<FlawKey, string>;
