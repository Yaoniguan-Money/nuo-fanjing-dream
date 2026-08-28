# Dream Card Delta 审计

审计时间：2026-08-28（Asia/Shanghai）  
当前迁移工作区：`feat/next-unified-app@d7eea92`（`/Users/river/.codex/worktrees/2393/guizhou-hackathon`）  
参考交付分支：`fix/dream-card-delivery@571dfc6`（`/Users/river/Dev/guizhou-hackathon`）  
参考分支相对共同基线 `06d55c2` 只有 `b929df6`、`571dfc6` 两个提交。本文只做只读审计；未修改运行时代码，未执行 checkout/reset/stash/merge 等 Git 状态操作。

## 结论

参考分支的交付修复不能整提交移植：Dream Card 内容、Schema/内容校验、角色高亮与双人布局、AJV 安全升级属于必须吸收的行为；Pages 工作流和旧 Vite package 则与当前“单一根 Next.js + Route Handler”的架构冲突，应改写为 Next 运行时部署。当前迁移工作区已经完成目录迁移和大部分内容迁移，但仍发现 5 个必须补齐项：模板 `$schema` 路径错误、角色 instanceId/position 未吸收、播放器仍为旧三列 grid、根 `ajv` 版本有中危审计结果、内容校验没有迁移为可复现的构建门禁。

## 必须吸收与精确映射

### 1. 固定卡内容、角色 ID 与布局（P0）

参考 `dream-card/cards/dream.kailu-jiangjun.du-shan-ji.json` 的修复应映射到当前 `content/dream-cards/dream.kailu-jiangjun.du-shan-ji.json`：

| 当前行 | 必须吸收的值 | 原因 |
| --- | --- | --- |
| 45（act-01） | `adu.position: "right"` | 与老者形成左右双人构图；参考分支已将第二角色从 center 移到 right。 |
| 66（act-02） | `grandfather.position: "right"` | 与阿渡形成左右双人构图。 |
| 92（act-03） | `instanceId: "villager-a"` | 文本 `speakerId` 已是 `villager-a`；否则当前播放器无法将发言者与立绘关联。 |
| 114、144、195（act-04/05/07） | `instanceId: "masked"` | 文本 `speakerId` 已是 `masked`；否则神秘人永远不会获得 active 高亮。 |

当前 act-03 的 `notes`（第 106 行）仍写 `villager-representative`，应同步改为 `villager-a`，避免文档语义继续漂移；参考提交本身没有修正这一处，不能机械照搬。

参考 `dream-card/src/App.tsx` 的 `characterHorizontalPosition()` 与 inline `left` 样式，必须映射到 `src/features/dream-player/dream-player.tsx:19-27` 的 `CharacterLayer`。参考 `dream-card/src/styles.css` 的布局变更必须映射到 `src/features/dream-player/dream-player.css:160-191`：去掉 grid/grid-column 定位，slot 改为 absolute、`top:10%`、`bottom:15%`、`width:33.333%`，并用 `translateX(-50%)` 配合 `left`；两人时 left/right 应落在约 33.33%/66.67%，三人时约 25%/50%/75%。只改 JSON 而不改播放器会留下旧网格行为，只改播放器而不改 ID 则 active speaker 仍失效。

### 2. Schema 与内容校验（P0）

参考 `dream-card/schemas/dream-card.schema.json` 已迁移为当前 `docs/dream-card/dream-card.schema.json`，Schema 本体已经完整保留；当前 `src/domain/dream-card/schema.ts` 的 Zod Schema 也应继续与 Draft 2020-12 Schema 同步。当前硬错误是 `docs/dream-card/dream-card.template.json:2` 的 `$schema` 为 `../schemas/dream-card.schema.json`，从该文件解析到不存在的 `docs/schemas/`；应改为 `./dream-card.schema.json`。样例卡的 `../../docs/dream-card/dream-card.schema.json`（`content/dream-cards/...json:2`）解析正确。

参考 `dream-card/scripts/validate-content.mjs:1-144` 必须以根 Next 结构改写并落到 `scripts/validate-content.mjs`，路径映射如下：

