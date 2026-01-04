#!/bin/sh
set -e

INIT_FLAG="/data/.minio-initialized"

if [ ! -f "$INIT_FLAG" ]; then
  echo "MinIO not initialized. Starting initialization process..."
  
  # Start MinIO in background for initialization
  echo "Starting MinIO server in background..."
  minio server /data --console-address :9001 &
  MINIO_PID=$!
  
  # Wait for MinIO to be ready
  echo "Waiting for MinIO to be ready..."
  MAX_RETRIES=30
  RETRY_COUNT=0
  
  until mc alias set myminio http://localhost:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
      echo "Error: MinIO failed to start after $MAX_RETRIES attempts"
      kill $MINIO_PID 2>/dev/null || true
      exit 1
    fi
    sleep 1
  done
  
  echo "MinIO is ready. Creating bucket: $BUCKET_NAME"
  mc mb "myminio/$BUCKET_NAME" || {
    echo "Warning: Bucket creation failed (may already exist)"
  }
  
  echo "Setting up webhook events..."
  mc event add "myminio/$BUCKET_NAME" arn:minio:sqs::PRIMARY:webhook --event put || {
    echo "Warning: Webhook event setup failed (may already be configured)"
  }
  
  # Mark as initialized
  touch "$INIT_FLAG"
  echo "MinIO initialization complete."
  
  # Stop the background MinIO process
  echo "Stopping initialization MinIO instance..."
  kill $MINIO_PID 2>/dev/null || true
  wait $MINIO_PID 2>/dev/null || true
  sleep 1
else
  echo "MinIO already initialized. Skipping initialization."
fi

# Start MinIO server in foreground
echo "Starting MinIO server..."
exec minio server /data --console-address :9001

