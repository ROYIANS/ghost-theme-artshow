# 小梦岛 Ghost 主题 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 开发 Ghost 主题 `xiaomengtao-theme`，首页复刻 xiaomengtao.html 地下画廊风格，文章页支持 AI 生成完整 HTML 全量接管，附带 AI 生成脚本。

**Architecture:** Ghost 主题（Handlebars）+ Node.js 脚本。主题负责首页展览大厅、分类页、文章页双模式渲染（普通 / AI 全量接管）。脚本调 Ghost Content API 拉文章，调 Claude API 生成完整 HTML，写回 Ghost Admin API 的 `codeinjection_head` 字段并打 `#custom-ui` tag。

**Tech Stack:** Ghost 6.x, Handlebars, CSS Variables, Node.js 18+, @tryghost/admin-api, @anthropic-ai/sdk

---

### Task 1: 主题骨架

**Files:**
- Create: `theme/package.json`
- Create: `theme/index.hbs`
- Create: `theme/post.hbs`
- Create: `theme/tag.hbs`
- Create: `theme/default.hbs`
- Create: `theme/error.hbs`
- Create: `theme/assets/css/main.css`
- Create: `theme/assets/js/main.js`

**Step 1: 创建主题目录结构**

```bash
mkdir -p theme/assets/css theme/assets/js theme/partials
```

**Step 2: 写 package.json**

```json
{
  "name": "xiaomengtao-theme",
  "description": "小梦岛 — 地下画廊博客主题",
  "version": "1.0.0",
  "engines": { "ghost": ">=6.0.0" },
  "config": {
    "posts_per_page": 10,
    "image_sizes": {}
  }
}
```

**Step 3: 写 default.hbs（基础布局）**

包含 `{{ghost_head}}`、`{{ghost_foot}}`、`{{{body}}}`，引入 Google Fonts 和 main.css/main.js。

**Step 4: 用 gscan 验证骨架**

```bash
npx gscan theme/
```
Expected: 通过，无 errors

**Step 5: Commit**

```bash
git add theme/
git commit -m "feat: ghost theme skeleton"
```

---

### Task 2: CSS 变量与基础样式

**Files:**
- Modify: `theme/assets/css/main.css`

**Step 1: 从 xiaomengtao.html 提取 :root 变量和 body/reset 样式**

完整复制以下内容到 main.css：
- `:root` 颜色变量（--void, --dark, --acid, --neon, --cyan, --amber, --violet, --ghost, --text 系列）
- `*, *::before, *::after` reset
- `body` 基础样式（背景、字体、cursor: crosshair）
- `body::before` noise overlay
- Google Fonts 引用（Bebas Neue, Unbounded, IBM Plex Mono, Noto Sans SC）

**Step 2: Commit**

```bash
git commit -m "feat: css variables and base styles"
```

---

### Task 3: Header partial

**Files:**
- Create: `theme/partials/header.hbs`

**Step 1: 写 header.hbs**

从 xiaomengtao.html 的 `.site-header` 提取，动态部分替换：
- Logo 文字：`{{@site.title}}`
- 导航：`{{navigation}}`（Ghost 原生 helper）
- 搜索按钮暂时静态

```handlebars
<header class="site-header">
  <div class="sh-logo">
    <div class="sh-logo-mark">M</div>
    <div class="sh-logo-text">
      {{@site.title}}
      <small>writing exhibition</small>
    </div>
  </div>
  <ul class="sh-nav">
    {{#foreach navigation}}
    <li class="{{#if current}}on{{/if}}"><a href="{{url}}">{{label}}</a></li>
    {{/foreach}}
  </ul>
</header>
```

**Step 2: 在 default.hbs 中引入**

```handlebars
{{> header}}
{{{body}}}
```

**Step 3: Commit**

```bash
git commit -m "feat: header partial"
```

---

### Task 4: 首页 index.hbs — Hero 区

**Files:**
- Modify: `theme/index.hbs`

**Step 1: 写 Hero 区 Handlebars**

从 xiaomengtao.html 的 `.hero` 提取，动态部分：
- Featured 文章：`{{#get "posts" limit="1" filter="featured:true"}}` 或直接用 `{{#foreach posts limit="1"}}`
- 文章标题：`{{title}}`
- 文章摘要：`{{excerpt}}`
- 文章链接：`{{url}}`
- 发布日期：`{{date format="YYYY.MM.DD"}}`
- 分类 rooms：`{{#get "tags" limit="4"}}{{#foreach tags}}...{{/foreach}}{{/get}}`

