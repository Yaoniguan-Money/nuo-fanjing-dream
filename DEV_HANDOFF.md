# DEV HANDOFF — Next App Router 唯一基线

## 体验链路

产品主链路固定为 `Threshold → GetFaceRitual → DreamCard → GetFaceResult → Codex`。`Threshold` 负责封面、开场影片和龙坛过门；`GetFaceRitual` 负责名字、愿望、八面自动匹配与入戏确认；`DreamCard` 播放注册表中的固定幻梦；`GetFaceResult` 以完成的故事卡绑定得面、签解、溯源和视觉变体；`Codex` 负责本机傩谱收录与浏览。

页面入口是 `src/app/page.tsx`、`src/app/dream/[cardId]/page.tsx`、`src/app/result/page.tsx` 与演示用 `src/app/codex/page.tsx`。幻梦播放结束后由结果页载入故事绑定签解，并在确认收录后进入 Codex 体验。

## 权威边界

- 页面与接口只放在 `src/app/`；`POST /api/v1/omen` 的 Route Handler 在 `src/app/api/v1/omen/route.ts`。
- UI 与视觉运行时只放在 `src/features/`；Threshold、GetFaceRitual、DreamCard、GetFaceResult 和 Codex 各自维护自己的组件与样式。
- 得面数据、解析算法和会话状态只放在 `src/domain/get-face/`；不要在组件中复制角色关键词、传统说明或匹配规则。
- 幻梦内容只来自 `content/dream-cards/`，通过 `src/domain/dream-card/registry.ts` 显式注册；素材路径只由 `content/assets.manifest.json` 映射到 `public/dream-assets/`。
- 傩谱持久化只经过 `src/domain/codex/`；`reference-materials/` 只保留研究与源文件。
- 服务端 provider 位于 `src/server/ai/`，外部模型密钥只能由服务端环境读取。

## 摄像头与本机数据

当前核心链路不请求摄像头，只保存继续体验所需的名字、愿望、匹配卡片和面具索引。旧三幕选择与可选摄像头预览保留在 `src/features/get-face/get-face-ritual-legacy.tsx` 与 `src/domain/get-face/session-legacy.ts`，未来评估效果时再决定是否恢复；该 legacy 边界仍不得截帧、分析、保存或上传。会话存储不能保存愿望之外的人像、视频帧、摄像头状态或服务端配置；本机傩谱不得保存愿望，清空入口必须二次确认。

## 视觉与文化边界

开场由封面、入梦影片和龙坛过门组成，交互入口是封面上的“开始入梦”；主场保留龙坛、面具和输入接口，鼠标反馈只服务抓取、拖拽与确认。

结尾先做 cinematic reveal，再进入神龛式八角色墙。Codex 固定八大职司：开路将军、先锋小姐、九位土地神、唐氏太婆、勾簿判官、扫地和尚、柳毅、阿布摩；同一面具只占一个位置，重复体验更新该位置最近一次结果。详情当前使用透明 PNG 与卡片式倾斜交互，正式模型接入前不得标注为文物扫描；结果页始终保留“历史身份及授权来源未提供”的声明。

## 性能与验证

开场最多 8 至 12 个主要 DOM 节点，粒子数量不超过 30，避免在 pointermove 中同时更新大量元素；动画优先使用 transform 与 opacity，视频失败时必须直接进入龙坛过门。

唯一完整验证命令见 [README.md](README.md) 的“唯一验证流程”，顺序为 lint、typecheck、Vitest、内容校验、standalone build、audit 与 diff check。构建配置由 `next.config.ts` 的 `output: "standalone"` 负责，CI 以 `.github/workflows/ci.yml` 为准。
