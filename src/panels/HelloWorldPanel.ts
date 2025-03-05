import { Disposable, Webview, WebviewPanel, window, Uri, ViewColumn, } from "vscode";
import { getUri } from "../utilities/getUri";
import { getNonce } from "../utilities/getNonce";
import { log } from "../extension";

/**
 * This class manages the state and behavior of HelloWorld webview panels.
 *
 * It contains all the data and methods for:
 *
 * - Creating and rendering HelloWorld webview panels
 * - Properly cleaning up and disposing of webview resources when the panel is closed
 * - Setting the HTML (and by proxy CSS/JavaScript) content of the webview panel
 * - Setting message listeners so data can be passed between the webview and extension
 */
export class HelloWorldPanel {
  public static currentPanel: HelloWorldPanel | undefined;
  private _panel: WebviewPanel | undefined;
  private _disposables: Disposable[] = [];

  /**
   * The HelloWorldPanel class private constructor (called only from the render method).
   *
   * @param panel A reference to the webview panel
   * @param extensionUri The URI of the directory containing the extension
   */
  private constructor(panel: WebviewPanel, extensionUri: Uri) {
    (async () => {
      this._panel = panel;

      // Set an event listener to listen for when the panel is disposed (i.e. when the user closes
      // the panel or when the panel is closed programmatically)
      this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

      // Set the HTML content for the webview panel
      this._panel.webview.html = await this._getWebviewContent(this._panel.webview, extensionUri);

      // Set an event listener to listen for messages passed from the webview context
      this._setWebviewMessageListener(this._panel.webview);
    })();
  }

  /**
   * Renders the current webview panel if it exists otherwise a new webview panel
   * will be created and displayed.
   *
   * @param extensionUri The URI of the directory containing the extension.
   */
  public static async render(extensionUri: Uri) {
    if (HelloWorldPanel.currentPanel) {
      // If the webview panel already exists reveal it
      if (HelloWorldPanel.currentPanel._panel) {
        HelloWorldPanel.currentPanel._panel.reveal(ViewColumn.One);
      }
    } else {
      // If a webview panel does not already exist create and show a new one
      const panel = window.createWebviewPanel(
        // Panel view type
        "showHelloWorld",
        // Panel title
        "Hello World",
        // The editor column the panel should be displayed in
        ViewColumn.One,
        // Extra panel configurations
        {
          // Enable JavaScript in the webview
          enableScripts: true,
          // Restrict the webview to only load resources from the `out` and `webview-ui/build` directories
          localResourceRoots: [
            Uri.file(__dirname),
            Uri.joinPath(extensionUri, "out"),
            Uri.joinPath(extensionUri, "webview-ui/build")],
        }
      );

      HelloWorldPanel.currentPanel = await new HelloWorldPanel(panel, extensionUri);
      log(`创建 HelloWorldPanel 完毕！`);
    }
  }

