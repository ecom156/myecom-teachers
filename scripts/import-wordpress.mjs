// WordPress (www.myecom.net/teachers/) から固定ページと画像を取り込む一回限りのスクリプト。
// 使い方: node scripts/import-wordpress.mjs <REST API の JSON と固定ページ HTML を置いたディレクトリ>
//   full_pages.json  … /teachers/wp-json/wp/v2/pages?per_page=100
//   html/<id>.html   … 固定ページの表示 HTML（WPBakery のショートコードが展開済みのもの）
import fs from 'node:fs';
import path from 'node:path';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

const SRC = process.argv[2];
const ROOT = path.resolve(import.meta.dirname, '..');
const ORIGIN = 'https://www.myecom.net';
// ブログ一覧（移行しない）、学校教員向け応募（廃止）、旧予約システムの埋め込みだけのページは取り込まない
const SKIP_PAGES = new Set(['blog', 'apply-school-teachers', 'teachers']);
// フォームを差し込むページ（本文中の Gravity Forms の位置に <!-- form --> を置く）
const FORMS = { form: 'apply', 'contact-form': 'contact' };

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(SRC, f), 'utf8'));
const decode = (s) => {
  const t = s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  return t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&hellip;/g, '…');
};
const yaml = (s) => JSON.stringify(s);

// 旧サイトの URL をサイト内のパスに直す
const OLD_HOSTS = /^https?:\/\/(www\.myecom\.net|myecom\.sakura\.ne\.jp\/wp\/www)(?=\/teachers)/;
const images = new Set();
const localize = (url) => {
  const u = url.replace(OLD_HOSTS, ORIGIN);
  if (!u.startsWith(`${ORIGIN}/teachers/wp-content/uploads/`)) return url;
  images.add(u);
  return u.slice(ORIGIN.length);
};

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });
td.use(gfm);
td.keep(['iframe']);
td.addRule('formMarker', {
  filter: (node) => node.nodeName === 'P' && node.textContent === '@@FORM@@',
  replacement: () => '\n\n<!-- form -->\n\n',
});
td.addRule('image', {
  filter: 'img',
  replacement: (_, node) => {
    // WordPress の遅延読み込みで src がダミー画像になっているので data-src を優先する
    const src = node.getAttribute('data-src') || node.getAttribute('src');
    if (!src || src.startsWith('data:')) return '';
    return `![${(node.getAttribute('alt') || '').replace(/[[\]]/g, '')}](${localize(src)})`;
  },
});
td.addRule('figcaption', {
  filter: 'figcaption',
  replacement: (content) => `\n\n*${content.trim()}*\n\n`,
});
// 旧サイトの時点で既にリンク切れだったページ（講師の動画レター）
const DEAD_LINK = /^\/teachers\/school_introduction\/professional-teachers\//;
// 廃止したページへのリンクの張り替え先
const RELINK = { '/teachers/apply-school-teachers/': '/teachers/form/' };
td.addRule('internalLink', {
  filter: (node) => node.nodeName === 'A' && OLD_HOSTS.test(node.getAttribute('href') || ''),
  replacement: (content, node) => {
    let href = node.getAttribute('href').replace(OLD_HOSTS, '');
    if (DEAD_LINK.test(href)) return '';
    href = RELINK[href] ?? href;
    return `[${content}](${href.startsWith('/teachers/wp-content/uploads/') ? localize(ORIGIN + href) : decodeURI(href)})`;
  },
});
// WPBakery の表をそのまま HTML で残すので、装飾用のクラスと空行を落とす
const cleanTables = (html) =>
  html.replace(/<table[\s\S]*?<\/table>/g, (t) =>
    t.replace(/<span class="vc_table_content">([\s\S]*?)<\/span>/g, '$1')
      .replace(/ class="[^"]*"/g, '')
      .replace(/<tr>(\s*<td>\s*<\/td>)+\s*<\/tr>/g, ''));
const toMarkdown = (html) =>
  td.turndown(cleanTables(html).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<noscript[\s\S]*?<\/noscript>/g, ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim() + '\n';

// Gravity Forms のマークアップ一式を目印に置き換える
const replaceForm = (html) => {
  const start = html.indexOf("<div class='gf_browser");
  if (start < 0) return html;
  let end = html.indexOf('</form>', start);
  end = html.indexOf('</div>', end) + '</div>'.length;
  // フォームの後ろに付く送信用 iframe とスクリプトも捨てる
  const rest = html.slice(end).replace(/^\s*<iframe[\s\S]*?<\/iframe>/, '').replace(/^\s*<script[\s\S]*?<\/script>/, '');
  return `${html.slice(0, start)}<p>@@FORM@@</p>${rest}`;
};

const pageDir = path.join(ROOT, 'src/content/pages');
fs.mkdirSync(pageDir, { recursive: true });
for (const p of readJson('full_pages.json')) {
  if (SKIP_PAGES.has(p.slug)) continue;
  const html = fs.readFileSync(path.join(SRC, 'html', `${p.id}.html`), 'utf8');
  const start = html.indexOf('<div class="entry-content">');
  const end = html.indexOf('</article>', start);
  let body = start >= 0 ? html.slice(start, end) : p.content.rendered;
  const form = FORMS[p.slug];
  if (form) body = replaceForm(body);
  // /teachers/ からの相対パス（トップページは空文字）
  const urlPath = decodeURIComponent(new URL(p.link).pathname).replace(/^\/teachers\/?|\/$/g, '');
  const fm = [
    `title: ${yaml(decode(p.title.rendered))}`,
    `path: ${yaml(urlPath)}`,
    `order: ${p.menu_order}`,
    form ? `form: ${form}` : null,
  ].filter(Boolean);
  fs.writeFileSync(path.join(pageDir, `${urlPath.replace(/\//g, '--') || 'index'}.md`), `---\n${fm.join('\n')}\n---\n\n${toMarkdown(body)}`);
}

// ---- 画像（旧サイトと同じパスで配信する）
let ok = 0;
const failed = [];
for (const u of images) {
  const out = path.join(ROOT, 'public', decodeURIComponent(u.slice(ORIGIN.length)));
  if (fs.existsSync(out)) { ok++; continue; }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  let done = false;
  for (let i = 0; i < 4 && !done; i++) {
    try {
      const res = await fetch(u);
      if (res.status === 404) break;
      if (!res.ok) throw new Error(String(res.status));
      fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
      done = true;
    } catch {
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }
  done ? ok++ : failed.push(u);
}
// 旧サイトでも表示されていなかった画像（404）は本文から外す
const missing = failed.map((u) => u.slice(ORIGIN.length));
for (const f of fs.readdirSync(pageDir)) {
  const file = path.join(pageDir, f);
  let md = fs.readFileSync(file, 'utf8');
  for (const m of missing) {
    const e = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    md = md.replace(new RegExp(`\\[!\\[[^\\]]*\\]\\(${e}\\)\\]\\([^)]*\\)|!\\[[^\\]]*\\]\\(${e}\\)`, 'g'), '');
  }
  fs.writeFileSync(file, md);
}
console.log(`images: ${ok} saved, ${failed.length} failed`);
for (const u of failed) console.log(`  missing: ${u}`);
