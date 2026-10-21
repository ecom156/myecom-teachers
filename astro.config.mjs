// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// サイトは www.myecom.net/teachers/ 配下だけ。ページは src/pages/teachers/ に置き、
// 本番では Cloudflare の Worker ルート「www.myecom.net/teachers*」で配信する
export default defineConfig({
  site: 'https://www.myecom.net',
  // フォームの POST がスラッシュ付きへの転送で壊れないよう ignore にする
  trailingSlash: 'ignore',
  adapter: cloudflare(),
});
