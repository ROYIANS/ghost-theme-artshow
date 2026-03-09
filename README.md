# xiaomengtao-theme / new-blog

一个基于 Ghost 的博客主题项目，定位为“线上展览馆”风格，同时提供 AI 辅助脚本用于为文章生成定制化页面 UI 并回写到 Ghost。

## 项目组成

- `theme/`：Ghost 主题（Handlebars + CSS + JS）
- `scripts/`：Node.js 脚本（读取 Ghost 文章、调用 OpenAI、生成预览、回写 Ghost）
- `docs/plans/`：设计与实现计划文档
- `xiaomengtao-theme.zip`：已打包的主题压缩包（可直接上传 Ghost）

## 功能概览

- 首页“展厅式”展示布局（Hero + 作品网格 + 侧边栏）
- 标签页（Room）和默认文章页模板
- 支持文章使用 `custom-artshow` 模板进行自定义渲染
- AI 生成工作流：
  - 读取站点与文章信息
  - 生成页面 HTML
  - 保存本地预览文件
  - 确认后回写到 Ghost

## 目录结构

```text
.
├─ theme/
│  ├─ assets/
│  │  ├─ css/main.css
│  │  └─ js/main.js
│  ├─ partials/
│  ├─ default.hbs
│  ├─ index.hbs
│  ├─ post.hbs
│  ├─ tag.hbs
│  ├─ custom-ui.hbs
│  └─ custom-artshow.hbs
├─ scripts/
│  ├─ generate-ui.js
│  ├─ .env.example
│  └─ previews/
└─ docs/plans/
```

## 环境要求

- Ghost `>= 6.0.0`
- Node.js `>= 18`（建议 18/20 LTS）
- `pnpm`（用于运行 `scripts/` 下的脚本）
- 可用的 Ghost Admin API Key
- 可用的 OpenAI API Key

## 快速开始

### 1) 安装主题到 Ghost

1. 进入 Ghost Admin 后台
2. `Settings -> Design -> Upload theme`
3. 上传 `xiaomengtao-theme.zip`（或自行打包 `theme/`）
4. 激活主题

### 2) 配置 AI 脚本环境

在 `scripts/` 目录下创建 `.env`（可复制 `.env.example`）：

```bash
cd scripts
cp .env.example .env
```

填写变量：

```env
GHOST_URL=https://your-ghost-site.com
GHOST_ADMIN_API_KEY=your-admin-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-4o
```

安装依赖：

```bash
cd scripts
pnpm install
```

## AI 脚本使用方式

脚本入口：`scripts/generate-ui.js`

### 模式 A：AI 生成 -> 本地预览 -> 确认回写

```bash
cd scripts
pnpm run generate -- <post-slug>
```

执行后会在 `scripts/previews/` 生成预览 HTML，并在终端询问是否回写到 Ghost。

### 模式 B：仅生成 Prompt 文件

```bash
cd scripts
pnpm run generate -- <post-slug> --prompt-only
```

会在 `scripts/previews/` 生成 `<slug>.prompt.md`，不回写 Ghost。

### 模式 C：使用本地 HTML 回写

```bash
cd scripts
pnpm run generate -- <post-slug> --file <path-to-local-html>
```

会读取本地 HTML（若含完整 `body` 会自动提取 body 内容）并直接回写 Ghost。

## 渲染说明

- 脚本回写时会把文章 `custom_template` 设置为 `custom-artshow`
- `custom-artshow.hbs` 继承 `custom-ui.hbs`
- `custom-ui.hbs` 保持最简结构，通过 `{{ghost_head}}` 注入 `codeinjection_head` 中的样式/结构

## 常见问题

### 1) 预览文件在哪里？

在 `scripts/previews/` 目录。

### 2) 回写失败通常是什么原因？

- `GHOST_URL` 填写错误
- `GHOST_ADMIN_API_KEY` 无效或权限不足
- `OPENAI_*` 配置错误
- 文章 `slug` 不存在

### 3) 主题如何重新打包？

在项目根目录执行（PowerShell）：

```powershell
Compress-Archive -Path .\theme\* -DestinationPath .\xiaomengtao-theme.zip -Force
```

## 开发提示

- 主题模板修改后建议先在本地 Ghost 环境验证页面结构与响应式表现
- AI 生成结果建议先预览再回写，避免覆盖线上文章展示
- 详细设计过程可参考 `docs/plans/` 下文档
