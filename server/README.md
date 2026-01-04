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

```bash
docker-compose up -d
```
