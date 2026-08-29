# 资料与资产｜唯一索引

本表以用途管理素材。需要在产品内加载的文件留在 `public/dream-assets/`；设计原始文件和实物来源不移动，只通过相对链接回溯。

| 用途 | 运行时目录 | 制作 / 原始资料 |
| --- | --- | --- |
| 封面、Logo、字体 UI | [../../public/dream-assets/brand/](../../public/dream-assets/brand/) | [../../../../设计资料/大傩幻梦_视觉资料库/04_视觉语法/CC0_UI与字体/](../../../../设计资料/大傩幻梦_视觉资料库/04_视觉语法/CC0_UI与字体/) |
| 开场与请面空间 | [../../public/dream-assets/intro/](../../public/dream-assets/intro/)；[../../public/dream-assets/altar/](../../public/dream-assets/altar/) | [../../../../设计资料/大傩幻梦_视觉资料库/01_入戏_愿在木纹中显影/](../../../../设计资料/大傩幻梦_视觉资料库/01_入戏_愿在木纹中显影/) |
| 剧情背景与人物 | [../../public/dream-assets/backgrounds/](../../public/dream-assets/backgrounds/)；[../../public/dream-assets/characters/](../../public/dream-assets/characters/) | [../../reference-materials/dream-card-source/](../../reference-materials/dream-card-source/) |
| 傩谱卡面、详情、签条 | [../../public/dream-assets/ui/codex/](../../public/dream-assets/ui/codex/) | [../../../../设计资料/大傩幻梦_视觉资料库/03_得面_傩签与图鉴/](../../../../设计资料/大傩幻梦_视觉资料库/03_得面_傩签与图鉴/) |
| 三视图和实体参考 | [../../public/dream-assets/codex/masks/](../../public/dream-assets/codex/masks/) | [../../reference-materials/中国傩戏网_面具图片/](../../reference-materials/中国傩戏网_面具图片/) |
| 文化调研与项目基线 | 不进入运行包 | [../../reference-materials/](../../reference-materials/)；[../../../../报告/](../../../../报告/) |

## 入库顺序

1. 由 `purpleeerrr` 确认视觉版本、透明底、命名与画幅。
2. 将通过验收的运行副本放入相应 `public/dream-assets/<用途>/` 目录。
3. 在 [../../content/assets.manifest.json](../../content/assets.manifest.json) 登记稳定 `assetId`、尺寸、Alpha、来源与状态。
4. UI 使用路径或 `assetId` 接入，卡面/详情素材同步检查透明边缘。
5. 原始图、生成过程和实物图只留在本表所指的非运行目录。

详细规格见 [../dream-card/assets-guide.md](../dream-card/assets-guide.md)。
