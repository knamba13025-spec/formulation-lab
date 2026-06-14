import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const QUEUE_FILE = path.join(__dirname, 'article-queue.json');
const CONTENT_DIR = path.join(ROOT, 'src/content/blog');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO = GITHUB_TOKEN
  ? `https://${GITHUB_TOKEN}@github.com/knamba13025-spec/formulation-lab.git`
  : null;

const client = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function loadQueue() {
  return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
}

function saveQueue(queue) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));
}

function pickArticles(queue) {
  const pending = queue.queue;
  if (pending.length === 0) return [];

  const trafficArticles = pending.filter(a => a.type === 'traffic');
  const monetizationArticles = pending.filter(a => a.type === 'monetization');

  const selected = [];

  if (trafficArticles.length > 0) selected.push(trafficArticles[0]);
  if (monetizationArticles.length > 0) selected.push(monetizationArticles[0]);
  if (selected.length < 2 && pending.length >= 2) selected.push(pending.find(a => !selected.includes(a)));

  return selected.filter(Boolean).slice(0, 2);
}

async function generateArticle(article) {
  console.log(`\n✍️  生成中: ${article.title}`);

  const today = new Date().toISOString().split('T')[0];

  const prompt = `あなたは化粧品メーカーで処方開発・品質管理を5年以上担当した経験を持つ専門家です。
接客業も14年以上経験しており、顧客の美容への悩みをリアルに理解しています。

以下の条件でアンチエイジングに関するブログ記事を書いてください。

【記事情報】
タイトル: ${article.title}
カテゴリ: ${article.category}
エビデンスグレード: ${article.grade}
キーワード: ${article.keywords.join('、')}
盛り込むべきポイント: ${article.points.join('、')}
記事タイプ: ${article.type === 'traffic' ? '集客記事（教育・情報提供が目的）' : '収益記事（製品比較・購買に繋げる）'}

【執筆ルール】
1. フロントマターは含めない（別途付与します）
2. 見出しはH2（##）とH3（###）を使う
3. 必ず「> メーカー視点のひとこと：」というブロックを1〜2箇所入れる
4. 薬機法に注意：「治療」「治る」などの表現は避け、「期待できます」「とされています」を使う
5. 文字数：2,000〜3,000文字
6. 冒頭は読者の共感を引く一文で始める
7. ${article.type === 'monetization' ? '記事末尾に「おすすめ製品」セクションを設け、「※アフィリエイトリンクを含みます」を記載する' : ''}
8. 表や箇条書きを積極的に使い、読みやすくする

記事本文のみを出力してください。`;

  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const body = message.content[0].text;

  const frontmatter = `---
title: "${article.title}"
description: "${article.keywords[0]}について、元化粧品メーカー処方開発者が解説。${article.points[0]}など詳しく紹介します。"
pubDate: ${today}
category: ${article.category}
grade: ${article.grade}
affiliate: ${article.type === 'monetization'}
---

`;

  return frontmatter + body;
}

function saveArticle(slug, content) {
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  fs.writeFileSync(filePath, content);
  console.log(`💾 保存: ${filePath}`);
  return filePath;
}

function pushToGitHub(slugs) {
  console.log('\n🚀 GitHubにプッシュ中...');
  const today = new Date().toLocaleDateString('ja-JP');
  execSync(`cd "${ROOT}" && git add -A && git commit -m "自動生成記事 ${today}: ${slugs.join(', ')}"`, { stdio: 'inherit' });
  if (!REPO) {
    console.log('⚠️  GITHUB_TOKEN未設定のためプッシュをスキップ。記事はローカルに保存済みです。');
    return;
  }
  execSync(`cd "${ROOT}" && git push "${REPO}" main`, { stdio: 'pipe' });
  console.log('✅ デプロイ完了');
}

async function main() {
  console.log('🤖 記事自動生成を開始します...');
  console.log(`📅 ${new Date().toLocaleString('ja-JP')}`);

  if (!client) {
    console.log('⚠️  ANTHROPIC_API_KEY未設定のため記事生成をスキップしました。');
    process.exit(0);
  }

  const queue = loadQueue();
  const articles = pickArticles(queue);

  if (articles.length === 0) {
    console.log('⚠️  キューに記事がありません。article-queue.jsonに追加してください。');
    process.exit(0);
  }

  console.log(`\n📋 本日生成する記事 (${articles.length}件):`);
  articles.forEach(a => console.log(`  - [${a.type === 'traffic' ? '集客' : '収益'}] ${a.title}`));

  const generatedSlugs = [];

  for (const article of articles) {
    try {
      const content = await generateArticle(article);
      saveArticle(article.slug, content);
      generatedSlugs.push(article.slug);

      queue.queue = queue.queue.filter(a => a.slug !== article.slug);
      queue.completed.push({ ...article, completedAt: new Date().toISOString() });
    } catch (err) {
      console.error(`❌ エラー: ${article.title}\n`, err.message);
    }
  }

  queue.lastRun = new Date().toISOString();
  saveQueue(queue);

  if (generatedSlugs.length > 0) {
    pushToGitHub(generatedSlugs);
    console.log(`\n✅ 完了: ${generatedSlugs.length}記事を生成・公開しました`);
  }
}

main().catch(console.error);
