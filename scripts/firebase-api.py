#!/usr/bin/env python3
"""
Firebase REST API helper — uses the stored Firebase CLI refresh token
so Claude can manage Firebase Hosting (domains, sites, etc.) from the terminal.

Usage:
  python3 scripts/firebase-api.py <command> [args]

Commands:
  token                          Print a fresh access token
  list-sites                     List all Hosting sites
  list-domains <site-id>         List custom domains for a site
  add-domain <site-id> <domain>  Add a custom domain to a site
  remove-domain <site-id> <domain>  Remove a custom domain
"""

import sys
import json
import urllib.request
import urllib.parse

CONFIG_PATH = "/Users/mathandlove/.config/configstore/firebase-tools.json"
CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com"
CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi"
PROJECT = "wonder-stories-web"


def get_token():
    with open(CONFIG_PATH) as f:
        d = json.load(f)
    refresh_token = d["tokens"]["refresh_token"]
    data = urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token"
    }).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)["access_token"]


def api(method, path, body=None):
    token = get_token()
    url = f"https://firebasehosting.googleapis.com/v1beta1/{path}"
    payload = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=payload, method=method, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        print(f"Error {e.code}: {e.read().decode()}", file=sys.stderr)
        sys.exit(1)


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(0)

    cmd = args[0]

    if cmd == "token":
        print(get_token())

    elif cmd == "list-sites":
        result = api("GET", f"projects/{PROJECT}/sites")
        for site in result.get("sites", []):
            print(f"{site['name'].split('/')[-1]:30s}  {site.get('defaultUrl', '')}")

    elif cmd == "list-domains":
        site = args[1]
        result = api("GET", f"sites/{site}/domains")
        for d in result.get("domains", []):
            print(f"{d['domainName']:40s}  {d.get('status', '')}  cert={d.get('provisioning', {}).get('certStatus', '')}")

    elif cmd == "add-domain":
        site, domain = args[1], args[2]
        result = api("POST", f"sites/{site}/domains", {"domainName": domain, "site": site})
        print(json.dumps(result, indent=2))

    elif cmd == "remove-domain":
        site, domain = args[1], args[2]
        result = api("DELETE", f"sites/{site}/domains/{domain}")
        print(json.dumps(result, indent=2))

    else:
        print(f"Unknown command: {cmd}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
