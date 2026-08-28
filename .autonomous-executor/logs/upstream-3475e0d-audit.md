# upstream/main `3475e0d` 审计：Refine ritual altar mask atmosphere

## 1. 审计范围与基线

- 目标提交：`3475e0d0122303e5e96f0ee1af741ea578ab8408`，父提交为 `06d55c2`；只审计该提交本身，不把其后 `fa21ceb` 的 orbit/Codex 重做混入迁移范围。
- Next 基线：`feat/next-unified-app` → `01336617e206c34f86b53485cf03d49acf0f7248`。
- 审计方式：通过 `git show <ref>:<path>` 读取两个 ref，未 checkout、未修改运行时代码。当前工作目录 checkout 分支是 `fix/dream-card-delivery`，因此以下“Next 基线”均明确指向 `feat/next-unified-app` ref，而不是工作目录 HEAD。
- 目标提交实际只改 `index.html`、`src/app.js`、`src/styles.css`；没有改 `src/domain/**`、Codex 数据/协议、接口、路由或图片二进制资产。

## 2. 结论摘要

`3475e0d` 是一次“龙坛择面”表现层重构：把旧版 SVG 线稿龙坛和抽象面具占位，换成“暗场 + 三层雾 + 光束 + 五枚环境傩面 + 四枚真实面具”的静态祭坛构图，并把择面从旋转 carousel 改成固定构图中的聚焦、拖拽、吸附演出。它同时降低尘埃数量、用帧合并的反向 parallax 控制面具层和氛围层，并在拖面吸附时淡出其他面具与远/中雾。

Next 已经具备相同的四张面具图、`dragon-altar-style.png`、`resolveVisual` 匹配、拖入 `face-drop-zone` 后进入三幕故事，以及独立的 Codex/程序化浮雕查看器。因此资产和领域逻辑不需要迁移；真正缺口是 `GetFaceRitual` 的 DOM/CSS 氛围层、静态祭坛构图、择面/显形/戴面三个演出阶段和对应的拖拽视觉反馈。

## 3. 3475e0d 的全部新增/改变行为

### 3.1 氛围 DOM 与层级

`index.html:42-47` 在 `#ritual` 中新增 `.ritual-atmosphere`，包含 `far/mid/front` 三层雾、三个光束节点和 `#ritualAmbientMasks` 环境面具容器。该层是 `aria-hidden`、不可交互的纯视觉背景；原有 `#dragonField`/SVG 仍在 DOM，但新 CSS `src/styles.css:715` 将其隐藏。

`src/app.js:537-561` 新增两组确定性布局：

| 环境槽 | 使用面具 | class | 视觉意图 |
|---|---:|---|---|
| 1 | 2（束发圆目） | `altar-ambient altar-foreground altar-left` | 左前景，宽、重度模糊、暗化 |
| 2 | 1（方冠笑相） | `altar-ambient altar-foreground altar-right` | 右前景，镜像/旋转 |
| 3 | 3（高冠静相） | `altar-ambient altar-mid altar-left-mid` | 左中景 |
| 4 | 0（翘冠长须） | `altar-ambient altar-mid altar-right-mid` | 右中景 |
| 5 | 2（束发圆目） | `altar-ambient altar-far altar-center-far` | 中央远景，最淡 |

环境槽实际复用 `MASKS[index].asset`，不是新图片；`src/styles.css:717-731` 定义了其绝对定位、`screen` 混合、模糊/亮度/对比度/棕褐化、三层雾的动画和三道斜向光束。

### 3.2 主面具由占位 SVG 改为真实图片

提交删除 `obscuredMaskSvg`（旧的抽象路径/线条），并在 `src/app.js:563-569` 让四个主面具使用真实 `maskImage()`，结构为 `.mask.scene-mask > .mask-card.mask-photo > img.scene-mask-image + i`。图片统一 `object-fit: cover`，再叠加渐变遮罩和径向“遮面”层；默认仍然朦胧，不是直接展示清晰卡片。

`ALTAR_MASK_LAYOUT`（`src/app.js:537-541`）把四张面具固定在祭坛构图中，而不是环形 carousel：

