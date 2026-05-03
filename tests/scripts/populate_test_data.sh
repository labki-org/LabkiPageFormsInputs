#!/bin/bash
#
# Seed the dev wiki with test pages exercising all three input types.
#
# Creates Property:Has test {datetime,date,time}, Template:Test event,
# Form:Test event, and a Category:Test event landing page. After running
# this, visit http://localhost:8890/index.php/Special:FormEdit/Test_event
# to add a page through the form and watch the widgets in action.
#
# Usage: ./tests/scripts/populate_test_data.sh
set -e

if ! docker compose ps wiki 2>/dev/null | grep -qE "(running|Up)"; then
	echo "ERROR: Docker wiki container is not running."
	echo "Start it with: ./tests/scripts/reinstall_test_env.sh"
	exit 1
fi

# maintenance/edit.php reads page content from stdin, so we pipe each
# fixture file in. Title goes as the positional argument.

for entry in \
	"Property:Has test datetime|Property_Has_test_datetime.wikitext" \
	"Property:Has test date|Property_Has_test_date.wikitext" \
	"Property:Has test time|Property_Has_test_time.wikitext" \
	"Template:Test event|Template_Test_event.wikitext" \
	"Form:Test event|Form_Test_event.wikitext"
do
	title="${entry%%|*}"
	file="${entry##*|}"
	echo "==> Importing $title from $file"
	docker compose exec -T wiki php maintenance/run.php edit \
		--user="Admin" \
		--summary="Seed test fixtures" \
		"$title" < "$(dirname "$0")/../fixtures/$file"
done

# A simple landing page so #forminput on Form:Test event has somewhere
# obvious to point users.
docker compose exec -T wiki php maintenance/run.php edit \
	--user="Admin" \
	--summary="Seed test fixtures" \
	"Category:Test event" <<'EOF'
Pages tagged with this category were created via [[Form:Test event]]. Use
that form to exercise the three Labki PageForms input types.

== All test events ==
{{#ask: [[Category:Test event]]
| ?Has test datetime
| ?Has test date
| ?Has test time
| format=table
}}
EOF

echo ""
echo "==> Done. Visit:"
echo "    http://localhost:8890/index.php/Special:FormEdit/Test_event"
echo "    http://localhost:8890/index.php/Category:Test_event"
