# 完成交互待办并整合 main
目标：在最新 main 上补齐 `feat/codex-interaction-next-20260829` 的残余待办并本地合并回 main。
当前阶段：实施
已确认事实：目标分支自 bad0758 分出；main 领先 34 提交，目标分支有 5 个独有提交，直接合并会回退主线。
已改动或已执行：main 已快进到 origin/main@922e05e；工作分支为 codex/complete-interaction-todos-20260830；已提交真实面具三联确认页。
未解决问题：真实卡槽飞入、四个并行实现单元、透明边缘视觉核验、全链路回归。
下一步：整合并行单元，完成卡槽飞入，更新权威待办状态。
验证命令或验收标准：npm run lint && npm run typecheck && npm test && npm run validate:content && npm run build。
涉及文件：src/domain/get-face、src/features/{get-face,codex,dream-player,threshold}、docs/04_协作交接。
约束：保留 main 后续预加载、八故事和移动端修复；不推送远端；视觉板只作验收，不整张铺入页面。
