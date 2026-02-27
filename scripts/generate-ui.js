import GhostAdminAPI from '@tryghost/admin-api';
import OpenAI from 'openai';
import { config } from 'dotenv';
import * as readline from 'readline';
import { createHmac } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
config();

// Ghost Admin API JWT 签名
function signJWT(id, secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: id })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300, aud: '/admin/' })).toString('base64url');
  const sig = createHmac('sha256', Buffer.from(secret, 'hex')).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

const ghost = new GhostAdminAPI({
  url: process.env.GHOST_URL,
  key: process.env.GHOST_ADMIN_API_KEY,
  version: 'v5.0'
});

const ai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
});

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function fetchSite() {
  const [id, secret] = process.env.GHOST_ADMIN_API_KEY.split(':');
  const res = await fetch(`${process.env.GHOST_URL}/ghost/api/admin/site/`, {
    headers: { Authorization: `Ghost ${signJWT(id, secret)}` }
  });
  const data = await res.json();
  return {
    title: data.site?.title || '',
    description: data.site?.description || '',
    url: process.env.GHOST_URL,
  };
}

function savePreview(slug, html) {
  const dir = resolve('./previews');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${slug}.html`);
  // 包一层完整 HTML 方便浏览器直接打开
  const full = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Preview: ${slug}</title></head><body>${html}</body></html>`;
  writeFileSync(file, full, 'utf-8');
  return file;
}

async function writeBack(post, html) {
  const existingTags = (post.tags || []).filter(t => t.name !== '#custom-ui');
  await ghost.posts.edit({
    id: post.id,
    updated_at: post.updated_at,
    codeinjection_head: html,
    tags: [...existingTags, { name: '#custom-ui' }]
  });
}

// ── 模式 A：AI 生成 → 本地预览 → 确认回写 ──
async function modeGenerate(slug, site, post) {
  const styleHint = await ask('风格描述（直接回车使用默认风格）: ');
  console.log('\n[3/5] 构造 prompt...');
  const prompt = buildPrompt(post, site, styleHint);

  console.log('[4/5] 调用 AI 生成 HTML...');
  const completion = await ai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }]
  });
  const raw = completion.choices[0].message.content;
  const html = raw.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();

  const previewFile = savePreview(slug, html);
  console.log(`\n[5/5] 预览文件已生成：`);
  console.log(`      ${previewFile}`);
  console.log(`      用浏览器打开确认效果\n`);

  const confirm = await ask('确认回写到 Ghost？(y/N): ');
  if (confirm.toLowerCase() === 'y') {
    await writeBack(post, html);
    console.log(`\n✓ 已回写: ${post.title}`);
    console.log(`  预览: ${site.url}/${post.slug}/`);
  } else {
    console.log('\n已取消。HTML 保留在 previews/ 目录，可修改后用 --file 模式回写。');
  }
}

// ── 模式 B：直接上传本地 HTML 回写 ──
async function modeFile(slug, site, post, filePath) {
  const html = readFileSync(resolve(filePath), 'utf-8')
    // 如果是完整 HTML 文件，提取 body 内容
    .replace(/^[\s\S]*<body[^>]*>/i, '')
    .replace(/<\/body>[\s\S]*$/i, '')
    .trim();

  console.log(`[3/3] 回写到 Ghost...`);
  await writeBack(post, html);
  console.log(`\n✓ 已回写: ${post.title}`);
  console.log(`  预览: ${site.url}/${post.slug}/`);
}

async function main() {
  const args = process.argv.slice(2);
  const slug = args[0];
  const fileIdx = args.indexOf('--file');
  const filePath = fileIdx !== -1 ? args[fileIdx + 1] : null;

  if (!slug) {
    console.log('用法:');
    console.log('  node generate-ui.js <slug>              AI 生成，本地预览后确认回写');
    console.log('  node generate-ui.js <slug> --file <path>  直接上传本地 HTML 回写');
    process.exit(1);
  }

  console.log('[1/5] 拉取站点信息...');
  const site = await fetchSite();
  console.log(`      站点: ${site.title} (${site.url})`);

  console.log(`[2/5] 拉取文章: ${slug}`);
  const post = await ghost.posts.read({ slug }, { formats: ['html'], include: 'tags,authors' });
  console.log(`      标题: "${post.title}"\n`);

  if (filePath) {
    await modeFile(slug, site, post, filePath);
  } else {
    await modeGenerate(slug, site, post);
  }
}

function buildPrompt(post, site, styleHint) {
  const tags = post.tags?.filter(t => !t.name.startsWith('#')).map(t => t.name).join(', ') || '无';
  const defaultStyle = `设计感强、艺术感强、扁平风格、信息密度高、大胆的排版——大字标题、强对比色、克制的留白、网格感布局`;
  const styleDesc = styleHint
    ? `用户指定风格：${styleHint}\n同时保持整体基调：${defaultStyle}`
    : `默认风格：${defaultStyle}`;

  return `你是一个前端艺术家，专门为博客文章创作独特的视觉页面。

## 站点信息（重要，所有链接必须基于此）
- 站点名称：${site.title}
- 站点域名：${site.url}
- 站点简介：${site.description}
- 首页链接：${site.url}/
- 当前文章链接：${site.url}/${post.slug}/

## 文章信息
- 标题：${post.title}
- 分类：${tags}
- 摘要：${post.custom_excerpt || post.excerpt || ''}
- 正文（HTML）：
${post.html}

## 风格要求
${styleDesc}

## 输出要求
1. 只输出 <style> 块 + HTML 结构，不要 <!DOCTYPE>、<html>、<head>、<body> 标签
2. 所有链接必须使用真实域名 ${site.url}，禁止使用 example.com、blog.domain.com 等占位域名
3. 风格与文章情绪/主题深度结合——技术文章可用终端风格，情感文章可用诗意排版，旅行文章可用明信片风格等
4. 正文内容创意编排，可以有分栏、浮动引用、大字排版，不要简单线性堆叠
5. 必须包含返回首页链接：<a href="${site.url}/">← 返回展览大厅</a>
6. 字体使用 Google Fonts，在 <style> 里用 @import 引入
7. 页面完整可读，移动端友好
8. 只输出代码，不要任何解释文字`;
}

main().catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
