# AI 风格推荐前置步骤 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 generate-ui.js 的风格描述输入前，增加一次 AI 分析调用，推荐整体视觉风格，用户可直接回车采用或修改。

**Architecture:** 新增 `recommendStyle(post)` 函数，调用同一个 OpenAI 模型，返回解释+关键词。三个模式函数（modeGenerate / modeFile / modePromptOnly）均在询问风格前调用此函数，以推荐关键词作为默认值填入交互提示。

**Tech Stack:** Node.js ESM, OpenAI SDK (`openai` npm package), readline

---

### Task 1: 新增 `recommendStyle` 函数

**Files:**
- Modify: `scripts/generate-ui.js`

**Step 1: 在 `buildPrompt` 函数之前插入 `recommendStyle` 函数**

在 `scripts/generate-ui.js` 的 `buildPrompt` 函数定义之前，插入以下代码：

```js
async function recommendStyle(post) {
  const tags = post.tags?.filter(t => !t.name.startsWith('#')).map(t => t.name).join(', ') || '无';
  const prompt = `你是一个前端设计顾问。请根据以下博客文章的内容，推荐一个最合适的整体视觉风格。

文章标题：${post.title}
文章分类：${tags}
文章摘要：${post.custom_excerpt || post.excerpt || ''}
文章正文（前500字）：
${(post.html || '').replace(/<[^>]+>/g, '').slice(0, 500)}

请按以下格式输出，不要输出任何其他内容：

【风格分析】
<一两句话，解释为什么推荐这个风格>

【推荐关键词】
<逗号分隔的风格关键词，可直接用于描述整体视觉风格，不涉及具体布局>`;

  const completion = await ai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }]
  });
  return completion.choices[0].message.content.trim();
}
```

**Step 2: 人工验证函数签名正确**

确认函数：
- 接受 `post` 对象（含 `title`, `tags`, `custom_excerpt`, `excerpt`, `html`）
- 返回 AI 输出的原始字符串（含【风格分析】和【推荐关键词】两段）
- 使用 `max_tokens: 300`（分析用，不需要多）

---

### Task 2: 新增 `askStyleWithRecommend` 交互函数

**Files:**
- Modify: `scripts/generate-ui.js`

**Step 1: 在 `recommendStyle` 函数之后插入以下函数**

```js
async function askStyleWithRecommend(post, stepLabel) {
  console.log(`${stepLabel} 分析文章风格...`);
  const recommendation = await recommendStyle(post);

  // 提取【推荐关键词】行作为默认值
  const keywordsMatch = recommendation.match(/【推荐关键词】\s*\n([\s\S]*?)(?:\n【|$)/);
  const defaultKeywords = keywordsMatch ? keywordsMatch[1].trim() : '';

  console.log('\n' + '─'.repeat(50));
  console.log(recommendation);
  console.log('─'.repeat(50) + '\n');

  const input = await ask(`风格描述（直接回车使用推荐风格，输入内容则覆盖）: `);
  return input || defaultKeywords;
}
```

**Step 2: 确认提取逻辑**

`keywordsMatch` 用正则从 AI 输出中提取【推荐关键词】下方的文字。若 AI 输出格式不符（网络异常等），`defaultKeywords` 退化为空字符串，效果等同原来的"直接回车用默认风格"，不会崩溃。

---

### Task 3: 更新 `modeGenerate`

**Files:**
- Modify: `scripts/generate-ui.js:70-97`

**Step 1: 将原来的 `ask` 调用替换**

原代码：
```js
async function modeGenerate(slug, site, post) {
  const styleHint = await ask('风格描述（直接回车使用默认风格）: ');
  console.log('\n[3/5] 构造 prompt...');
```

改为：
```js
async function modeGenerate(slug, site, post) {
  const styleHint = await askStyleWithRecommend(post, '[3/6]');
  console.log('\n[4/6] 构造 prompt...');
```

**Step 2: 更新后续步骤编号**

将 modeGenerate 内其余 console.log 里的步骤编号依次更新：
- `[4/5]` → `[5/6]`
- `[5/5]` → `[6/6]`

---

### Task 4: 更新 `modePromptOnly`

**Files:**
- Modify: `scripts/generate-ui.js:108-115`

**Step 1: 将原来的 `ask` 调用替换**

原代码：
```js
async function modePromptOnly(slug, site, post) {
  const styleHint = await ask('风格描述（直接回车使用默认风格）: ');
  console.log('\n[3/3] 构造 prompt...');
```

改为：
```js
async function modePromptOnly(slug, site, post) {
  const styleHint = await askStyleWithRecommend(post, '[3/4]');
  console.log('\n[4/4] 构造 prompt...');
```

---

### Task 5: 更新 `modeFile`

**Files:**
- Modify: `scripts/generate-ui.js:116-127`

**Step 1: 在 modeFile 中加入风格分析步骤**

原代码：
```js
async function modeFile(slug, site, post, filePath) {
  const html = readFileSync(resolve(filePath), 'utf-8')
    ...
  console.log(`[3/3] 回写到 Ghost...`);
```

改为：
```js
async function modeFile(slug, site, post, filePath) {
  await askStyleWithRecommend(post, '[3/4]');
  const html = readFileSync(resolve(filePath), 'utf-8')
    ...
  console.log(`[4/4] 回写到 Ghost...`);
```

注意：`modeFile` 模式不使用 styleHint（HTML 已写好），调用 `askStyleWithRecommend` 仅供用户参考，返回值可忽略（用 `await` 调用但不赋值）。

---

### Task 6: 更新 `main` 中的步骤总数

**Files:**
- Modify: `scripts/generate-ui.js:144`

**Step 1: 修改步骤总数计算**

原代码：
```js
const steps = promptOnly || filePath ? 3 : 5;
```

改为：
```js
const steps = promptOnly || filePath ? 4 : 6;
```

---

### Task 7: 手动测试验证

**Step 1: 运行 `--prompt-only` 模式（最快验证，不消耗主生成 token）**

```bash
cd scripts
node generate-ui.js <任意已有slug> --prompt-only
```

预期输出：
```
[1/4] 拉取站点信息...
[2/4] 拉取文章: <slug>
[3/4] 分析文章风格...
──────────────────────────────────────────────────
【风格分析】
...

【推荐关键词】
...
──────────────────────────────────────────────────

风格描述（直接回车使用推荐风格，输入内容则覆盖）:
[4/4] 构造 prompt...
✓ Prompt 已保存：...
```

**Step 2: 验证回车走推荐关键词**

在提示处直接回车，检查生成的 `.prompt.md` 文件里 `styleDesc` 是否包含 AI 推荐的关键词（而非空字符串走默认风格）。

**Step 3: 验证输入内容覆盖**

在提示处输入 `自定义风格测试`，检查 `.prompt.md` 里是否使用了 `自定义风格测试` 而非推荐关键词。

---

### Task 8: 提交

```bash
git add scripts/generate-ui.js
git commit -m "feat: add AI style recommendation before style input"
```
