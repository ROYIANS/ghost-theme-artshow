# Gallery Redesign + Main Exhibit Bug Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix card-main-exhibit not rendering (replace broken `{{#get}}` logic) and redesign card-exhibit to be image-fill gallery-wall style cards.

**Architecture:** Two changes — (1) `index.hbs` gallery loop simplified to two plain `{{#foreach}}` loops (no nested `{{#get}}`), (2) `card-exhibit.hbs` completely rewritten so image fills the card and text overlays at the bottom as a placard. Old `.ce-*` CSS classes replaced wholesale.

**Tech Stack:** Ghost Handlebars templates, vanilla CSS, no build tools. Deploy by uploading `theme/` as a `.zip` to Ghost Admin.

---

## Context: Current State

```
theme/index.hbs              ← gallery loop uses broken {{#get}} logic
theme/partials/
  card-exhibit.hbs           ← flex row with 120px thumb — needs full rewrite
  card-main-exhibit.hbs      ← KEEP AS-IS, this is fine
theme/assets/css/main.css    ← .card-exhibit and .ce-* classes need full replacement
```

Ghost Handlebars notes:
- `{{#foreach posts}}` = the page's post list (10 per page, ordered by published_at DESC)
- `{{@first}}` = true for the first iteration in a `{{#foreach}}`
- `{{#unless @first}}` = true for every iteration except the first
- `{{@number}}` = 1-based iteration index, available inside `{{#foreach}}`
- `{{excerpt words="20"}}` = truncates post excerpt to 20 words
- `{{#if custom_excerpt}}...{{else}}...{{/if}}` = show custom excerpt if set, else auto-excerpt

---

## Task 1: Fix `index.hbs` Gallery Loop

**Files:**
- Modify: `theme/index.hbs` (the gallery-grid section, currently lines ~85–105)

**Step 1: Read the current gallery-grid section**

Open `theme/index.hbs` and find the block starting with:
```hbs
{{!-- Main Exhibit: featured post first, fallback to latest --}}
{{#get "posts" filter="featured:true" limit="1"}}
```

This entire block (from `{{!-- Main Exhibit }}` comment down through `</div>` closing the `exhibit-grid`) needs to be replaced.

**Step 2: Replace the gallery loop**

