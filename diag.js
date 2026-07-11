const puppeteer = require('puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:8080';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LINK = 'diagv1';
const wait = ms => new Promise(r => setTimeout(r, ms));

async function submitPrejoin(page, name) {
  await page.waitForSelector('#jm-prejoin input', { timeout: 20000 });
  await page.evaluate((n) => {
    const i = document.querySelector('#jm-prejoin input');
    i.value = n; i.dispatchEvent(new Event('input', { bubbles: true }));
    const f = document.querySelector('#jm-prejoin form');
    f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  }, name);
  await wait(500);
  const removed = await page.evaluate(() => !document.getElementById('jm-prejoin'));
  console.log('  [submitPrejoin] overlay removed after submit =', removed);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--disable-dev-shm-usage']
  });
  const hostCtx = await browser.createBrowserContext();
  const guestCtx = await browser.createBrowserContext();
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();
  const allLogs = [];
  for (const [name, page] of [['host', host], ['guest', guest]]) {
    page.on('console', m => { const t = '[' + name + '][' + m.type() + '] ' + m.text(); allLogs.push(t); });
    page.on('pageerror', e => { allLogs.push('[' + name + '][PAGEERROR] ' + e.message); });
    page.on('dialog', async d => { try { await d.accept(); } catch (e) {} });
  }
  await host.goto(BASE + '/#/meeting/' + LINK + '?t=' + LINK + '&n=Host&host=1', { waitUntil: 'networkidle2' });
  await guest.goto(BASE + '/#/meeting/' + LINK + '?t=' + LINK + '&n=Guest&host=0', { waitUntil: 'networkidle2' });
  await submitPrejoin(host, 'Host');
  await submitPrejoin(guest, 'Guest');
  await wait(9000);
  const hs = await host.evaluate(() => window.__lm ? window.__lm.state() : 'NO __lm');
  const gs = await guest.evaluate(() => window.__lm ? window.__lm.state() : 'NO __lm');
  console.log('HOST state:', JSON.stringify(hs));
  console.log('GUEST state:', JSON.stringify(gs));
  console.log('=== LOGS (' + allLogs.length + ') ===');
  allLogs.slice(-40).forEach(l => console.log(l));
  await browser.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
