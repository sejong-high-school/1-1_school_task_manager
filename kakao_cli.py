#!/usr/bin/env python3
import json
import os
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

import requests
import typer
from dotenv import load_dotenv

app = typer.Typer(help="KakaoTalk CLI: login and send self-memo messages.")

TOKEN_PATH = os.path.join(os.getcwd(), ".kakao_token.json")


def save_token(token: dict) -> None:
    with open(TOKEN_PATH, "w") as f:
        json.dump(token, f, indent=2)


def load_token() -> dict | None:
    if not os.path.exists(TOKEN_PATH):
        return None
    with open(TOKEN_PATH, "r") as f:
        return json.load(f)


def get_env(key: str, default: str | None = None) -> str:
    value = os.getenv(key, default)
    if value is None:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return value


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        if "code" in query:
            code = query["code"][0]
            self.server.auth_code = code  # type: ignore[attr-defined]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(
                b"<html><body>Login complete. You can close this window.</body></html>"
            )
        else:
            self.send_response(400)
            self.end_headers()


def run_local_server_for_code(port: int = 8765) -> str:
    server = HTTPServer(("127.0.0.1", port), OAuthCallbackHandler)
    server.auth_code = None  # type: ignore[attr-defined]
    while server.auth_code is None:  # type: ignore[attr-defined]
        server.handle_request()
    return server.auth_code  # type: ignore[attr-defined]


@app.command()
def login():
    """Perform OAuth login and cache tokens locally."""
    load_dotenv()
    rest_api_key = get_env("KAKAO_REST_API_KEY")
    redirect_uri = os.getenv("KAKAO_REDIRECT_URI", "http://localhost:8765/callback")

    authorize_url = (
        "https://kauth.kakao.com/oauth/authorize"
        f"?client_id={rest_api_key}"
        f"&redirect_uri={typer.utils.quote(redirect_uri)}"
        "&response_type=code"
        "&scope=talk_message"
    )

    typer.echo("Opening browser for Kakao login...")
    webbrowser.open(authorize_url)

    if redirect_uri.startswith("http://localhost:") or redirect_uri.startswith("http://127.0.0.1:"):
        port = int(redirect_uri.split(":")[2].split("/")[0])
        code = run_local_server_for_code(port)
    else:
        code = typer.prompt("Enter the authorization code from the callback URL")

    token_res = requests.post(
        "https://kauth.kakao.com/oauth/token",
        data={
            "grant_type": "authorization_code",
            "client_id": rest_api_key,
            "redirect_uri": redirect_uri,
            "code": code,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=30,
    )
    token_res.raise_for_status()
    token = token_res.json()
    token["created_at"] = int(time.time())
    save_token(token)
    typer.echo("Login successful. Token saved to .kakao_token.json")


def ensure_token() -> dict:
    token = load_token()
    if not token:
        raise RuntimeError("Not logged in. Run: python kakao_cli.py login")

    # Refresh if expired
    expires_in = int(token.get("expires_in", 0))
    created_at = int(token.get("created_at", 0))
    if expires_in and int(time.time()) > created_at + expires_in - 60:
        load_dotenv()
        rest_api_key = get_env("KAKAO_REST_API_KEY")
        refresh_token = token.get("refresh_token")
        if not refresh_token:
            raise RuntimeError("Missing refresh_token. Please login again.")
        res = requests.post(
            "https://kauth.kakao.com/oauth/token",
            data={
                "grant_type": "refresh_token",
                "client_id": rest_api_key,
                "refresh_token": refresh_token,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )
        res.raise_for_status()
        new_token = res.json()
        for k in ["access_token", "expires_in", "token_type", "scope"]:
            if k in new_token:
                token[k] = new_token[k]
        token["created_at"] = int(time.time())
        save_token(token)
    return token


@app.command()
def send_self(text: str = typer.Argument(..., help="Message text for self-memo")):
    """Send a message to your own KakaoTalk via Self Memo (personal accounts)."""
    token = ensure_token()
    access_token = token["access_token"]

    # Kakao requires a template object in JSON string for talk_message
    template_obj = {
        "object_type": "text",
        "text": text,
        "link": {"web_url": "https://developers.kakao.com"},
    }

    res = requests.post(
        "https://kapi.kakao.com/v2/api/talk/memo/default/send",
        data={"template_object": json.dumps(template_obj, ensure_ascii=False)},
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout=30,
    )
    if res.status_code == 403:
        typer.secho("Permission denied. Ensure 'talk_message' scope is granted.", fg=typer.colors.RED)
    res.raise_for_status()
    typer.echo("Self memo sent.")


if __name__ == "__main__":
    app()