| 面具索引 | x (% viewport) | y (% viewport) | scale | opacity | z |
|---:|---:|---:|---:|---:|---:|
| 0 | 0 | -24 | .94 | .50 | 18 |
| 1 | -24 | -8 | .66 | .29 | 12 |
| 2 | 25 | -3 | .62 | .25 | 10 |
| 3 | 13 | 18 | .48 | .18 | 7 |

`layoutRing()`（`src/app.js:573-584`）现在只按上述静态布局定位；旧的 `sin/cos` 深度排序、blur、大小和透明度计算已删除。漂浮幅度从 `y += 7` 改为 `y += 4`，周期从约 2.4 秒改为 3.6 秒起步，整体更慢、更克制。

### 3.3 入坛演出与文案阶段

`startRitual()`（`src/app.js:586-599`）新增 `body.ritual-active` 和 `#ritual.ritual-invocation` 状态。演出顺序变成：氛围整体淡入 1.25 秒 → 环境面具交错淡入 → 主面具从小/下方交错淡入 → 仅标题淡入 → 输入框可交互。初始 invocation 隐藏描述，仅保留“来者何人？”的肃静构图；提交名字后 `src/app.js:609-614` 移除 invocation，恢复“问·愿”文案。

`src/styles.css:706-745` 的视觉语义包括：纯黑到棕黑的横向暗场、强边缘暗角、祭坛光晕降至约 `.13`、顶部/深度/开发标记降至 `.13`，声音按钮降至 `.28`，以及移动端进一步压低前景面具亮度。旧的龙图不再承担焦点。

### 3.4 择面从旋转 carousel 改为固定构图聚焦

`chooseMask()`（`src/app.js:626-636`）不再把面具旋转 2.7 圈，也不再调用 `layoutRing(angle)` 重排。它停止漂浮、标记选中面具为 `.is-chosen`，然后在 2.35 秒内把选中面具移至 `x=0, y=-7.5vh`、`scale=1.06`、`opacity=.78`，完成后进入 `focusMask()`。

`focusMask()`（`src/app.js:1219-1254`）把选中面具变为 `.is-revealed`，最终保持 `x=0, y=-7.5vh, scale=1.08, opacity=.82`；不再做旧版的 mask-card `rotateY` 翻面。约 450ms 后播放重击/震动，约 1.10 秒后改为“请·面 / 把那道影子带到你面前 / 握住它。它尚未显形。”并只允许该面具开始拖拽，面具回正旋转约 `.62` 秒。

### 3.5 拖拽、吸附与进入故事

拖拽的命中与磁吸算法在该提交前已存在；3475 改变的是吸附后的演出。`snapMaskToFace()`（`src/app.js:1176-1212`）在命中后：

1. 其他主面具 `.72s` 交错淡出，并下移 20px、缩小 `.08`。
2. 环境面具、中雾、远雾同时在 `.58s` 内淡出；前雾保留，继续压住边缘。
3. 选中面具移至 `x=0,y=-45`、`scale=1.55`，耗时 `.58s`。
4. 再放大到 `scale=3.9`、透明度 `.10`，耗时 `.44s`，制造“戴入/穿越面”的冲击。
5. 文案改为“戴·面 / 你已经入戏 / [名字]，你戴上了「[面具]面」。不是它告诉你答案，而是从这一刻开始，你要用它的眼睛进入故事。”，然后显示“进入第一幕”继续按钮。

因此，3475 的产品阶段是“面具聚焦 → 用户拖入脸区 → 戴面确认 → 用户点击进入第一幕 → 三幕故事”，而不是吸附后立即切到第一幕。

### 3.6 parallax、hover 与性能

`src/app.js:1065-1074` 用 `requestAnimationFrame` 合并指针事件：非拖拽时，`#maskRing` 按 `x*5,y*3` 平移，氛围层按 `-x*5*.48,-y*3*.48` 反向平移；旧的 dragon/orb/ring 三套独立 GSAP 指针 tween 被移除。拖拽时暂停该 parallax。

