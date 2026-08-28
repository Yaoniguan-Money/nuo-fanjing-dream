# upstream/main `fa21ceb` 审计：傩面图鉴与择面演出

审计对象：`upstream/main@fa21ceb`（父提交 `3475e0d`）

对比基线：`feat/next-unified-app@0133661`

审计范围：只读对比上游提交与 Next worktree 中的 GetFaceRitual、Codex、Result、数据模型、样式和测试。上游是旧的单页运行时（`index.html` + `src/app.js` + `src/styles.css`），不能直接复制到 Next；下面给出按责任边界拆分后的迁移结论。

## 结论先行

`feat/next-unified-app` 已经拥有上游所依赖的核心数据和 3D 浮雕能力：4 个面具、8 个 reserved 槽位组成的 12 槽位 Codex、`nuo.codex.v2` 本地边界、角色/来源/签解字段，以及 `MaskReliefViewer`，均已有等价实现。因此本次迁移的主体不是数据重做，而是两个呈现层重构：

1. 坛前：把当前 Next 的 4 个静态候选面具 + 用户拖入面中，改成父提交建立的暗场氛围/真实面具资产，再采用 `fa21ceb` 最终的 7 个场景槽位、持续环绕和自动择面导演序列。
2. 傩谱：把当前全宽 12 卡墙 + 条件挂载的详情对话框，改成左侧 12 格纵向图鉴、右侧常驻显形台；获得面具从卡片位置飞入右侧查看器，详情文字随后显现。

`3475e0d` 的静态 4 面具定位、悬停变亮和“拖拽后 snap-to-face”是中间版本；`fa21ceb` 的 `chooseMask → playMaskSelectionCinematic` 已绕过该拖拽链路，最终迁移应以 `fa21ceb` 为准，不要把两套择面交互叠加。旧单页的 `window.NuoDemoAPI`、`EventBus`、`#outro` 和 `AudioEngine` 全量搬运也不符合 Next 架构；应迁移可见行为、状态和清理约束，改用 React 状态/refs、GSAP 和现有路由边界。

## 现状证据

- Next 当前 GetFaceRitual 位于 [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/get-face/get-face-ritual.tsx`]，第 31–207 行负责相机、阶段状态、4 面具选择和 Pointer 拖拽，第 209–258 行只渲染简单 altar、输入、portrait、mask、story、submitting。
- Next 当前样式 [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/get-face/get-face-ritual.css`] 第 1–37 行是简单的暗色背景、4 列/移动端 2 列面具和 drop zone，没有上游的 ambient masks、fog、beams、scene mask front/back 或 orbital layout。
- Next 当前 Codex [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/codex/codex-experience.tsx`] 第 33–54 行会为 collected 卡渲染原始面具 front，第 57–110 行把详情作为条件挂载的 modal，第 112–158 行使用全宽卡墙；样式 [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/codex/codex.css`] 第 12 行默认 6 列、第 28 行起为 overlay detail。
- Next 数据 [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/domain/get-face/data.ts`] 第 85–123 行已具有上游相同的 4 masks、roles、`codex.storageKey = "nuo.codex.v2"`、4 mask + 8 reserved slots、relief 和 altar 配置。
- Next 结果 [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/get-face/get-face-result.tsx`] 第 52–90 行已稳定解析角色/变体并过滤 transient 字段，第 154–173 行请求签解并在“确认此面，入傩谱”时写入 Codex；这条结果路由与旧单页 outro 不同，应保留。
- 当前 Next worktree 基线验证：`npm test -- --run`：15 files / 38 tests passed；`npm run typecheck` passed；`npm run lint` passed。该验证不证明新演出已实现，只证明现有基线没有回归。

## 逐项迁移矩阵

