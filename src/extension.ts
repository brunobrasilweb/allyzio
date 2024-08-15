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
            const prompt = `
              You are a software engineering expert, provide comments explaining the code in a simple way in lang ${language}. Return only the code with the comments without using markdown MD.

              What you should not do in the code:
              - alter the code structure
              - remove any code
            `;
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
            const promptRefactorCode = `
              You are a software engineering expert and will be making improvements by expanding the following rules of what to do and what not to do in these improvements:

              Rules:
              - Return only the refactored code.
              - Apply the best practices of the programming language.
              - Apply design patterns concepts if applicable.
              - Apply SOLID principles if applicable.
              - If using Java, utilize the new features and versions, e.g., streams, etc.
              - Do not suggest changes to variables, methods, or classes if they are correctly named.
              - Do not comment on the code.
              - Do not import libraries.
              - Do not return code in Markdown (MD) format.
            `;
            const returnCode = await callChatOpenAi(promptRefactorCode, selectedText);

            await showDiff(editor, selectedText, returnCode);
        } catch (error) {
            vscode.window.showErrorMessage('Error refactoring code');
        }
    });

    context.subscriptions.push(refactorCode, commentCode);
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
  const payload = {
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

  return payload;
}

async function callChatOpenAi(prompt: string, code: string): Promise<string> {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions', openAiPayload(prompt, code), openAiHeaders()
  );

  return response.data.choices[0].message.content;
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