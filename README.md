# 高级的vscode webview扩展模板 (React + Vite)

这是一个高级的 vscode webview 扩展模板，使用 React + Vite + Webview UI Toolkit 实现，支持调试 webview 中的 react app。

它的高级之处是：
1. 支持用 chrome开发者工具 查看 react app 代码、热更新、调试等功能。当然也可以打包为正式的 vscode 扩展内嵌的 webview html资源。
2. 支持在开发模式下，在 webview react app 内访问 vscode api。
3. 支持在开发模式下，在 webview react app 内使用 vscode webview 样式变量，如 `var(--vscode-editor-background)` 等。

本项目扩展自微软的 [vscode-webview-ui-toolkit-samples](https://github.com/microsoft/vscode-webview-ui-toolkit-samples/tree/main/default/hello-world)。

## 调试扩展的方法

要调试本扩展，请用以下方法。

```bash
# 安装依赖
npm run install:all

# 启动 webview 开发服务器
npm run start:webview
```

用 vscode 打开本扩展项目，然按以下步骤调试扩展：

1. 按 `F5` 打开一个新的 `扩展开发宿主窗口 (Extension Development Host window)`。
2. 在宿主窗口中，打开命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`），输入 `Hello World (React + Vite): Show`，这样会激活扩展。
3. 按 `F12` 打开 chrome 开发者工具，切换到 `Sources` 选项卡，可以看到 `webview` 项目的源代码。
4. 可以任意修改 webview-ui 下的 react app，保存后会自动热更新，不必重启扩展就能立即看到效果。

## 打包发布扩展

要打包发布扩展，请用以下方法。

```bash
# 打包 webview react app
npm run build:webview

# 打包 vscode 扩展
npm run build
```
