import os, sys, json, hashlib, random, string, urllib.request, urllib.error, urllib.parse

TOKEN = os.environ.get('NETLIFY_TOKEN')
if not TOKEN:
    sys.exit('NO NETLIFY_TOKEN')
SITE_NAME = os.environ.get('NETLIFY_SITE', 'jm-meet')
SRC = r'C:/Users/igeowang/WorkBuddy/2026-07-24-21-03-14/meeting-app/index.html'
API = 'https://api.netlify.com/api/v1'


def req(method, url, body=None, headers=None):
    h = {'Authorization': 'Bearer ' + TOKEN, 'User-Agent': 'meet-deploy/1.0'}
    if headers:
        h.update(headers)
    data = None
    if body is not None:
        if isinstance(body, (bytes, bytearray)):
            data = body
        else:
            data = json.dumps(body).encode()
            h['Content-Type'] = 'application/json'
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        resp = urllib.request.urlopen(r, timeout=60)
        return resp.status, resp.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', 'replace')


with open(SRC, 'rb') as f:
    content = f.read()
sha = hashlib.sha1(content).hexdigest()
print('local index.html size:', len(content), 'sha1:', sha[:10])

# 1) create site (try short slug, reuse if already exists, fallback to suffixed)
site_id = None
site_url = None
attempts = [SITE_NAME] + [SITE_NAME + '-' + ''.join(random.choices(string.ascii_lowercase + string.digits, k=4)) for _ in range(3)]
for name in attempts:
    st, body = req('POST', API + '/sites', {'name': name})
    if st in (200, 201):
        site = json.loads(body)
        site_id = site['id']
        site_url = site.get('url')
        print('create site ok:', name, '->', site_url)
        break
    else:
        # name taken: try to reuse existing site
        gst, gbody = req('GET', API + '/sites?name=' + urllib.parse.quote(name))
        if gst == 200:
            arr = json.loads(gbody)
            for s in arr:
                if s.get('name') == name:
                    site_id = s['id']
                    site_url = s.get('url')
                    print('reuse existing site:', name, '->', site_url)
                    break
        if site_id:
            break
        print('name', name, 'taken/failed:', st)
if not site_id:
    sys.exit('无法创建或查找 Netlify site')

# 2) create deploy
st2, body2 = req('POST', f'{API}/sites/{site_id}/deploys', {'files': {'index.html': sha}})
if st2 not in (200, 201):
    print('create deploy failed', st2, body2)
    sys.exit(1)
dep = json.loads(body2)
deploy_id = dep['id']
print('deploy created:', deploy_id, 'required:', dep.get('required'))

# 3) upload file
st3, body3 = req('PUT', f'{API}/deploys/{deploy_id}/files/index.html', content,
                 {'Content-Type': 'application/octet-stream'})
print('upload index.html ->', st3)
if st3 not in (200, 201, 204):
    print('upload body:', body3)
    sys.exit(1)

print('DONE', site_url)
