#!/bin/bash
set -e

echo "Waiting for SpacetimeDB to be ready..."
until curl -s http://spacetimedb:3000 > /dev/null 2>&1; do
  sleep 1
done

echo "Publishing module to SpacetimeDB..."
cd /module/spacetimedb

# Publish with --clear-database to ensure fresh state (useful for development)
# Remove --clear-database -y if you want to preserve existing data
spacetime publish lcr \
  --server http://spacetimedb:3000 \
  --module-path . \
  --clear-database -y

echo "Module published successfully!"
