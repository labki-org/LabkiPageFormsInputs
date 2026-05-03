#!/bin/bash
#
# Reinstall the LabkiPageFormsInputs Docker test environment from scratch.
#
# Tears down all containers and volumes and rebuilds a fresh MediaWiki
# instance with SMW + PageForms + LabkiPageFormsInputs.
#
# Flags:
#   --run-jobs       Drain the job queue after install. SMW needs this to
#                    process property annotations on test pages.
#   --no-jobrunner   Stop the background jobrunner container after setup.
#                    Useful if you want to control job execution manually.
#
# Examples:
#   ./tests/scripts/reinstall_test_env.sh
#   ./tests/scripts/reinstall_test_env.sh --run-jobs --no-jobrunner
set -e

NO_JOBRUNNER=false
RUN_JOBS=false
for arg in "$@"; do
	case "$arg" in
		--no-jobrunner) NO_JOBRUNNER=true ;;
		--run-jobs) RUN_JOBS=true ;;
		--help|-h) sed -n '2,/^set -e/{ /^#/s/^# \?//p }' "$0"; exit 0 ;;
	esac
done

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

echo "==> Shutting down existing containers and removing volumes..."
docker compose down -v

echo "==> Building images..."
docker compose build

echo "==> Starting new environment..."
docker compose up -d

echo "==> Waiting for MW to be ready..."
for i in $(seq 1 60); do
	if docker compose exec -T wiki curl -sf http://localhost/api.php?action=query > /dev/null 2>&1; then
		echo "MW is ready."
		break
	fi
	if [ "$i" -eq 60 ]; then
		echo "ERROR: MediaWiki did not become ready in time."
		docker compose logs wiki
		exit 1
	fi
	sleep 2
done

echo "==> Running update.php..."
docker compose exec wiki php maintenance/run.php update --quick

if [ "$RUN_JOBS" = true ]; then
	echo "==> Running job queue (--run-jobs)..."
	docker compose exec wiki php maintenance/run.php runJobs
fi

if [ "$NO_JOBRUNNER" = true ]; then
	echo "==> Stopping jobrunner (--no-jobrunner)..."
	docker compose stop jobrunner
fi

echo "==> Environment ready!"
echo "Visit http://localhost:8890"
echo "Admin / DockerPass123!"