| 领域 | 上游事实（精确证据） | Next 当前等价 | 结论与目标映射 |
| --- | --- | --- | --- |
| 面具/图鉴数据 | `fa21ceb:src/get-face-data.js:6-47`：4 mask、12 slots、relief、altar；父提交未改数据 | `src/domain/get-face/data.ts:85-123` 完整存在，资产路径已改为 `/dream-assets/...` | **已有等价**。不要复制 `src/get-face-data.js`；只复用 `getFaceData`。 |
| Codex 持久化 | 上游 `src/codex-collection.js:31-65` 只保存 mask/role/variant/visual/reason/sources/omen，排除 wish、portrait、media、API metadata | `src/domain/codex/collection.ts:144-218` 有更严格的 TS normalize/clone/storage 边界 | **已有等价**。不迁移旧全局对象；仅验证新 UI 仍通过 `CodexCollection`。 |
| 3D 浮雕 | 上游 `src/mask-relief-viewer.js:15-141` 为图片生成 PNG relief，支持 pointer 旋转、wheel 缩放、reset、dispose/fallback | `src/features/codex/mask-relief-viewer.ts` 已是 Next/Three 等价实现，CodexDetail 第 67–83 行已 mount/dispose | **已有等价**。不改 viewer 算法；改造详情容器时保留 loading/fallback/reset/cleanup。 |
| 3475 氛围层 | `3475e0d` 在 `src/app.js:529-584` 加入真实 PNG 面具、5 个 ambient 面具、静态暗场布局；`index.html:40-48` 加 ritual-atmosphere；`src/styles.css` 的 Dragon Altar 段加入 fog/beams/ambient CSS | Next 只有 `.get-face-altar` 渐变，没有 ambient DOM 或真实面具层 | **必须迁移（父提交基础）**。目标是 `get-face-ritual.tsx` 渲染 atmosphere/ambient/scene-mask，CSS 放入 `get-face-ritual.css`；图片通过 `getFaceData.masks[*].asset`，不要复制旧 HTML/相对 `assets/` 路径。 |
| 3475 静态布局 | 父提交的 `ALTAR_MASK_LAYOUT` 为 4 个固定位置，`layoutRing` 和 `_float` 浮动；hover 用 `is-near`；`snapMaskToFace` 为用户拖拽后 fade/snap | Next 目前正是 4 个按钮 + Pointer drag + drop zone | **不应按最终形态迁移**。这些行为被 `fa21ceb` 的 7 槽位导演序列替代；可以保留可访问的状态边界，但不要同时保留 drop zone 作为第二套择面入口。 |
| 最终场景槽位 | `fa21ceb:src/app.js:555-616`：`ALTAR_MASK_INDICES = [0,2,1,3,0,1,2]`；每槽位用 `maskIndex`，动态计算 x/y/scale/opacity/zIndex/rotationZ，并以 4.2s 间隔循环 orbit | Next 没有 scene mask 节点或 orbit | **必须迁移**。在 `get-face-ritual.tsx`/新建同目录 scene helper 中定义该常量和 ref；重复 mask 是刻意的视觉槽位，不要去重。 |
| 择面触发 | `fa21ceb:src/app.js:654-663`：wish 通过 `resolveVisual` 得到 index，`selectedSceneMask` 取第一个同 `data-mask-index` 的节点，直接调用 `playMaskSelectionCinematic()` | Next `continueFromPortrait` 第 110–114 行只 dispatch `maskSelected`，随后等待用户拖拽 | **必须迁移最终触发语义**。保留 `resolveVisual`/`selectedMaskIndex` 作为领域输入，但 mask 阶段挂载后由演出自动开始；完成后 dispatch `maskSnapped`/进入 story。 |
| 择面阶段 | `fa21ceb:src/app.js:1294-1338`：停 orbit、阶段 `selecting → spinning → ejecting → revealing → impact → blackout`；隐藏标题/输入；中段 3 次完整共享转动；1.70s 后其他节点向外弹出并消失；chosen 前冲、翻转 180→360、重击/锣/flash、放大 4.8→7.2、ritual 淡出；onComplete 进入 story | Next 无阶段动画，`data-phase="mask"` 时仍显示静态文案和 drop zone | **必须迁移**。建议新增 `src/features/get-face/altar-scene.ts` 保存纯函数/阶段类型，组件中用 GSAP timeline refs；`data-ceremony-phase` 或等价 DOM 属性供测试/调试，不搬运全局 ceremony API。 |
| 择面媒体处理 | 上游触发 `AudioEngine.playCue("suck"/"heavy"/"gong")`、`impact`、`crush`、flash；父提交还隐藏 topbar、做 ritual parallax | Next 无 AudioEngine，但已有 GSAP/threshold runtime lifecycle | **迁移结果，不迁移实现**。视觉/阶段/flash 必须存在；声音可接 Next 的最小 client 音效适配或无音效降级，但不能引入旧全局 `AudioEngine`。所有 timeline 必须在 unmount/pagehide kill。 |
| Codex 卡墙模型 | `fa21ceb:src/app.js:868-902`：count 分母改为 `CODEX_DATA.slots.length`（12）；所有未收录槽位显示 `locked`、`未得之面`；编号为 `谱 · NN`；card 不再渲染 front 图片；获得卡显示 `acquired-idle`/`已 · 获` | `codex-model.ts:15-27` 已正确产生 4 mask + 8 reserved；`codex-experience.tsx:33-54` 仍渲染 collected front；count 第 154 行分母为 `data.masks.length`（4） | **必须迁移 UI，不改核心模型**。`codex-model.ts` 可继续保留 reserved 语义，但展示层应统一未收录视觉为 locked；count 改为 `data.codex.slots.length`；卡片仅显示 glyph/back、`谱 · NN`、`未得之面`/role 名称和已获得标记。 |
| Codex 初始显形台 | 上游 `index.html:132-151` 增加 empty state；`buildCodex` `src/app.js:868-880` 打开 Codex 时 detail 常驻、viewer/fallback 隐藏、empty state 显示 | Next 只有 `activeSlot` 非空才挂载 `CodexDetail`（第 156 行） | **必须迁移**。Codex 页面始终渲染右侧 detail shell；无 active slot 时显示“点击已获得面具，显形入鉴”，不显示 viewer。 |
| Codex 打开演出 | `fa21ceb:src/app.js:904-953`：`codexState = selected`，卡加 `selected opening`；mount relief/fallback；以 source card rect 和 viewer rect 计算起点；stage `scale .26 → 1`、`rotationY 0→180→360`，copy fade-up；完成为 `revealed` | Next `open` 第 129–133 行只 setActiveSlot，详情立即出现；无 selected/revealed 状态和飞入动画 | **必须迁移**。目标文件为 `codex-experience.tsx` + `codex.css`；使用 refs 计算起点，timeline 状态至少 `locked/selected/revealed`，防止重复点击和 stale timeline。 |
| Codex 详情关闭 | `fa21ceb:src/app.js:956-970`：kill timeline、dispose viewer、恢复 empty state、隐藏 viewer、清 transform/copy、移除 body class、恢复 focus；Escape 在 `1002-1007` 绑定 | Next Escape/focus restore 已有（第 134–150 行），viewer unmount 也会 dispose，但没有常驻 empty state 和动画 reset | **部分已有等价，需补 UI/动画 reset**。保留 React 的 Escape/focus 方案，不迁移 body class/global querySelector。 |
| Codex 清空 | `fa21ceb:src/app.js:972-976` 要 confirm，清空 `nuo.codex.v2` 并重建图鉴 | Next 第 138–143 行已有 confirm/clear/set entries | **已有等价**。只更新文案/计数为 12；不要删除 session 或 dream data。 |
| 移动端/响应式 | 上游新增 CSS：桌面左侧 42vw + 3×4 网格、`max-width:900` 为 2 列，`max-width:700` 改纵向滚动、detail 68vh、隐藏 close、restart 回流；ritual `max-width:800` 缩 ambient/scene mask | Next Codex 是 6→4→3 列，detail 是 modal；Ritual 只有 `max-width:620` 的 2 列 | **必须迁移最终布局约束**。详情见下方验收标准；不要照搬旧绝对定位 CSS 到 JSX 之外，避免 SSR/滚动溢出问题。 |
| Result/旧 outro | 上游旧单页在 `finishStory` 后进入 `#outro` ending，再点击进入 Codex；`fa21ceb` 没有改变结果数据协议 | Next 走 `/dream/[cardId]` → `/result`，`DreamResult` 再渲染 `GetFaceResult`，确认按钮进入 Codex | **已有等价/不应迁移旧实现**。保留 Next 的 route、omen API、transient whitelist 和显式确认；只把新 Codex 视觉接到 `GetFaceResult` 的 `enterCodex`。 |
| 调试接口 | `fa21ceb:src/app.js:285-303` 新增 `NuoDemoAPI.codex.getState`、`ceremony.getState/replay/reset` | Next 无 `window.NuoDemoAPI` | **不应迁移旧全局 API**。测试通过纯函数、组件 `data-*` 属性或受控 props 观察阶段；若确需调试，只做开发环境局部 hook。 |

