import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
    const commentCode = vscode.commands.registerCommand('allyzio.commentCode', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showInformationMessage('No active editor found.');
            return;
        }

        const selectedText = getSelectedText(editor);

        if (!selectedText) {
            vscode.window.showInformationMessage('No code selected.');
            return;
        }

        try {
            const language = vscode.env.language;
            const prompt = `You are a software engineering expert. Make comments in the code with language ${language} in a simple and explanatory way of how the code works. Dont remove any code. I want you to only return the code with the comment without markdown code (MD):`;
            const returnCode = await callChatOpenAi(prompt, selectedText);

            await showDiff(editor, selectedText, returnCode);
        } catch (error) {
            vscode.window.showErrorMessage('Error refactoring code');
        }
    });

    const refactorCode = vscode.commands.registerCommand('allyzio.refactorCode', async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
            vscode.window.showInformationMessage('No active editor found.');
            return;
        }

        const selectedText = getSelectedText(editor);

        if (!selectedText) {
            vscode.window.showInformationMessage('No code selected.');
            return;
        }

        try {
            const promptRefactorCode = `You are a software engineering expert. ${getConfig('allyzio.chatgpt.apiKey')}. Only return the code without markdown code (MD) to be replaced.`;
            const returnCode = await callChatOpenAi(promptRefactorCode, selectedText);

            await showDiff(editor, selectedText, returnCode);
        } catch (error) {
            vscode.window.showErrorMessage('Error refactoring code');
        }
    });

    context.subscriptions.push(refactorCode);
    context.subscriptions.push(commentCode);
}

function getSelectedText(editor: vscode.TextEditor) {
    const selection = editor.selection;
    return editor.document.getText(selection).trim();
}

function getConfig(key: string): string | undefined {
  return vscode.workspace.getConfiguration().get(key);
}

function openAiHeaders() {
  return {
    headers: {
      Authorization: `Bearer ${getConfig('allyzio.chatgpt.apiKey')}`,
      'Content-Type': 'application/json',
    },
  };
}

function openAiPayload(prompt: string, code: string) {
  return {
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: prompt,
      },
      {
        role: 'user',
        content: code,
      },
    ],
  };
}

async function callChatOpenAi(prompt: string, code: string): Promise<string> {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions', openAiPayload(prompt, code), openAiHeaders()
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