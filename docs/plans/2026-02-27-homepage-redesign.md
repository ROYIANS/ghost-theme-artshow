# Homepage Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the homepage Hero text (小梦岛) and replace the Gallery card system with equal-weight exhibit cards that all show feature images.

**Architecture:** Three changes — (1) Hero title text swap, (2) two new Handlebars partials (`card-main-exhibit.hbs`, `card-exhibit.hbs`), (3) CSS for both new cards. The old `card-wide.hbs` / `card-row.hbs` partials are NOT deleted (tag page uses card-row). `index.hbs` loop logic is updated to use new partials.

**Tech Stack:** Ghost Handlebars templates, vanilla CSS, no build tools. Deploy by uploading `theme/` as a `.zip` to Ghost Admin.

---

## Context: Current Homepage Structure

```
theme/index.hbs       ← main template, touch this
theme/partials/
  card-wide.hbs       ← currently used by index (keep, don't delete)
  card-row.hbs        ← used by index + tag.hbs (keep, don't delete)
  card-grid.hbs       ← not used by index currently (keep)
theme/assets/css/main.css  ← add new classes here
```

Key Ghost Handlebars notes:
- `{{#foreach posts}}` = the page's post list (10 per page)
- `{{@first}}` = true for the first item in a foreach
- `{{@number}}` = 1-based index in foreach
- `{{#if feature_image}}` = checks if post has a feature image
- `{{#get "posts" filter="featured:true" limit="1"}}` = fetches featured posts; has `{{else}}` block if none found

---

## Task 1: Update Hero Title Text

**Files:**
- Modify: `theme/index.hbs` (lines 13–18, the `hero-exhibition-title` block)
- Modify: `theme/assets/css/main.css` (the `.het-oversize` block, ~lines 153–173)

**Step 1: Edit `index.hbs` — replace the title block**

Find this block (lines 13–18):
```hbs
<div class="hero-exhibition-title">
  <span class="het-oversize">XIAO</span>
  <span class="het-oversize acid">MENG</span>
  <span class="het-oversize ghost-stroke">DAO</span>
  <div class="het-line"></div>
</div>
```

Replace with:
```hbs
<div class="hero-exhibition-title">
  <span class="het-oversize het-cn">小梦岛</span>
  <span class="het-subtitle">XIAO MENG DAO</span>
  <div class="het-line"></div>
</div>
```

**Step 2: Add subtitle line above `hero-desc` in `index.hbs`**

Find:
```hbs
<p class="hero-desc">{{@site.description}}</p>
```

Replace with:
```hbs
<p class="hero-tagline">文学数字艺术的在线展览 · FREE &amp; LONG-TERM EXHIBITION</p>
<p class="hero-desc">{{@site.description}}</p>
```

**Step 3: Update CSS for new hero title classes**

In `main.css`, find the `.het-oversize` block (~line 153). **Add** these new rules after the existing `.het-oversize.ghost-stroke` rule:

```css
.het-oversize.het-cn {
  font-family: 'Noto Sans SC', sans-serif;
  font-weight: 900;
  letter-spacing: -.01em;
}
.het-subtitle {
  display: block;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 10px;
  letter-spacing: .35em;
  color: var(--text3);
  text-transform: uppercase;
  margin-top: 8px;
  margin-bottom: 4px;
}
.hero-tagline {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px;
  letter-spacing: .2em;
  text-transform: uppercase;
  color: var(--acid);
  opacity: .7;
  margin-bottom: 8px;
}
```

**Step 4: Commit**
```bash
git add theme/index.hbs theme/assets/css/main.css
git commit -m "feat: replace hero title XIAO MENG DAO with 小梦岛"
```

**Verify (after uploading theme to Ghost):**
- Hero left panel shows "小梦岛" in large Chinese bold text
- "XIAO MENG DAO" appears as a small mono label below it
- "文学数字艺术的在线展览 · FREE & LONG-TERM EXHIBITION" appears above the description

---

## Task 2: Create `card-main-exhibit.hbs` Partial

**Files:**
- Create: `theme/partials/card-main-exhibit.hbs`

**Step 1: Create the file with this content**

