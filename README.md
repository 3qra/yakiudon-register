# 焼うどん売上レジ

焼うどん（1食400円）が売れたらボタンを押すだけで、日時つきで売上を記録するWebアプリです。
Cloudflare Workers（無料枠）で動き、記録は Cloudflare D1（データベース）に保存されます。

- 「売れた！」で +400円、「返品」で −400円を記録（時刻はサーバー側で付けます）
- その日の総額・販売数・返品数を表示。日付を切り替えて過去の日も見られます
- 押し間違いは「取消」で削除
- 日別の売上一覧、CSV書き出し（Excelで開けます）
- パスコードなしで、URLを開けばすぐ使えます（URLを知っている人は誰でも押せます）
- 複数のスマホで同時に使っても、15秒ごとに揃います

## サーバーを立てる

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/3qra/yakiudon-register)

1. 上のボタンを押し、Cloudflare にログイン（アカウントがなければ無料で作成）
2. GitHub と連携し、リポジトリ名・データベース名はそのままでOK
3. 「Create and deploy」を押す
4. 表示された `https://yakiudon-register.<あなたのサブドメイン>.workers.dev` をスマホで開き、ホーム画面に追加

あとからパスコードを付けたくなったら、Cloudflare の管理画面 → Workers → yakiudon-register → Settings → Variables and Secrets で、シークレット `PASSCODE` を追加します。

## 手元で動かす

```sh
npm install
npm run dev    # http://localhost:8787
```

## API

`PASSCODE` を設定した場合だけ、`x-passcode` ヘッダーが必要になります。

| メソッド | パス | 内容 |
| --- | --- | --- |
| GET | `/api/sales?day=YYYY-MM-DD` | その日の記録と合計 |
| POST | `/api/sales` `{"type":"sale"\|"refund"}` | 販売・返品を記録 |
| DELETE | `/api/sales/:id` | 記録の取消 |
| GET | `/api/days` | 日別の合計（直近60日） |
| GET | `/api/export.csv?day=YYYY-MM-DD` | CSV（`day` 省略で全期間） |

日付はすべて日本時間で区切ります。
