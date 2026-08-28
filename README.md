# 傩 · 梵净入梦

BUILD: `20260828-fanjing-opening-v3`

一个围绕“入戏—幻梦—得面”的沉浸式傩文化交互原型。

## 体验设计

- 开场：1.48 秒的单一连续镜头，由白昼云雾中的贵州梵净山推进至破旧村寨正中的门洞；开场不展示文字或按钮，傩门是第一次交互。
- 请面：4 个不显示真实样貌的朦胧傩影在龙坛旋转、聚焦与可拖拽吸附，避免在故事前泄露收集面具。
- 收集展示面：结尾 cinematic reveal 与傩谱收集墙使用 `assets/masks/` 中的原始 PNG 文件；浏览器仅做等比展示，不裁剪、不重绘或降质。
- 性能：开场仅 6 个内部节点，动画以 GSAP 的 `transform` 与 `opacity` 为主。

## 本地启动

直接双击 `start.bat`，或在项目目录运行：

```powershell
python server.py
```

服务会选择一个空闲本地端口并关闭缓存。

## 发布

推送到 `main` 后，`.github/workflows/deploy-pages.yml` 会将静态站点发布到 GitHub Pages。首次创建仓库后，请在仓库 **Settings → Pages** 中将 Source 设为 **GitHub Actions**。

## 主要文件

- `index.html`：场景结构
- `src/app.js`：GSAP 交互、请面和收集解锁流程
- `src/styles.css`：镜头、门与傩谱视觉样式
- `assets/fanjing-mountain-village.png`：梵净山—村寨开场背景
- `assets/masks/`：结尾收集展示使用的原始面具文件
