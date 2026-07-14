import { Client } from 'ssh2';

const HOST = '160.250.204.162';
const PASS = process.env.DEPLOY_PASS;
if (!PASS) { process.exit(1); }

const conn = new Client();
const run = (c) => new Promise((resolve) => {
  conn.exec(c, (err, stream) => {
    if (err) { resolve(''); return; }
    let o = '';
    stream.on('close', () => resolve(o.trim()));
    stream.on('data', d => o += d.toString());
    stream.stderr.on('data', d => o += d.toString());
  });
});

conn.on('ready', async () => {
  console.log('=== Dashboard container logs ===');
  let r = await run('docker logs lead-automation-dashboard --tail 30 2>&1');
  console.log(r);

  console.log('\n=== Check nginx config inside container ===');
  r = await run('docker exec lead-automation-dashboard cat /etc/nginx/conf.d/default.conf 2>&1 | head -20');
  console.log(r);

  console.log('\n=== Check dashboard HTML served ===');
  r = await run('curl -s http://localhost:3000/ | head -30 2>&1');
  console.log(r);

  console.log('\n=== Check dashboard JS bundle loads ===');
  r = await run('curl -s http://localhost:3000/ | grep -o "src=\"[^\"]*\\.js\"" | head -5 2>&1');
  console.log('  JS bundles: ' + (r || 'none found'));

  r = await run('curl -s http://localhost:3000/ | grep -o "href=\"[^\"]*\\.css\"" | head -5 2>&1');
  console.log('  CSS files: ' + (r || 'none found'));

  console.log('\n=== Check JS bundle for annyang ===');
  r = await run('docker exec lead-automation-dashboard grep -c "annyang" /usr/share/nginx/html/assets/index-*.js 2>&1');
  console.log('  annyang in bundle: ' + (r || 'NOT FOUND'));

  console.log('\n=== Check the main bundle for errors ===');
  r = await run('docker exec lead-automation-dashboard grep -o "annyang\|SpeechRecognition\|webkitSpeech" /usr/share/nginx/html/assets/index-*.js 2>&1 | head -10');
  console.log('  Keywords: ' + (r || 'none'));

  console.log('\n=== Test page load via Caddy (real HTTPS) ===');
  r = await run('curl -s -k https://deploysafe.in/ | head -5 2>&1');
  console.log(r);

  console.log('\n=== Check Caddy reverse proxy config ===');
  r = await run('cat /etc/caddy/Caddyfile 2>&1');
  console.log(r);

  console.log('\n=== Build log (check for annyang errors) ===');
  r = await run('cd /opt/lead-automation-demo && docker build -t lead-automation-demo-dashboard -f dashboard-v2/Dockerfile dashboard-v2/ 2>&1 | grep -i "annyang\|error\|warn\|fail" | head -10');
  console.log(r || '  No build errors detected');

  console.log('\n=== Search for annyang or voice commands in bundle ===');
  r = await run('docker exec lead-automation-dashboard grep -o "VoiceCommand\\|pendingSearch\\|annyang\\|startListening\\|navigate_ui__" /usr/share/nginx/html/assets/index-*.js 2>/dev/null | head -5 || echo "checking different approach"');
  console.log('  ' + r);

  r = await run('docker exec lead-automation-dashboard sh -c "strings /usr/share/nginx/html/assets/index-CUCkwO2k.js | grep -c annyang" 2>&1');
  console.log('  annyang string count: ' + r);

  r = await run('docker exec lead-automation-dashboard sh -c "strings /usr/share/nginx/html/assets/index-CUCkwO2k.js | grep -c \\\"show me\\\|go to\\\|navigate\\\|qr-codes\\\" " 2>&1');
  console.log('  command phrases: ' + r);

  console.log('\n=== Check if voice UI renders (error in console) ===');
  r = await run('docker exec lead-automation-dashboard sh -c "strings /usr/share/nginx/html/assets/index-CUCkwO2k.js | grep -c \\\"annyang is not supported\\\|not supported\\\|Listening...\\\|Thinking...\\\" " 2>&1');
  console.log('  Voice UI strings: ' + r);

  console.log('\n=== Verify annyang module exists in node_modules ===');
  r = await run('docker exec lead-automation-dashboard ls /usr/share/nginx/html/assets/index-CUCkwO2k.js 2>&1 | head -1');
  console.log('  index bundle exists: ' + (r.includes('No such') ? 'NO' : 'YES'));

  conn.end();

  conn.end();
}).on('error', e => console.error(e.message))
.connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });
