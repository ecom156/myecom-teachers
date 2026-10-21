# www.myecom.net/teachers/

ECOM の講師募集サイト（Astro + Cloudflare Workers）。

- ページ: `src/content/pages/`（Markdown。`path` が `/teachers/` からの URL）
- 応募フォーム: `src/components/ApplyForm.astro` → `src/pages/teachers/api/apply.ts`（受信先へ送信し、応募者に自動返信）
- 問い合わせフォーム: `src/components/ContactForm.astro` → `src/pages/teachers/api/contact.ts`
- 旧 WordPress からの転送: `public/_redirects`

フォームには Cloudflare の Worker の「変数とシークレット」に次の設定が必要です。

| 名前 | 内容 |
|---|---|
| `TURNSTILE_SECRET_KEY` | Turnstile のシークレットキー（会社サイトと同じウィジェット） |
| `RESEND_API_KEY` | Resend の API キー（ecominc.co.jp を認証済みのアカウント） |
| `MAIL_TO` | 受信先。省略時 `rec@ecominc.co.jp` |

本番は Cloudflare の Worker ルート `www.myecom.net/teachers*` で配信し、それ以外の www.myecom.net はさくらのサーバーが応答します（DNS は www のみプロキシ、SSL/TLS は「フル」）。
main へのマージで Cloudflare Workers Builds が自動でビルド・公開します（Cloudflare の GitHub アプリにこのリポジトリへのアクセス権が必要）。

```sh
npm install
npm run dev     # http://localhost:4321/teachers/
npm run build
```
