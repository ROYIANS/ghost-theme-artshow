import GhostAdminAPI from '@tryghost/admin-api';
import OpenAI from 'openai';
import { config } from 'dotenv';
import * as readline from 'readline';
config();

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

async function generateUI(slug) {
  console.log(`[1/5] 拉取站点信息...`);
  const settings = await ghost.settings.browse();
  const site = {
    title: settings.find(s => s.key === 'title')?.value || '',
    description: settings.find(s => s.key === 'description')?.value || '',
    url: process.env.GHOST_URL,
  };
  console.log(`      站点: ${site.title} (${site.url})`);

  console.log(`[2/5] 拉取文章: ${slug}`);
  const post = await ghost.posts.read(
    { slug },
    { formats: ['html'], include: 'tags,authors' }
  );
  console.log(`      标题: "${post.title}"`);

  const styleHint = await ask('\n风格描述（直接回车使用默认风格）: ');

  console.log(`\n[3/5] 构造 prompt...`);
  const prompt = buildPrompt(post, site, styleHint);

  console.log(`[4/5] 调用 AI 生成 HTML...`);
  const completion = await ai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }]
  });

  const raw = completion.choices[0].message.content;
  const generatedHTML = raw.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();

  console.log(`[5/5] 写回 Ghost...`);
  const existingTags = (post.tags || []).filter(t => t.name !== '#custom-ui');
  await ghost.posts.edit({
    id: post.id,
    updated_at: post.updated_at,
    codeinjection_head: generatedHTML,
    tags: [...existingTags, { name: '#custom-ui' }]
  });

  console.log(`\n✓ 完成: ${post.title}`);
  console.log(`  预览: ${site.url}/${post.slug}/`);
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

// CLI 入口
const slug = process.argv[2];
if (!slug) {
  console.error('用法: node generate-ui.js <post-slug>');
  console.error('示例: node generate-ui.js my-first-post');
  process.exit(1);
}

generateUI(slug).catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