Find the current block (it looks like this):
```hbs
    {{!-- Main Exhibit: featured post first, fallback to latest --}}
    {{#get "posts" filter="featured:true" limit="1"}}
      {{#foreach posts}}
        {{> "card-main-exhibit"}}
      {{/foreach}}
    {{else}}
      {{#get "posts" limit="1"}}
        {{#foreach posts}}
          {{> "card-main-exhibit"}}
        {{/foreach}}
      {{/get}}
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

Replace it with:
```hbs
    {{!-- Main Exhibit: always the first post in the list --}}
    {{#foreach posts}}
      {{#if @first}}{{> "card-main-exhibit"}}{{/if}}
    {{/foreach}}

    {{!-- Regular Exhibits: 2-column grid --}}
    <div class="exhibit-grid">
    {{#foreach posts}}
      {{#unless @first}}{{> "card-exhibit"}}{{/unless}}
    {{/foreach}}
    </div>
```

**Step 3: Verify the change looks correct**

Read the file back and confirm:
- No more `{{#get}}` in the gallery section
- First foreach uses `{{#if @first}}` to render `card-main-exhibit`
- Second foreach uses `{{#unless @first}}` inside `exhibit-grid`
- `.gg-header` (filter bar) and `.pager` are still present and unchanged

**Step 4: Commit**
```bash
cd /d/个人/new-blog
git add theme/index.hbs
git commit -m "fix: simplify gallery loop to use foreach @first instead of nested #get"
```

---

## Task 2: Rewrite `card-exhibit.hbs`

**Files:**
- Modify: `theme/partials/card-exhibit.hbs` (full rewrite)

**Step 1: Read the current file**

Read `theme/partials/card-exhibit.hbs` to see the current content (so you know exactly what to replace).

**Step 2: Overwrite with new template**

Write this exact content to `theme/partials/card-exhibit.hbs`:

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

**Step 3: Read the file back to verify**

Confirm every element is present:
- Outer `<a class="card-exhibit">` linking to `{{url}}`
- `.ce-bg` with `{{#if feature_image}}` → img / `{{else}}` → fallback div
- `.ce-overlay` (empty div for gradient)
- `.ce-placard` with `.ce-header` (NO.{{@number}} + optional tag), `.ce-title`, `.ce-excerpt` (custom or auto), `.ce-date`

**Step 4: Commit**
```bash
git add theme/partials/card-exhibit.hbs
git commit -m "feat: rewrite card-exhibit to image-fill gallery wall style"
```

---

## Task 3: Replace Card-Exhibit CSS

**Files:**
- Modify: `theme/assets/css/main.css`

This task has two parts: (A) delete the old `.card-exhibit` and `.ce-*` rules, (B) insert the new rules.

**Step 1: Read the current CSS**

Read `theme/assets/css/main.css`. Find the `/* ══ EXHIBIT GRID ══ */` section. It currently contains:
- `.exhibit-grid` — keep this structure but we'll rewrite `.card-exhibit`
- `.card-exhibit` — old flex row layout, DELETE
- `.exhibit-grid .card-exhibit:nth-child(even)` — keep
- `.card-exhibit:hover` — rewrite
- `.ce-thumb` and all `.ce-*` inside it — DELETE ALL
- `.ce-info` and all its children — DELETE ALL
- `.ce-num-label`, `.ce-kicker`, `.ce-title`, `.ce-meta`, `.ce-arrow` — DELETE ALL

**Step 2: Replace the entire EXHIBIT GRID section**

Find the block starting with `/* ══ EXHIBIT GRID ══ */` and ending just before `/* wide card */` (or the next major comment section). Replace the entire `.exhibit-grid` + `.card-exhibit` + all `.ce-*` block with:

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
```

**Step 3: Update the responsive block**

Find the `@media (max-width: 768px)` block. It currently has:
```css
  .exhibit-grid { grid-template-columns: 1fr; }
  .exhibit-grid .card-exhibit { border-right: none; }
```

Replace those two lines with:
```css
  .exhibit-grid { grid-template-columns: 1fr; }
  .exhibit-grid .card-exhibit { border-right: none; aspect-ratio: 3 / 2; }
```

**Step 4: Verify**

Read the CSS around the `/* ══ EXHIBIT GRID ══ */` section and confirm:
- No old `.ce-thumb`, `.ce-thumb-img`, `.ce-thumb-fallback`, `.ce-info`, `.ce-num-label`, `.ce-kicker`, `.ce-arrow`, `.ce-meta` remain
- All new `.ce-bg`, `.ce-bg-img`, `.ce-bg-fallback`, `.ce-overlay`, `.ce-placard`, `.ce-header`, `.ce-num`, `.ce-tag`, `.ce-title`, `.ce-excerpt`, `.ce-date` are present
- Responsive block updated with `aspect-ratio: 3 / 2`

**Step 5: Commit**
```bash
git add theme/assets/css/main.css
git commit -m "feat: rewrite card-exhibit CSS to image-fill gallery wall style"
```

---

## Task 4: Package & Deploy

**Step 1: Rebuild the theme zip**

```bash
cd /d/个人/new-blog
rm -f xiaomengtao-theme.zip
powershell.exe -Command "Compress-Archive -Path 'D:\个人\new-blog\theme\*' -DestinationPath 'D:\个人\new-blog\xiaomengtao-theme.zip' -Force"
```

Verify: `ls -lh xiaomengtao-theme.zip` should show a non-zero file.

**Step 2: Upload to Ghost Admin**
- Ghost Admin → Settings → Design → Change theme → Upload theme
- Upload `xiaomengtao-theme.zip` → Activate

**Step 3: Visual verification checklist**
- [ ] Gallery section shows a full-width `card-main-exhibit` as the first card (not just a row of small cards)
- [ ] Below the main exhibit, the `exhibit-grid` shows 2-column cards with images filling the card
- [ ] Each exhibit card has a dark gradient at the bottom with exhibit number, tag, title, excerpt, date
- [ ] Hover on an exhibit card: image brightens slightly and scales up a tiny bit (scale 1.03)
- [ ] Posts without a feature image show ghost-stroke title text as the background
- [ ] On mobile (<768px): exhibit grid becomes single column, cards become aspect-ratio 3:2

**Step 4: Commit the zip**
```bash
git add xiaomengtao-theme.zip
git commit -m "chore: rebuild theme zip for gallery redesign deploy"
```

---

## Quick Reference: All Changes

| File | Change |
|------|--------|
| `theme/index.hbs` | Replace `{{#get}}` loop with two simple `{{#foreach}}` |
| `theme/partials/card-exhibit.hbs` | Full rewrite — image-fill + bottom placard |
| `theme/assets/css/main.css` | Replace entire exhibit grid + `.ce-*` CSS block |
| `xiaomengtao-theme.zip` | Rebuild for deployment |

**Files NOT touched:**
- `theme/partials/card-main-exhibit.hbs` — correct, keep as-is
- `theme/partials/card-wide.hbs`, `card-row.hbs`, `card-grid.hbs` — keep
- Hero section in `index.hbs` — keep
- Sidebar, header, footer — keep
