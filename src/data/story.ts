import { esc } from '../lib/util';
import type { Line, Talk } from '../types';

export interface Intro { news: [string, string]; lines: Talk[]; items: [string, string][] }
export interface Scene { scene: 'log' | 'phantom' | 'chief' | 'title'; text?: string; stamp?: string; lines: Line[] }

/* 毎朝の通達。DAYS と同じ並び */
export const INTRO: Intro[] = [
  {news:['API入国審査局、新人審査官を迎える','本日より6日間の試用勤務'],
   lines:[['chief','よく来てくれた。ここではAPIにやってくる訪問者のトークンを審査してもらう。まずは基本の4項目からだ。'],
          ['senpai','似たドメインには気をつけてね。「l（エル）」と「1（いち）」なんて、パッと見じゃ分からないから。迷ったら照合ルーペ！'],
          ['chief','それと、最近「ファントム」と呼ばれる攻撃者が出没している。User-Agent に妙な綴りを残す癖があるそうだ。見つけたら通報してくれ。']],
   items:[['iss と aud','発行者と宛先が規則と完全一致しているか'],['alg は RS256 だけ','none や HS256 は受け付けない'],['exp','現在時刻より前なら期限切れ']]},
  {news:['他局で偽造トークン、見逃し相次ぐ','中身を書き換えた手口。見た目は本物そっくり'],
   lines:[['chief','偽造トークンの被害が出た。本日から署名スキャナーを支給する。'],
          ['senpai','スキャナーは使うたびにちょっと時間がかかるけど、改ざんは目では見つけられないの。怪しくなくても照合してみて。']],
   items:[['kid','信頼する鍵の一覧にない鍵は拒否'],['署名スキャナー','改ざんされたトークンを見つける'],['スコープ','エンドポイントごとに必要なスコープ。足りなければ403']]},
  {news:['大量のトークン漏洩事件が発生','盗まれたトークンが出回っている恐れ'],
   lines:[['chief','大事件だ。大量のトークンが漏洩した。本日からDPoPで「持ち主」を確かめる。'],
          ['senpai','cnf.jkt がついたトークンは、持ち主の鍵と結び付いてるの。DPoP尋問で訪問者に鍵を見せてもらって、指紋が一致するか見てね。'],
          ['senpai','それから、ログイン用のIDトークンをそのまま持ってくる人もいるみたい。typ を見れば分かるよ。']],
   items:[['typ','at+jwt 以外（IDトークンなど）は拒否'],['DPoP尋問','cnf.jkt と、訪問者が示した鍵の指紋を比べる']]},
  {news:['審査局、トークン交換窓口を統合','認可コードの横取り対策が急務に'],
   lines:[['chief','本日からトークン交換窓口も兼務してもらう。認可コードをトークンに交換しに来る訪問者だ。'],
          ['senpai','交換リクエストと、局の認可記録台帳を見比べてね。ハッシュ計算機は本物のSHA-256だよ。code_verifier を計算して、台帳の code_challenge と同じならOK。']],
   items:[['PKCE','S256(code_verifier) が台帳の code_challenge と一致'],['redirect_uri','台帳と完全一致'],['使い回し','使用済みのコードは拒否'],['方式','plain は不可、S256 のみ']]},
  {news:['署名鍵を定期交換、key-2026-a は失効','あわせてマルチテナント化を開始'],
   lines:[['chief','鍵のローテーションを行った。key-2026-a は今日から使えない。昨日の感覚で通さないように。'],
          ['senpai','今日から管理者機能はロールも確認するよ。それと、テナントごとにデータが分かれたから、tenant とURLのテナントが一致してるかも見てね。']],
   items:[['鍵ローテーション','key-2026-a は失効、key-2026-c が新しく追加'],['ロール（RBAC）','管理者機能は role が admin のときだけ'],['テナント（ABAC）','トークンの tenant とURLのテナントが一致']]},
  {news:['金融パートナーとの接続が本日開通','FAPI準拠の厳格な審査を導入'],
   lines:[['chief','最終日だ。本日から金融APIの審査も担当してもらう。金融APIは規則が厳しいぞ。'],
          ['senpai','/bank/ で始まるリクエストは、PS256 か ES256 の署名と、cnf（送信者制約）が必須だよ。'],
          ['chief','情報によると、ファントムは今日、大きな仕掛けを打ってくるらしい。頼んだぞ。']],
   items:[['金融APIのアルゴリズム','PS256 か ES256 のみ（RS256 は不可）'],['送信者制約','金融APIは cnf.jkt 必須。DPoPの鍵と一致すること']]}
];