`src/app.js:1159-1168` 将面具 hover 从 `rotationY/rotationX` 小幅倾斜改成 `.is-near`；`src/styles.css:738` 对 `.is-near` 提高真实图片不透明度（`.92`）并减弱遮面径向层（`.62`），不改变位置，避免破坏祭坛构图。

`makeDust()`（`src/app.js:515-530`）把全场尘埃从 42 个降为 18 个，且 `#ritual .particle-field` 在 `src/styles.css:732` 降至 `.42` 并用 `screen`。这是为新增的大量雾/环境面具让层次和性能保持可控。

`window.resize`（`src/app.js:955`）在择面完成后不再重新布局，避免已聚焦/已拖拽的面具因窗口变化跳回初始构图；由 `altarSelectionActive` 负责门控。

`finishStory()`（`src/app.js:768-779`）进入 revelation/outro 前移除 `body.ritual-active`。这是旧单页多屏 runtime 的清理要求；Next 若用独立组件挂载，必须保证任何全局 class/listener/tween 在卸载或离开仪式时清理。

## 4. 与 Next 基线的差异分类

### 4.1 必须迁移（行为或视觉尚未等价）

1. **祭坛氛围层**：在 `src/features/get-face/get-face-ritual.tsx` 的 `.get-face-altar` 附近增加纯视觉 atmosphere/particle/ambient-mask DOM；在 `src/features/get-face/get-face-ritual.css` 迁移三层雾、三束光、五枚环境面具、前雾暗角、混合模式和移动端参数。Next 目前只有 `get-face-altar` 的单层渐变与同心环（`get-face-ritual.css:1-3`），没有任何环境面具、光束、动画雾或粒子。
2. **真实面具的祭坛构图**：Next 当前 `get-face-ritual.tsx:239-248` 是四列/两列 grid，只有选中项可见且其他项 `pointer-events:none`；需要改为四枚 `.scene-mask` 的叠放构图，仍仅允许 `selectedMaskIndex` 拖拽。使用 `data.masks[index].asset`，并保留遮罩层，默认不能变成明亮的四张卡片。
3. **固定定位与不旋转择面**：用上述 4 组 x/y/scale/opacity/z 值替换 grid；不要引入旧 carousel 的 angle/sin/cos/2.7 圈旋转。选择后停止漂浮并把选中面具聚焦到 `y=-7.5vh`，窗口 resize 不应把它重置。
4. **聚焦与“戴面”中间阶段**：Next 当前 `continueFromPortrait()` 直接进入 `phase=mask`，拖拽命中后 reducer 直接进入 `phase=story`（`src/domain/get-face/session.ts:88-99`），没有 focusMask 的延迟文案、磁吸后的戴面确认和“进入第一幕”按钮。要在 `GetFaceRitual` 中增加 UI 演出状态，必要时扩展 session phase/事件（建议将其作为产品状态明确建模，而非用不可审计的定时器绕过状态机）。
5. **拖拽吸附演出**：必须实现“其他面具淡出 → 中/远雾淡出 → 选中面具放大并淡出 → 戴面文案/继续按钮”；命中区仍对应现有 `.face-drop-zone`，不改变 camera/愿望/三幕数据边界。
6. **反向 parallax 与 hover**：在 ritual root 内以单个 rAF 更新 mask layer 与 atmosphere layer，拖拽时暂停；hover 只减弱遮面并提高图片，不做位置旋转。避免在 React render 中高频 setState。
7. **粒子数量与降噪**：若迁移粒子层，初始生成 18 个并保持 `.42` 左右 screen 混合；不可把旧 42 个粒子原样带入。
8. **入坛/离坛生命周期**：入坛时氛围与面具按 `1.25s → 1.2s stagger → 1.1s stagger → 标题 → input` 的顺序显现；名字提交后隐藏 invocation 描述。离开仪式或组件卸载时停止媒体流、rAF、GSAP/定时器并移除任何全局 class/listener。

### 4.2 已有等价，不要重复迁移

