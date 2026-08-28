# 统一 Next.js 幻梦体验架构

Task ID: `unified-next-dream-experience`

## 目标

将 `feat/dream-card-player` 提交 `a1dab33` 中的根静态体验和 Vite 幻梦卡播放器统一迁移为仓库根目录唯一的 Next.js App Router + React + TypeScript 应用。React 持有页面、流程与领域状态；静态幻梦卡持有固定剧情；Three.js/GSAP 仅作为隔离的视觉能力；Route Handlers 提供无状态、可替换的 AI 编排边界。

## 非目标

- 不部署、不推送、不合并 main；不修改 `agent_meta`。
- 不引入数据库、向量库、复杂 Agent 框架、monorepo 或 React Three Fiber。
- 不让 AI 生成或改写卡片 Act；不把研究参考材料放进 `public` 或产品 bundle。
- 不删除无法确认是否为正式文化素材的 `reference-materials/` 与 `offcial-guide/`。

## 用户可观察行为

- `/`：完成 Three.js/GSAP 入戏体验并输入愿望，服务端匹配一个现有 `cardId`。
- `/dream/[cardId]`：完整播放权威静态卡片的 7 Act，完成后进入签解。
- `/result`：读取版本化 DreamSession，并通过 interpret API 展示结构化结果。
- `/dev/cards`：仅开发环境可见的卡池选择器，可选择并测试完整播放；生产环境返回 404。

## 约束与风险

- 起点必须包含 `feat/dream-card-player`；当前 HEAD 已核对为 `a1dab33`。
- 目录权威：`src/app` 仅路由/API；`src/features` 体验功能；`src/domain` 领域；`src/server/ai` 服务端 provider；`content/dream-cards` 固定卡；`content/assets.manifest.json` 稳定映射；`public/dream-assets` 正式共享素材；`docs/dream-card` 创建指南。
- 服务端 API 只接受 `cardId`（match 另接愿望文本），始终从服务端权威注册表读取完整卡片。
- WebGL 组件必须完整清理 renderer、RAF、GSAP timeline、纹理/材质/几何和全局监听。
- 依赖版本写入单一 lockfile；不提交 `node_modules`、`.next`、coverage、dist 或 tmp。
- 研究素材的文化准确性和授权状态未在本任务内重新验证，必须留在非 public 区域。
- 用户在原始工作目录 `/Users/river/Dev/guizhou-hackathon` 并行开发；五阶段和自身门禁完成后必须执行只读并行差异整合门禁。不得修改、覆盖、checkout、reset、stash 或清理原始目录；只在本隔离 worktree 吸收可确定变化。

## 交付物

- 根目录 Next.js 应用、四类页面路由和两个 API Route Handler。
- DreamCard JSON Schema、TypeScript/Zod Schema、卡片注册/校验/assetId 解析、共享素材与 React 播放器。
- 版本化 DreamSession 与 deterministic/mock AI provider。
- 可恢复 `.agent/tasks/unified-next-dream-experience/{spec.md,state.json}`。
- 更新后的 README、单一 package/lockfile 和确定性验证脚本/测试。

## 整体验收标准

1. `npm ci` 可复现；仓库仅一个 `package.json`、一个 App Router 应用入口、一种本地启动方式。
2. `npm run lint`、`npm run typecheck`、`npm test`、`npm run validate:content`、`npm run build` 全部通过。
3. 所有卡片通过 Schema；所有引用 assetId 存在、文件可解析且不逃逸 `public/dream-assets`。
4. 开发卡池可选择现有卡并完整播放 7 Act；正式链路完成入戏、愿望匹配、固定幻梦和签解结果。
5. API 请求/响应均通过结构化 Schema；match 只返回注册表内 cardId；interpret 不信任客户端卡片数据。
6. Three.js 重复挂载/卸载不会遗留 RAF、renderer、timeline 或全局监听。
7. 旧根静态入口、Vite 子应用、旧 player、tmp/dist、vendor、本地 server/启动脚本和 Pages 工作流退出；参考材料保留在非 public 区域。
8. 最终 diff 不包含 node_modules、构建产物或范围外修改，并提供恢复/回滚说明。
9. 最终完成前重新检查原始工作目录 branch、HEAD、staged/unstaged/untracked，并将相对起点及本 worktree 最终 diff 的并行变化逐项分类为：吸收、等价替代、迁移保留、语义冲突；最终报告给出清单和处理结果。
