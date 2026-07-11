const fs = require('fs');
const path = require('path');
const file = process.argv[2] || 'public/index.html';
const html = fs.readFileSync(file, 'utf8');
const re = /<script>([\s\S]*?)<\/script>/g; // 仅内联脚本（无 src 的）
let m, i = 0, ok = true;
while ((m = re.exec(html))) {
  const code = m[1];
  try { new Function(code); console.log('inline script #' + i + ' OK (' + code.length + ' chars)'); }
  catch (e) { ok = false; console.error('inline script #' + i + ' SYNTAX ERROR: ' + e.message); }
  i++;
}
process.exit(ok ? 0 : 1);
