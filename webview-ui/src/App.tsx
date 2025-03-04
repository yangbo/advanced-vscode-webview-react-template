import { vscode } from "./utilities/vscode";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import "./App.css";

function App() {
  function handleHowdyClick() {
    console.log(`发送消息`);
    vscode.postMessage({
      command: "hello",
      text: "你好，vscode 开发者! 🤠",
    });
  }

  return (
    <main>
      <h1>你好，vscode 扩展开发！</h1>
      <h1>我是一个 react 实现的 webview 页面!</h1>
      <VSCodeButton onClick={handleHowdyClick} style={{
        margin: "10px auto" // 居中显示
      }}>点我能触发消息</VSCodeButton>
    </main>
  );
}

export default App;