1. **面具二进制资产**：Next `src/domain/get-face/data.ts:85-92` 已引用 `/dream-assets/masks/mask-01.png` 至 `mask-04.png`，且 0133661 的 `public/dream-assets/masks/` 已存在；3475 没有新增图片，也不应从旧 `assets/` 复制一份。
2. **祭坛背景资产来源**：Next `src/domain/get-face/data.ts:113-123` 已保留 `/dream-assets/altar/dragon-altar-style.png`。注意：3475 的 ritual CSS 最终改为渐变暗场并隐藏 dragon SVG；该背景仍被 Next Codex 使用，不能因仪式改动而删掉或改名。
3. **愿望匹配与面具结果**：Next `continueFromPortrait()` 已用 `resolveVisual(getFaceData, state.wish)` 设置 `selectedMaskIndex`（`get-face-ritual.tsx:110-114`），结果页也以 `selectedMaskIndex` 调用 `resolveRole`（`get-face-result.tsx:52-71`）。3475 没有改变匹配算法、角色、签解或 API payload。
4. **拖拽命中后的领域阶段**：Next 的 `maskSnapped` 事件和 `face-drop-zone` 已提供可测试的状态边界；迁移只需补出演出/确认阶段，不要把愿望、人像、摄像头数据塞入 Codex 或改写 `resolveRole`。
5. **Codex 本身**：0133661 的 `src/features/codex/codex-experience.tsx`、`codex.css`、`mask-relief-viewer.ts` 已提供独立图鉴、已收录卡片、键盘/ESC 关闭、3D 浮雕和原图 fallback；3475 没有改 Codex DOM 或行为。只需验证仪式新增 CSS 作用域不会污染 `.codex-experience`。

### 4.3 不应迁移

1. **旧 runtime DOM/事件总线**：不要复制 `#ritual`、`#ritualOrb`、`#dragonField`、`#ritualEyebrow` 等 ID，或把 `EventBus`、`switchScreen`、全局 `state` 搬进 Next；对应关系应落在 React 组件、refs、受控 session 事件和局部 CSS。
2. **龙 SVG 与抽象占位面具**：`obscuredMaskSvg` 已被删除，`.dragon-svg` 在目标视觉中明确隐藏；不要把线稿龙、抽象 veil SVG 或 carousel card 翻面带回 Next。
3. **旧版全局 topbar/depth/dev-chip/cursor 的视觉规则**：`body.ritual-active` 对它们降 opacity 是旧多屏 shell 的实现细节。Next ritual 有自己的 header/return button，最多将对应降噪样式作用域化到 `.get-face-ritual`，不要修改 `globals.css` 或 Codex 的 body 级视觉。
4. **3475 之后的 `fa21ceb` 内容**：7 枚 orbit 面具、`ceremony` API、Codex 12 槽计数/显形台等属于后续提交，不是本次迁移范围。
5. **Codex 数据/Schema/资产清单**：不改 `FaceCodexConfig`、`storageKey`、角色来源、API schema、`MaskReliefViewer`；本提交没有产品数据变更依据。

## 5. 精确 Next 文件映射

