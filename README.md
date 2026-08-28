# 入梦黔境

一个统一运行在 Next.js App Router 上的贵州傩文化互动幻梦原型。体验依次完成入戏、请面、愿望匹配、固定幻梦、得面与签解；React 管理页面和产品状态，Three.js/GSAP 只负责隔离的沉浸视觉。

## 本地运行

需要 Node.js 20.9 或更高版本：

```bash
npm ci
npm run dev
```

打开 `http://localhost:3000`。开发环境可访问 `http://localhost:3000/dev/cards` 检查卡池；该路由在 production 中返回 404。

## 验证

```bash
npm run lint
npm run typecheck
npm test
npm run validate:content
npm run build
```

## 权威边界

- `src/app`：页面和 Route Handler 入口，不放产品领域逻辑。
- `src/features`：threshold、wish-input、dream-player、dream-result、get-face 与 codex 体验。
- `src/domain`：DreamCard、DreamSession、Interpretation 与得面结果的 Schema/状态。
- `src/server`：服务端 provider 与外部模型代理，密钥不得进入浏览器。
- `content/dream-cards`：固定幻梦。选中卡片后，AI 不得生成或改写 Act。
- `content/assets.manifest.json`：稳定 `assetId` 到共享素材的唯一映射。
- `public`：产品运行时可访问的正式素材。
- `docs/dream-card`：幻梦卡创建与素材指南。
- `reference-materials`：研究与源文件，不进入产品 bundle；比赛手册等项目文档统一放在 `docs`。

## 体验约束

- 入场保持单一连续镜头；门环是入场后的第一次主动交互。
- WebGL 组件卸载时必须释放 renderer、RAF、GSAP timeline、几何/材质/纹理与全局监听。
- match 只返回已注册 `cardId`；interpret 只接收 `cardId` 与愿望，并由服务端读取权威卡片。
- 摄像头只能用于本机预览，不截帧、不识别、不保存、不上传，并在离页时释放轨道。
- 本机傩谱不得保存愿望、人像、视频帧、摄像头状态或服务端配置。
- 签解是叙事性反思，不是事实预测或专业建议。
