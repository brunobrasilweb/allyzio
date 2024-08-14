import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('allyzio.refactorCode', async () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showInformationMessage('No active editor found.');
      return;
    }

    const selection = editor.selection;
    const selectedText = editor.document.getText(selection).trim();

    if (!selectedText) {
      vscode.window.showInformationMessage('No code selected.');
      return;
    }

    try {
      const apiKey = getConfig('allyzio.chatgpt.apiKey') || ''; 
      const promptRefactorCode = getConfig('allyzio.prompt.refactorCode') || '';
      const refactoredCode = await getRefactoredCode(apiKey, promptRefactorCode, selectedText);

      await showDiff(editor, selectedText, refactoredCode);
    } catch (error) {
      vscode.window.showErrorMessage(`Error refactoring code`);
    }
  });

  context.subscriptions.push(disposable);
}

function getConfig(key: string): string | undefined {
  return vscode.workspace.getConfiguration().get(key);
}

async function getRefactoredCode(apiKey: string , prompt: string, code: string): Promise<string> {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a software engineering expert. ${prompt} and only return the code without code MD to be replaced.`,
        },
        {
          role: 'user',
          content: code,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.choices[0].message.content.trim();
}

async function showDiff(editor: vscode.TextEditor, originalCode: string, refactoredCode: string) {
  const refactoredDocument = await vscode.workspace.openTextDocument({
    content: editor.document.getText().replace(originalCode, refactoredCode),
    language: editor.document.languageId,
  });

  await vscode.commands.executeCommand(
    'vscode.diff',
    refactoredDocument.uri,
    editor.document.uri,
    'Allyzio: Diff View'
  );
}