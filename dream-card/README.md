# Dream Card Player

正式播放器采用 React + TypeScript + Vite。`cards/*.json` 与 `assets/assets.manifest.json` 是唯一权威数据；播放器通过 Vite 的文件发现能力自动形成卡池，不维护额外的卡片索引或生成脚本。

## 本地运行

首次运行：

```bash
cd dream-card
npm install
npm run dev
```

随后打开终端显示的本地地址，默认是 `http://127.0.0.1:5173/`。

## 内容更新

- 在 `cards/` 中新增符合 Dream Card Schema 的 JSON，重启或刷新开发服务后会自动出现在剧目下拉框。
- 在 `assets/` 中增加素材，并在 `assets/assets.manifest.json` 中登记稳定 `assetId` 与相对文件路径。
- `assets/source/` 是源文件区，不会进入播放器构建产物。
- `data.acts` 在卡片被选中后固定播放，播放器不会修改剧情数据。

## 验证与构建

```bash
npm run typecheck
npm run build
```

生产构建输出到 `dist/`，可以作为静态 Web 应用部署，也可以继续嵌入后续正式项目。
