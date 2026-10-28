import type { CastKey, Client, CodeFlaw, DayInfo, Endpoint, Flaw, FlawKey, JwtFlaw, Person, ToolKey, Tool, CaseKind } from '../types';

export const ISS = 'https://auth.example.com', AUD = 'https://api.example.com';
export const kidsFor = (day: number) => day >= 5 ? ['key-2026-b','key-2026-c'] : ['key-2026-a','key-2026-b'];
export const KEYS = '1234567890-';
export const MAX_TRUST = 5;
export const CAST: Record<CastKey, Person> = {
  chief:{nm:'鷹野局長', sp:'chief', c:'#2A4D9A', lc:'#8FB4FF'},
  senpai:{nm:'ミナト先輩', sp:'senpai', c:'#2E7D4F', lc:'#7FD6A2'},
  fridge:{nm:'レイゾウ', sp:'fridge', c:'#3B8FA8', lc:'#6FD0EA'},
  phantom:{nm:'ファントム', sp:'phantom', c:'#7A4FD6', lc:'#B48CFF'}
};
export const DAYS: DayInfo[] = [
  {n:8,  sec:200, col:'#7FD6A2', title:'着任', sum:'iss・aud・alg・exp の基本4項目'},
  {n:8,  sec:200, col:'#E8B53A', title:'偽造トークン', sum:'鍵（kid）・署名・スコープ。署名スキャナー支給'},
  {n:9,  sec:210, col:'#8FB4FF', title:'大量漏洩事件', sum:'IDトークンの持ち込みとDPoP。DPoP尋問を解禁'},
  {n:10, sec:230, col:'#FF9E7A', title:'交換窓口の兼務', sum:'認可コード交換とPKCE。ハッシュ計算機を支給'},
  {n:10, sec:220, col:'#C9A2FF', title:'鍵の世代交代', sum:'鍵ローテーション、ロール（RBAC）とテナント（ABAC）'},
  {n:10, sec:230, col:'#FFD36A', title:'金融パートナー開通', sum:'FAPI：金融APIは PS256／ES256 と送信者制約が必須'}
];
export const LOGLINE = ['新人審査官、着任。最初の訪問者がやってくる。','見た目は本物。中身は偽物。','盗まれたトークンが、窓口に押し寄せる。','認可コードを狙う、横取りの影。','昨日の鍵は、今日の鍵ではない。','ファントム、最後の大勝負。'];
export const TOOLS: Record<ToolKey, Tool> = {
  LOUPE:{d:1, key:'L', g:'◎', nm:'照合ルーペ', desc:'URLや識別子を規則・台帳と1文字ずつ比べる'},
  SCAN:{d:2, key:'S', g:'▣', nm:'署名スキャナー', desc:'信頼する鍵で署名を照合し、改ざんを見つける'},
  DPOP:{d:3, key:'D', g:'？', nm:'DPoP尋問', desc:'訪問者に鍵の証明を出させ、指紋を確認する'},
  HASH:{d:4, key:'H', g:'＃', nm:'ハッシュ計算機', desc:'code_verifier を SHA-256 で計算する（本物）'}
};
export const TORDER: ToolKey[] = ['LOUPE','SCAN','DPOP','HASH'];
export const FLAWS: Record<FlawKey, Flaw> = {
  ISS:{d:1, k:'jwt', nm:'発行者が違う', code:401},
  AUD:{d:1, k:'jwt', nm:'宛先が違う', code:401},
  ALG:{d:1, k:'jwt', nm:'アルゴリズム違反', code:401},
  EXP:{d:1, k:'jwt', nm:'有効期限切れ', code:401},
  KID:{d:2, k:'jwt', nm:'信頼していない鍵', code:401},
  SIG:{d:2, k:'jwt', nm:'署名が不正', code:401},
  SCOPE:{d:2, k:'jwt', nm:'スコープ不足', code:403},
  TYP:{d:3, k:'jwt', nm:'トークンの種類違い', code:401},
  DPOP:{d:3, k:'jwt', nm:'持ち主を確認できない', code:401},
  ROLE:{d:5, k:'jwt', nm:'ロール不足', code:403},
  TENANT:{d:5, k:'jwt', nm:'テナント違い', code:403},
  PKCE:{d:4, k:'code', nm:'PKCEの検証失敗', code:400},
  REDIRECT:{d:4, k:'code', nm:'リダイレクト先が違う', code:400},
  REUSE:{d:4, k:'code', nm:'使用済みのコード', code:400},
  PLAIN:{d:4, k:'code', nm:'plain方式', code:400}
};
export const JWT_FL: JwtFlaw[] = ['ISS','AUD','ALG','EXP','KID','SIG','SCOPE','TYP','DPOP','ROLE','TENANT'];
export const CODE_FL: CodeFlaw[] = ['PKCE','REDIRECT','REUSE','PLAIN'];
export const ALL_SCOPES = ['orders:read','orders:write','profile:read','profile:write'];
export const CLIENTS: Required<Omit<Client, 'fridge'>>[] = [
  {nm:'モバイルアプリ', sp:'phone', ua:'ShopApp/3.2 (iOS 18)', cid:'shop-mobile', cb:'com.example.shop:/oauth/cb'},
  {nm:'Webフロント', sp:'monitor', ua:'Mozilla/5.0 (Macintosh) Chrome/130', cid:'web-front', cb:'https://app.example.com/callback'},
  {nm:'パートナー社のバッチ', sp:'server', ua:'PartnerBatch/1.4', cid:'partner-batch', cb:'https://partner.example.net/cb'},
  {nm:'社内ダッシュボード', sp:'monitor', ua:'Mozilla/5.0 (Windows) Edge/130', cid:'ops-dashboard', cb:'https://ops.example.com/oauth/cb'},
  {nm:'自動化スクリプト', sp:'robot', ua:'curl/8.4.0', cid:'auto-runner', cb:'https://runner.example.com/cb'}
];
export const FRIDGE = {nm:'IoT冷蔵庫レイゾウ', sp:'fridge', ua:'FridgeOS/2.0 (Reizo)', cid:'fridge-iot', cb:'https://fridge.example.com/cb', fridge:true} as const satisfies Client;
export const PHANTOM_UA = ['ShopApp/3.2 (iOS 18) ph4nt0m', 'Mozilla/5.0 Ph4ntom-Kit/0.9', 'curl/8.4.0 ph4nt0m-run', 'PartnerBatch/1.4 +ph4nt', 'Mozilla/5.0 (Windows) PH4NT0M'];
export const DECOY_UA = ['Mozilla/5.0 PhantomJS/2.1.1', 'PhantomWallet/1.0 (Android)'];
export const FRIDGE_SCRIPT: {flaw: FlawKey | null; say: string; kind?: CaseKind; bank?: boolean}[] = [
  {flaw:null, say:'牛乳が切れたので注文します！'},
  {flaw:null, say:'卵も追加で注文させてください！'},
  {flaw:'EXP', say:'すみません、さっきまで再起動してて…'},
  {flaw:null, kind:'code', say:'スマホアプリと連携したいです！'},
  {flaw:'TENANT', say:'となりの家の冷蔵庫の分も注文してあげます！'},
  {flaw:null, bank:true, say:'ついに銀行振込に対応しました！'}
];
export const BANK_EPS: Endpoint[] = [
  {m:'POST', p:'/bank/transfers', s:'payments:write', bank:true, say:'振込を実行したいです'},
  {m:'GET', p:'/bank/accounts/me', s:'accounts:read', bank:true, say:'口座残高を確認したいです'}
];