## 精确 Next 文件映射

### 1. 坛前演出

- [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/get-face/get-face-ritual.tsx:31-207`]：保留 name/wish/portrait/session/API 流程；将当前 mask drag 逻辑替换为场景节点 refs、演出阶段和 timeline 生命周期。`continueFromPortrait` 仍用 `resolveVisual(getFaceData, state.wish)`，但自动启动择面；timeline 完成后再触发 `maskSnapped`。camera cleanup、session storage 和 `/api/dream/match` 不动。
- 建议新增 [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/get-face/altar-scene.ts`]：放 `ALTAR_MASK_INDICES`、`AltarScenePhase`、`altarOrbitPosition(slot, phase, viewport)` 和 timeline 可测试的关键时点/动作描述；GSAP DOM 操作仍由 client component 执行。若实现者选择不新建文件，以上责任必须清晰收敛在 `get-face-ritual.tsx`，不能散落到 domain。
- [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/get-face/get-face-ritual.css:1-37`]：加入父提交保留的 ritual atmosphere、5 个 ambient mask、fog/beams、front/back scene mask 的暗场裁切与移动端规则。React 资产路径必须来自 `mask.asset`，不要写 `assets/masks/...`。
- 仅在需要复用背景时读取 [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/public/dream-assets/altar/dragon-altar-style.png`]；该资产已存在，不新增旧 `assets/` 目录。

