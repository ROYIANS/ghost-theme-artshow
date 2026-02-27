# 首页布局改版设计文档

**日期:** 2026-02-27
**作者:** ROYIANS
**范围:** `theme/index.hbs` · `theme/assets/css/main.css` · 相关 partials

---

## 背景与目标

当前首页 Gallery 区域存在权重失衡问题：第一篇文章独占宽卡（含头图），其余文章仅为无图行卡。
每篇文章都是独立展品，应当平等展示头图，体现"文学数字艺术在线展览"的定位。

---

## Hero 区域改动（小改）

### 变更
- 将三行英文大字 `XIAO / MENG / DAO` 改为横排中文"小梦岛"作为主标题
- 字体：`Noto Sans SC` weight 900，字号保持与原来同级别（`clamp(64px, 9vw, 130px)`）
- 保留 `XIAO MENG DAO` 作为小字副标题（字母装饰感）
- 在 description 上方增加一行：`文学数字艺术的在线展览 · FREE & LONG-TERM EXHIBITION`

### 布局示意
```
SEASON 01 · 2026
小梦岛
XIAO MENG DAO   ← 小字，letter-spacing 大
[描述]
文学数字艺术的在线展览 · FREE & LONG-TERM EXHIBITION
[N] WORKS  [N] ROOMS
```

---

## Gallery 列表区域（主要改动）

### 新卡片体系

替换原有 `card-wide.hbs` + `card-row.hbs` 的组合，引入两种新卡片：

#### 1. 主展品卡片 `card-main-exhibit.hbs`（全宽，每页1张）

**来源逻辑：** 有 `featured` 文章时取第一篇 featured，否则取最新一篇。

```
┌──────────────────────────────────────────────────────────────┐
│  NO.001                                    [FEATURED] 角标   │
│                                                              │
│  ░░░░░░░░░░░░░░░ 头图背景 (height: 280px) ░░░░░░░░░░░░░░░░  │
│  (底部渐变遮罩，无头图时以 ghost-stroke 标题文字填充)          │
│                                                              │
│  TAG · 阅读时间                                              │
│  文章标题（Noto Sans SC 900, 20-24px）                       │
│  摘要（2-3行）                                               │
│  DATE                            → 进入展览                  │
└──────────────────────────────────────────────────────────────┘
```

#### 2. 普通展品卡片 `card-exhibit.hbs`（2列，横向，左图右文）

**来源逻辑：** 其余所有文章（主展品之外）均使用此卡片，2列网格排列。

```
┌───────────────────────────────┐  ┌───────────────────────────────┐
│ ┌──────┐  NO.002              │  │ ┌──────┐  NO.003              │
│ │      │  文章标题（最多2行）  │  │ │ 头图 │  文章标题（最多2行）  │
│ │ 头图 │  TAG · DATE          │  │ │      │  TAG · DATE          │
│ └──────┘  →                   │  │ └──────┘  →                   │
└───────────────────────────────┘  └───────────────────────────────┘
```

- 图片区：120px × 90px，`object-fit: cover`
- 无头图时：`--dark2` 背景 + 编号大字填充（ghost-stroke）
- Hover：卡片背景变深，箭头变 `--acid` 色并右移 4px

### Gallery 整体结构变化

| 原结构 | 新结构 |
|--------|--------|
| `card-wide`（第1篇，含图）| `card-main-exhibit`（featured或最新，全宽）|
| `card-row`（其余，无图）| `card-exhibit`（2列，均有图位）|

### Handlebars 逻辑

```hbs
{{!-- 主展品：先尝试 featured，否则取第一篇 --}}
{{#get "posts" filter="featured:true" limit="1"}}
  {{#if posts}}
    {{> "card-main-exhibit" post=(first posts)}}
  {{else}}
    {{#foreach posts limit="1"}}{{> "card-main-exhibit"}}{{/foreach}}
  {{/if}}
{{/get}}

{{!-- 普通展品 2列网格 --}}
<div class="exhibit-grid">
  {{#foreach posts}}
    {{#unless @first}}
      {{> "card-exhibit"}}
    {{/unless}}
  {{/foreach}}
</div>
```

> **注：** Ghost Handlebars 的 `{{#get}}` + `featured` filter 用法需验证；如实现复杂，退而用 `{{#if featured}}` 在 foreach 中判断。

---

## 编号规则

- 主展品：`NO.001`（页面内固定）
- 普通展品：`NO.002`、`NO.003`...（按 `@index` 递推）

---

## CSS 改动

### 新增类
- `.card-main-exhibit` — 全宽主展品
- `.cme-image-wrap` — 头图区域（height: 280px）
- `.cme-placard` — 底部展品说明牌
- `.exhibit-grid` — 2列网格容器
- `.card-exhibit` — 普通展品横向卡片
- `.ce-thumb` — 左侧图片（120×90px）
- `.ce-info` — 右侧文字区

### 删除/保留
- 删除 `.aw-wide`、`.aww-main`、`.aww-side`（wide card）
- 保留 `.aw-row`（tag页、其他地方可能还在用 → 检查后再删）
- 保留 `.gg-header`（筛选栏不变）
- 保留 `.pager`（分页不变）

---

## 响应式

| 断点 | Gallery 布局 |
|------|-------------|
| `>768px` | 主展品全宽 + 2列普通卡片 |
| `≤768px` | 主展品全宽 + 单列普通卡片 |

---

## 不变动的部分

- Header、Footer、Manifesto Band
- Hero 左右分割整体结构（只改文字内容）
- 侧边栏（Curator / Rooms / Contact）
- Tag 页、Post 页、Page 页
- 分页逻辑

---

## 文件清单

| 文件 | 操作 |
|------|------|
| `theme/index.hbs` | 修改 Hero 文字；修改 Gallery 循环逻辑 |
| `theme/partials/card-main-exhibit.hbs` | 新建 |
| `theme/partials/card-exhibit.hbs` | 新建 |
| `theme/assets/css/main.css` | 新增新卡片样式；调整 Hero 标题样式 |
| `theme/partials/card-wide.hbs` | 保留（其他页可能用到） |
| `theme/partials/card-row.hbs` | 保留（tag页在用） |
