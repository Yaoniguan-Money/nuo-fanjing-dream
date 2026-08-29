# 用户流程｜页面与资料索引

## 当前玩家主线

```text
开始入梦
  ↓
开场视频与过门
  ↓
来者何人（输入姓名）
  ↓
陈述现实困惑
  ↓
八大职司匹配（当前待重做）
  ↓
点击「入戏」
  ↓
固定剧情体验
  ↓
面具揭示与「收录此面」
  ↓
傩谱图鉴
  ↓
详情：签条 / 主面具 / 细节图解 / 傩解 / 相关图录
```

## 环节交接包

| 阶段 | 路由或组件 | 运行素材 | 设计资料库 | 当前责任 |
| --- | --- | --- | --- | --- |
| 00 封面与视频 | [../../src/features/threshold/](../../src/features/threshold/) | [../../public/dream-assets/brand/](../../public/dream-assets/brand/)；[../../public/dream-assets/intro/](../../public/dream-assets/intro/) | [../../../../设计资料/大傩幻梦_视觉资料库/04_视觉语法/CC0_UI与字体/](../../../../设计资料/大傩幻梦_视觉资料库/04_视觉语法/CC0_UI与字体/) | 已接入；视觉验收 `purpleeerrr` |
| 01 请面：姓名 / 困惑 | [../../src/features/get-face/get-face-ritual.tsx](../../src/features/get-face/get-face-ritual.tsx) | [../../public/dream-assets/altar/](../../public/dream-assets/altar/)；[../../public/dream-assets/ui/ritual/](../../public/dream-assets/ui/ritual/) | [../../../../设计资料/大傩幻梦_视觉资料库/01_入戏_愿在木纹中显影/](../../../../设计资料/大傩幻梦_视觉资料库/01_入戏_愿在木纹中显影/) | 文案与画面重做 `purpleeerrr` |
| 02 八面匹配 / 入戏 | [../../src/features/get-face/get-face-ritual.tsx](../../src/features/get-face/get-face-ritual.tsx) | [../../public/dream-assets/codex/masks/](../../public/dream-assets/codex/masks/) | [../../../../设计资料/大傩幻梦_视觉资料库/03_得面_傩签与图鉴/](../../../../设计资料/大傩幻梦_视觉资料库/03_得面_傩签与图鉴/) | 交互与美术 `purpleeerrr`；规则接入待队友 |
| 03 幻梦剧情 | [../../src/features/dream-player/](../../src/features/dream-player/) | [../../public/dream-assets/backgrounds/](../../public/dream-assets/backgrounds/)；[../../public/dream-assets/characters/](../../public/dream-assets/characters/) | [../../../../原型/](../../../../原型/) | 剧情内容依 JSON；新增剧情待分配 |
| 04 得面收录 | [../../src/features/get-face/get-face-result.tsx](../../src/features/get-face/get-face-result.tsx) | [../../public/dream-assets/ui/codex/details/](../../public/dream-assets/ui/codex/details/) | [../../../../设计资料/大傩幻梦_视觉资料库/03_得面_傩签与图鉴/](../../../../设计资料/大傩幻梦_视觉资料库/03_得面_傩签与图鉴/) | 动效与美术 `purpleeerrr` |
| 05 傩谱与详情 | [../../src/features/codex/](../../src/features/codex/) | [../../public/dream-assets/ui/codex/](../../public/dream-assets/ui/codex/) | [../../../../设计资料/大傩幻梦_视觉资料库/03_得面_傩签与图鉴/傩签与傩解/](../../../../设计资料/大傩幻梦_视觉资料库/03_得面_傩签与图鉴/傩签与傩解/) | 视觉验收 `purpleeerrr`；代码接入可协作 |

## 当前剧情覆盖

| 可直接体验 | 卡片 JSON | 收录面具 |
| --- | --- | --- |
| 开路将军《独山记》 | [../../content/dream-cards/dream.kailu-jiangjun.du-shan-ji.json](../../content/dream-cards/dream.kailu-jiangjun.du-shan-ji.json) | 开路将军 |
| 先锋小姐《牵界桥》 | [../../content/dream-cards/dream.xianfeng-xiaojie.qian-jie-qiao.json](../../content/dream-cards/dream.xianfeng-xiaojie.qian-jie-qiao.json) | 先锋小姐 |
| 九位土地神《第九坛》 | [../../content/dream-cards/dream.jiu-wei-tu-di-shen.di-jiu-tan.json](../../content/dream-cards/dream.jiu-wei-tu-di-shen.di-jiu-tan.json) | 九位土地神 |
| 唐氏太婆《织魂记》 | [../../content/dream-cards/dream.tangshi-taipo.zhi-hun-ji.json](../../content/dream-cards/dream.tangshi-taipo.zhi-hun-ji.json) | 唐氏太婆 |

八职司、素材状态与未完成项由 [../04_协作交接/待办与分工.md](../04_协作交接/待办与分工.md) 统一维护。
