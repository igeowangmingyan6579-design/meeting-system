const puppeteer = require('puppeteer-core');
const BASE = process.env.BASE || 'http://localhost:8080';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LINK = 'xferdiag-' + Date.now();
const wait = ms => new Promise(r => setTimeout(r, ms));

async function submitPrejoin(page, name) {
  await page.waitForSelector('#jm-prejoin input', { timeout: 20000 });
  await page.evaluate((n) => {
    const i = document.querySelector('#jm-prejoin input');
    i.value = n; i.dispatchEvent(new Event('input', { bubbles: true }));
    const f = document.querySelector('#jm-prejoin form');
    f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  }, name);
  await wait(400);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--disable-dev-shm-usage'] });
  const hostCtx = await browser.createBrowserContext();
  const guestCtx = await browser.createBrowserContext();
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();
  const logs = [];
  for (const [name, page] of [['host', host], ['guest', guest]]) {
    page.on('console', m => logs.push('[' + name + '][' + m.type() + '] ' + m.text()));
    page.on('pageerror', e => logs.push('[' + name + '][PAGEERROR] ' + e.message));
    page.on('dialog', async d => { logs.push('[' + name + '][DIALOG] ' + d.message().slice(0, 40)); try { await d.accept(); } catch (e) {} });
  }
  await host.goto(BASE + '/#/meeting/' + LINK + '?t=' + LINK + '&n=Host&host=1', { waitUntil: 'networkidle2' });
  await guest.goto(BASE + '/#/meeting/' + LINK + '?t=' + LINK + '&n=Guest&host=0', { waitUntil: 'networkidle2' });
  await submitPrejoin(host, 'Host');
  await submitPrejoin(guest, 'Guest');
  await wait(4000);
  console.log('BEFORE transfer:');
  console.log('  host :', JSON.stringify(await host.evaluate(() => window.__lm.state())));
  console.log('  guest:', JSON.stringify(await guest.evaluate(() => window.__lm.state())));

  await host.evaluate(() => { window.confirm = () => true; });
  const guestId = await host.evaluate(() => window.__lm.remoteIds()[0]);
  console.log('guestId =', guestId);
  // 调转让
  await host.evaluate((id) => window.__lm.transfer(id), guestId);
  console.log('transfer() called. Polling states for 10s...');
  for (let i = 0; i < 10; i++) {
    await wait(1000);
    const h = await host.evaluate(() => window.__lm.state());
    const g = await guest.evaluate(() => window.__lm.state());
    console.log('  t+' + (i + 1) + 's host(anchor=' + h.amAnchor + ' conn=' + h.connCount + ' cur=' + (h.currentAnchorId || '').slice(-12) + ') guest(anchor=' + g.amAnchor + ' conn=' + g.connCount + ' cur=' + (g.currentAnchorId || '').slice(-12) + ')');
  }
  console.log('=== LOGS (' + logs.length + ') ===');
  logs.slice(-50).forEach(l => console.log(l));
  await browser.close();
})().catch(e => { console.error('CRASH', e); process.exit(2); });