### 2. 傩面图鉴

- [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/codex/codex-experience.tsx:33-54`]：卡片改成最终上游的 back-only 语义，仍使用真实 `<button>`、disabled locked、Enter/Space 与 aria label；不要退回上游 `div role="button"`。计数来自 `data.codex.slots.length`。
- [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/codex/codex-experience.tsx:57-110`]：重构 `CodexDetail` 为 `slot: CodexSlotView | null` 的常驻右侧显形台。null 时仅显示 empty state；有 slot 时保留 relief loading/ready/fallback、sources、omen、asset notice 和 reset。打开/关闭动画使用该组件的 viewer/copy refs，不能用全局 class/query selector。
- [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/codex/codex-experience.tsx:112-158`]：保留 collection/storage/clear/Escape/focus-return，但把 `activeSlot` 扩展为 presentation state；打开卡片时记录 source rect，关闭时 kill timeline、隐藏 viewer、恢复 empty state 和焦点。结果页传入的 collection 仍是唯一持久化入口。
- [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/codex/codex-model.ts:15-41`]：数据模型基本不改。可新增 presentation-only label/state helper，但不把 reserved 槽位写入 collection，也不改变 `collectedCount` 的“只数 entry”约束。
- [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/codex/codex.css:1-59`]：将桌面布局改为左侧 42vw、3 列×4 行、右侧 detail；补齐 900/700 breakpoint、empty state、selected/opening/revealed、viewer column 和 copy fade。保留现有 CSS 的 `prefers-reduced-motion`，并扩展到新 timeline/scene，不得让降 motion 仍播放长演出。
- [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/codex/mask-relief-viewer.ts:1-...`]：不改算法；只确认新常驻 detail 在 slot 切换、关闭和 unmount 时调用 dispose，fallback 仍显示原始视觉母体。

### 3. 结果页与不迁移项