| 参考脚本路径 | Next 目标 |
| --- | --- |
| `dream-card/cards/` | `content/dream-cards/` |
| `dream-card/assets/assets.manifest.json` | `content/assets.manifest.json` |
| `dream-card/assets/` | `public/dream-assets/` |
| `dream-card/schemas/dream-card.schema.json` | `docs/dream-card/dream-card.schema.json` |
| `dream-card/create-guide/dream-card.template.json` | `docs/dream-card/dream-card.template.json` |

脚本必须保留参考分支已有的检查：所有卡和模板均以 AJV strict/allErrors 校验；`$schema` 必须解析到唯一 Schema；manifest 的 `schemaVersion`、assetId 唯一性、文件必须在运行时素材目录内且不得逃逸/进入 source、实际文件存在且 `bytes` 一致；卡片 `meta.id` 唯一；每幕引用的背景/人物 assetId 存在；每幕 `instanceId` 和 position 不重复。当前 `npm run validate:content` 仅运行 `src/domain/dream-card/content.test.ts` 的 3 个测试，未覆盖模板、bytes、路径逃逸和重复 position；当前 Zod `assetManifestSchema` 也只做相对路径基本检查，不能替代这些交付门禁。根 `package.json` 的 `validate:content` 应执行该脚本（可再串联 Vitest），`build` 或 CI 必须先执行它。

### 3. 依赖安全（P0）

参考 `dream-card/package.json:6-8,20-26` 将 AJV 固定到 `8.20.0`，并声明 Node `^20.19.0 || >=22.12.0`。当前根 `package.json:31` 仍为 `ajv: 8.17.1`；本工作区执行 `npm audit --json` 得到 `GHSA-2g4f-4pwh-qvx6`（AJV `$data` ReDoS，moderate，受影响范围 `<8.18.0`），修复建议明确为 `8.20.0`。必须只升级根 package 的 AJV 和根 `package-lock.json`，不能把参考的 Vite 子应用 package 原样复制进 Next 根目录，也不能重新引入第二个 lockfile。

Node 版本应在根 package/CI 中统一声明和执行；Next 16.3.3 本身要求 Node `>=20.9.0`，但 CI 建议固定 `actions/setup-node@v4` 的 `22.12.0`，并让 README、`engines` 与 workflow 一致。升级后验收 `npm ci` 后 `npm audit --json` 不再出现上述直接依赖漏洞。

### 4. 资产、临时文件与文档入口（P1）

当前 `content/assets.manifest.json` 的 12 个 Dream Card 素材与参考分支一致，应保留迁移工作区额外的 4 个 threshold 素材，并保证对应文件位于 `public/dream-assets/`；不得删除 threshold 内容以机械匹配参考分支。参考分支删除的 `dream-card/tmp/*.html` 与新增的 `tmp/` ignore 规则，应在 Next 根目录保持：当前 `.gitignore` 已包含 `tmp/`，最终 diff 不应重新出现旧 Vite `dist`、`node_modules` 或临时 HTML。

当前 canonical 文档是 `docs/dream-card/README.md`、`assets-guide.md`、`dream-card.schema.json`、`dream-card.template.json` 和 `幻梦卡生成指南.md`。旧的 `docs/幻梦卡生成指南.md` 仍在第 9-26、42-46、65 行引用已删除的 `dream-card/create-guide`、`dream-card/cards`、`dream-card/assets` 路径，必须更新为新权威路径或明确删除，避免 Agent 读取到两套互相冲突的制卡规范。

## 不应原样吸收：部署语义冲突

参考 `.github/workflows/deploy-pages.yml:24-51` 的修复意图是：Node/Python 设定、主体验测试、`dream-card` 的 `npm ci`/build、将根静态站点和 `/dream-card/` 组装后上传 Pages。当前 Next 任务规格明确要求旧 Pages 工作流退出（`.agent/tasks/unified-next-dream-experience/spec.md:49`），且根应用保留 `/api/dream/match`、`/api/dream/interpret` Route Handler 和 `next start`，因此该 workflow 不能直接恢复；GitHub Pages 静态导出无法承载当前 API/服务端 provider。

