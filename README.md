# 入梦黔境

入梦黔境是运行在 Next.js App Router 上的贵州傩文化互动幻梦原型。唯一体验链路为 `Threshold → GetFaceRitual → DreamCard → GetFaceResult → Codex`：穿过山门后完成请面、愿望与三幕选择，播放一张固定幻梦，查看得面与签解，最后将结果收录到本机傩谱。

## 运行

要求 Node.js `24.x`，首次安装与本地开发使用：

```bash
npm ci
npm run dev
```

访问 <http://localhost:3000>。生产构建使用标准 Next.js 输出；完成构建后可用 `npm run start` 启动生产服务，线上由 Vercel 托管。

## 唯一验证流程

本地完整验证按以下顺序执行，CI 使用同一组项目门禁：

```bash
npm run lint
npm run typecheck
npm test
npm run validate
npm run build
npm run audit
git diff --check
```

CI 定义在 `.github/workflows/ci.yml`；`npm test` 只运行 Vitest。`npm run build` 也会先校验幻梦内容，并生成标准 Next.js 生产产物。

## 路由与权威路径

- `src/app/`：App Router 页面与 Route Handler 入口；主要页面是山门 `/`、幻梦 `/dream/[cardId]`、结果 `/result`，傩引接口为 `POST /api/v1/omen`。
- `src/features/`：Threshold、GetFaceRitual、DreamCard 播放、GetFaceResult 与 Codex 的界面和运行时效果。
- `src/domain/`：领域模型、状态机、校验与持久化边界；得面权威数据在 `src/domain/get-face/`，幻梦权威注册在 `src/domain/dream-card/`，傩谱边界在 `src/domain/codex/`。
- `src/server/`：服务端 AI provider 与外部模型代理；密钥和 provider 细节不得进入浏览器。
- `content/dream-cards/`：固定幻梦内容；选中卡片后，AI 不得生成或改写 Act。
- `content/assets.manifest.json`：稳定 `assetId` 到运行素材的唯一映射。
- `public/dream-assets/`：产品运行时可访问的正式素材。
- `reference-materials/`：研究资料与源文件，不进入产品 bundle。
- `docs/dream-card/`：幻梦卡 schema、模板、素材规范与内容流程。
- `next.config.ts`、`vitest.config.mts`、`package.json`：构建、测试与项目命令的配置来源。

项目资料总导航位于 [docs/README.md](docs/README.md)。按体验阶段、技术目录、设计资产与当前责任查找文件时，从该页进入；所有交接文档使用相对路径。

## 隐私与产品边界

摄像头仅用于本机预览，不截帧、不识别、不保存、不上传；离页、切后台和确认操作都会释放媒体轨道。愿望、人像、视频帧、摄像头状态和服务端配置不会写入本机傩谱，傩谱只保存面具、职司、傩签、傩解、溯源与视觉变体。

签解是叙事性反思，不是事实预测或专业建议。面具视觉母体是项目运行素材，结果页会明确标注历史身份及授权来源未提供。
