#!/usr/bin/env bash
# Conservative cleanup: does NOT touch containers, volumes, or tagged images.
set -Eeuo pipefail
echo 'This cleanup affects dangling images and build cache for the ENTIRE Docker host.'
echo 'It does not touch containers or volumes and must not be scheduled automatically.'
echo 'Current Docker usage:'
docker system df
echo
echo 'Removing only dangling images older than 7 days...'
docker image prune --force --filter 'until=168h'
echo 'Removing unused build cache older than 7 days...'
docker builder prune --force --filter 'until=168h'
echo 'Final Docker usage:'
docker system df
echo 'No volumes were removed. Always review usage on shared hosts.'
