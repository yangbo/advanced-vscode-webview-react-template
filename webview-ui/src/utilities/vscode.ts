import type { WebviewApi } from "vscode-webview";

/**
 * A utility wrapper around the acquireVsCodeApi() function, which enables
 * message passing and state management between the webview and extension
 * contexts.
 *
 * This utility also enables webview code to be run in a web browser-based
 * dev server by using native web browser features that mock the functionality
 * enabled by acquireVsCodeApi.
 */
class VSCodeAPIProxy implements WebviewApi<unknown> {
  private portPostMessage: MessagePort|undefined;

  constructor() {
    // 侦听来自父窗口的通道创建消息
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'createChannel') {
        switch(message.api) {
          case "postMessage":
            this.portPostMessage = event.ports?.[0];
            console.log(`[iframe] postMessage通道建立${this.portPostMessage ? "成功" : "失败"}`);
            // 这里我们不需要侦听来自通道的消息，因为我们只需要往通道发送消息而收消息
            break;
          case "getState":
            break;
          case "setState":
            break;
          default:
            console.log("不支持的 api: " + message.api);
            break;
        }
      }
    });

    // 侦听来自主帧的css样式变量消息
    window.addEventListener('message', (event) => {
      if (event.data.type === 'vscodeInlineStyles') {
          const htmlElement = document.documentElement;
          const vscodeStyles = event.data.styles;
          console.log("[iframe] 收到 vscodeInlineStyles 消息: ");
          console.log(vscodeStyles);
          const existingStyle = htmlElement.getAttribute("style") || "";
          const combinedStyle = `${existingStyle}; ${vscodeStyles}`;
          htmlElement.setAttribute("style", combinedStyle);
      }
    });
  }

  postMessage(message: unknown): void {
    this.portPostMessage?.postMessage(message);
  }

  getState(): unknown {
    throw new Error("Method not implemented.");
  }
  setState<T extends unknown>(newState: T): T {
    throw new Error("Method not implemented.");
  }

}

class VSCodeAPIWrapper {
  private vsCodeApi: WebviewApi<unknown> | undefined;

  constructor() {
    // Check if the acquireVsCodeApi function exists in the current development
    // context (i.e. VS Code development window or web browser)
    if (typeof acquireVsCodeApi === "function") {
      this.vsCodeApi = acquireVsCodeApi();
    } else {
      console.log(`[iframe] 准备 vsCodeApi 代理...`);
      // 准备代理
      this.vsCodeApi = new VSCodeAPIProxy();
    }
  }

  /**
   * Post a message (i.e. send arbitrary data) to the owner of the webview.
   *
   * @remarks When running webview code inside a web browser, postMessage will instead
   * log the given message to the console.
   *
   * @param message Abitrary data (must be JSON serializable) to send to the extension context.
   */
  public postMessage(message: unknown) {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else {
      // 其他情况，则直接打印消息
      console.log(message);
    }
  }

  /**
   * Get the persistent state stored for this webview.
   *
   * @remarks When running webview source code inside a web browser, getState will retrieve state
   * from local storage (https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
   *
   * @return The current state or `undefined` if no state has been set.
   */
  public getState(): unknown | undefined {
    if (this.vsCodeApi) {
      return this.vsCodeApi.getState();
    } else {
      const state = localStorage.getItem("vscodeState");
      return state ? JSON.parse(state) : undefined;
    }
  }

  /**
   * Set the persistent state stored for this webview.
   *
   * @remarks When running webview source code inside a web browser, setState will set the given
   * state using local storage (https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage).
   *
   * @param newState New persisted state. This must be a JSON serializable object. Can be retrieved
   * using {@link getState}.
   *
   * @return The new state.
   */
  public setState<T extends unknown | undefined>(newState: T): T {
    if (this.vsCodeApi) {
      return this.vsCodeApi.setState(newState);
    } else {
      localStorage.setItem("vscodeState", JSON.stringify(newState));
      return newState;
    }
  }
}

// Exports class singleton to prevent multiple invocations of acquireVsCodeApi.
export const vscode = new VSCodeAPIWrapper();
