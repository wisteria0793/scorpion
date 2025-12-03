#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/make-ghcr-public.sh OWNER PACKAGE_NAME [--org]
# Examples:
#   ./scripts/make-ghcr-public.sh wisteria0793 scorpion-backend
#   ./scripts/make-ghcr-public.sh my-org scorpion-backend --org

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI is not installed. Install from https://cli.github.com/"
  exit 2
fi

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 OWNER PACKAGE_NAME [--org]"
  exit 2
fi

OWNER="$1"
PACKAGE="$2"
MODE="user"
if [ "${3:-}" = "--org" ]; then
  MODE="org"
fi

echo "Checking gh authentication..."
if ! gh auth status >/dev/null 2>&1; then
  echo "gh is not authenticated. Run 'gh auth login' and try again." >&2
  exit 3
fi

if [ "$MODE" = "user" ]; then
  ENDPOINT="/user/packages/container/${PACKAGE}/visibility"
else
  ENDPOINT="/orgs/${OWNER}/packages/container/${PACKAGE}/visibility"
fi

echo "Making package '${PACKAGE}' public (endpoint: ${ENDPOINT})..."
gh api --method PATCH "$ENDPOINT" -f visibility=public

echo "Done. The package should now be public."
