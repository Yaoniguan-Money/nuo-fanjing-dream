# DEV HANDOFF — 当前唯一基线

## 开场
不要恢复旧版山体多层动画。开场只有一个连续吸入镜头，控制在 1.2~1.6 秒，优先只动画 transform / opacity，避免复杂 filter 和大量 DOM。

## 交互
傩门之前不出现文字、不出现按钮。傩门是第一次主动交互。

## 主场
保留龙坛、面具、输入接口。鼠标视觉反馈克制，主要服务抓取、拖拽与确认。

## 结尾
禁止回到四张卡片式总结。结尾必须先做 cinematic reveal，再进入人物图鉴。图鉴采用角色墙/神龛式布局，不做 SaaS 卡片。

## 性能
- 开场最多 8~12 个主要 DOM 节点
- 优先 transform / opacity
- 粒子数量 <= 30
- 不要在 pointermove 中同时更新大量元素
- GSAP tween 使用 overwrite:auto
