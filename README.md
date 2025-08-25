# KakaoTalk CLI (Personal Self-Memo)

Send a KakaoTalk message to yourself (Self Memo) from the command line.

This uses Kakao OAuth with the `talk_message` scope. This works for personal Kakao accounts. Sending to subscribers via a KakaoTalk Channel requires a business-approved channel and different APIs (not covered by this simple CLI).

## Setup

1. Create a Kakao Developers app and get the REST API Key.
2. Add a Redirect URI in Kakao Developers: `http://localhost:8765/callback`
3. Copy `.env.example` to `.env` and set `KAKAO_REST_API_KEY`.

```bash
cp .env.example .env
# edit .env with your REST API Key
```

4. Install dependencies (Python 3.9+):

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

## Usage

1. Login (opens browser):

```bash
python kakao_cli.py login
```

2. Send a self memo:

```bash
python kakao_cli.py send-self "Hello from CLI"
```

Alternatively, pass the message as an argument without quotes if no spaces.

## Notes

- If token expires, the tool will auto-refresh using `refresh_token`.
- Ensure your Kakao account allows the `talk_message` scope during consent.
- For KakaoTalk Channel broadcasts to followers, you need a business channel and Kakao's Channel/Business APIs and approval. This CLI focuses on personal self-memo.