# Gallery 重设计 + 主展品 Bug 修复 — 设计文档

**日期:** 2026-02-27
**范围:** `theme/index.hbs` · `theme/partials/card-exhibit.hbs` · `theme/assets/css/main.css`

---

## 问题1：card-main-exhibit 不渲染（Bug）

### 根因
`index.hbs` 中使用 `{{#get "posts" filter="featured:true"}}` + 嵌套 `{{#get}}` 的 `{{else}}` fallback，在 Ghost Handlebars 里执行不稳定，导致主展品卡片完全不出现。

### 修复方案
移除全部 `{{#get}}` 逻辑，改用两个 `{{#foreach}}` 循环：

```hbs
{{!-- 主展品：始终是列表第一篇 --}}
{{#foreach posts}}
  {{#if @first}}{{> "card-main-exhibit"}}{{/if}}
{{/foreach}}

{{!-- 常规展品网格 --}}
<div class="exhibit-grid">
{{#foreach posts}}
  {{#unless @first}}{{> "card-exhibit"}}{{/unless}}
{{/foreach}}
</div>
```

**权衡：** 放弃"featured 优先"逻辑（Ghost 嵌套 `#get` 不稳定）。用户可通过调整文章发布时间控制哪篇排第一。

---

## 问题2：card-exhibit 展廊重设计

### 设计原则
每张卡片 = 一件展览作品。封面图作为"画作"本身占满整张卡，底部叠加渐变 + 展品标牌信息。

### 卡片视觉结构

```
┌──────────────────────────────┐
│                              │
│    封面图（aspect-ratio 4:3） │
│    object-fit: cover          │
│    hover: scale(1.03) + 亮   │
│                              │
│ ▓▓ 渐变遮罩（透明→黑 95%）▓▓ │
│ NO.002          [TAG]        │
│ 展品标题，最多2行              │
│ 摘要摘要，最多2行               │
│ 2026.02.27                   │
└──────────────────────────────┘
```

### 无封面图 Fallback
`--dark2` 背景 + 标题文字以 ghost-stroke（透明 + 描边）大字填充，与 card-main-exhibit 风格一致。

### 交互
- Hover: 封面图 `opacity: .65 → .8`，`transform: scale(1.03)`
- 渐变遮罩整体跟随（不单独动画）
- 整张卡片是 `<a>` 标签，点击进入文章

---

## 文件改动清单

### 1. `theme/index.hbs`（修改）
- 替换 gallery-grid 内的 `{{#get}}` 主展品逻辑 → 两个 `{{#foreach}}` 循环
- `card-main-exhibit` 从第一个 `{{#foreach}}` 的 `{{#if @first}}` 渲染
- `exhibit-grid` 包裹第二个 `{{#foreach}}` 的 `{{#unless @first}}` 结果

### 2. `theme/partials/card-exhibit.hbs`（完全重写）

```hbs
<a class="card-exhibit" href="{{url}}">
  <div class="ce-bg">
    {{#if feature_image}}
      <img src="{{feature_image}}" alt="{{title}}" class="ce-bg-img">
    {{else}}
      <div class="ce-bg-fallback">{{title}}</div>
    {{/if}}
  </div>
  <div class="ce-overlay"></div>
  <div class="ce-placard">
    <div class="ce-header">
      <span class="ce-num">NO.{{@number}}</span>
      {{#if primary_tag}}<span class="ce-tag">{{primary_tag.name}}</span>{{/if}}
    </div>
    <h3 class="ce-title">{{title}}</h3>
    {{#if custom_excerpt}}
      <p class="ce-excerpt">{{custom_excerpt}}</p>
    {{else}}
      <p class="ce-excerpt">{{excerpt words="20"}}</p>
    {{/if}}
    <div class="ce-date">{{date format="YYYY.MM.DD"}}</div>
  </div>
</a>
```

### 3. `theme/assets/css/main.css`（修改）

**删除旧类：**
- `.card-exhibit`（旧 flex 行布局）
- `.ce-thumb`, `.ce-thumb-img`, `.ce-thumb-fallback`
- `.ce-info`, `.ce-num-label`, `.ce-kicker`, `.ce-arrow`
- 旧 `.ce-title`, `.ce-meta`

**新增类（`.exhibit-grid` 保留，`.card-exhibit` 完全重写）：**

```css
/* ══ EXHIBIT GRID ══ */
.exhibit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.card-exhibit {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-bottom: 1px solid var(--ghost);
  border-right: 1px solid var(--ghost);
  cursor: crosshair;
  display: block;
  animation: slideUp .5s ease .35s forwards; opacity: 0;
}
.exhibit-grid .card-exhibit:nth-child(even) { border-right: none; }
.card-exhibit:hover .ce-bg-img {
  opacity: .8;
  transform: scale(1.03);
}
.ce-bg {
  position: absolute; inset: 0;
  background: var(--dark2);
}
.ce-bg-img {
  width: 100%; height: 100%;
  object-fit: cover; opacity: .65;
  transition: opacity .4s, transform .5s;
  display: block;
}
.ce-bg-fallback {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%;
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(36px, 5vw, 72px);
  color: transparent;
  -webkit-text-stroke: 1px rgba(255,255,255,.07);
  letter-spacing: -.02em; user-select: none;
  text-align: center; line-height: .88; padding: 16px;
}
.ce-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(
    to top,
    rgba(12,11,9,.95) 0%,
    rgba(12,11,9,.7) 45%,
    transparent 75%
  );
}
.ce-placard {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 20px 22px;
  z-index: 2;
}
.ce-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.ce-num {
  font-size: 8px; letter-spacing: .2em; color: var(--text3);
}
.ce-tag {
  font-size: 8px; letter-spacing: .15em; text-transform: uppercase;
  color: var(--acid); border: 1px solid rgba(212,242,60,.3);
  padding: 2px 6px;
}
.ce-title {
  font-family: 'Noto Sans SC', sans-serif; font-weight: 700;
  font-size: 14px; line-height: 1.4; color: var(--text);
  margin-bottom: 6px;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
.ce-excerpt {
  font-family: 'Noto Sans SC', sans-serif; font-size: 11px;
  line-height: 1.65; color: var(--text2); margin-bottom: 10px;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
.ce-date {
  font-size: 9px; color: var(--text3); letter-spacing: .08em;
}

/* Responsive */
@media (max-width: 768px) {
  .exhibit-grid { grid-template-columns: 1fr; }
  .exhibit-grid .card-exhibit { border-right: none; aspect-ratio: 3 / 2; }
}
```

---

## 不变动的部分
- Hero 区域（左右分栏、标题文字）
- `card-main-exhibit.hbs`（主展品全宽卡片）
- `.card-main-exhibit` CSS
- 侧边栏、Header、Footer
- Tag 页、Post 页
