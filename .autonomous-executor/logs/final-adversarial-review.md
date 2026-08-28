# feat/next-unified-app 最终对抗审查

- 审查基线：`upstream/main@fa21ceb`
- 审查对象：`feat/next-unified-app` 的 11 个提交（`b57b874..478d529`）及当前未提交的 Next Image 改动。
- 执行日期：2026-08-28
- 结论：**不建议在修复以下 P1 前推送/创建 PR/以 standalone 交付。**

## Findings

### [P1] 摄像头请求完成后仍可能在已离开肖像页时重新打开

- 位置：[get-face-ritual.tsx:123](/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/get-face/get-face-ritual.tsx:123)、[get-face-ritual.tsx:134](/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/get-face/get-face-ritual.tsx:134)、[get-face-ritual.tsx:148](/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/get-face/get-face-ritual.tsx:148)
- 触发路径：在 `portrait` 阶段点击“启镜采相”，在浏览器还未 resolve `getUserMedia()` 前立即点击“受相入坛”或“以影代相”。继续操作会先调用 `releaseCamera()`，但该函数无法停止尚未返回的 stream；随后 `startCamera()` 只检查挂载状态与页面可见性，仍会把刚返回的 stream 写入 `streamRef`。此时 reducer 已处在 `mask` 而忽略 `portraitPreviewStarted`，但摄像头轨道会一直运行到离页/卸载。
- 影响：违背“确认操作必须释放媒体轨道”的隐私承诺，并可能在用户已进入择面、三幕甚至离开可见视频节点后仍点亮摄像头指示器。
- 建议：使用请求代号/`AbortController` 风格的失效标志；进入 `continueFromPortrait` 时递增代号，`getUserMedia` resolve 后必须同时确认代号未失效且当前 ritual phase 仍是 `portrait`，否则立即 `stopGetFaceMediaStream(stream)`。
- 为什么现有测试没挡住：`src/domain/get-face/session.test.ts` 只覆盖纯 reducer 状态转移；没有渲染 `GetFaceRitual`，也没有模拟延迟 resolve 的 `MediaStream` 与“启动后立即继续”的竞态。

### [P1] `/result` 未校验“幻梦已完成”，可绕过 DreamCard 直接生成签解和得面

- 位置：[dream-result.tsx:19](/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/dream-result/dream-result.tsx:19)、[dream-result.tsx:25](/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/dream-result/dream-result.tsx:25)、[dream-result.tsx:29](/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/dream-result/dream-result.tsx:29)；状态定义见 [schema.ts:10](/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/domain/dream-session/schema.ts:10)。
- 触发路径：完成三幕请面并匹配到 DreamCard 后，session 的 status 为 `matched`；在播放固定幻梦之前直接访问 `/result`。结果页只判断 session 是否存在以及是否已有 interpretation，而不会要求 `status === "dream-completed"`，因此立即向 `/api/dream/interpret` 请求签解，并继续展示 GetFaceResult/Codex。
- 影响：打破声明的 `GetFaceRitual → DreamCard → GetFaceResult → Codex` 状态链；用户可以不播放固定三幕/七幕内容而获得签解与收藏。
- 建议：结果页仅在 session status 为 `dream-completed` 或 `interpreted` 时允许解释；其他状态返回 DreamCard（且应验证 URL cardId 与 session match cardId）或呈现明确的“请先完成幻梦”入口。
- 为什么现有测试没挡住：`storage.test.ts` 仅验证 `completeDreamSession()` 本身，`api-routes.test.ts` 仅验证 Route Handler 输入；没有 `DreamResult` 集成测试覆盖 `matched` session、直接路由访问、或与 DreamPlayer completion 的连接。

### [P1] README 声明 standalone 可直接运行，但构建产物不含运行所需静态资源

- 位置：[README.md:15](/Users/river/.codex/worktrees/2393/guizhou-hackathon/README.md:15)、[next.config.ts:5](/Users/river/.codex/worktrees/2393/guizhou-hackathon/next.config.ts:5)。
- 触发路径：按 README 仅部署/运行 `.next/standalone/server.js`。本次实际 `npm run build` 后检查到 `.next/standalone/public` 与 `.next/standalone/.next/static` 均不存在；Next standalone 不会自动复制这两类目录。产品的所有可见场景图片都来自 `public/dream-assets`，客户端脚本/CSS 来自 `.next/static`。
- 影响：独立产物部署后会出现 404 静态资源，关键背景、面具与客户端资源无法加载；README 的生产交付步骤不可复现。
- 建议：在部署/Docker 打包步骤显式复制 `public` 至 standalone 根目录、复制 `.next/static` 至 standalone `.next/static`，或删除“直接运行 standalone”承诺并提供经过验证的启动方式；CI 应对打包后的 standalone 作 HTTP smoke test。
- 为什么现有测试没挡住：CI 及本地 `npm run build` 只验证编译成功，未运行 standalone server，也未请求 `/_next/static/*` 与 `/dream-assets/*`。

### [P2] Threshold 未响应 prefers-reduced-motion，仍运行完整 rAF 与 GSAP 镜头/开门动画

- 位置：[threshold-experience.tsx:28](/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/threshold/threshold-experience.tsx:28)、[threshold-scene.ts:145](/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/threshold/threshold-scene.ts:145)、[threshold-scene.ts:166](/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/threshold/threshold-scene.ts:166)、[threshold-scene.ts:171](/Users/river/.codex/worktrees/2393/guizhou-hackathon/src/features/threshold/threshold-scene.ts:171)。
- 触发路径：系统设置 `prefers-reduced-motion: reduce` 后进入 `/`。请面、DreamCard 和 Codex 都有减动处理，但 Threshold 仍以常规时长执行 intro/openDoor，且持续启动雾气 WebGL rAF loop。
- 影响：迁移后的体验在入口处无法满足用户减动偏好，也会在低性能移动端保持不必要的渲染循环。
- 建议：将 media query 结果传给 scene；减动时直接设置最终镜头/视觉状态、跳过门动画，并不启动雾气 rAF（或只渲染一次）。
- 为什么现有测试没挡住：`threshold-experience.test.tsx` 和 `runtime-lifecycle.test.ts` 只断言 listener/cleanup 计数，没有模拟 `matchMedia("(prefers-reduced-motion: reduce)")` 或断言 animation/rAF 行为。

## 已核验的非阻断项

- 当前 Next Image 改动的 `fill` 图像父节点已有 `position: absolute`/明确尺寸，`sizes` 已提供；`npm run lint`、typecheck 和生产 build 均通过。
- Codex 将 `wish`、人像、媒体状态和 omen metadata 排除在 `localStorage` 条目外；12 槽位（4 个面具 + 8 个 reserved）和移动端 grid 均有明确实现。
- Omen Route Handler 有字节上限、严格输入 schema、服务端读取环境密钥、错误码映射和 `no-store`；本轮未发现密钥泄漏到客户端的路径。
- Threshold/Three 与 Codex relief viewer 的显式 dispose、RAF/监听清理在正常卸载路径上存在；本报告的生命周期问题仅限异步 getUserMedia 竞态。

## 执行的只读验证

```text
npm run lint                  PASS
npm run typecheck             PASS
npm test                      PASS (16 files, 42 tests)
npm run validate              PASS
npm run build                 PASS
git diff --check              PASS
```

本轮未修改产品运行时代码、Git 提交或分支状态；仅新增此审查报告。
