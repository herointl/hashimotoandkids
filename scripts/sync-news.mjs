#!/usr/bin/env node
/**
 * microCMS からお知らせを取得し、
 * - data/news.json（公開用・APIキーなし）
 * - news/<slug>/index.html（詳細ページ・SEO用）
 * を生成します。
 *
 * 使い方:
 *   MICROCMS_SERVICE_DOMAIN=xxx MICROCMS_API_KEY=yyy node scripts/sync-news.mjs
 *   またはリポジトリ直下に .env を置く
 *
 * APIキー未設定のときは、既存の data/news.json から詳細ページだけ再生成します。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const NEWS_JSON = path.join(ROOT, 'data', 'news.json');
const NEWS_HTML = path.join(ROOT, 'news.html');
const NEWS_DIR = path.join(ROOT, 'news');
const MARKER = 'data-generated-by="microcms-news"';

loadDotEnv(path.join(ROOT, '.env'));

const SERVICE = process.env.MICROCMS_SERVICE_DOMAIN || '';
const API_KEY = process.env.MICROCMS_API_KEY || '';
const ENDPOINT = process.env.MICROCMS_ENDPOINT || 'news';
const SITE_ORIGIN = (process.env.SITE_ORIGIN || 'https://hashimoto.andkids.jp').replace(/\/$/, '');

const CATEGORY_CLASS = {
  空き状況: 'g',
  行事: 'g',
  イベント: 'g',
  活動報告: 'g',
  重要: 'b',
  重要なお知らせ: 'b'
};

async function main() {
  let items;
  let source = 'json';

  if (SERVICE && API_KEY) {
    items = await fetchAllFromMicroCMS();
    source = 'microcms';
    console.log('Fetched', items.length, 'published contents from microCMS');
  } else {
    if (!fs.existsSync(NEWS_JSON)) {
      console.error('MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が未設定で、data/news.json もありません。');
      process.exit(1);
    }
    const data = JSON.parse(fs.readFileSync(NEWS_JSON, 'utf8'));
    items = Array.isArray(data) ? data : data.items || [];
    console.log('APIキー未設定のため data/news.json から', items.length, '件を再生成します');
  }

  const normalized = items
    .map(normalizeItem)
    .filter(Boolean)
    .sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date));
    });

  const publicItems = normalized.map(function (item) {
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      date: item.date,
      category: item.category,
      categoryClass: item.categoryClass,
      description: item.description,
      eyecatch: item.eyecatch,
      url: item.url,
      seoTitle: item.seoTitle,
      seoDescription: item.seoDescription,
      content: item.content
    };
  });

  if (source === 'microcms') {
    fs.mkdirSync(path.dirname(NEWS_JSON), { recursive: true });
    fs.writeFileSync(
      NEWS_JSON,
      JSON.stringify({ generatedAt: new Date().toISOString(), source: source, items: publicItems }, null, 2) + '\n'
    );
  }

  const template = fs.readFileSync(NEWS_HTML, 'utf8');
  fs.mkdirSync(NEWS_DIR, { recursive: true });

  const keep = new Set();
  for (const item of publicItems) {
    keep.add(item.slug);
    const dir = path.join(NEWS_DIR, item.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), renderArticle(template, item), 'utf8');
    console.log('Wrote news/' + item.slug + '/index.html');
  }

  pruneStale(keep);
  console.log('Done.');
}

function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === '') process.env[key] = val;
  }
}

async function fetchAllFromMicroCMS() {
  const items = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const url =
      'https://' +
      SERVICE +
      '.microcms.io/api/v1/' +
      encodeURIComponent(ENDPOINT) +
      '?limit=' +
      limit +
      '&offset=' +
      offset +
      '&orders=-publishedAt';
    const res = await fetch(url, {
      headers: { 'X-MICROCMS-API-KEY': API_KEY }
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error('microCMS HTTP ' + res.status + ': ' + body.slice(0, 500));
    }
    const data = await res.json();
    const chunk = data.contents || [];
    items.push.apply(items, chunk);
    const total = data.totalCount || items.length;
    offset += chunk.length;
    if (offset >= total || chunk.length === 0) break;
  }
  return items;
}

function normalizeItem(raw) {
  if (!raw) return null;
  const id = String(raw.id || '');
  const title = String(raw.title || '').trim();
  if (!title) return null;

  const slug = toSlug(raw.slug, id || title);
  if (!slug) return null;

  const dateIso = pickDate(raw);
  const category = String(raw.category || 'お知らせ').trim() || 'お知らせ';
  const description = String(raw.description || raw.seoDescription || '').trim();
  const content = sanitizeHtml(raw.content || '');
  const eyecatch = normalizeImage(raw.eyecatch);
  const seoTitle = String(raw.seoTitle || '').trim();
  const seoDescription = String(raw.seoDescription || description).trim();

  return {
    id: id || slug,
    slug: slug,
    title: title,
    date: dateIso,
    category: category,
    categoryClass: CATEGORY_CLASS[category] || '',
    description: description,
    seoTitle: seoTitle,
    seoDescription: seoDescription,
    eyecatch: eyecatch,
    url: 'news/' + slug + '/',
    content: content
  };
}

function pickDate(raw) {
  const candidates = [raw.publishedDate, raw.publishedAt, raw.updatedAt, raw.date];
  for (const c of candidates) {
    if (!c) continue;
    const d = String(c).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  }
  return new Date().toISOString().slice(0, 10);
}

function toSlug(value, fallback) {
  const raw = String(value || '').trim().toLowerCase();
  let slug = raw
    .replace(/[^\w\u3040-\u30ff\u4e00-\u9faf-]+/g, '-')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    slug = String(fallback || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  return slug;
}

function normalizeImage(img) {
  if (!img || !img.url) return null;
  return {
    url: String(img.url),
    alt: String(img.alt || ''),
    width: img.width || null,
    height: img.height || null
  };
}

function sanitizeHtml(html) {
  return String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rewriteRootRelative(html) {
  return html
    .replace(/\b(href|src)="(?!https?:|mailto:|tel:|#|\/\/)([^"]+)"/g, function (_, attr, url) {
      if (url.startsWith('../../')) return attr + '="' + url + '"';
      return attr + '="../../' + url + '"';
    });
}

function renderArticle(baseHtml, item) {
  const pageTitle = (item.seoTitle || item.title) + '｜こども発達らぼ ＆kids橋本';
  const desc =
    item.seoDescription ||
    item.description ||
    (item.title + '｜こども発達らぼ ＆kids橋本からのお知らせです。');
  const canonical = SITE_ORIGIN + '/news/' + item.slug + '/';
  const ogImage = (item.eyecatch && item.eyecatch.url) || SITE_ORIGIN + '/images/logo.png';
  const displayDate = item.date.replace(/-/g, '.');
  const catCls = item.categoryClass ? 'news-cat ' + item.categoryClass : 'news-cat';

  let html = rewriteRootRelative(baseHtml);

  html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + escapeHtml(pageTitle) + '</title>');
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    '<meta name="description" content="' + escapeHtml(desc) + '">'
  );
  html = html.replace(
    /<meta property="og:type" content="[^"]*">/,
    '<meta property="og:type" content="article">\n' +
      '<link rel="canonical" href="' +
      escapeHtml(canonical) +
      '">\n' +
      '<meta property="og:url" content="' +
      escapeHtml(canonical) +
      '">\n' +
      '<meta property="og:image" content="' +
      escapeHtml(ogImage) +
      '">\n' +
      '<meta name="twitter:card" content="summary_large_image">\n' +
      '<meta name="twitter:title" content="' +
      escapeHtml(pageTitle) +
      '">\n' +
      '<meta name="twitter:description" content="' +
      escapeHtml(desc) +
      '">'
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*">/,
    '<meta property="og:title" content="' + escapeHtml(pageTitle) + '">'
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*">/,
    '<meta property="og:description" content="' + escapeHtml(desc) + '">'
  );

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: item.title,
    datePublished: item.date,
    description: desc,
    mainEntityOfPage: canonical,
    url: canonical,
    image: item.eyecatch && item.eyecatch.url ? [item.eyecatch.url] : undefined,
    author: {
      '@type': 'Organization',
      name: 'こども発達らぼ ＆kids橋本',
      url: SITE_ORIGIN + '/'
    },
    publisher: {
      '@type': 'Organization',
      name: 'こども発達らぼ ＆kids橋本',
      url: SITE_ORIGIN + '/',
      logo: {
        '@type': 'ImageObject',
        url: SITE_ORIGIN + '/images/logo.png'
      }
    }
  };
  if (!jsonLd.image) delete jsonLd.image;

  html = html.replace(
    '</head>',
    '<script type="application/ld+json">\n' +
      JSON.stringify(jsonLd) +
      '\n</script>\n</head>'
  );

  html = html.replace('<html lang="ja">', '<html lang="ja" ' + MARKER + '>');

  const eyecatch = item.eyecatch
    ? '<figure class="news-article-eyecatch"><img src="' +
      escapeHtml(item.eyecatch.url) +
      '" alt="' +
      escapeHtml(item.eyecatch.alt || item.title) +
      '"' +
      (item.eyecatch.width ? ' width="' + item.eyecatch.width + '"' : '') +
      (item.eyecatch.height ? ' height="' + item.eyecatch.height + '"' : '') +
      '></figure>'
    : '';

  const article = [
    '<section class="phero">',
    '  <img class="ch l" src="../../images/characters/dog-happy.png" alt="" width="200">',
    '  <img class="ch r" src="../../images/characters/pome-a.png" alt="" width="200">',
    '  <div class="wrap">',
    '    <span class="en">News</span>',
    '    <h1>' + escapeHtml(item.title) + '</h1>',
    '    <p class="news-article-hero-meta">',
    '      <time datetime="' + escapeHtml(item.date) + '">' + escapeHtml(displayDate) + '</time>',
    '      <span class="' + escapeHtml(catCls) + '">' + escapeHtml(item.category) + '</span>',
    '    </p>',
    '  </div>',
    '</section>',
    '<div class="breadcrumb">',
    '  <div class="wrap">',
    '    <ol>',
    '      <li><a href="../../index.html">ホーム</a></li>',
    '      <li><a href="../../news.html">お知らせ</a></li>',
    '      <li>' + escapeHtml(item.title) + '</li>',
    '    </ol>',
    '  </div>',
    '</div>',
    '<section class="sec">',
    '  <div class="wrap wrap-narrow">',
    '    <article class="news-article">',
    eyecatch,
    '      <div class="news-article-body">',
    item.content || '<p>本文は準備中です。</p>',
    '      </div>',
    '      <p class="news-article-back"><a class="btn btn-outline" href="../../news.html">お知らせ一覧へ戻る</a></p>',
    '    </article>',
    '  </div>',
    '</section>'
  ].join('\n');

  html = html.replace(
    /<section class="phero">[\s\S]*?<section class="cta">/,
    article + '\n\n<!-- ============ CTA ============ -->\n<section class="cta">'
  );

  html = html.replace(
    /<script src="[^"]*js\/news\.js[^"]*"[^>]*><\/script>\s*/g,
    ''
  );

  return html;
}

function pruneStale(keep) {
  if (!fs.existsSync(NEWS_DIR)) return;
  for (const name of fs.readdirSync(NEWS_DIR)) {
    const dir = path.join(NEWS_DIR, name);
    if (!fs.statSync(dir).isDirectory()) continue;
    const index = path.join(dir, 'index.html');
    if (!fs.existsSync(index)) continue;
    const html = fs.readFileSync(index, 'utf8');
    if (!html.includes(MARKER)) continue;
    if (!keep.has(name)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log('Removed stale news/' + name + '/');
    }
  }
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
