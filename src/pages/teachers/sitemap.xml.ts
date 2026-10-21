import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// 本番ではサイトのルート（www.myecom.net/）はさくら側なので、サイトマップも /teachers/ 配下に置く
export const GET: APIRoute = async ({ site }) => {
  const pages = await getCollection('pages');
  const urls = pages
    .filter((p) => p.data.path !== 'form/thank-you')
    .map((p) => new URL(`/teachers/${p.data.path ? `${p.data.path}/` : ''}`, site).href)
    .sort();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
