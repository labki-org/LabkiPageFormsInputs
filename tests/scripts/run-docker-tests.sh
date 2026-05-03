#!/bin/bash
#
# Run LabkiPageFormsInputs PHPUnit tests inside the Docker MediaWiki environment.
#
# Our test classes extend MediaWikiIntegrationTestCase (PageForms must be
# loaded for input-class assertions), so we use MW's PHPUnit runner via
# `composer phpunit` rather than a standalone unit-test bootstrap.
#
# Usage:
#   ./tests/scripts/run-docker-tests.sh [phpunit-args...]
#
# Examples:
#   ./tests/scripts/run-docker-tests.sh
#   ./tests/scripts/run-docker-tests.sh --testdox
#   ./tests/scripts/run-docker-tests.sh --filter DateTimeTzInputTest
set -e

if ! docker compose ps wiki 2>/dev/null | grep -qE "(running|Up)"; then
	echo "ERROR: Docker wiki container is not running."
	echo "Start it with: ./tests/scripts/reinstall_test_env.sh"
	exit 1
fi

EXT_PATH="/mw-user-extensions/LabkiPageFormsInputs"

echo "Running LabkiPageFormsInputs tests..."
echo ""
docker compose exec -T -w /var/www/html -e MW_INSTALL_PATH=/var/www/html wiki composer phpunit -- \
	--configuration "$EXT_PATH/tests/phpunit/integration.xml" \
	"$@"

echo ""
echo "Tests completed."
