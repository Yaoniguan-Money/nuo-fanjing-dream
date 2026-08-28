# main 领先能力与 Next.js 迁移清单

审计日期：2026-08-28（Asia/Shanghai）
基线：upstream/main@06d55c2（Implement get-face codex and altar experience）
审计工作区：/Users/river/.codex/worktrees/2393/guizhou-hackathon

## 0. 结论

当前 Next 代码已形成“连续入山 → 写愿望 → 匹配一张权威幻梦卡 → 播放七幕 → 确定性签解”链路，入口为 src/app/page.tsx、src/features/threshold/threshold-shell.tsx、src/features/wish-input/wish-input.tsx、src/features/dream-player/dream-experience.tsx 和 src/app/result/page.tsx。

main 最新提交新增的不是七幕卡库的换皮，而是“龙坛请面 → 可选本机采相 → 三幕选择 → 拖拽面具受面 → 得面结果 → cinematic reveal → 12 格傩谱 → PNG 浮雕 → DeepSeek 傩签”链路。当前 Next 中没有对应的 get-face TS 域、龙坛页面、三幕选择、摄像头组件、傩谱存储、浮雕查看器或 /api/v1/omen，因此迁移尚未完成。

当前 worktree 处于迁移中的 staged 状态：HEAD 与 upstream/main 同为 06d55c2；Next 文件已 staged 新增/迁移，legacy 的 index.html、server.py、src/app.js、src/styles.css、vendor 和 assets/masks 已 staged 删除。物理仍存在的 legacy 文件不代表已被 Next runtime 接入。

## 1. 当前 Next 已覆盖

| 能力 | 证据 | 边界 |
| --- | --- | --- |
| 连续入山/开门 | src/features/threshold/threshold-experience.tsx:22-40,53-64,80-94；src/features/threshold/threshold-scene.ts:62-197 | 一个 Three renderer、1.35 秒 intro、门环按住 1.2 秒、Space/Enter、开门后回调；穿门后直接进入 WishInput。 |
| 生命周期清理 | src/features/threshold/runtime-lifecycle.ts:7-58；src/features/threshold/threshold-experience.test.tsx:9-36 | 覆盖 scene、RAF、全局 listener；未覆盖 camera、codex viewer、ritual listener。 |
| 愿望匹配 | src/features/wish-input/wish-input.tsx:10-24；src/app/api/dream/match/route.ts:6-14 | 2–280 字愿望，服务端只选注册 DreamCard；不是 main 的三幕受面。 |
| 七幕播放 | src/features/dream-player/dream-player.tsx:46-88；src/domain/dream-card/playback.ts:1-25 | 固定七幕、typewriter、auto/manual、键盘左右键；不可替代 main 的三幕请面。 |
| 确定性签解 | src/server/ai/deterministic-provider.ts:1-47；src/app/api/dream/interpret/route.ts:6-15 | 只返回 deterministic-local 反思；不是 DeepSeek 傩签/傩解。 |
| 会话存储 | src/domain/dream-session/storage.ts:6-36 | sessionStorage 保存 wish、match、播放和 interpretation；不能复用为傩谱存储。 |
| DreamCard 资产契约 | content/assets.manifest.json；src/domain/dream-card/content.test.ts:20-29 | 16 个背景/角色/threshold 资产已迁到 public/dream-assets；缺 dragon altar、4 张 get-face mask、glyph 与 source 字段。 |

## 2. 必须迁移的 main 能力

### 2.1 get-face 数据与确定性域

main src/get-face-data.js:4-49 定义 4 个视觉母体、3 幕故事、9 个职司、2 条溯源、12 个傩谱槽位、浮雕参数、龙坛背景和本地资产免责声明。src/get-face-domain.js:4-39 提供 resolveVisual、resolveRole、buildVariant、chineseCount：按主题命中视觉母体，在 mask 内按愿望 trigger 与 choices 权重选角色，未知愿望回落 neutral-questioner，并由姓名/愿望/选择/角色生成稳定 variant。

映射：

- src/get-face-data.js → src/domain/get-face/data.ts + Zod schema；内容不得散落 JSX 或 route handler。
- src/get-face-domain.js → src/domain/get-face/domain.ts；保持确定性算法，不用随机数或 LLM 替代。
- tests/get-face-domain.test.mjs:13-30 → Vitest TS domain tests。

