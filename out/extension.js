"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
function activate(context) {
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
        }
        catch (error) {
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
        }
        catch (error) {
            vscode.window.showErrorMessage('Error refactoring code');
        }
    });
    context.subscriptions.push(refactorCode);
    context.subscriptions.push(commentCode);
}
function getSelectedText(editor) {
    const selection = editor.selection;
    return editor.document.getText(selection).trim();
}
function getConfig(key) {
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
function openAiPayload(prompt, code) {
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
async function callChatOpenAi(prompt, code) {
    const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', openAiPayload(prompt, code), openAiHeaders());
    return response.data.choices[0].message.content.trim();
}
async function showDiff(editor, originalCode, refactoredCode) {
    const refactoredDocument = await vscode.workspace.openTextDocument({
        content: editor.document.getText().replace(originalCode, refactoredCode),
        language: editor.document.languageId,
    });
    await vscode.commands.executeCommand('vscode.diff', refactoredDocument.uri, editor.document.uri, 'Allyzio: Diff View');
}
//# sourceMappingURL=extension.js.map