| 旧提交证据 | Next 目标 | 迁移边界 |
|---|---|---|
| `index.html:42-47` atmosphere DOM | `src/features/get-face/get-face-ritual.tsx`，`GetFaceRitual` root 内 | 新增 `aria-hidden` 氛围层、五个环境面具和粒子容器；不要复制旧 screen wrapper |
| `src/app.js:515-530` dust 18 个 | 同一组件的 `useEffect`/ref 或专用局部视觉 helper；CSS 在 `get-face-ritual.css` | 可用 GSAP/rAF，但必须可清理，不能在 render 中随机生成 |
| `src/app.js:537-584` ambient/layout/float | `get-face-ritual.tsx` 的 mask render + `get-face-ritual.css` | 4 个主面具静态 absolute 构图；5 个 ambient image 按表复用 `getFaceData.masks` |
| `src/app.js:586-620` 入坛/名字 | `get-face-ritual.tsx` 的 phase/UI 演出逻辑 | 现有 name/wish/portrait 数据流程保留；补 invocation hide 和淡入顺序 |
| `src/app.js:626-636` chooseMask | `get-face-ritual.tsx` 的 portrait→mask 过渡、局部 animation refs | 不做 carousel；停止 float、聚焦选中面具 |
| `src/app.js:1018-1063`（旧有磁吸）+ `1176-1212`（本提交吸附演出） | `get-face-ritual.tsx:149-181` drag handlers + CSS classes | 保留命中边界，补磁吸反馈、其他面具/雾淡出、戴面确认 |
| `src/app.js:1065-1074` parallax | `get-face-ritual.tsx` pointer effect/ref + ritual CSS | rAF 更新两个 layer transform，drag 时暂停 |
| `src/app.js:1159-1168` hover | `get-face-ritual.tsx:242` 的 class 绑定 + CSS | `.is-near` 只调图片/遮罩不透明度 |
| `src/styles.css:706-747` ritual 专属 CSS | `src/features/get-face/get-face-ritual.css` | 转换 selector：`#ritual`→`.get-face-ritual`、`.ritual-copy`→当前各 phase section；不要落入 `globals.css` |
| `src/app.js:768-779` ritual-active 清理 | `GetFaceRitual` effect cleanup、离开回调、路由切换 | 确认 body class、rAF、GSAP、timer、camera stream 均不会泄漏到 Dream/Codex |
| 本提交无 Codex diff | `src/features/codex/**` | 不改实现；仅做回归验证 |

## 6. 验收标准

### 6.1 视觉构图

- 进入 ritual 后无可见龙 SVG/线稿，也不是四列卡片；暗场中央有三层缓慢雾、三束低透明棕金斜光、左右前景/中景和中央远景的五枚朦胧真实面具。
- 四个主面具按 `0:(0,-24,.94,.50,z18)`、`1:(-24,-8,.66,.29,z12)`、`2:(25,-3,.62,.25,z10)`、`3:(13,18,.48,.18,z7)` 落位；默认图片暗化、棕褐化并被径向遮面，不得直接变成明亮卡片。
- 桌面宽度和 ≤800px 移动端均无横向溢出；移动端前景面具更窄、更暗，主面具仍可见且可拖入 drop zone。

### 6.2 交互时序

- 入坛演出按氛围、环境面具、主面具、标题、输入的顺序完成；首次只显示“来者何人？”焦点，提交名字后才显示愿望说明。
- 肖像确认后保留所有四枚主面具在祭坛中，但只有算法选中的一枚可拖；选中面具先完成约 2.35 秒的聚焦，再出现“把那道影子带到你面前”。不发生 2.7 圈旋转。
- hover 选中/可拖面具时只变清晰度；指针移动会让主面具层与氛围层反向轻微移动，拖拽期间暂停 parallax。
- 拖入 face zone 后依次看到其他面具淡出、中/远雾淡出、选中面具放大并淡出，随后出现“你已经入戏”和“进入第一幕”；只有点击该按钮才进入第一幕。放开在 zone 外则回到可拖状态，不丢失选中面具。

### 6.3 生命周期与回归

- 离开 ritual、进入 Dream/Result、返回山门或组件卸载后，无残留 camera stream、pointer listener、rAF、GSAP tween、timer 或全局 ritual class。
- 现有 `name → wish → portrait → mask → story → submitting → complete` 数据契约、`resolveVisual/resolveRole`、固定梦卡 API、摄像头“只预览不保存/上传”约束不改变。
- Codex 的 4 个面具槽、localStorage 收录、卡片键盘/ESC、程序化浮雕和 fallback 与 0133661 相同；Codex 页面不出现 ritual atmosphere 的五枚环境面具。
- 至少补/更新组件行为测试覆盖：默认主面具布局状态、只允许选中项拖拽、zone 内外释放、戴面确认后才进入 story；并运行 `npm run typecheck`、`npm test`、`npm run build`。

## 7. 审计证据命令

```text
git show --stat 3475e0d
git show 3475e0d -- index.html src/app.js src/styles.css
git show 0133661:src/features/get-face/get-face-ritual.tsx
git show 0133661:src/features/get-face/get-face-ritual.css
git show 0133661:src/features/codex/codex-experience.tsx
git show 0133661:src/features/codex/codex.css
git show 0133661:src/domain/get-face/data.ts
```
