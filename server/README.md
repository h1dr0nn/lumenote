# Lumenote Sync Server

A lightweight synchronization server for [Lumenote](https://github.com/h1dr0nn/lumenote), built with Rust.

## Features

- **Modern Tech Stack**: Built with Axum and SQLx (SQLite).
- **Private & Secure**: Simple token-based authentication via `X-Sync-Key`.
- **LWW Conflict Resolution**: Implements Last-Write-Wins strategy using timestamps.
- **Docker Ready**: Easily self-host with Docker and Docker Compose.

## API Endpoints

- `GET /health`: Returns `{ "status": "ok" }`.
- `POST /sync`: The primary synchronization endpoint. Requires `X-Sync-Key` header.

## Local Development

1. Ensure you have Rust installed.
2. `cd server`
3. `cargo run`

The server runs on `http://0.0.0.0:3000` by default.

## Docker Deployment

1. (Optional) Set your custom sync key in `docker-compose.yml`:
```yaml
environment:
  - DEFAULT_SYNC_KEY=ln_opt_your_secure_password_here
```
   If not set, the default sync key will be `ln_opt_password`.

2. Start the server:
```bash
docker-compose up -d
```

3. **Important**: The sync key will be printed to console on startup. Save it securely!

4. View the sync key in logs:
```bash
docker-compose logs sync-server | grep "SYNC KEY"
```

**Security Note**: The sync key is only shown once on startup. Anyone with the sync key can access your data, so keep it secret!
