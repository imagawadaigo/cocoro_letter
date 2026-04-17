/**
 * Cocoro Letter — Anthropic API Proxy
 *
 * 設定手順:
 * 1. GASエディタ → 歯車アイコン「プロジェクトの設定」
 * 2. 「スクリプトプロパティ」→「プロパティを追加」
 *    プロパティ名: ANTHROPIC_API_KEY
 *    値: sk-ant-... (AnthropicのAPIキー)
 * 3. 「デプロイ」→「新しいデプロイ」
 *    種類: ウェブアプリ
 *    次のユーザーとして実行: 自分
 *    アクセスできるユーザー: 全員
 * 4. デプロイURLをコピーしてindex.htmlのGAS_PROXY_URLに貼り付ける
 */

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1000;
const ALLOWED_ORIGIN = 'https://imagawadaigo.github.io';

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  // CORS headers (GASではカスタムヘッダー追加不可のためJSONレスポンスで対応)
  try {
    const body = JSON.parse(e.postData.contents);
    const prompt = body.prompt;

    if (!prompt || typeof prompt !== 'string' || prompt.length > 8000) {
      output.setContent(JSON.stringify({ error: 'invalid_prompt' }));
      return output;
    }

    const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
    if (!apiKey) {
      output.setContent(JSON.stringify({ error: 'api_key_not_configured' }));
      return output;
    }

    const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      payload: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
      muteHttpExceptions: true,
    });

    const status = response.getResponseCode();
    const data = JSON.parse(response.getContentText());

    if (status !== 200 || !data.content || !data.content[0]) {
      output.setContent(JSON.stringify({ error: 'upstream_error', detail: data }));
      return output;
    }

    output.setContent(JSON.stringify({ text: data.content[0].text }));
    return output;

  } catch (err) {
    output.setContent(JSON.stringify({ error: 'server_error', message: err.toString() }));
    return output;
  }
}

// GETリクエスト → 動作確認用
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ status: 'ok', model: MODEL })
  ).setMimeType(ContentService.MimeType.JSON);
}