验收：同一 name/wish/choices/selectedMask 重跑必须得到相同 role、mask、score、variant seed；前路案例得到 path-general/crown-beard；未知愿望得到 neutral-questioner；结果显示传统职司借鉴/项目新创和“本地视觉母体，历史身份及授权来源未提供”。

### 2.2 龙坛请面、三幕选择与拖拽受面

main index.html:40-87 提供 ritual、SVG 龙纹、4 个朦胧面具、姓名/愿望输入、portrait rite、choice 和 continue；src/app.js:571-605 启动龙坛并分两步收集姓名/愿望；src/app.js:404-415 渲染二选一；src/app.js:542-569 和 1071-1204 实现朦胧面具、选择聚焦、拖拽和磁吸。

关键行为：

- 穿门后进入 DRAGON ALTAR，龙坛底图和面具淡入；门前不出现 ritual 文案/按钮（DEV_HANDOFF.md:3-15）。
- 姓名后再问愿望；三幕各有两个选项，choices 固定为 3 个 0/1 值。
- 选中的视觉母体聚焦翻面，拖到脸部区域小于 150px 才吸附并进入第一幕；否则回弹。

映射：当前 src/features/threshold/threshold-shell.tsx:7-12 在穿门后直接返回 WishInput。应改为 Threshold → GetFaceRitual 状态机，新增 src/features/get-face/get-face-shell.tsx、portrait-rite.tsx、choice-stage.tsx、mask-altar.tsx。

验收：穿门后必须先出现龙坛；完成姓名/愿望、三幕二选一和拖拽吸附后才进入得面；阈值外释放回弹且不能完成；重复挂载不增加 listener、RAF、renderer。

### 2.3 摄像头隐私边界

main index.html:70-83 的 video/剪影/启镜/确认/跳过与 src/app.js:343-401 实现严格本机预览：

- 默认 symbolic/silhouette，不默认调用 getUserMedia；只有用户点击启镜且 mediaDevices 与 secure context 可用才请求视频。
- video 只绑定本地 srcObject；没有 canvas 截帧、识别、上传或保存；文案明确不会截帧/识别/上传。
- 确认、跳过、组件卸载、visibilitychange(hidden)、pagehide 均停止 tracks 并清空 srcObject。
- 权限拒绝或不安全环境降级剪影，流程继续。

映射：新增 client-only portrait-rite.tsx，以 MediaStream ref/effect cleanup 管理；不得把 MediaStream 放入 session、localStorage、URL 或 API payload。

验收：未点击启镜不触发 getUserMedia；网络请求无 video/blob/frame；所有退出路径后 track.readyState 为 ended 且 video.srcObject 为 null；持久化内容不含 wish、portrait、video、camera、stream、apiKey。

### 2.4 得面结果与 cinematic reveal

main src/app.js:677-751 组装 role、mask、variant、evidence、sources、omen；753-765 完成后持久化；767-811 先播放面具/职司/傩签占位的 reveal，再允许进入傩谱。结果必须包括视觉母体与变体、授面理由、职司背景、傩签/傩解、溯源、类型和本地资产免责声明；不得回到四张 SaaS 卡片式总结（DEV_HANDOFF.md:12-22）。

映射：新增 src/features/get-face/get-face-result.tsx 和 get-face-session；不要改造 src/features/dream-result/dream-result.tsx:11-35 来假装完成。验收：三幕完成后先见完整 reveal，点击或键盘确认才进入傩谱；同一 mask 重复体验只更新原槽位。

### 2.5 codex collection 傩谱

main src/codex-collection.js:4-65 使用 version 2、key nuo.codex.v2 的 localStorage 白名单存储：只保留 mask/role/variant/visualText/reasonText/sources/omen/collectedAt/updatedAt，省略 wish、portrait、media、API metadata；upsert 以 mask ID 为主键并保留首次 collectedAt；坏 JSON/未知版本安全降级。

main index.html:113-148 和 src/app.js:825-851 固定 12 格（4 个 mask + 8 个 reserved），已收录卡可点击/键盘翻面；src/app.js:902-907 清空需要二次确认。

映射：新增 src/domain/get-face/codex-schema.ts、codex-storage.ts（client-only）、src/features/codex/codex-world.tsx 和 codex-detail.tsx；不可复用 src/domain/dream-session/storage.ts:6-36。

