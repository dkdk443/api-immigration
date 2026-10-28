export type SpriteKey = 'phone' | 'monitor' | 'server' | 'fridge' | 'robot' | 'chief' | 'senpai' | 'phantom';
export type CastKey = 'chief' | 'senpai' | 'fridge' | 'phantom';
export type ToolKey = 'LOUPE' | 'SCAN' | 'DPOP' | 'HASH';
export type JwtFlaw = 'ISS' | 'AUD' | 'ALG' | 'EXP' | 'KID' | 'SIG' | 'SCOPE' | 'TYP' | 'DPOP' | 'ROLE' | 'TENANT';
export type CodeFlaw = 'PKCE' | 'REDIRECT' | 'REUSE' | 'PLAIN';
export type FlawKey = JwtFlaw | CodeFlaw;
export type CaseKind = 'jwt' | 'code';
/** 判定：許可（OK）か、拒否の理由 */
export type Choice = 'OK' | FlawKey;
export type Verdict = 'good' | 'half' | 'bad';
export type Phase = 'notice' | 'loading' | 'play' | 'feedback' | 'over';
/** 会話の1行 */
export type Talk = [CastKey, string];
/** 演出の1行。話者 null はナレーション */
export type Line = [CastKey | null, string];

export interface Person { nm: string; sp: SpriteKey; c: string; lc: string }
export interface DayInfo { n: number; sec: number; col: string; title: string; sum: string }
export interface Tool { d: number; key: string; g: string; nm: string; desc: string }
export interface Flaw { d: number; k: CaseKind; nm: string; code: number }

export interface Client {
  nm: string;
  sp: SpriteKey;
  ua?: string;
  cid?: string;
  cb?: string;
  fridge?: boolean;
}

export interface Endpoint {
  m: string;
  p: string;
  s?: string;
  say?: string;
  tenant?: string;
  admin?: boolean;
  bank?: boolean;
}

/** 1人分の訪問者の設計図。buildDay が作り、makeCase が中身を作る */
export interface Spec {
  flaw: FlawKey | null;
  kind?: CaseKind;
  bank?: boolean;
  fridge?: boolean;
  phantom?: boolean;
  decoy?: boolean;
  say?: string;
}

interface CaseBase {
  flaw: FlawKey | null;
  now: number;
  ep: Endpoint;
  variant: string;
  client: Client;
  say: string;
  ua: string;
  phantom: boolean;
  fridge: boolean;
  decoy: boolean;
}

export interface Payload {
  iss: string;
  aud: string;
  sub: string;
  scope?: string;
  iat: number;
  exp: number;
  role?: string;
  tenant?: string;
  nonce?: string;
  email?: string;
}

export interface JwtCase extends CaseBase {
  kind: 'jwt';
  hdr: { alg: string; typ: string; kid: string };
  pay: Payload;
  sig: string;
  sigOk: boolean;
  jkt: string | null;
  reqJkt: string | null;
}

export interface CodeCase extends CaseBase {
  kind: 'code';
  req: { grant_type: string; client_id: string; code: string; redirect_uri: string; code_verifier: string };
  led: { client_id: string; redirect_uri: string; code_challenge: string; method: string; status: string; code: string };
}

export type Case = JwtCase | CodeCase;
/** 訪問者ごとの見た目（client など）を付ける前の、トークンの中身だけ */
export type CaseCore<C extends Case> = Omit<C, 'client' | 'say' | 'ua' | 'phantom' | 'fridge' | 'decoy'>;

export interface Row { key: string; label: string; val: string; rule: string; tool?: ToolKey | null }
export type Mark = 'ok' | 'ng';

export interface DayStats { ok: number; n: number; miss: number; score0: number; rep: number; phantoms: number; phCaught: number }
export interface Miss { c: Case; choice: Choice; day: number }

/** localStorage に保存する進み具合 */
export interface Save {
  day: number;
  score: number;
  trust: number;
  total: number;
  correct: number;
  half: number;
  reports: number;
  phantomsSeen: number;
  falseReports: number;
}

export interface TutStep { t: string; who: CastKey; text: string; wait: string }
export interface TutCase { make(): JwtCase; steps: TutStep[] }

export interface Typer { readonly done: boolean; finish(): void }

export interface GameState extends Save {
  list: Spec[];
  idx: number;
  misses: Miss[];
  phase: Phase;
  clock: number;
  dayStats: DayStats;
  shiftLen: number;
  shiftEnd: number;
  cur: Case | null;
  used: Partial<Record<ToolKey, boolean>>;
  t0: number;
  rows: Row[];
  marks: Partial<Record<string, Mark>>;
  report: boolean;
  sayTyper: Typer | null;
  leave: string;
  pausedAt: number | null;
  tut: { cases: TutCase[]; step: number; fromStory: boolean } | null;
}
