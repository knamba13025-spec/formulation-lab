import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'src/content/blog');
const REPORT_DIR = path.join(ROOT, 'reports');
const REPORT_PATH = path.join(REPORT_DIR, 'daily-affiliate-audit.md');

const categoryPriority = {
  clinic: 5,
  supplement: 4,
  skincare: 3,
  science: 1,
};

function parseFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { data: {}, body: source };

  const data = {};
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    value = value.replace(/^"|"$/g, '');
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    data[key] = value;
  }
  return { data, body: source.slice(match[0].length) };
}

function scoreArticle(fileName, source) {
  const { data, body } = parseFrontmatter(source);
  const text = body.replace(/```[\s\S]*?```/g, '');
  const checks = [
    {
      ok: Boolean(data.description && data.description.length >= 55 && data.description.length <= 130),
      label: 'SEO descriptionを55〜130字に調整',
      weight: 2,
    },
    {
      ok: /おすすめ|比較|ランキング|選び方/.test(data.title ?? ''),
      label: 'タイトルに購買意図語を追加',
      weight: 3,
    },
    {
      ok: /\|.+\|/.test(body),
      label: '比較表を追加',
      weight: 3,
    },
    {
      ok: /\[[^\]]+\]\([^)]+\)/.test(body),
      label: '内部リンクまたは収益リンクを追加',
      weight: 4,
    },
    {
      ok: /アフィリエイト|広告/.test(body),
      label: '広告表記を本文内にも追加',
      weight: 2,
    },
    {
      ok: /おすすめ製品|おすすめクリニック|購入前|予約前/.test(body),
      label: '成約直前セクションを追加',
      weight: 4,
    },
    {
      ok: text.length >= 1800,
      label: '本文を1,800字以上に拡張',
      weight: 2,
    },
  ];

  const missing = checks.filter(check => !check.ok);
  const category = data.category ?? 'science';
  const affiliateBoost = data.affiliate === true ? 8 : 0;
  const score = missing.reduce((sum, item) => sum + item.weight, 0) + (categoryPriority[category] ?? 1) + affiliateBoost;

  return {
    slug: fileName.replace(/\.md$/, ''),
    title: data.title ?? fileName,
    category,
    affiliate: data.affiliate === true,
    score,
    missing,
  };
}

function main() {
  const files = fs.readdirSync(CONTENT_DIR).filter(file => file.endsWith('.md'));
  const audits = files
    .map(file => scoreArticle(file, fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8')))
    .sort((a, b) => b.score - a.score);

  const today = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });

  const top = audits.slice(0, 5);
  const lines = [
    `# Daily Affiliate Audit`,
    ``,
    `実行日: ${today}`,
    ``,
    `## 今日やるべき改善`,
    ``,
  ];

  if (top.length === 0) {
    lines.push(`記事がまだありません。まず収益記事を1本作成してください。`);
  } else {
    for (const [index, article] of top.entries()) {
      lines.push(`${index + 1}. [${article.title}](/blog/${article.slug})`);
      lines.push(`   - 優先度スコア: ${article.score}`);
      lines.push(`   - カテゴリ: ${article.category} / ${article.affiliate ? '収益記事' : '集客記事'}`);
      if (article.missing.length > 0) {
        lines.push(`   - 改善: ${article.missing.slice(0, 3).map(item => item.label).join('、')}`);
      } else {
        lines.push(`   - 改善: 現状維持。次はASPリンク差し替えとCV計測を確認`);
      }
      lines.push(``);
    }
  }

  lines.push(`## 収益化チェックリスト`);
  lines.push(``);
  lines.push(`- 美容医療ASP、NMN直販、Amazon、楽天の順で登録状況を確認`);
  lines.push(`- 収益記事には比較表、広告表記、購入前の判断基準、内部リンクを入れる`);
  lines.push(`- 集客記事の末尾から対応する収益記事へ送客する`);
  lines.push(`- クリック数を見られるようにASP別のリンクIDを分ける`);
  lines.push(``);

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${lines.join('\n')}\n`);
  console.log(`Affiliate audit written: ${REPORT_PATH}`);
}

main();
