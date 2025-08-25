# SMS Sender (Traccar SMS Gateway)

A tiny PWA that sends SMS via your Android phone running Traccar SMS Gateway.

## How it works
- The app runs fully client-side (static hosting like GitHub Pages).
- It calls your phone's Traccar SMS Gateway HTTP API on your local network.
- You configure the gateway base URL and API token in the app (stored locally).

## Requirements
- Android phone with the Traccar SMS Gateway app running.
- Phone and the device using this PWA must be on the same network, or you must expose the phone with a secure tunnel.

## Gateway details (typical defaults)
- Base URL example: `http://<phone-lan-ip>:8082`
- POST JSON:
  - URL: `http://<phone-lan-ip>:8082/`
  - Headers: `Content-Type: application/json`, `Authorization: <token>`
  - Body: `{ "to": "+821012345678", "message": "hello" }`
- GET fallback (if CORS or headers are blocked):
  - `http://<phone-lan-ip>:8082/?to=%2B821012345678&message=hello&token=<token>`

Note: Some firmware requires enabling the app's HTTP API and setting the token in the app.

## Phone numbers (South Korea)
- Use E.164 format with `+82` country code, e.g. `+821012345678`.

## Local development
- Serve the folder statically (any HTTP server). Example:
  - Python: `python3 -m http.server 8080`
  - Node: `npx serve .`

## Deploy on GitHub Pages
1. Push this folder to a GitHub repository.
2. In repo Settings → Pages, choose the branch (e.g., `main`) and root.
3. Visit the Pages URL, install to home screen (it's a PWA), and configure the Gateway URL and Token in the app.

## Privacy & security
- The token and URL are stored in `localStorage` on your device only.
- Anyone who knows the phone URL and token could send SMS. Keep them secret.
- Consider reserving the phone's IP in your router to avoid changes.

## Option: expose phone with ngrok + Cloudflare Worker (CORS)

1) Run ngrok in Termux on the phone
```bash
pkg update
pkg install wget tar
wget https://ngrok-agent.s3.amazonaws.com/ngrok-stable-linux-arm64.tgz
tar -xzf ngrok-stable-linux-arm64.tgz
./ngrok config add-authtoken YOUR_NGROK_TOKEN
./ngrok http http://127.0.0.1:8082
```
Note: If your Traccar listens on the LAN IP, use `http://<PHONE_LAN_IP>:8082`.

2) Deploy the Cloudflare Worker proxy
- Install Wrangler: `npm i -g wrangler`
- Edit `wrangler.toml` and set `UPSTREAM_URL` to your ngrok URL.
- Optionally set `GATEWAY_TOKEN` to inject the Authorization header.
- Login and deploy:
```bash
wrangler login
wrangler deploy
```

3) Point the PWA to the Worker URL
- In the app, set Gateway Base URL to your Worker URL (e.g., `https://traccar-sms-proxy.your-subdomain.workers.dev`).
- If using `GATEWAY_TOKEN` in the Worker, you can leave the app token empty.

This Worker adds CORS headers and forwards requests to your ngrok endpoint.