/* プロローグ冒頭で流れる、不正アクセスのログ */
export function logLines(){
  const L: [string, string][] = [
    ['', 'GET /orders/1043 　user_42 → 200 OK（他人の注文）'], ['hot', '!! BOLA　オブジェクトの持ち主を確認していない'],
    ['', 'PATCH /users/me 　{"is_admin": true} → 200 OK'], ['warn', '!! トークン alg: none を受理'],
    ['', 'POST /login 　×38,000 / 10分'], ['hot', '!! 期限切れトークンでアクセス成功'],
    ['', 'GET /v1/users/42/full 　→ 200 OK（廃止予定のAPI）'], ['warn', '!! aud が別APIのトークンを受理'],
    ['', 'DELETE /admin/users/all 　role: member → 200 OK'], ['hot', '!! 盗まれたトークンの再利用を検知']
  ];
  const one = L.map(([c, s], i) => `<div class="${c}">[02:${String(13 + i).padStart(2,'0')}:${String(i*7 % 60).padStart(2,'0')}] ${esc(s)}</div>`).join('');
  return one + one + one + one;
}

export const PROLOGUE: Scene[] = [
  {scene:'log', lines:[[null,'2026年。APIを狙う攻撃は、静かに、確実に増えていた。'],[null,'他人の注文。偽物の管理者。盗まれたトークン。'],[null,'鍵を確かめない門は、開いているのと同じだった。']]},
  {scene:'phantom', lines:[['phantom','……今夜も見つけた。トークンをろくに確かめないAPIを。'],['phantom','トークンを確かめない門番など、いないのと同じだ。']]},
  {scene:'chief', lines:[['chief','聞こえるか、新人。ファントムが動いた。'],['chief','君の配属先は API入国審査局。トークンという名のパスポートを見抜くのが仕事だ。'],['chief','本番の前に、訓練シミュレーションを受けてもらう。']]},
  {scene:'title', text:'API入国審査局', stamp:'訓練開始', lines:[['senpai','ミナトです。訓練は私が案内するね。一緒にがんばろう！']]}
];
export const EPILOGUE: Scene[] = [
  {scene:'phantom', lines:[['phantom','……面白い。訓練くらいは、やり遂げたか。'],['phantom','本番で会おう、新人。']]},
  {scene:'chief', lines:[['chief','訓練は合格だ。よくやった。'],['chief','明日から本番だ。ファントムは必ずまた来る。頼んだぞ。']]},
  {scene:'title', text:'DAY 1', stamp:'着任', lines:[[null,'こうして、6日間の勤務が始まった。']]}
];

/* 結末。finish() が選ぶ */
export const ENDINGS: Record<'fired' | 'arrest' | 'escape' | 'unseen', {t: string; lines: Talk[]}> = {
  fired:{t:'解雇エンド', lines:[['chief','残念だが、これ以上は任せられない。…だが、ここで学んだことは無駄にはならないはずだ。'],['senpai','また一緒に働けるの、待ってるからね。']]},
  arrest:{t:'ファントム逮捕エンド', lines:[['chief','君の通報記録が決め手になった。ファントムは今朝、身柄を確保された。'],['phantom','…まさか User-Agent から足がつくとはな。'],['senpai','すごいよ！ 本採用、おめでとう！']]},
  escape:{t:'ファントム逃走エンド', lines:[['chief','6日間ご苦労だった。ファントムはあと一歩のところで逃げられた。'],['senpai','でも通報のおかげで手口はかなり分かったよ。次は捕まえよう！']]},
  unseen:{t:'見えない侵入者エンド', lines:[['chief','審査そのものはよくやってくれた。だが、ファントムには最後まで気づけなかったようだな。'],['phantom','…ずっと、窓口の前にいたんだけどね。']]}
};