验收：始终显示 12 格、计数为已收录 mask/4；重复 upsert 不新增槽且 collectedAt 不变；坏数据降级空集合；清空确认可取消；持久化无愿望/人像/视频/摄像头/key；Enter/Space 打开详情、Escape 关闭并还焦点。

### 2.6 PNG 程序化浮雕

main src/mask-relief-viewer.js:6-145 从 PNG 采样并洪泛填充背景，生成 front/back/edge mesh；支持低功耗 renderer、pointer drag 旋转、wheel 缩放、reset，dispose 释放 geometry/material/texture/renderer。src/app.js:872-887 在 WebGL 失败时回退原图；index.html:125-133 明确“程序化浮雕 3D／非历史扫描模型”。

映射：新增 client component src/features/codex/mask-relief-viewer.tsx 或 .ts；复用 package.json 中 three 依赖，但不得在 Server Component 初始化 WebGL。

验收：已收录详情可旋转/缩放/复位；加载或 WebGL 失败显示原图；关闭、切换、卸载释放 renderer、RAF、geometry、material、texture，不留 canvas/context；文案不得称文物扫描。

### 2.7 DeepSeek server 傩签

main server.py:1-214 是 localhost-only DeepSeek proxy：

- 只从 .env.local/进程环境读取 DEEPSEEK_API_KEY、DEEPSEEK_BASE_URL、DEEPSEEK_MODEL（server.py:39-52），key 不进浏览器。
- POST /api/v1/omen，body ≤8192 bytes；wish 非空且 ≤300，choices 恰好 3 个 0/1，role 必须有 id/name/duty/reason/kind，evidence 必须有 signs（server.py:73-90,174-195）。
- 上游 /responses 使用严格 JSON schema；qian 为无标点 8–12 个汉字，jie 为 70–120 个汉字，禁保证/必然/治愈/诊断/处方/投资/中奖/吉凶（server.py:55-70,103-133）。
- 格式/安全错误 repair 一次；成功返回 model/prompt_version/request_id，并做 96 项 LRU cache；401/403/429/timeout/无配置/坏 JSON 有稳定错误码。

映射：当前只有 /api/dream/match 和 /api/dream/interpret，src/server/ai/index.ts:1-2 仅导出 deterministic provider。新增 src/app/api/v1/omen/route.ts + src/server/ai/deepseek-omen.ts，或保留 Python localhost server；无论选哪种，API key 必须只在 server runtime。

验收：无 key 为 503 AI_NOT_CONFIGURED；bundle/HTML/client state/network 不出现 key；非法请求不调用上游；坏 qian/jie/禁词 repair 一次后仍不合规则拒绝；同上下文命中 cache；日志只带 request_id/status/elapsed_ms；迁移 tests/test_server.py:6-30 的 qian 标点、jie 禁词、三项 choices 测试。

### 2.8 音频、输入与调试接口

main src/app.js:85-148 提供 WebAudio drone 和 wood/gong/heavy/suck cues；150-209 提供 mouse parallax、Space/Enter、Gamepad A 和连接状态；211-292 暴露 NuoDemoAPI 的 data/audio/input/events/result/codex/portrait；1-17 提供 runtime error/unhandled rejection 面板。DEV_HANDOFF.md:24-29 规定粒子、pointermove、GSAP overwrite 性能边界。

映射：可用 context/hooks 替代全局实现，但开发环境应保留等价可审计 API；除非有测试或手测证据，不要宣称音频/gamepad 行为完全等价。

## 3. 资产差异

| 资产 | main 证据 | 当前 Next 状态 | 迁移要求 |
| --- | --- | --- | --- |
| 龙坛底图 | assets/dragon-altar-style.png；src/get-face-data.js:45；src/styles.css:660 | 文件仍在根目录，但 Next 只公开 public，且无 Next import | 移到 public/dream-assets/altar/dragon-altar-style.png，manifest 增加 entry。 |
| 4 张 mask | assets/masks/mask-01.png…mask-04.png；src/get-face-data.js:7-10 | staged 到 reference-materials/legacy-product-assets/masks，不是 public runtime；manifest 无 mask | 放入 public/dream-assets/masks/，声明本地视觉母体，不称馆藏/扫描。 |
| altar/codex CSS | main src/styles.css:654-701 | legacy styles staged 删除；Next 只有 threshold/dream result CSS | 在 get-face/codex feature CSS 中迁移响应式 12 格、detail、focus、fallback。 |
| relief | main src/mask-relief-viewer.js:6-145 | legacy UMD 未被 Next import | TS client 化，补 disposal/fallback 测试。 |