```hbs
<a class="card-main-exhibit" href="{{url}}">
  <div class="cme-image-wrap">
    {{#if feature_image}}
      <img src="{{feature_image}}" alt="{{title}}" class="cme-image">
    {{else}}
      <div class="cme-image-fallback">{{title}}</div>
    {{/if}}
    <div class="cme-image-overlay"></div>
    <span class="cme-corner-tag">{{#if featured}}FEATURED{{else}}LATEST{{/if}}</span>
  </div>

  <div class="cme-placard">
    <div class="cme-num">NO.001</div>
    <div class="cme-kicker">
      {{#if primary_tag}}{{primary_tag.name}}{{else}}EXHIBIT{{/if}}
      <span class="cme-kicker-sep">·</span>
      {{reading_time}}
    </div>
    <h2 class="cme-title">{{title}}</h2>
    {{#if custom_excerpt}}
      <p class="cme-excerpt">{{custom_excerpt}}</p>
    {{else if excerpt}}
      <p class="cme-excerpt">{{excerpt words="30"}}</p>
    {{/if}}
    <div class="cme-foot">
      <span class="cme-date">{{date format="YYYY.MM.DD"}}</span>
      <span class="cme-enter">→ 进入展览</span>
    </div>
  </div>
</a>
```

**Step 2: Commit**
```bash
git add theme/partials/card-main-exhibit.hbs
git commit -m "feat: add card-main-exhibit partial"
```

---

## Task 3: Create `card-exhibit.hbs` Partial

**Files:**
- Create: `theme/partials/card-exhibit.hbs`

**Step 1: Create the file with this content**

```hbs
<a class="card-exhibit" href="{{url}}">
  <div class="ce-thumb">
    {{#if feature_image}}
      <img src="{{feature_image}}" alt="{{title}}" class="ce-thumb-img">
    {{else}}
      <div class="ce-thumb-fallback">{{@number}}</div>
    {{/if}}
  </div>
  <div class="ce-info">
    <div class="ce-num">NO.{{pad_number @number 3}}</div>
    <div class="ce-kicker">{{#if primary_tag}}{{primary_tag.name}}{{else}}EXHIBIT{{/if}}</div>
    <h3 class="ce-title">{{title}}</h3>
    <div class="ce-meta">{{date format="YYYY.MM.DD"}}</div>
  </div>
  <div class="ce-arrow">→</div>
</a>
```

> **Note on `{{pad_number}}`:** Ghost does not have a built-in `pad_number` helper. Use a plain `{{@number}}` instead and style the number with CSS. Replace `NO.{{pad_number @number 3}}` with just `{{@number}}` formatted in the placard, e.g.:
> ```hbs
> <div class="ce-num">{{@number}}</div>
> ```
> CSS will handle leading zeros visually if desired, or just show 1, 2, 3...

**Revised safe version (no custom helpers):**
```hbs
<a class="card-exhibit" href="{{url}}">
  <div class="ce-thumb">
    {{#if feature_image}}
      <img src="{{feature_image}}" alt="{{title}}" class="ce-thumb-img">
    {{else}}
      <div class="ce-thumb-fallback">{{@number}}</div>
    {{/if}}
  </div>
  <div class="ce-info">
    <div class="ce-num-label">EXHIBIT {{@number}}</div>
    <div class="ce-kicker">{{#if primary_tag}}{{primary_tag.name}}{{/if}}</div>
    <h3 class="ce-title">{{title}}</h3>
    <div class="ce-meta">{{date format="YYYY.MM.DD"}}</div>
  </div>
  <div class="ce-arrow">→</div>
</a>
```

**Step 2: Commit**
```bash
git add theme/partials/card-exhibit.hbs
git commit -m "feat: add card-exhibit partial"
```

---

## Task 4: Update `index.hbs` Gallery Loop

**Files:**
- Modify: `theme/index.hbs` (the `gallery-grid` section, lines 85–98)

**Step 1: Replace the foreach block inside `.gallery-grid`**

Find this block (lines 85–91):
```hbs
{{#foreach posts}}
  {{#if @first}}
    {{> "card-wide"}}
  {{else}}
    {{> "card-row"}}
  {{/if}}
{{/foreach}}
```

Replace with:
```hbs
{{!-- Main Exhibit: featured post first, fallback to latest --}}
{{#get "posts" filter="featured:true" limit="1"}}
  {{#foreach posts}}
    {{> "card-main-exhibit"}}
  {{/foreach}}
  {{else}}
  {{#foreach ../posts limit="1"}}
    {{> "card-main-exhibit"}}
  {{/foreach}}
{{/get}}

{{!-- Regular Exhibits: 2-column grid --}}
<div class="exhibit-grid">
{{#foreach posts}}
  {{#unless @first}}
    {{> "card-exhibit"}}
  {{/unless}}
{{/foreach}}
</div>
```

