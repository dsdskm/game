#!/bin/sh
set -eu

if [ "$#" -eq 0 ]; then
  set -- 3000 3001 3002
fi

if ! command -v lsof >/dev/null 2>&1; then
  printf 'lsof is required to find port listeners\n' >&2
  exit 1
fi

for port do
  case "$port" in
    ''|*[!0-9]*)
      printf 'Invalid port: %s\n' "$port" >&2
      exit 1
      ;;
  esac
  if [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
    printf 'Invalid port: %s\n' "$port" >&2
    exit 1
  fi
done

for port do
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -z "$pids" ]; then
    printf 'Port %s is free\n' "$port"
    continue
  fi

  for pid in $pids; do
    printf 'Stopping PID %s on port %s\n' "$pid" "$port"
    kill -TERM "$pid"
  done
done