- [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/get-face/get-face-result.tsx:52-200`]：不重做 result model、omen 请求或存储白名单。仅需保证确认按钮进入新 Codex 后，已收录条目能在常驻图鉴中出现；若为无 storage 环境，现有错误提示/不可确认语义保留。
- [`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/dream-result/dream-result.tsx:14-40`]、[`/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/app/dream/[cardId]/page.tsx:1-14`]：不迁移旧 `#outro`、`finishStory`、`location.reload()` 和旧单页导航。Next 的路由和显式“确认此面，入傩谱”是当前架构边界。
- 不复制上游 `index.html`、`src/app.js`、`src/styles.css`、`src/get-face-data.js`、`src/codex-collection.js`、`src/mask-relief-viewer.js`；它们只作为行为证据。

## 验收标准

### A. 坛前最终择面

1. 在 desktop 和 mobile 完成阈门→姓名→愿望→portrait 后，坛前出现暗场氛围：fog、beam、ambient 面具和真实 PNG 面具；原始图片矩形不能以白/灰卡片形式暴露。相机仍是本机预览，不截帧、不上传、不进入 Codex。
2. 视觉场景有 7 个节点，槽位 mask index 精确为 `[0, 2, 1, 3, 0, 1, 2]`；重复槽位必须保留，选中某个 mask index 时只取第一个匹配节点作为 chosen，其余重复节点仍参与被弹出。
3. 由愿望确定 selected index 后，不需要用户拖动 drop zone；演出自动按 `selecting → spinning → ejecting → revealing → impact → blackout → story` 推进。演出中输入/标题不可重复触发，旧 orbit timeline 被 kill。
4. 演出可观察结果：至少约 3 次共享环绕；其他面具向外弹出并淡出；chosen 前冲、front/back 翻面（180→360）、放大/flash/冲击后坛前淡出；最终显示“你已经入戏”和“进入第一幕”，三幕选择与 API match 链路仍能完成。
5. 快速刷新、路由离开、`pagehide`、组件卸载不会留下 GSAP ticker/timeline、相机流或 viewer 资源；`prefers-reduced-motion` 下应缩短/跳过长动画但仍自动进入 story，不能卡在 mask 阶段。

### B. 傩面图鉴

1. Codex 初始显示 12 个槽位，计数为 `已收录 N / 12`；4 个面具槽和 8 个 reserved 槽位的领域语义保持不变。未收录项统一为暗色 back-only 卡，显示 `谱 · NN`、`未得之面`、`锁 · 未得`；已收录项显示 role 名称、`已 · 获`，不在卡片中提前显示原始 PNG front。
2. desktop 布局为左侧约 42vw 的 3 列×4 行可滚动墙，右侧约 50% 的常驻显形台；右侧未选中时显示 empty state，viewer/fallback 和详情文字隐藏。Codex 标题文案为“面具图鉴”并带 `(N / 12)`。
3. 点击或键盘 Enter/Space 激活已收录卡：卡片获得 selected/opening 状态；右侧 relief/fallback 从卡片中心位置飞入，完成一次 3D Y 轴翻转后 copy fade-up，最终进入 revealed。重复激活同一已 revealed 卡不得重置或叠加 timeline；locked/reserved 卡不可打开。
4. viewer 仍支持 drag 旋转、wheel 缩放、复位；Three 不可用时显示原始视觉母体 fallback。关闭按钮或 Escape 应 kill 动画、dispose viewer、恢复 empty state、移除 selected/opening、恢复触发卡 focus；清空需要 confirm，清除后仍停留在空图鉴。
5. breakpoint：`<=900px` 左墙约 44vw/2 列、右 detail 约 49vw；`<=700px` 标题/操作/卡墙/显形台纵向排列，卡墙 3 列且页面可滚动，detail 约 68vh，隐藏 close 但不能丢失 Escape/返回路径，restart 置于底部。移动端不允许固定层遮住所有卡片或导致 body 无法滚动。
6. 视觉减少动画时仍能访问卡片和详情；焦点、aria label、disabled locked 语义不能因动画或常驻 detail 回归。

### C. 回归与测试要求

- 保持当前 38 个测试全部通过，并补充纯函数测试：7 槽位常量/重复节点、orbit pose 的有限值和 phase transitions；不要依赖真实 RAF/音频/WebGL。
- 更新 Codex 组件测试：计数断言从 `1 / 4` 改为 `1 / 12`；验证 12 张 card、初始 empty state、只显示 back-only、键盘打开、动画完成后的 viewer/detail、Escape focus restore、clear confirm 和 locked 不可打开。
- 新增 GetFaceRitual 的组件/场景测试或可测试 helper：完成 portrait 后会自动启动择面，timeline 完成后进入 story；重复触发、卸载/pagehide 会 kill；减少动画模式不会卡住。
- 运行并记录：`npm test -- --run`、`npm run typecheck`、`npm run lint`；再做至少一次 desktop（>900px）和 mobile（<=700px）浏览器手动验收，检查卡墙滚动、右侧显形台、7 面具演出和 3D fallback。

## 审计边界与工作区说明

本审计没有修改 runtime 源码、依赖、配置或任何 Git 分支/提交；仅写入本报告。目标 worktree 在审计开始时已有 `.autonomous-executor/config.json` 修改和 `.autonomous-executor/logs/` 未跟踪内容，未对其作清理或覆盖。报告中的“必须迁移”指最终用户可见行为和生命周期约束，不指复制旧单页实现。