> **Important Ghost Handlebars caveat:** The `{{else}}` block of `{{#get}}` and `../posts` context access may behave unexpectedly across Ghost versions. If the featured fallback doesn't work correctly in the browser, simplify to:
> ```hbs
> {{#foreach posts limit="1"}}
>   {{> "card-main-exhibit"}}
> {{/foreach}}
> <div class="exhibit-grid">
> {{#foreach posts}}
>   {{#unless @first}}
>     {{> "card-exhibit"}}
>   {{/unless}}
> {{/foreach}}
> </div>
> ```
> This always uses the latest post as main exhibit (simpler, reliable).

**Step 2: Commit**
```bash
git add theme/index.hbs
git commit -m "feat: update gallery loop to use new exhibit cards"
```

---

## Task 5: Add CSS for New Card Styles

**Files:**
- Modify: `theme/assets/css/main.css`

**Step 1: Find the `/* ══ GALLERY SECTION ══ */` comment (~line 267)**

**Add the following new CSS block AFTER the existing `.gg-h-filter` / `.gg-f` rules (after line ~285), BEFORE the `/* wide card */` comment:**

```css
/* ══ MAIN EXHIBIT CARD ══ */
.card-main-exhibit {
  display: block;
  border-bottom: 1px solid var(--ghost);
  cursor: crosshair;
  transition: background .15s;
  animation: slideUp .5s ease .25s forwards; opacity: 0;
}
.card-main-exhibit:hover { background: var(--ghost3); }

.cme-image-wrap {
  position: relative;
  height: 280px;
  overflow: hidden;
  background: var(--dark2);
}
.cme-image {
  width: 100%; height: 100%;
  object-fit: cover; opacity: .55;
  transition: opacity .3s;
}
.card-main-exhibit:hover .cme-image { opacity: .65; }
.cme-image-fallback {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%;
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(48px, 8vw, 90px);
  color: transparent;
  -webkit-text-stroke: 1.5px rgba(255,255,255,.06);
  letter-spacing: -.02em; user-select: none;
  padding: 24px; text-align: center; line-height: .88;
}
.cme-image-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(12,11,9,.85) 0%, transparent 55%);
}
.cme-corner-tag {
  position: absolute; top: 20px; right: 20px;
  font-size: 8px; letter-spacing: .25em; text-transform: uppercase;
  color: var(--acid); border: 1px solid rgba(212,242,60,.3);
  padding: 4px 10px; z-index: 2;
}
.cme-placard {
  padding: 24px 32px 28px;
}
.cme-num {
  font-size: 9px; letter-spacing: .2em; color: var(--text3);
  margin-bottom: 10px;
}
.cme-kicker {
  font-size: 9px; letter-spacing: .2em; text-transform: uppercase;
  color: var(--text3); margin-bottom: 12px;
}
.cme-kicker-sep { margin: 0 6px; }
.cme-title {
  font-family: 'Noto Sans SC', sans-serif; font-weight: 900;
  font-size: 22px; line-height: 1.4; color: var(--text);
  margin-bottom: 12px;
}
.cme-excerpt {
  font-family: 'Noto Sans SC', sans-serif; font-weight: 300;
  font-size: 13px; line-height: 1.85; color: var(--text2);
  margin-bottom: 18px;
}
.cme-foot {
  display: flex; align-items: center; justify-content: space-between;
}
.cme-date { font-size: 9px; color: var(--text3); letter-spacing: .1em; }
.cme-enter {
  font-size: 9px; color: var(--text3); letter-spacing: .15em;
  transition: .15s;
}
.card-main-exhibit:hover .cme-enter { color: var(--acid); }

/* ══ EXHIBIT GRID ══ */
.exhibit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.card-exhibit {
  display: flex; align-items: stretch;
  border-bottom: 1px solid var(--ghost);
  border-right: 1px solid var(--ghost);
  cursor: crosshair; transition: background .15s;
  animation: slideUp .5s ease .35s forwards; opacity: 0;
  min-height: 100px;
}
.exhibit-grid .card-exhibit:nth-child(even) { border-right: none; }
.card-exhibit:hover { background: var(--ghost3); }

.ce-thumb {
  width: 120px; flex-shrink: 0;
  overflow: hidden; background: var(--dark2);
}
.ce-thumb-img {
  width: 100%; height: 100%;
  object-fit: cover; opacity: .6;
  transition: opacity .3s; display: block;
}
.card-exhibit:hover .ce-thumb-img { opacity: .75; }
.ce-thumb-fallback {
  display: flex; align-items: center; justify-content: center;
  width: 100%; height: 100%;
  font-family: 'Unbounded', sans-serif; font-weight: 900;
  font-size: 28px; color: var(--text3); opacity: .4;
}
.ce-info {
  flex: 1; padding: 16px 20px;
  display: flex; flex-direction: column; gap: 4px;
}
.ce-num-label {
  font-size: 8px; letter-spacing: .2em; color: var(--text3);
}
.ce-kicker {
  font-size: 8px; letter-spacing: .15em; text-transform: uppercase;
  color: var(--text3);
}
.ce-title {
  font-family: 'Noto Sans SC', sans-serif; font-size: 13px;
  font-weight: 700; color: var(--text); line-height: 1.45;
  flex: 1;
  /* Clamp to 2 lines */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ce-meta { font-size: 9px; color: var(--text3); letter-spacing: .08em; }
.ce-arrow {
  display: flex; align-items: center;
  padding: 0 16px; font-size: 14px;
  color: var(--text3); flex-shrink: 0; transition: .15s;
}
.card-exhibit:hover .ce-arrow { color: var(--acid); transform: translateX(3px); }

/* ══ RESPONSIVE: exhibit grid ══ */
@media (max-width: 768px) {
  .exhibit-grid { grid-template-columns: 1fr; }
  .exhibit-grid .card-exhibit { border-right: none; }
}
```

