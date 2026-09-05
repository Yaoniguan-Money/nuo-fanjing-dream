# 完成交互待办并整合 main
目标：在最新 main 上补齐 `feat/codex-interaction-next-20260829` 的残余待办并本地合并回 main。
当前阶段：本地验收完成，等待线上预览
已确认事实：目标分支自 bad0758 分出；main 领先 34 提交，目标分支有 5 个独有提交，直接合并会回退主线。
已改动或已执行：main 已快进到 origin/main@922e05e；工作分支为 codex/complete-interaction-todos-20260830；已完成真实面具三联确认页、封面同源按钮、八面环转、音乐单击播放与加载进度动画。
未解决问题：Vercel Preview 尚未提交；当前 Vercel CLI 登录令牌失效。
下一步：用户完成 Vercel 登录并确认后，提交 Vercel Preview，核验线上加载动画、音乐单击播放和移动端布局。
验证命令或验收标准：npm run lint && npm run typecheck && npm test && npm run validate:content && npm run build。
涉及文件：src/domain/get-face、src/features/{get-face,codex,dream-player,threshold}、docs/04_协作交接。
约束：保留 main 后续预加载、八故事和移动端修复；工作分支可推送，远端 main 暂不推送；视觉板只作验收，不整张铺入页面。
