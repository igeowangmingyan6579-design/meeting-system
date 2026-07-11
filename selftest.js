const puppeteer = require('puppeteer-core');

const BASE = process.env.BASE || 'http://localhost:8080';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const LINK = 'selftest-' + Date.now();
const wait = ms => new Promise(r => setTimeout(r, ms));

function log(...a) { console.log(...a); }
const R = (c, m) => (c ? 'PASS' : 'FAIL') + ' · ' + m;

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

async function waitForFn(page, fnStr, timeout = 12000) {
  try { await page.waitForFunction(fnStr, { timeout }); return true; }
  catch (e) { return false; }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--disable-dev-shm-usage']
  });
  const results = {};
  const errors = [];
  const hostCtx = await browser.createBrowserContext();
  const guestCtx = await browser.createBrowserContext();
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();
  for (const [name, page] of [['host', host], ['guest', guest]]) {
    page.on('console', m => { if (m.type() === 'error') errors.push('[' + name + '] ' + m.text()); });
    page.on('pageerror', e => errors.push('[' + name + ' PAGEERROR] ' + e.message));
    page.on('dialog', async d => { try { await d.accept(); } catch (e) {} });
  }

  const hostUrl = BASE + '/#/meeting/' + LINK + '?t=' + LINK + '&n=Host&host=1';
  const guestUrl = BASE + '/#/meeting/' + LINK + '?t=' + LINK + '&n=Guest&host=0';

  await host.goto(hostUrl, { waitUntil: 'networkidle2' });
  await guest.goto(guestUrl, { waitUntil: 'networkidle2' });

  await submitPrejoin(host, 'Host');
  await submitPrejoin(guest, 'Guest');

  // 等待 __lm 就绪
  results.lmReady = (await waitForFn(host, 'window.__lm && typeof window.__lm.state==="function"', 15000))
                 && (await waitForFn(guest, 'window.__lm && typeof window.__lm.state==="function"', 15000));

  // 等待两人连通
  const hostOk = await waitForFn(host, 'window.__lm.state().amAnchor===true && window.__lm.state().connCount>0', 15000);
  const guestOk = await waitForFn(guest, 'window.__lm.state().connCount>0', 15000);
  results.connectHost = hostOk;
  results.connectGuest = guestOk;
  log(R(hostOk, 'host 成为锚点且连上 guest'), '|', R(guestOk, 'guest 连上 host'));

  // 人数上限文案：应为 " / 8"
  const pcText = await host.evaluate(() => {
    const sp = Array.from(document.querySelectorAll('span')).find(s => /参会人/.test(s.textContent));
    return sp ? sp.textContent : '';
  });
  results.capText = pcText;
  results.capIs8 = /\/\s*8/.test(pcText);
  log(R(results.capIs8, '人数上限文案 = "' + pcText + '"'));

  // 聊天：host -> guest（用 evaluate 点击，避免无头环境下元素可点性报错）
  async function appSendChat(page, text) {
    await page.evaluate(() => { const b = document.querySelector('button[title="聊天 Chat"]'); if (b) b.click(); });
    await wait(300);
    await page.evaluate((t) => {
      const i = document.querySelector('#jm-chat input');
      i.value = t; i.dispatchEvent(new Event('input', { bubbles: true }));
      const b = document.querySelector('#jm-chat button'); if (b) b.click();
    }, text);
  }
  await appSendChat(host, 'hello from host');
  await wait(1500);
  const guestChat = await guest.evaluate(() => document.querySelectorAll('#jm-chat .chat-msg').length);
  results.chatDelivered = guestChat > 0;
  log(R(results.chatDelivered, 'host->guest 聊天送达 (guest chat-msgs=' + guestChat + ')'));

  // 弱网友好降级（确定性触发）：host 标记 guest 为弱网（放在转让前，确保连接稳定）
  let weak = { ok: false };
  try {
    const gid = await host.evaluate(() => window.__lm.remoteIds()[0]);
    await host.evaluate((id) => window.__lm.simWeak(id, true), gid);
    await wait(300);
    const badgeOn = await host.evaluate((id) => !!document.querySelector('#remote-' + id + ' .weak-badge'), gid);
    const wcOn = await host.evaluate(() => window.__lm.state().weakCount);
    await host.evaluate((id) => window.__lm.simWeak(id, false), gid);
    await wait(300);
    const badgeOff = await host.evaluate((id) => !document.querySelector('#remote-' + id + ' .weak-badge'), gid);
    const wcOff = await host.evaluate(() => window.__lm.state().weakCount);
    weak = { ok: badgeOn && badgeOff && wcOn === 1 && wcOff === 0, badgeOn, badgeOff, wcOn, wcOff };
  } catch (e) { weak.err = e.message; }
  results.weak = weak;
  log(R(weak.ok, '弱网降级：角标出现=' + weak.badgeOn + ' 计数=1，解除后角标消失=' + weak.badgeOff + ' 计数=0'));

  // 主持权转让：host 把权交给 guest（无头环境强制 confirm 返回 true，排除对话框干扰）
  await host.evaluate(() => { window.confirm = () => true; });
  let transfer = { ok: false };
  try {
    const guestId = await host.evaluate(() => window.__lm.remoteIds()[0]);
    results.guestId = guestId;
    await host.evaluate((id) => window.__lm.transfer(id), guestId);
    const guestBecomesAnchor = await waitForFn(guest, 'window.__lm.state().amAnchor===true', 9000);
    const hostRejoins = await waitForFn(host, 'window.__lm.state().amAnchor===false && window.__lm.state().connCount>0', 9000);
    transfer = { ok: guestBecomesAnchor && hostRejoins, guestBecomesAnchor, hostRejoins };
  } catch (e) { transfer.err = e.message; }
  results.transfer = transfer;
  log(R(transfer.ok, '主持转让：guest 成为新主持人=' + transfer.guestBecomesAnchor + '，host 回退为参会者=' + transfer.hostRejoins));

  // 转让后再次聊天验证会议未散
  if (transfer.ok) {
    await wait(800);
    await appSendChat(host, 'after transfer');
    await wait(1500);
    const guestChat2 = await guest.evaluate(() => document.querySelectorAll('#jm-chat .chat-msg').length);
    const gotAfterMsg = await guest.evaluate(() => Array.from(document.querySelectorAll('#jm-chat .chat-msg')).some(e => /after transfer/.test(e.textContent)));
    results.chatAfterTransfer = gotAfterMsg;
    log(R(results.chatAfterTransfer, '转让后 host->guest 聊天仍送达 (guest chat-msgs=' + guestChat2 + ', gotAfter=' + gotAfterMsg + ')'));
  }

  results.errors = errors;
  results.noFatalErrors = errors.filter(e => !/favicon|404/.test(e)).length === 0;
  log('--- console/page errors (' + errors.length + ') ---');
  errors.forEach(e => log('  ' + e));

  console.log('\n=== SELFTEST SUMMARY ===');
  console.log(JSON.stringify({ ...results, errors }, null, 2));

  await browser.close();
  const allPass = results.lmReady && results.connectHost && results.connectGuest && results.capIs8
    && results.chatDelivered && results.transfer.ok && results.chatAfterTransfer !== false && results.weak.ok && results.noFatalErrors;
  process.exit(allPass ? 0 : 1);
})().catch(e => { console.error('SELFTEST CRASH:', e); process.exit(2); });
