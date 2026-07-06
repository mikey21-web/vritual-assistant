import { Client } from 'ssh2';
const HOST = '160.250.204.162';
const PASS = 'Maheshwari21!';
const conn = new Client();
conn.on('ready', async () => {
  const exec = (cmd) => new Promise(r => {
    conn.exec(cmd, (e, s) => {
      let o = '';
      s.on('close', (c) => r({ o: o.trim(), c }));
      s.stderr.on('data', d => o += d);
      s.on('data', d => o += d);
    });
  });

  // Fix: add args_schema to the send_message StructuredTool wrapper
  const fix = `
import json
with open('/opt/lead-automation/agent-service/app/runner.py') as f:
    c = f.read()

old = '''            tools[i] = lc_tools.StructuredTool(
                        name="send_message",
                        description=t.description,
                        coroutine=send_message_wrapper,
                    )'''
new = '''            tools[i] = lc_tools.StructuredTool(
                        name="send_message",
                        description=t.description,
                        args_schema=t.args_schema,
                        coroutine=send_message_wrapper,
                    )'''
c = c.replace(old, new)
with open('/opt/lead-automation/agent-service/app/runner.py', 'w') as f:
    f.write(c)
print('Fixed')
`;
  const b64 = Buffer.from(fix, 'utf-8').toString('base64');
  await exec(`python3 -c "import base64; exec(base64.b64decode('${b64}'))"`);

  // Verify
  let { o: verify } = await exec("grep -n 'args_schema' /opt/lead-automation/agent-service/app/runner.py");
  console.log(verify);

  // Rebuild
  let { o: build } = await exec('cd /opt/lead-automation && docker compose up -d --no-deps --build agent-service 2>&1 | tail -5');
  console.log(build);
  conn.end();
}).connect({ host: HOST, port: 22, username: 'root', password: PASS, readyTimeout: 30000, keepaliveInterval: 10000 });