Hero 右侧 featured exhibit 卡片示例：
```handlebars
{{#get "posts" limit="1" filter="featured:true"}}
{{#foreach posts}}
<div class="featured-exhibit">
  <div class="fe-bg"></div>
  <div class="fe-overlay"></div>
  <span class="fe-corner-tag">Featured</span>
  <div class="fe-placard">
    <div class="fep-kicker">{{primary_tag.name}}</div>
    <h2 class="fep-title"><a href="{{url}}">{{title}}</a></h2>
    <div class="fep-meta">{{date format="YYYY.MM.DD"}}</div>
  </div>
</div>
{{/foreach}}
{{/get}}
```

**Step 2: Commit**

```bash
git commit -m "feat: homepage hero section"
```

---

### Task 5: 首页 index.hbs — Gallery Grid + Sidebar

**Files:**
- Modify: `theme/index.hbs`

**Step 1: 写 Gallery Grid**

文章列表用 `{{#foreach posts}}` 遍历，按 `@index` 决定卡片类型：
- index 0：`.aw-wide`（宽卡）
- index 1,2：`.aw-grid`（双列卡）
- index 3+：`.aw-row`（横排小卡）

```handlebars
<div class="gallery-grid">
  {{#foreach posts}}
    {{#if @first}}
      {{> "partials/card-wide"}}
    {{else}}
      {{#if (lt @index 3)}}
        {{> "partials/card-grid"}}
      {{else}}
        {{> "partials/card-row"}}
      {{/if}}
    {{/if}}
  {{/foreach}}
  {{pagination}}
</div>
```

**Step 2: 写 Sidebar**

从 xiaomengtao.html 的 `.sidebar-panel` 提取：
- 策展人信息：`{{@site.description}}`
- 分类列表：`{{#get "tags"}}{{#foreach tags}}...{{/foreach}}{{/get}}`
- 时间归档：静态占位（Ghost 无原生归档 helper，后续可用 API）

**Step 3: Commit**

```bash
git commit -m "feat: homepage gallery grid and sidebar"
```

---

### Task 6: 文章页 post.hbs

**Files:**
- Modify: `theme/post.hbs`

**Step 1: 写双模式渲染逻辑**

```handlebars
{{#post}}
  {{#has tag="#custom-ui"}}
    {{! AI 全量接管模式：直接输出 codeinjection_head 内容 }}
    <div class="custom-ui-wrapper">
      {{{codeinjection_head}}}
    </div>
  {{else}}
    {{! 普通文章模式 }}
    <article class="post-default">
      {{> header}}
      <main class="post-main">
        <h1>{{title}}</h1>
        <div class="post-meta">{{date format="YYYY.MM.DD"}} · {{primary_tag.name}}</div>
        <section class="post-content">{{content}}</section>
      </main>
    </article>
  {{/has}}
{{/post}}
```

**Step 2: 写普通文章的基础 CSS**

在 main.css 追加 `.post-default`、`.post-main`、`.post-content` 样式，保持地下画廊风格（深色背景、IBM Plex Mono 正文）。

**Step 3: Commit**

```bash
git commit -m "feat: post template with dual render mode"
```

---

### Task 7: 分类页 tag.hbs

**Files:**
- Modify: `theme/tag.hbs`

**Step 1: 写 tag.hbs**

```handlebars
{{#tag}}
<div class="tag-page">
  {{> header}}
  <main class="tag-main">
    <div class="tag-header">
      <span class="tag-label">ROOM</span>
      <h1 class="tag-title">{{name}}</h1>
      {{#if description}}<p class="tag-desc">{{description}}</p>{{/if}}
      <div class="tag-count">{{count.posts}} works</div>
    </div>
    <div class="tag-posts">
      {{#foreach posts}}
        {{> "partials/card-row"}}
      {{/foreach}}
    </div>
    {{pagination}}
  </main>
</div>
{{/tag}}
```

**Step 2: Commit**

```bash
git commit -m "feat: tag page"
```

---

### Task 8: Manifesto Band + Footer

**Files:**
- Create: `theme/partials/footer.hbs`
- Modify: `theme/default.hbs`

**Step 1: 写 footer.hbs**

从 xiaomengtao.html 提取 `.manifesto-band` 和 `.site-footer`，滚动字幕用 CSS animation 实现。

**Step 2: 在 default.hbs 引入**

```handlebars
{{> header}}
{{{body}}}
{{> footer}}
```

**Step 3: Commit**

```bash
git commit -m "feat: manifesto band and footer"
```

---

### Task 9: 打包上传主题

**Step 1: 打包**

```bash
cd theme && zip -r ../xiaomengtao-theme.zip . -x "*.DS_Store" -x "__MACOSX/*"
```

**Step 2: 上传到 Ghost 后台**

Ghost Admin → Settings → Design → Upload theme → 选择 `xiaomengtao-theme.zip` → Activate

**Step 3: 验证首页渲染正常**

访问博客首页，确认：
- Header 显示正确
- Hero 区有 featured 文章
- Gallery Grid 有文章列表
- Sidebar 有分类

---

### Task 10: AI 生成脚本

**Files:**
- Create: `scripts/generate-ui.js`
- Create: `scripts/package.json`
- Create: `scripts/.env.example`

**Step 1: 初始化脚本目录**

```bash
mkdir scripts && cd scripts && npm init -y
npm install @tryghost/admin-api @anthropic-ai/sdk dotenv
```

**Step 2: 写 .env.example**

```
GHOST_URL=https://your-ghost-site.com
GHOST_ADMIN_API_KEY=your-admin-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

**Step 3: 写 generate-ui.js 核心逻辑**

```javascript
import GhostAdminAPI from '@tryghost/admin-api';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

const ghost = new GhostAdminAPI({
  url: process.env.GHOST_URL,
  key: process.env.GHOST_ADMIN_API_KEY,
  version: 'v5.0'
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateUI(slug) {
  // 1. 拉取文章
  const post = await ghost.posts.read({ slug }, { formats: ['html'], include: 'tags' });

  // 2. 构造 prompt
  const prompt = buildPrompt(post);

  // 3. 调 Claude 生成 HTML
  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }]
  });

  const generatedHTML = msg.content[0].text;

  // 4. 写回 Ghost
  await ghost.posts.edit({
    id: post.id,
    updated_at: post.updated_at,
    codeinjection_head: generatedHTML,
    tags: [...(post.tags || []), { name: '#custom-ui' }]
  });

  console.log(`Done: ${post.title}`);
}

function buildPrompt(post) {
  return `你是一个前端艺术家。请为以下博客文章生成一个完整的、独特风格的 HTML 页面。

文章标题：${post.title}
文章分类：${post.tags?.map(t => t.name).join(', ') || '无'}
文章摘要：${post.custom_excerpt || ''}
文章正文（HTML）：
${post.html}

要求：
1. 输出完整的 <style> 块 + HTML 结构，不要输出 <!DOCTYPE> 或 <html>/<body> 标签
2. 风格与文章情绪/主题深度结合，每篇文章风格完全不同
3. 正文内容要编排进页面，不是简单堆叠，可以有创意的布局
4. 必须包含一个返回首页的链接（href="/"）
5. 页面要完整可读，字体大小适中，行高舒适
6. 使用 CSS 变量，颜色方案与文章情绪匹配
7. 只输出代码，不要任何解释文字`;
}

// CLI 入口
const slug = process.argv[2];
if (!slug) { console.error('Usage: node generate-ui.js <post-slug>'); process.exit(1); }
generateUI(slug).catch(console.error);
```

**Step 4: 测试脚本**

```bash
cp .env.example .env
# 填入真实的 API keys
node generate-ui.js your-test-post-slug
```

Expected: 控制台输出 `Done: 文章标题`，Ghost 后台该文章的 Code Injection 有内容，且打上了 `#custom-ui` tag。

**Step 5: Commit**

```bash
git add scripts/
git commit -m "feat: AI UI generation script"
```

---

## 完成标准

- [ ] `npx gscan theme/` 无 errors
- [ ] 首页正确渲染 Hero + Gallery + Sidebar
- [ ] 普通文章页正常显示
- [ ] 打 `#custom-ui` tag 的文章页由 AI HTML 全量接管
- [ ] `node scripts/generate-ui.js <slug>` 成功生成并写回
