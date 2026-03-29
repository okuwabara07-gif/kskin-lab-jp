const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AMAZON_ID = process.env.AMAZON_TRACKING_ID || '';
const RAKUTEN_ID = process.env.RAKUTEN_AFFILIATE_ID || '';

const KEYWORDS = [
  {kw:"\u30ca\u30a4\u30a2\u30b7\u30f3\u30a2\u30df\u30c9 \u52b9\u679c \u4f7f\u3044\u65b9",genre:"ingredient"},
  {kw:"\u30bb\u30f3\u30c6\u30e9\u30a2\u30b8\u30a2\u30c1\u30ab \u52b9\u679c \u30b3\u30b9\u30e1",genre:"ingredient"},
  {kw:"BHA \u30b5\u30ea\u30c1\u30eb\u9178 \u97d3\u56fd\u30b3\u30b9\u30e1",genre:"ingredient"},
  {kw:"\u30d2\u30a2\u30eb\u30ed\u30f3\u9178 \u97d3\u56fd\u30b3\u30b9\u30e1 \u304a\u3059\u3059\u3081",genre:"ingredient"},
  {kw:"\u30ec\u30c1\u30ce\u30fc\u30eb \u97d3\u56fd\u30b3\u30b9\u30e1 \u521d\u5fc3\u8005",genre:"ingredient"},
  {kw:"\u30d3\u30bf\u30df\u30f3C \u7f8e\u5bb9\u6db2 \u97d3\u56fd \u304a\u3059\u3059\u3081",genre:"ingredient"},
  {kw:"AHA \u30b0\u30ea\u30b3\u30fc\u30eb\u9178 \u97d3\u56fd\u30b3\u30b9\u30e1",genre:"ingredient"},
  {kw:"\u30b9\u30cd\u30a4\u30eb\u30df\u30e5\u30fc\u30b7\u30f3 \u52b9\u679c",genre:"ingredient"},
  {kw:"\u30d7\u30ed\u30dd\u30ea\u30b9 \u97d3\u56fd\u30b3\u30b9\u30e1 \u52b9\u679c",genre:"ingredient"},
  {kw:"\u30da\u30d7\u30c1\u30c9 \u97d3\u56fd\u30b9\u30ad\u30f3\u30b1\u30a2",genre:"ingredient"}
];

const SYS = `あなたは韓国コスメ・K-Beauty専門ライターです。読者目線で分かりやすく、SEOに強い記事を書きます。見出しはH2/H3を使ってください。文字数2000字以上。Markdown形式で出力。記事内でおすすめ商品を紹介する箇所には[AMAZON:商品名]と[RAKUTEN:商品名]を合計5箇所挿入してください。`;

function insertLinks(text) {
  text = text.replace(/\[AMAZON:([^\]]+)\]/g, (_, p) => `[🛒 ${p}をAmazonでチェック](https://www.amazon.co.jp/s?k=${encodeURIComponent(p)}&tag=${AMAZON_ID})`);
  text = text.replace(/\[RAKUTEN:([^\]]+)\]/g, (_, p) => `[🛍 ${p}を楽天でチェック](https://search.rakuten.co.jp/search/mall/${encodeURIComponent(p)}/?rafcid=${RAKUTEN_ID})`);
  return text;
}

function toSlug(kw) {
  return kw.replace(/[\s\u3000]+/g, '-').replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF-]/g, '') + '-' + Date.now();
}

async function generateArticle(kw, genre) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01'},
    body: JSON.stringify({model: 'claude-sonnet-4-20250514', max_tokens: 3000, system: SYS, messages: [{role: 'user', content: `ジャンル：${genre}\nキーワード：「${kw}」\n\nSEO記事をMarkdownで書いてください。`}]}),
  });
  const data = await res.json();
  return data.content?.map(c => c.text || '').join('') || '';
}

async function main() {
  const contentDir = path.join(process.cwd(), 'content/blog');
  if (!fs.existsSync(contentDir)) fs.mkdirSync(contentDir, { recursive: true });
  const targets = KEYWORDS.sort(() => Math.random() - 0.5).slice(0, 5);
  for (const { kw, genre } of targets) {
    console.log(`生成中: ${kw}`);
    try {
      let text = await generateArticle(kw, genre);
      text = insertLinks(text);
      const slug = toSlug(kw);
      const content = `---\ntitle: "${kw}"\ndate: "${new Date().toISOString().split('T')[0]}"\ngenre: "${genre}"\ntags: [${genre}]\n---\n\n${text}\n`;
      fs.writeFileSync(path.join(contentDir, `${slug}.mdx`), content);
      console.log(`完了: ${slug}.mdx`);
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) { console.error(`エラー: ${kw}`, e.message); }
  }
  console.log('全記事生成完了！');
}
main();
