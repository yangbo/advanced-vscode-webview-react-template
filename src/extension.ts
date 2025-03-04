import { commands, ExtensionContext } from "vscode";
import { HelloWorldPanel } from "./panels/HelloWorldPanel";
import * as vscode from "vscode"

export let outputChannel: vscode.OutputChannel;

export function activate(context: ExtensionContext) {
  // 创建一个日志输出通道
  outputChannel = vscode.window.createOutputChannel("hello-wolrd-react-vite")
  // Create the show hello world command
  const showHelloWorldCommand = commands.registerCommand("hello-world.showHelloWorld", async () => {
    HelloWorldPanel.render(context.extensionUri);
  });

  // Add command to the extension context
  context.subscriptions.push(showHelloWorldCommand);
}

export function log(msg: string) {
  outputChannel.appendLine(msg);
}