  /**
   * Cleans up and disposes of webview resources when the webview panel is closed.
   */
  public dispose() {
    HelloWorldPanel.currentPanel = undefined;

    // Dispose of the current webview panel
    if (this._panel) {
      this._panel.dispose();
    }
    // Dispose of all disposables (i.e. commands) for the current webview panel
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Defines and returns the HTML that should be rendered within the webview panel.
   *
   * @remarks This is also the place where references to the React webview build files
   * are created and inserted into the webview HTML.
   *
   * @param webview A reference to the extension webview
   * @param extensionUri The URI of the directory containing the extension
   * @returns A template string literal containing the HTML that should be
   * rendered within the webview panel
   */
  private async _getWebviewContent(webview: Webview, extensionUri: Uri) {
    let _DEBUG = true;
    // 添加 debug 模式，支持 HMR 热重载
    if (_DEBUG) {
      // 用 iframe 模式装载 react app，但这样就不能往 vscode 发送消息了
      const htmlUri = "http://localhost:3000/";
      // 用 iframe 方法访问
      return /*html*/`<!DOCTYPE html>
<html>
<head>
  <title>Webview 主页面</title>
  <style>
    html, body {
      height: 100%; /* 确保父容器占据整个视口高度 */
      margin: 0;
      padding: 0;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none; /* 移除 iframe 边框 */
    }
  </style>
</head>
<body>
  <iframe id="myIframe" src="${htmlUri}" width="100%" height="100%"></iframe> 
  <script>
    
    // 创建 main frame 和 iframe 之间的 Message Channel，用来实现 WebView.postMessage()、getState()和setState() 函数代理
    const channelPostMessage = new MessageChannel();
    const channelSetState = new MessageChannel();
    const channelGetState = new MessageChannel();

    /**
     * 创建 main frame 和 iframe 之间的 Message Channel，
     * 实现 WebView.postMessage() 函数代理
     */
    function proxyVscode(iframe, vscode){
      // 在 iframe onloaded 事件时再发送 vscode api 到 iframe
      iframe.onload = function() {
        // 代理 vscode.postMesssage() 函数
        console.log("[main frame] 创建消息通道，实现 postMessage 函数代理");
        iframe.contentWindow.postMessage({
            command: 'createChannel',
            api: "postMessage"
        }, '*', [channelPostMessage.port2]);
        // 侦听通道收到的消息
        channelPostMessage.port1.onmessage = function(event) {
          console.log("[main frame] 收到 iframe postMessage 消息: ");
          console.log(event.data);
          vscode.postMessage(event.data);
        };

        // 代理 vscode.getState() 函数
        console.log("[main frame] 创建消息通道，实现 getState 函数代理");
        iframe.contentWindow.postMessage({
            command: 'createChannel',
            api: "getState"
        }, '*', [channelGetState.port2]);
        // 侦听通道收到的消息
        channelGetState.port1.onmessage = function(event) {
          console.log("[main frame] 收到 iframe getState 消息: ");
          console.log(event.data);
          const state = vscode.getState();
          // 发送 getState() 结果到 iframe
          channelGetState.port1.postMessage(state);
        }

        // 代理 vscode.setState() 函数
        console.log("[main frame] 创建消息通道，实现 setState 函数代理");
        iframe.contentWindow.postMessage({
            command: 'createChannel',
            api: "setState"
        }, '*', [channelSetState.port2]);
        // 侦听通道收到的消息
        channelSetState.port1.onmessage = function(event) {
          console.log("[main frame] 收到 iframe setState 消息: ");
          console.log(event.data);
          const state = vscode.setState(event.data);
        }
      }
    }

    // 还没有获取过 vscode api，需要获取
    if (!window.vsCodeApi){
      window.vsCodeApi = acquireVsCodeApi();
      console.log("[main frame] 获取到 window.vsCodeApi: ");
      console.log(window.vsCodeApi);
    } else {
      // 已经获取过 vscode api，不需要再获取
      console.log("[main frame] window.vsCodeApi 已经存在，不需要重新获取:");
      console.log(window.vsCodeApi);
    }
    // 准备接收 iframe 的 vscode api 消息
    const iframe = document.getElementById('myIframe');
    if (window.vsCodeApi) {
      proxyVscode(iframe, window.vsCodeApi);
    }

    // 传递 vscode 的 css 样式
    function sendVscodeCssVariablesToIframe(iframe) {
      const variables = {};
      // 获取所有CSS变量（自定义属性）
      const htmlElement = document.documentElement;
      const inlineStyle = htmlElement.getAttribute("style") || "";

      iframe.addEventListener('load', () => {
        console.log("发送 vscode css 变量到 iframe");
        iframe.contentWindow.postMessage({ type: 'vscodeInlineStyles', styles: inlineStyle }, '*');
      });
    }
    sendVscodeCssVariablesToIframe(iframe);
  </script>
</body>
</html>`;
    } else {
      // The CSS file from the React build output
      const stylesUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.css"]);
      // The JS file from the React build output
      const scriptUri = getUri(webview, extensionUri, ["webview-ui", "build", "assets", "index.js"]);

      const nonce = getNonce();

      // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
      return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <link rel="stylesheet" type="text/css" href="${stylesUri}">
          <title>Hello World</title>
        </head>
        <body>
          <div>来自HTML文件</div>
          <div id="root"></div>
          <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
        </body>
      </html>
    `;
    }
  }

  /**
   * Sets up an event listener to listen for messages passed from the webview context and
   * executes code based on the message that is recieved.
   *
   * @param webview A reference to the extension webview
   * @param context A reference to the extension context
   */
  private _setWebviewMessageListener(webview: Webview) {
    webview.onDidReceiveMessage(
      (message: any) => {
        const command = message.command;
        const text = message.text;

        switch (command) {
          case "hello":
            // Code that should run in response to the hello message command
            window.showInformationMessage(text);
            return;
          // Add more switch case statements here as more webview message commands
          // are created within the webview context (i.e. inside media/main.js)
        }
      },
      undefined,
      this._disposables
    );
  }
}
