# 小梦岛博客 — 设计文档

**日期**：2026-02-27
**作者**：ROYIANS
**目标**：1-2 天内上线

---

## 核心创意

博客即艺术展览。首页是展览大厅，每篇文章是一件独立展品。
每篇文章页面由 AI 生成完整 HTML，风格、布局、配色与文章内容深度结合，没有两篇文章长得一样。

---

## 技术选型

| 层 | 选择 | 理由 |
|---|---|---|
| CMS | Ghost（自托管 Docker） | 主题系统成熟，API 完整，支持 per-post code injection |
| 主题引擎 | Handlebars（Ghost 原生） | 轻量，够用 |
| 首页风格 | 复刻 `xiaomengtao.html` | 已有设计稿，直接转主题 |
| 文章页 | AI 生成完整 HTML | 全量接管，无默认布局 |
| AI 生成脚本 | Node.js，手动触发 | 简单，可控 |
| 评论 | 暂不做 | 后续单独迭代 |
| 部署 | VPS + Docker Compose | Ghost 官方推荐方式 |

---

## 架构

```
Ghost CMS（后台管理）
  ├── 文章管理（标题、正文、分类、tag）
  ├── 分类管理
  └── Code Injection（per-post）

Ghost 主题（xiaomengtao-theme）
  ├── index.hbs        首页，复刻 xiaomengtao.html
  ├── post.hbs         文章页，检测 tag 决定渲染模式
  ├── tag.hbs          分类页
  └── assets/          CSS、JS

AI 生成脚本（scripts/generate-ui.js）
  ├── 读取文章内容（Ghost Content API）
  ├── 调用 AI 生成完整 HTML
  └── 写回 Ghost Admin API（codeinjection_head 字段）
```

---

## 文章页渲染逻辑

文章打上 `#custom-ui` tag 后，`post.hbs` 走完全自定义路径：

```handlebars
{{#if (has tag="hash-custom-ui")}}
  {{! 全量渲染 AI 生成的 HTML，隐藏所有默认布局 }}
  {{{codeinjection_head}}}
{{else}}
  {{! 普通文章，走默认主题布局 }}
  <article>...</article>
{{/if}}
```

AI 生成的 HTML 是一个完整的 `<style>` + `<div>` 结构，包含：
- 文章标题的排版处理
- 正文内容的布局编排（段落位置、字体、配色由 AI 决定）
- 页面整体风格（与文章主题/情绪匹配）

---

## AI 生成脚本流程

```
1. 传入文章 slug 或 id
2. 从 Ghost Content API 拉取：标题、正文、分类、摘要
3. 构造 prompt，要求 AI 生成：
   - 完整 <style> 块
   - 完整页面 HTML 结构（含正文内容）
   - 风格与文章情绪/主题匹配
   - 保留返回首页的导航链接
4. 将生成结果写入 codeinjection_head
5. 同时打上 #custom-ui tag
```

---

## 首页设计

直接基于 `xiaomengtao.html` 转 Handlebars：

- Hero 区：展览标题 + 最新文章 featured
- Gallery Grid：文章卡片列表（wide / grid / row 三种卡片）
- Sidebar：岛主信息、分类、标签云、时间归档、友链
- 底部：滚动字幕 + Footer

动态数据通过 Ghost Handlebars helpers 填充：
- `{{#foreach posts}}` 遍历文章
- `{{#foreach tags}}` 遍历分类
- `{{pagination}}` 分页

---

## 开发顺序

1. **Ghost 环境搭建**（Docker Compose，本地先跑起来）
2. **主题骨架**（Ghost 主题目录结构 + package.json）
3. **首页 index.hbs**（xiaomengtao.html → Handlebars）
4. **文章页 post.hbs**（双模式：默认 + custom-ui）
5. **分类页 tag.hbs**（简单列表）
6. **AI 生成脚本**（scripts/generate-ui.js）
7. **本地测试**，写几篇文章跑脚本验证
8. **部署到 VPS**

---

## 不做的事（保持最小范围）

- 评论系统
- 搜索功能
- 用户注册/登录
- RSS（Ghost 自带，不用开发）
- 暗色/亮色切换（首页本身就是暗色）
