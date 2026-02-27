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
  console.log(`[1/4] 拉取文章: ${slug}`);
  const post = await ghost.posts.read(
    { slug },
    { formats: ['html'], include: 'tags,authors' }
  );
  console.log(`      标题: "${post.title}"`);

  const styleHint = await ask('\n风格描述（直接回车使用默认风格）: ');

  console.log(`\n[2/4] 构造 prompt...`);
  const prompt = buildPrompt(post, styleHint);

  console.log(`[3/4] 调用 AI 生成 HTML...`);
  const completion = await ai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }]
  });

  const raw = completion.choices[0].message.content;
  const generatedHTML = raw.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();

  console.log(`[4/4] 写回 Ghost...`);
  const existingTags = (post.tags || []).filter(t => t.name !== '#custom-ui');
  await ghost.posts.edit({
    id: post.id,
    updated_at: post.updated_at,
    codeinjection_head: generatedHTML,
    tags: [...existingTags, { name: '#custom-ui' }]
  });

  console.log(`\n✓ 完成: ${post.title}`);
  console.log(`  预览: ${process.env.GHOST_URL}/${post.slug}/`);
}

function buildPrompt(post, styleHint) {
  const tags = post.tags?.filter(t => !t.name.startsWith('#')).map(t => t.name).join(', ') || '无';
  const defaultStyle = `设计感强、艺术感强、扁平风格、信息密度高、大胆的排版——大字标题、强对比色、克制的留白、网格感布局`;
  const styleDesc = styleHint
    ? `用户指定风格：${styleHint}\n同时保持整体基调：${defaultStyle}`
    : `默认风格：${defaultStyle}`;

  return `你是一个前端艺术家，专门为博客文章创作独特的视觉页面。

请为以下文章生成一个完整的、风格独特的 HTML 页面片段。

---
文章标题：${post.title}
文章分类：${tags}
文章摘要：${post.custom_excerpt || post.excerpt || ''}
文章正文（HTML）：
${post.html}
---

风格要求：
${styleDesc}

输出要求：
1. 只输出 <style> 块 + HTML 结构，不要 <!DOCTYPE>、<html>、<head>、<body> 标签
2. 风格必须与文章的情绪、主题深度结合——技术文章可以用终端/代码风格，情感文章可以用诗意排版，旅行文章可以用地图/明信片风格等
3. 正文内容要创意编排，不是简单的线性堆叠，可以有分栏、浮动引用、大字排版等
4. 必须包含一个返回首页的链接：<a href="/">← 返回展览大厅</a>
5. 字体使用 Google Fonts，在 <style> 里用 @import 引入
6. 页面要完整可读，移动端友好
7. 只输出代码，不要任何解释文字`;
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
