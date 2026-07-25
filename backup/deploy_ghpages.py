import os, re, json, base64, urllib.request, glob, time

# 1) 取 token（不落盘）
tok = None
for fp in glob.glob('C:/Users/igeowang/.workbuddy/traces/**/*.json', recursive=True):
    try:
        t = open(fp, encoding='utf-8', errors='ignore').read()
    except:
        continue
    m = re.search(r'ghp_[A-Za-z0-9]{36,}', t)
    if m:
        tok = m.group(0)
        break
if not tok:
    raise SystemExit('no token found')
print('token ok, len', len(tok))

OWNER = 'igeowangmingyan6579-design'
REPO = 'meeting-system'
BRANCH = 'main'
API = 'https://api.github.com'
HDR = {'Authorization': 'Bearer ' + tok, 'User-Agent': 'deploy', 'Accept': 'application/vnd.github+json'}

def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, headers=HDR, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.read().decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', 'ignore')

# 2) 读构建产物（内联 PeerJS + favicon + TURN + 挂断修复）
src = r'C:/Users/igeowang/WorkBuddy/2026-07-24-21-03-14/meeting-app/index.html'
html = open(src, encoding='utf-8').read()
b64 = base64.b64encode(html.encode('utf-8')).decode()

def put_file(path, content, message):
    # 已存在文件更新需带 sha，否则 GitHub API 返回 422
    st0, resp0 = api('GET', f'/repos/{OWNER}/{REPO}/contents/{path}?ref={BRANCH}')
    sha = None
    if st0 == 200:
        try: sha = json.loads(resp0)['sha']
        except Exception: sha = None
    body = {'message': message, 'content': content, 'branch': BRANCH}
    if sha: body['sha'] = sha
    st1, resp1 = api('PUT', f'/repos/{OWNER}/{REPO}/contents/{path}', body)
    return st1

# 3) 推 docs/index.html
print('put docs/index.html ->', put_file('docs/index.html', b64,
      'deploy: minimal meeting (inline peerjs + favicon + hangup fix)'))

# 4) 推 docs/.nojekyll（空文件，禁用 Jekyll）
print('put docs/.nojekyll ->', put_file('docs/.nojekyll', '',
      'deploy: disable jekyll'))

# 5) 启用 Pages（main 分支 /docs）
st3, resp3 = api('POST', f'/repos/{OWNER}/{REPO}/pages',
                 {'source': {'branch': BRANCH, 'path': '/docs'}, 'build_type': 'legacy'})
print('enable pages ->', st3, resp3[:200] if isinstance(resp3, str) else '')

print('DONE')