应吸收的是“CI 必须执行可复现安装、全量测试、内容校验、生产构建”的门禁语义，改写为根 `package-lock.json`、`npm ci`、`npm run lint`、`npm run typecheck`、`npm test`、`npm run validate:content`、`npm run build`，并选择支持 Next Route Handler 的部署目标（例如 Vercel 或自有 Node runtime）。只有在另行决定 `output: "export"`、移除服务端 API 并提供后端时，才可重新设计 Pages 部署；不能把参考 workflow 的 `cp index.html/assets/src/vendor` 逻辑带入统一 Next 应用。

## 文件映射总表

| 参考分支 | 当前 Next 对应 | 处理 |
| --- | --- | --- |
| `dream-card/cards/dream.kailu-jiangjun.du-shan-ji.json` | `content/dream-cards/dream.kailu-jiangjun.du-shan-ji.json` | 吸收 2 个 position + 4 个 instanceId；同步 notes。 |
| `dream-card/schemas/dream-card.schema.json` | `docs/dream-card/dream-card.schema.json` | Schema 本体保留；修 template 相对引用。 |
| `dream-card/create-guide/dream-card.template.json` | `docs/dream-card/dream-card.template.json` | 保留模板字段，`$schema` 改为 `./dream-card.schema.json`。 |
| `dream-card/scripts/validate-content.mjs` | `scripts/validate-content.mjs`（待补） | 迁移校验逻辑并改写四个根目录。 |
| `dream-card/src/App.tsx` | `src/features/dream-player/dream-player.tsx` | 移植 slot horizontal positioning。 |
| `dream-card/src/styles.css` | `src/features/dream-player/dream-player.css` | 移植 absolute/translateX 布局。 |
| `dream-card/package.json` + lock | 根 `package.json` + `package-lock.json` | 只吸收 AJV 8.20.0、Node/CI 约束；不吸收 Vite。 |
| `dream-card/assets/assets.manifest.json` | `content/assets.manifest.json` | 保留 12 个 Dream Card 条目并合并保留 4 个 threshold 条目。 |
| `.github/workflows/deploy-pages.yml` | Next 部署 workflow（待选宿主） | 只吸收 CI 门禁，不恢复旧 Pages artifact 拼装。 |
| `dream-card/tmp/*.html` + `.gitignore` | 根 `tmp/` ignore | 删除/忽略临时产物；当前 ignore 已有该规则。 |

## 验收标准

1. 内容：`content/dream-cards/dream.kailu-jiangjun.du-shan-ji.json` 仍为 7 Acts、所有 `choices` 为空；act-01/02 的双人角色为 left/right；act-03、04、05、07 的角色 `instanceId` 分别与文本 `speakerId` 对齐（`villager-a`、`masked`）；notes 不再引用旧 instanceId。
2. Schema/校验：模板 `$schema` 解析到现有 `docs/dream-card/dream-card.schema.json`；所有卡和模板通过 AJV Draft 2020-12 + Zod；校验能拒绝未知 assetId、缺失/越界素材、bytes 不一致、重复 card id、重复 instanceId/position，并输出文件与 JSON path。
3. 播放器：访问开发环境 `/dev/cards`，完整播放 7 幕；act-01/02 两人左右分布，act-03 三人约 25/50/75%；神秘人与村民对白出现时对应立绘 active 高亮；背景和人物请求均从 `/dream-assets/...` 返回 200。
4. 依赖：删除/重装 `node_modules` 后 `npm ci` 成功；根 lockfile 只有一份；`npm audit --json` 不再报告 AJV 8.17.1 的 GHSA；Node CI 使用锁定的 22.12.0（或与根 engines 明确一致的受支持版本）。
5. CI/部署：CI 执行 `npm ci`、lint、typecheck、test、content validation、build；部署目标能同时提供页面与两个 Route Handler。禁止以 Pages 静态 artifact 代替需要 Node runtime 的 API。
6. 最终命令门禁：`npm run lint`、`npm run typecheck`、`npm test`、`npm run validate:content`、`npm run build` 全通过；lint 应为零 warning。审计时当前工作区 `npm run validate:content`（3 tests）和 `npm test`（6 files/12 tests）通过，`npm run lint` 退出码 0 但当前仍有 `src/codex-collection.js` 3 条未使用变量 warning，故尚未满足“零 warning”门槛。

