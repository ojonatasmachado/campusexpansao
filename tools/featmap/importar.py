#!/usr/bin/env python3
"""Importa a análise autoral para uma instância local do Featmap, pela API.

Credenciais ficam fora do repositório. Repetir preserva cartões existentes.
"""
import argparse
import http.cookiejar
import json
from pathlib import Path
import secrets
import urllib.error
import urllib.parse
import urllib.request
import uuid


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("data", type=Path)
    parser.add_argument("--base-url", default="http://127.0.0.1:5180")
    parser.add_argument("--credentials", type=Path, default=Path.home() / ".local/share/featmap/credentials.json")
    args = parser.parse_args()
    parsed = urllib.parse.urlparse(args.base_url)
    if parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        parser.error("Este importador aceita apenas instâncias locais.")
    data = json.loads(args.data.read_text())
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    workspace = None

    def request(path, body=None):
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if workspace:
            headers["Workspace"] = workspace
        req = urllib.request.Request(args.base_url.rstrip("/") + "/v1/" + path,
                                     data=None if body is None else json.dumps(body).encode(), headers=headers)
        try:
            with opener.open(req, timeout=30) as response:
                text = response.read().decode()
                return json.loads(text) if text else None
        except urllib.error.HTTPError as error:
            # Não imprime corpo de autenticação nem token.
            raise RuntimeError(f"HTTP {error.code} em {path}") from None

    def uid(key):
        return str(uuid.uuid5(uuid.NAMESPACE_URL, "cex-service-featmap-2026-10-20/" + key))

    if args.credentials.exists():
        credentials = json.loads(args.credentials.read_text())
        request("users/login", {k: credentials[k] for k in ("email", "password")})
    else:
        credentials = {"email": "service@localhost.test", "password": secrets.token_urlsafe(24)}
        request("users/signup", {**credentials, "workspaceName": "cexservice", "name": "Análise Service"})
        args.credentials.parent.mkdir(parents=True, exist_ok=True)
        args.credentials.touch(mode=0o600)
        args.credentials.write_text(json.dumps(credentials, indent=2) + "\n")
        args.credentials.chmod(0o600)
        access = args.credentials.parent / "ACESSO.txt"
        access.touch(mode=0o600)
        access.write_text("Featmap local: http://localhost:5180\nEmail: " + credentials["email"] +
                          "\nSenha: " + credentials["password"] + "\n")
        access.chmod(0o600)

    app = request("account/app")
    ws = next(w for w in app["workspaces"] if w["name"] == "cexservice")
    workspace = ws["id"]
    if ws["allowExternalSharing"]:
        request("settings/allow-external-sharing", {"value": False})
    snapshots = []
    for project in data["projects"]:
        prefix = project["id"]
        project_id = uid(prefix)
        existing_projects = request("projects") or []
        if not any(p["id"] == project_id for p in existing_projects):
            request("projects/" + project_id, {"title": project["title"]})
            request("projects/" + project_id + "/description", {"description": project["description"]})
        state = request("projects/" + project_id)
        seen = {k: {v["id"] for v in (state.get(k) or [])} for k in
                ("milestones", "personas", "workflows", "subWorkflows", "features", "workflowPersonas")}

        def ensure(kind, id, body, description=""):
            if id not in seen[kind]:
                route = kind.lower()
                request(route + "/" + id, body)
                if description:
                    request(route + "/" + id + "/description", {"description": description})
                seen[kind].add(id)

        for lane in project["lanes"]:
            ensure("milestones", uid(prefix + "/lane/" + lane["id"]),
                   {"projectId": project_id, "title": lane["title"]}, lane["description"])
        for i, actor in enumerate(data["actors"]):
            ensure("personas", uid(prefix + "/actor/" + actor["id"]),
                   {"projectId": project_id, "avatar": "avatar0" + str(i), "name": actor["name"],
                    "role": actor["id"], "description": actor["description"], "workflowId": "", "workflowPersonaId": ""})
        for wf in project["workflows"]:
            wf_key = prefix + "/workflow/" + wf["id"]
            wf_id = uid(wf_key)
            ensure("workflows", wf_id, {"projectId": project_id, "title": wf["title"]}, wf.get("description", ""))
            if wf.get("actor"):
                ensure("workflowPersonas", uid(wf_key + "/actor"),
                       {"workflowId": wf_id, "personaId": uid(prefix + "/actor/" + wf["actor"])})
            for sw in wf["subworkflows"]:
                sw_key = wf_key + "/sub/" + sw["id"]
                sw_id = uid(sw_key)
                ensure("subWorkflows", sw_id, {"workflowId": wf_id, "title": sw["title"]})
                for i, feature in enumerate(sw["features"]):
                    desc = feature["description"]
                    if feature["sources"]:
                        desc += "\n\n## Fontes para conferência\n\n" + "\n".join("- `" + source + "`" for source in feature["sources"])
                    ensure("features", uid(sw_key + "/feature/" + str(i)),
                           {"subWorkflowId": sw_id, "milestoneId": uid(prefix + "/lane/" + feature["lane"]),
                            "title": feature["title"]}, desc)
        verified = request("projects/" + project_id)
        expected = sum(len(sw["features"]) for w in project["workflows"] for sw in w["subworkflows"])
        actual = len(verified["features"] or [])
        assert actual == expected, (project["id"], actual, expected)
        assert len(verified["workflows"] or []) == len(project["workflows"])
        assert len(verified["subWorkflows"] or []) == sum(len(w["subworkflows"]) for w in project["workflows"])
        assert all(f["description"] for f in verified["features"])
        snapshots.append(verified)
        print(f'{project["title"]}: {actual} cartões verificados', flush=True)
    target = args.data.parent / "snapshot-featmap.json"
    target.write_text(json.dumps({"date": data["date"], "workspace": "cexservice", "projects": snapshots},
                                 ensure_ascii=False, indent=2) + "\n")
    links = ["http://localhost:5180/cexservice/projects/" + p["project"]["id"] for p in snapshots]
    (args.data.parent / "links.json").write_text(json.dumps(links, indent=2) + "\n")
    print("Snapshot salvo. Credenciais locais fora do repositório.")
    for link in links:
        print(link)


if __name__ == "__main__":
    main()
