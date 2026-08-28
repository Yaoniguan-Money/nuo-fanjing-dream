# 傩 · 梵净入梦

BUILD: `20260828-codex-v1`

一个围绕“入戏—幻梦—得面”的沉浸式傩文化交互原型。

## 体验设计

- 开场：一个 Three.js 2.5D 场景内的 1.35 秒单调镜头，由白昼云雾中的贵州梵净山推进至破旧村寨正中的同一扇木门；镜头停稳后，门环才成为第一次交互。按住门环会打开同一组 3D 门扇，镜头连续穿过门洞进入仪式厅，没有黑场、背景替换或第二段门动画。
- 请面：4 个不显示真实样貌的朦胧傩影在龙坛旋转、聚焦与可拖拽吸附，避免在故事前泄露收集面具。
- 收集展示面：结尾 cinematic reveal 后进入 12 格傩谱。4 张视觉母体可按本机收录状态点亮，8 格为待补位置；收录数据不保存愿望或人像。
- 傩谱详情：已收录卡会翻入独立详情，使用原始 PNG 生成可拖动、缩放的程序化浮雕网格；它明确不是文物扫描模型。
- 龙坛：使用本地 `assets/dragon-altar-style.png` 作为祭坛氛围底图，原有请面拖拽流程保持不变。
- 性能：开场只运行一个 WebGL renderer；GSAP 只编排相机、门扇与雾层的 transform / opacity。低性能设备自动减少雾层与阴影。

## 本地启动

完整“得面”体验请通过 `start.bat`、`start.ps1` 或 `python server.py` 启动本地服务。它为 DeepSeek 傩签代理和摄像头预览提供所需的 localhost 环境；不要单独移动该文件，须保留同级的 `assets/`、`src/` 与 `vendor/` 文件夹。

直接双击 `index.html` 仍可查看原有离线场景，但浏览器会明确提示 AI 求签与摄像头预览不可用，不会生成伪造傩签。

`start.bat` 仅用于本地调试：它会启动禁用缓存的本地服务。也可在项目目录运行：

```powershell
python server.py
```

服务会选择一个空闲本地端口并关闭缓存。

### 配置 AI 傩签

复制 `.env.local.example` 为 `.env.local`，再填入**轮换后的** DeepSeek Key：

```ini
DEEPSEEK_API_KEY=你的新密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

`.env.local` 已被 Git 忽略。浏览器只请求本机 `/api/v1/omen`，摄像头只作本机预览，不截帧、不识别、不上传。

## 发布

推送到 `main` 后，`.github/workflows/deploy-pages.yml` 会先校验并构建 `dream-card/`，再将主体验发布到站点根路径、将 Dream Card Player 发布到 `/dream-card/`。首次创建仓库后，请在仓库 **Settings → Pages** 中将 Source 设为 **GitHub Actions**。

## 主要文件

- `index.html`：场景结构
- `src/app.js`：GSAP 交互、请面和收集解锁流程
- `src/threshold-scene.js`：Three.js 连续开场、门扇与相机路径
- `src/styles.css`：镜头、门与傩谱视觉样式
- `src/codex-collection.js`：本机傩谱存储边界（不含愿望、视频或人像）
- `src/mask-relief-viewer.js`：按视觉母体生成与释放 Three.js 浮雕查看器
- `assets/fanjing-backdrop-v2.png`、`assets/village-facade-door.png`、`assets/ritual-threshold-hall.png`：原创分层环境资源
- `vendor/three.min.js`、`vendor/THREE-LICENSE`：本地托管的 Three.js r160.1 经典脚本与 MIT 许可证
- `vendor/gsap.min.js`、`vendor/GSAP-LICENSE.md`：本地托管的 GSAP 3.15.0 与许可证说明
- `assets/masks/`：结尾收集展示使用的原始面具文件
- `assets/dragon-altar-style.png`：用户提供的龙坛画风底图
