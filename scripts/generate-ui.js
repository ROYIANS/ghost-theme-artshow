import GhostAdminAPI from '@tryghost/admin-api';
import OpenAI from 'openai';
import { config } from 'dotenv';
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

async function generateUI(slug) {
  console.log(`[1/4] 拉取文章: ${slug}`);
  const post = await ghost.posts.read(
    { slug },
    { formats: ['html'], include: 'tags,authors' }
  );

  console.log(`[2/4] 构造 prompt: "${post.title}"`);
  const prompt = buildPrompt(post);

  console.log(`[3/4] 调用 AI 生成 HTML...`);
  const completion = await ai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }]
  });

  const raw = completion.choices[0].message.content;
  // 提取代码块内容（如果 AI 包了 ```html ... ```）
  const generatedHTML = raw.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();

  console.log(`[4/4] 写回 Ghost...`);
  const existingTags = (post.tags || []).filter(t => t.name !== '#custom-ui');
  await ghost.posts.edit({
    id: post.id,
    updated_at: post.updated_at,
    codeinjection_head: generatedHTML,
    tags: [...existingTags, { name: '#custom-ui' }]
  });

  console.log(`✓ 完成: ${post.title}`);
  console.log(`  预览: ${process.env.GHOST_URL}/${post.slug}/`);
}

function buildPrompt(post) {
  const tags = post.tags?.filter(t => !t.name.startsWith('#')).map(t => t.name).join(', ') || '无';
  return `你是一个前端艺术家，专门为博客文章创作独特的视觉页面。

请为以下文章生成一个完整的、风格独特的 HTML 页面片段。

---
文章标题：${post.title}
文章分类：${tags}
文章摘要：${post.custom_excerpt || post.excerpt || ''}
文章正文（HTML）：
${post.html}
---

输出要求：
1. 只输出 <style> 块 + HTML 结构，不要 <!DOCTYPE>、<html>、<head>、<body> 标签
2. 风格必须与文章的情绪、主题深度结合——技术文章可以用终端/代码风格，情感文章可以用诗意排版，旅行文章可以用地图/明信片风格等
3. 正文内容要创意编排，不是简单的线性堆叠，可以有分栏、浮动引用、大字排版等
4. 必须包含一个返回首页的链接：<a href="/">← 返回展览大厅</a>
5. 字体使用 Google Fonts，在 <style> 里用 @import 引入
6. 页面要完整可读，移动端友好
7. 颜色方案与文章情绪匹配，不要千篇一律的深色背景
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