当前 Next 已迁移 16 个 DreamCard/threshold asset：content/assets.manifest.json:13-280、public/dream-assets/*、src/domain/dream-card/content.test.ts:20-29。它们不包含上述 get-face 资产、glyph 语义和溯源授权字段。


## 4. 文件级映射总表

| main 文件 | Next 目标 | 当前判定 |
| --- | --- | --- |
| index.html:40-148 | src/app/page.tsx + features/get-face + features/codex | page 当前只渲染 ThresholdShell。 |
| src/app.js:343-415 | get-face-shell、portrait-rite、choice-stage | 未迁移。 |
| src/app.js:542-605,1071-1204 | mask-altar + pointer hooks | 未迁移。 |
| src/app.js:677-811 | get-face-result + session | 未迁移。 |
| src/app.js:813-937 | codex-world + codex-detail | 未迁移。 |
| src/get-face-data.js:4-49 | src/domain/get-face/data.ts | legacy UMD，未被 Next 引用。 |
| src/get-face-domain.js:4-39 | src/domain/get-face/domain.ts | legacy UMD，未被 Next 引用。 |
| src/codex-collection.js:4-65 | src/domain/get-face/codex-storage.ts | legacy UMD，未被 Next 引用。 |
| src/mask-relief-viewer.js:6-145 | src/features/codex/mask-relief-viewer.tsx | legacy UMD，未被 Next 引用。 |
| server.py:1-214 | src/app/api/v1/omen/route.ts + server provider，或保留 Python | 当前 server.py staged 删除，Next 无替代 route。 |
| tests/get-face-domain.test.mjs:1-30 | Vitest domain tests | 仍是 legacy 测试。 |
| tests/codex-collection.test.mjs:1-37 | Vitest storage tests | 仍是 legacy 测试。 |
| tests/test_server.py:1-34 | Vitest route/provider 或保留 Python 测试 | 当前无 server.py 被测对象。 |

## 5. 合并前端到端验收

1. / 首屏 1.2–1.6 秒连续入山，门前无 ritual 文案/按钮；门环或 Space/Enter 后开门。
2. 门后先到龙坛，显示龙坛底图、4 个朦胧面具和姓名输入；姓名后再收愿望。
3. 默认剪影；主动启镜才显示本机 video；确认/跳过/卸载/离页释放 tracks。
4. 完成三幕二选一，得到确定性 role/variant；未知愿望为 neutral-questioner。
5. 面具拖到脸部阈值内磁吸进入第一幕，阈值外回弹。
6. 三幕结束先 cinematic reveal，再点击/键盘进入傩谱。
7. 傩谱显示 4 个可收录槽位 + 8 个待补槽位；已收录卡可键盘打开详情，详情可旋转/缩放/复位，WebGL 失败回退原图。
8. 客户端只请求本机 /api/v1/omen；无 key/网络失败保留已得之面；合规 qian/jie 可展示，重复上下文可 cache。
9. 清空必须二次确认；同一面具重复体验只更新原槽位。
10. 刷新/重复挂载无重复 RAF、listener、MediaStreamTrack、WebGL renderer；localStorage 无愿望、人像、视频、摄像头、API key。

## 6. 已执行验证

- npm run typecheck：通过，退出码 0；只证明现有 Next TS 类型可编译。
- node --test tests/get-face-domain.test.mjs tests/codex-collection.test.mjs：5 个 legacy 测试通过；不证明 Next 接入。
- npm test：未完成，node_modules 缺少 chai/index.js，Vitest 报 ERR_MODULE_NOT_FOUND；未安装或修改依赖。
- npm run build：被已有 .next 构建锁阻止，报 Another next build process is already running；未删除 lock。
- python3 tests/test_server.py：当前 server.py staged 删除，报 ModuleNotFoundError；这表示当前 Next 没有 Python server 被测对象，不是对 main server 逻辑的结论。

最终判断：Next 基础链路和类型契约已有，但 main 最新产品能力仍须按本清单迁移；最不可遗漏的是 camera privacy、12 格 codex、relief disposal、DeepSeek server-only boundary 以及 dragon/mask 的 public 资产路径。
