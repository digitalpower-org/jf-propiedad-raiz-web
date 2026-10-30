#!/usr/bin/env bash
# Inicializa el bucket local de R2 (Silo/MinIO) de forma idempotente.
# Cubre AC1.8.4 (CORS) y AC1.9.16 (lifecycle de pending/) en desarrollo.
set -euo pipefail

CONTAINER="${R2_CONTAINER:-local_r2_minio}"
BUCKET="${R2_BUCKET:-jf-media}"
ACCESS_KEY="${R2_ACCESS_KEY_ID:-minioadmin}"
SECRET_KEY="${R2_SECRET_ACCESS_KEY:-minioadmin}"
ENDPOINT="${R2_INTERNAL_ENDPOINT:-http://127.0.0.1:9000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CORS_FILE="${ROOT_DIR}/infra/r2/cors.xml"

if ! docker inspect "${CONTAINER}" >/dev/null 2>&1; then
  echo "ERROR: el contenedor '${CONTAINER}' no existe. Ejecuta 'npm run r2:up'." >&2
  exit 1
fi

if [ ! -f "${CORS_FILE}" ]; then
  echo "ERROR: no se encontró ${CORS_FILE}" >&2
  exit 1
fi

echo "==> alias local"
docker exec "${CONTAINER}" mc alias set local "${ENDPOINT}" "${ACCESS_KEY}" "${SECRET_KEY}" >/dev/null

echo "==> bucket ${BUCKET}"
docker exec "${CONTAINER}" mc mb --ignore-existing "local/${BUCKET}" >/dev/null

echo "==> CORS"
docker cp "${CORS_FILE}" "${CONTAINER}:/tmp/cors.xml" >/dev/null
docker exec "${CONTAINER}" mc cors set "local/${BUCKET}" /tmp/cors.xml >/dev/null

echo "==> lifecycle pending/ (1 día)"
if docker exec "${CONTAINER}" mc ilm rule ls "local/${BUCKET}" 2>/dev/null | grep -q "pending/"; then
  echo "    ya existe"
else
  docker exec "${CONTAINER}" mc ilm rule add --prefix "pending/" --expire-days 1 "local/${BUCKET}" >/dev/null
fi

echo "==> lectura anónima (emula dominio público de R2)"
docker exec "${CONTAINER}" mc anonymous set download "local/${BUCKET}" >/dev/null

echo "==> estado"
docker exec "${CONTAINER}" mc cors get "local/${BUCKET}"
docker exec "${CONTAINER}" mc ilm rule ls "local/${BUCKET}"
docker exec "${CONTAINER}" mc anonymous get "local/${BUCKET}"