**Step 2: Commit**
```bash
git add theme/assets/css/main.css
git commit -m "feat: add CSS for card-main-exhibit and exhibit-grid"
```

---

## Task 6: Package & Deploy to Ghost

**Step 1: Create the theme zip**

From the project root:
```bash
cd /d/个人/new-blog
# Remove old zip if exists
rm -f xiaomengtao-theme.zip
# Zip the theme directory (must not include the top-level 'theme' folder name inside)
cd theme && zip -r ../xiaomengtao-theme.zip . && cd ..
```

Or on Windows PowerShell:
```powershell
cd D:\个人\new-blog\theme
Compress-Archive -Path * -DestinationPath ..\xiaomengtao-theme.zip -Force
```

**Step 2: Upload to Ghost Admin**
- Go to Ghost Admin → Settings → Design → Change theme → Upload theme
- Upload `xiaomengtao-theme.zip`
- Activate it

**Step 3: Verify in browser**
- [ ] Hero: "小梦岛" shows as large Chinese title (not three English words stacked)
- [ ] "XIAO MENG DAO" appears as small mono sub-label
- [ ] "文学数字艺术的在线展览" tagline visible
- [ ] Gallery: first card is full-width main exhibit with image background
- [ ] Remaining posts appear in 2-column grid, each with thumbnail image
- [ ] No-image posts show fallback text in the thumb area
- [ ] Hover states work (arrow turns acid yellow)
- [ ] Mobile (<768px): exhibit grid collapses to single column

**Step 4: Final commit**
```bash
git add xiaomengtao-theme.zip
git commit -m "chore: update theme zip for deploy"
```

---

## Rollback

If something looks broken after deploy, re-activate the previous theme version in Ghost Admin (it keeps the last active theme). No code changes needed to roll back.

---

## Quick Reference: File Change Summary

| File | Action | What changes |
|------|--------|-------------|
| `theme/index.hbs` | Modify | Hero title block → 小梦岛; Gallery loop → new partials |
| `theme/partials/card-main-exhibit.hbs` | **Create** | Full-width main exhibit card |
| `theme/partials/card-exhibit.hbs` | **Create** | 2-column exhibit card (image + info) |
| `theme/assets/css/main.css` | Modify | New hero CSS + new card CSS |
| `theme/partials/card-wide.hbs` | Keep | Not deleted (may be used elsewhere) |
| `theme/partials/card-row.hbs` | Keep | Used by `tag.hbs` |
