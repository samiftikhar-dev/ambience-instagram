/**
 * One time: lets the shorts workflow upload to the channel.
 *
 *   node yt-auth.mjs path\to\client_secret.json
 *
 * The JSON is the "Desktop app" OAuth client downloaded from Google Cloud. This
 * opens Google's consent page; sign in with the account that owns the channel,
 * pick the channel, and allow. The client id, secret and the refresh token go
 * straight into the repository's secrets through gh; nothing is printed.
 */
import { createServer } from 'node:http';
import { execFileSync, exec } from 'node:child_process';
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) { console.log('Usage: node yt-auth.mjs path\\to\\client_secret.json'); process.exit(1); }
const json = JSON.parse(readFileSync(file, 'utf8'));
const { client_id: id, client_secret: secret } = json.installed || json.web || {};
if (!id || !secret) { console.log('That file has no OAuth client in it.'); process.exit(1); }

const PORT = 8765;
const redirect = `http://127.0.0.1:${PORT}`;
const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
  client_id: id, redirect_uri: redirect, response_type: 'code', access_type: 'offline', prompt: 'consent',
  scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
});

const repo = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']).toString().trim();
const setSecret = (name, value) => execFileSync('gh', ['secret', 'set', name, '--repo', repo], { input: value });

createServer(async (req, res) => {
  const code = new URL(req.url, redirect).searchParams.get('code');
  if (!code) { res.end('No code in this request.'); return; }
  const tok = await (await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: redirect, grant_type: 'authorization_code' }),
  })).json();
  if (!tok.refresh_token) {
    res.end('Google did not return a refresh token. Close this and run the script again.');
    console.log(`No refresh token (${tok.error || 'unknown'}).`);
    process.exit(1);
  }
  setSecret('YT_CLIENT_ID', id);
  setSecret('YT_CLIENT_SECRET', secret);
  setSecret('YT_REFRESH_TOKEN', tok.refresh_token);
  res.end('Done. The channel is connected; you can close this tab.');
  console.log(`Saved YT_CLIENT_ID, YT_CLIENT_SECRET and YT_REFRESH_TOKEN to ${repo}.`);
  process.exit(0);
}).listen(PORT, '127.0.0.1', () => {
  console.log('Opening Google sign-in. Use the account that owns the channel.');
  exec(`start "" "${url}"`);
});
