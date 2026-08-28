# 傩 · 梵净入梦

BUILD: `20260828-file-textures-v6`

一个围绕“入戏—幻梦—得面”的沉浸式傩文化交互原型。

## 体验设计

- 开场：一个 Three.js 2.5D 场景内的 1.35 秒单调镜头，由白昼云雾中的贵州梵净山推进至破旧村寨正中的同一扇木门；镜头停稳后，门环才成为第一次交互。按住门环会打开同一组 3D 门扇，镜头连续穿过门洞进入仪式厅，没有黑场、背景替换或第二段门动画。
- 请面：4 个不显示真实样貌的朦胧傩影在龙坛旋转、聚焦与可拖拽吸附，避免在故事前泄露收集面具。
- 收集展示面：结尾 cinematic reveal 与傩谱收集墙使用 `assets/masks/` 中的原始 PNG 文件；浏览器仅做等比展示，不裁剪、不重绘或降质。
- 性能：开场只运行一个 WebGL renderer；GSAP 只编排相机、门扇与雾层的 transform / opacity。低性能设备自动减少雾层与阴影。

## 本地启动

可直接双击 `index.html` 离线体验；不要单独移动该文件，须保留同级的 `assets/`、`src/` 与 `vendor/` 文件夹。

`start.bat` 仅用于本地调试：它会启动禁用缓存的本地服务。也可在项目目录运行：

```powershell
python server.py
```

服务会选择一个空闲本地端口并关闭缓存。

## 发布

推送到 `main` 后，`.github/workflows/deploy-pages.yml` 会将静态站点发布到 GitHub Pages。首次创建仓库后，请在仓库 **Settings → Pages** 中将 Source 设为 **GitHub Actions**。

## 主要文件

- `index.html`：场景结构
- `src/app.js`：GSAP 交互、请面和收集解锁流程
- `src/threshold-scene.js`：Three.js 连续开场、门扇与相机路径
- `src/styles.css`：镜头、门与傩谱视觉样式
- `assets/fanjing-backdrop-v2.png`、`assets/village-facade-door.png`、`assets/ritual-threshold-hall.png`：原创分层环境资源
- `vendor/three.min.js`、`vendor/THREE-LICENSE`：本地托管的 Three.js r160.1 经典脚本与 MIT 许可证
- `vendor/gsap.min.js`、`vendor/GSAP-LICENSE.md`：本地托管的 GSAP 3.15.0 与许可证说明
- `assets/masks/`：结尾收集展示使用的原始面具文件
