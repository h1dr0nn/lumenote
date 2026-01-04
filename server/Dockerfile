# Build stage
FROM rust:1.80-slim-bookworm AS builder

WORKDIR /usr/src/app
COPY . .

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

RUN cargo build --release

# Final stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /usr/src/app/target/release/server /app/lumenote-server
COPY --from=builder /usr/src/app/migrations /app/migrations

EXPOSE 3000

CMD ["./lumenote-server"]
