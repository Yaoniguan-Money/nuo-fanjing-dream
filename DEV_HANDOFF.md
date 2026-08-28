# DEV HANDOFF — Next App Router 唯一基线

## 体验链路

产品主链路固定为 `Threshold → GetFaceRitual → DreamCard → GetFaceResult → Codex`。`Threshold` 负责连续入场镜头与门环交互；`GetFaceRitual` 负责名字、愿望、可选摄像头预览、三幕选择与面具确认；`DreamCard` 播放注册表中的固定幻梦；`GetFaceResult` 展示得面、签解、溯源和视觉变体；`Codex` 负责本机傩谱收录与浏览。

页面入口是 `src/app/page.tsx`、`src/app/dream/[cardId]/page.tsx` 和 `src/app/result/page.tsx`。幻梦播放结束后由结果页载入确定性解释，并在完成得面后进入 Codex 体验。

## 权威边界

- 页面与接口只放在 `src/app/`；`POST /api/v1/omen` 的 Route Handler 在 `src/app/api/v1/omen/route.ts`。
- UI 与视觉运行时只放在 `src/features/`；Threshold、GetFaceRitual、DreamCard、GetFaceResult 和 Codex 各自维护自己的组件与样式。
- 得面数据、解析算法和会话状态只放在 `src/domain/get-face/`；不要在组件中复制角色关键词、传统说明或匹配规则。
- 幻梦内容只来自 `content/dream-cards/`，通过 `src/domain/dream-card/registry.ts` 显式注册；素材路径只由 `content/assets.manifest.json` 映射到 `public/dream-assets/`。
- 傩谱持久化只经过 `src/domain/codex/`；`reference-materials/` 只保留研究与源文件。
- 服务端 provider 位于 `src/server/ai/`，外部模型密钥只能由服务端环境读取。

## 摄像头与本机数据

摄像头是可选的本机预览。不得截帧、分析、保存或上传；页面隐藏、离页、刷新和确认操作都必须释放媒体轨道。会话存储只能保留继续体验所需的名字、愿望、选择与结果状态；本机傩谱不得保存愿望、人像、视频帧、摄像头状态或服务端配置，清空入口必须二次确认。

## 视觉与文化边界

开场是单一连续镜头，控制在 1.2 至 1.6 秒，优先只动画 transform 与 opacity。傩门之前不出现文字或按钮，门环是第一次主动交互；主场保留龙坛、面具和输入接口，鼠标反馈只服务抓取、拖拽与确认。

结尾先做 cinematic reveal，再进入神龛式角色墙，不回到四张卡片式总结。Codex 固定 12 格，其中 4 格映射现有视觉母体、8 格待补；同一面具只占一个位置，重复体验更新该位置最近一次结果。详情内的 3D 是由运行时 PNG 生成的浮雕网格，不标为文物扫描；结果页始终保留“历史身份及授权来源未提供”的声明。

## 性能与验证

开场最多 8 至 12 个主要 DOM 节点，粒子数量不超过 30，避免在 pointermove 中同时更新大量元素；WebGL 卸载时释放 renderer、RAF、GSAP timeline、几何、材质、纹理与全局监听，GSAP tween 使用 `overwrite: auto`。

唯一完整验证命令见 [README.md](README.md) 的“唯一验证流程”，顺序为 lint、typecheck、Vitest、内容校验、standalone build、audit 与 diff check。构建配置由 `next.config.ts` 的 `output: "standalone"` 负责，CI 以 `.github/workflows/ci.yml` 为准。
