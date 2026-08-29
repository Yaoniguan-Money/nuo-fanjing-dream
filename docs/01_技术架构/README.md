# 技术架构｜索引

## 运行链路

`Threshold → GetFaceRitual → DreamCard → GetFaceResult → Codex`

| 技术层 | 权威目录 / 文件 | 职责 |
| --- | --- | --- |
| 路由与 API | [../../src/app/](../../src/app/) | 页面入口、App Router 与 Route Handler |
| 界面功能 | [../../src/features/](../../src/features/) | 门槛、请面、剧情、得面与傩谱的组件及样式 |
| 领域数据 | [../../src/domain/](../../src/domain/) | 面具、职司、会话、傩谱、本地存储与内容校验 |
| 服务端匹配 | [../../src/server/ai/](../../src/server/ai/) | 服务端 provider 与确定性匹配降级 |
| 剧情内容 | [../../content/dream-cards/](../../content/dream-cards/) | 可播放的固定故事 JSON |
| 素材清单 | [../../content/assets.manifest.json](../../content/assets.manifest.json) | `assetId → public` 运行路径唯一映射 |
| 运行素材 | [../../public/dream-assets/](../../public/dream-assets/) | 浏览器直接加载的图片、视频、SVG、模型 |
| 研究源文件 | [../../reference-materials/](../../reference-materials/) | 实物图、调研、生成源文件；不进入运行包 |
| 运行工具 | [../../scripts/](../../scripts/) | 内容校验、Alpha 清理、预览及模型实验 |

## 功能与代码的对应

| 用户环节 | 主入口 | 数据 / 资产边界 |
| --- | --- | --- |
| 开场与过门 | [../../src/features/threshold/](../../src/features/threshold/) | [../../public/dream-assets/intro/](../../public/dream-assets/intro/)；[../../public/dream-assets/brand/](../../public/dream-assets/brand/) |
| 问名、问惑、匹配 | [../../src/features/get-face/](../../src/features/get-face/) | [../../src/domain/get-face/](../../src/domain/get-face/)；[../../src/domain/dream-session/](../../src/domain/dream-session/) |
| 固定剧情播放 | [../../src/features/dream-player/](../../src/features/dream-player/) | [../../content/dream-cards/](../../content/dream-cards/)；[../../src/domain/dream-card/](../../src/domain/dream-card/) |
| 得面、收录 | [../../src/features/get-face/get-face-result.tsx](../../src/features/get-face/get-face-result.tsx) | [../../src/domain/codex/](../../src/domain/codex/) |
| 图鉴与详情 | [../../src/features/codex/](../../src/features/codex/) | [../../public/dream-assets/ui/codex/](../../public/dream-assets/ui/codex/) |

## 变更规则

1. 新剧情只修改 [../dream-card/README.md](../dream-card/README.md) 所列的内容、注册表和素材清单。
2. UI 或交互先确认责任人与视觉资产，再修改 `src/features/`；组件中不复制职司文案或剧情规则。
3. 新运行素材先进入 `public/dream-assets/<用途>/`，随后更新 [../../content/assets.manifest.json](../../content/assets.manifest.json)。
4. 原图、实物图和设计源文件留在 [../../reference-materials/](../../reference-materials/) 或仓库外的设计资料库，避免直接打入页面。

开发与隐私约束见 [../../DEV_HANDOFF.md](../../DEV_HANDOFF.md)。
