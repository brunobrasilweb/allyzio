import * as vscode from "vscode";
import axios from "axios";
import markdownIt from 'markdown-it';

export function activate(context: vscode.ExtensionContext) {
  const explainCode = vscode.commands.registerCommand(
    "allyzio.explainCode",
    async () => {
      init(context);

      const token = getConfig("allyzio.token") || '';
      const editor = vscode.window.activeTextEditor;
      const markdownItParser = markdownIt();
      let counter: number = context.globalState.get('counter') || 0;

      if (!await isTokenValid(context, token)) {
        countRequest(context);
        
        if (counter > 5) {
          vscode.window.showInformationMessage("You've reached the limit of 5 requests per day. Upgrade here: https://allyzio.com");
          return;
        }
      }

      if (!editor) {
        vscode.window.showInformationMessage("No active editor found.");
        return;
      }

      const selectedText = getSelectedText(editor);

      if (!selectedText) {
        vscode.window.showInformationMessage("No code selected.");
        return;
      }

      try {
        const prompt = `
              You are a software engineering expert. You will briefly explain how the code works following these rules:

              Rules:
              - lang ${vscode.env.language}
              - Start with a description of how the code works
              - Talk only about the code
              - You can add comments to the code to make it easier to understand
            `;
        const returnCode = await callChatOpenAi(prompt, selectedText);

        showMarkdownInWebview(returnCode, context.extensionUri, markdownItParser);
      } catch (error) {
        vscode.window.showErrorMessage("Error refactoring code");
      }
    }
  );

  const testUnitCode = vscode.commands.registerCommand(
    "allyzio.testUnitCode",
    async () => {
      init(context);

      const token = getConfig("allyzio.token") || '';
      const editor = vscode.window.activeTextEditor;
      let counter: number = context.globalState.get('counter') || 0;

      if (!await isTokenValid(context, token)) {
        countRequest(context);
        
        if (counter > 5) {
          vscode.window.showInformationMessage("You've reached the limit of 5 requests per day. Upgrade here: https://allyzio.com");
          return;
        }
      }

      if (!editor) {
        vscode.window.showInformationMessage("No active editor found.");
        return;
      }

      const selectedText = getSelectedText(editor);

      if (!selectedText) {
        vscode.window.showInformationMessage("No code selected.");
        return;
      }

      try {
        const prompt = `
              You are a software engineering expert. You will write unit tests for the code with the following rules:

              Rules:
              - Only return the unit test code
              - do the complete unit test code and not just the comment
              - Generate all possible test scenarios for the code
              - Do not set up the application
              - Do not return code in Markdown format.
            `;
        const returnCode = await callChatOpenAi(prompt, selectedText);

        await generateCode(editor, returnCode);
      } catch (error) {
        vscode.window.showErrorMessage("Error refactoring code");
      }
    }
  );

  const commentCode = vscode.commands.registerCommand(
    "allyzio.commentCode",
    async () => {
      init(context);

      const token = getConfig("allyzio.token") || '';
      const editor = vscode.window.activeTextEditor;
      let counter: number = context.globalState.get('counter') || 0;

      if (!await isTokenValid(context, token)) {
        countRequest(context);
        
        if (counter > 5) {
          vscode.window.showInformationMessage("You've reached the limit of 5 requests per day. Upgrade here: https://allyzio.com");
          return;
        }
      }

      if (!editor) {
        vscode.window.showInformationMessage("No active editor found.");
        return;
      }

      const selectedText = getSelectedText(editor);

      if (!selectedText) {
        vscode.window.showInformationMessage("No code selected.");
        return;
      }

      try {
        const prompt = `
              You are a software engineering expert, provide comments explaining the code in a simple way in lang ${vscode.env.language}. Return only the code with the comments without using markdown.

              What you should not do in the code:
              - alter the code structure
              - remove any code
            `;
        const returnCode = await callChatOpenAi(prompt, selectedText);

        await showDiff(editor, selectedText, returnCode);
      } catch (error) {
        vscode.window.showErrorMessage("Error refactoring code");
      }
    }
  );

  const refactorCode = vscode.commands.registerCommand(
    "allyzio.refactorCode",
    async () => {
      init(context);

      const token = getConfig("allyzio.token") || '';
      const editor = vscode.window.activeTextEditor;
      let counter: number = context.globalState.get('counter') || 0;

      if (!await isTokenValid(context, token)) {
        countRequest(context);
        
        if (counter > 5) {
          vscode.window.showInformationMessage("You've reached the limit of 5 requests per day. Upgrade here: https://allyzio.com");
          return;
        }
      }

      if (!editor) {
        vscode.window.showInformationMessage("No active editor found.");
        return;
      }

      const selectedText = getSelectedText(editor);

      if (!selectedText) {
        vscode.window.showInformationMessage("No code selected.");
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
              - Do not return code in Markdown format.
            `;
        const returnCode = await callChatOpenAi(
          promptRefactorCode,
          selectedText
        );

        await showDiff(editor, selectedText, returnCode);
      } catch (error) {
        vscode.window.showErrorMessage("Error refactoring code");
      }
    }
  );

  context.subscriptions.push(
    refactorCode,
    commentCode,
    testUnitCode,
    explainCode
  );
}

function init(context: vscode.ExtensionContext) {
  if (undefined === context.globalState.get('date')) {
    context.globalState.update('date', new Date().getDate());  
  }

  if (undefined === context.globalState.get('counter')) {
    context.globalState.update('counter', 0);  
  }
  
  if (undefined === context.globalState.get('tokenValid')) {
    context.globalState.update('tokenValid', false);  
  }
}

function countRequest(context: vscode.ExtensionContext) {
  let date = context.globalState.get('date') || new Date().getDate();
  let counter: number = context.globalState.get('counter') || 0;
  
  if (date == new Date().getDate()) {
    context.globalState.update('counter', counter+1);  
  } else {
    context.globalState.update('counter', 0);  
    context.globalState.update('date', new Date().getDate());  
  }
}

function getSelectedText(editor: vscode.TextEditor): string {
  const selection = editor.selection;
  return editor.document.getText(selection).trim();
}

function getConfig(key: string): string | undefined {
  return vscode.workspace.getConfiguration().get(key);
}

function openAiHeaders(): any {
  return {
    headers: {
      Authorization: `Bearer sk-rtcqbJmL4SNbjqsChLR2Q8jxOdkrzRH58RunqmcczAT3BlbkFJsCBtdUTMuVIITwB62TgtDrZHJ4AfrNQh1exkOR6Q4A`,
      "Content-Type": "application/json",
    },
  };
}

function openAiPayload(prompt: string, code: string): any {
  return {
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: code,
      },
    ],
  };
}

async function isTokenValid(context: vscode.ExtensionContext, token: string) {
  let date = context.globalState.get('date') || 0;

  if (date == new Date().getDay()) {
    return context.globalState.get('tokenValid');
  }
  
  const response = await axios.get(
    "https://allyzio.com/api/token-access",
    {
      headers: {
        Token: token,
        "Content-Type": "application/json",
      },
    }
  );

  if (response.status == 200) {
    context.globalState.update('tokenValid', true);  
    return true;
  }
  
  context.globalState.update('tokenValid', false);  
  return false;
} 

async function callChatOpenAi(prompt: string, code: string): Promise<string> {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    openAiPayload(prompt, code),
    openAiHeaders()
  );

  return response.data.choices[0].message.content;
}

async function showDiff(
  editor: vscode.TextEditor,
  originalCode: string,
  refactoredCode: string
) {
  const refactoredDocument = await vscode.workspace.openTextDocument({
    content: editor.document.getText().replace(originalCode, refactoredCode),
    language: editor.document.languageId,
  });

  await vscode.commands.executeCommand(
    "vscode.diff",
    refactoredDocument.uri,
    editor.document.uri,
    "Allyzio: Diff View"
  );
}

async function generateCode(editor: vscode.TextEditor, code: string) {
  await vscode.workspace.openTextDocument({
    content: code,
    language: editor.document.languageId,
  });
}

function showMarkdownInWebview(content: string, extensionUri: vscode.Uri, markdownIt: markdownIt) {
  const panel = vscode.window.createWebviewPanel(
    'markdownPreview',
    'Allyzio Copilot',
    vscode.ViewColumn.Beside,
    {
      enableScripts: true,
    }
  );

  panel.webview.html = getHtmlForWebview(content, markdownIt);
}

function getHtmlForWebview(content: string, markdownIt: markdownIt): string {
  const htmlContent = markdownIt.render(content || "Select some Markdown text to display here.");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Allyzio Copilot</title>
    </head>
    <body>
      ${htmlContent}
    </body>
    </html>`;
}