# 幻梦卡开发指南

幻梦卡是静态内容资产。`content/dream-cards/*.json` 保存固定剧情，`content/assets.manifest.json` 保存稳定素材映射，`public/dream-assets/` 保存可进入产品运行时的共享素材。播放器不做文件系统自动发现；每张正式卡必须在 `src/domain/dream-card/registry.ts` 显式注册，以便构建、服务端 API 和测试共享同一权威列表。

## 新增卡片

1. 复制本目录的 `dream-card.template.json` 到 `content/dream-cards/`。
2. 按 `dream-card.schema.json` 完成 5 至 7 个 Act；`choices` 在 0.1.0 中必须为空。
3. 将正式素材放到 `public/dream-assets/`，并在 `content/assets.manifest.json` 登记稳定 `assetId`。
4. 在 `src/domain/dream-card/registry.ts` 显式导入并注册卡片。
5. 运行 `npm run validate:content`，再访问开发环境的 `/dev/cards` 完整播放。

## 不变量

- AI 只基于 `meta` 匹配卡片；卡片选中后 `data.acts` 固定，不得改写。
- Route Handler 不接受客户端上传的完整卡片，只接受 `cardId` 并从注册表读取权威内容。
- 原图、生成过程文件和文化研究材料放在非 public 的 `reference-materials/`，不得进入产品 bundle。
- 素材生产、命名、透明边缘与授权记录要求见 `assets-guide.md`。
