# LabkiPageFormsInputs Test Environment

Local MediaWiki dev environment for `LabkiPageFormsInputs`, modeled on the
SemanticSchemas dev setup.

The environment uses a custom `Dockerfile` (in the repo root) based on
`php:8.3-apache` that downloads MediaWiki from Git and installs SMW +
PageForms via Composer.

## Prerequisites

- Docker & Docker Compose

## Quick start

```bash
bash ./tests/scripts/reinstall_test_env.sh
```

This will:

1. Tear down any existing containers and volumes
2. Build the MediaWiki image (MW 1.44 + SMW 6 + PageForms 6)
3. Start a fresh wiki and database
4. Run `install.php`, then `setupStore.php`, then `update.php`
5. Mount this checkout as `/mw-user-extensions/LabkiPageFormsInputs`

Once running, the wiki is at:

**http://localhost:8890**

- Admin: `Admin`
- Password: `DockerPass123!`

Port `8890` is intentionally separate from the SemanticSchemas dev env
(`8889`) so both can run side by side.

## Seeding test pages

After the env is up, populate three test properties + a form so you can
exercise all three input types end-to-end:

```bash
bash ./tests/scripts/populate_test_data.sh
```

That script creates:

- `Property:Has test datetime` (`labki-datetime`)
- `Property:Has test date` (`labki-date`)
- `Property:Has test time` (`labki-time`)
- `Template:Test event` and `Form:Test event` that use all three
- `Category:Test event` with a `#ask` query rendering the saved values

Then visit:

- http://localhost:8890/index.php/Special:FormEdit/Test_event — open the form, fill in values, save
- http://localhost:8890/index.php/Category:Test_event — confirm the values rendered

## Configuration

The two `LocalSettings.*.php` files are mounted into the container:

- `tests/LocalSettings.common.php` — SMW + PageForms, sourced *before* SMW
  store setup. Edit this if you need to add extensions that must initialize
  before the store.
- `tests/LocalSettings.test.php` — `LabkiPageFormsInputs` itself, plus skin
  and debug config. Sourced *after* the store, like a real admin adding the
  extension to an existing wiki. Most edits go here.

To E2E the SemanticSchemas integration, uncomment the
`wfLoadExtension( 'SemanticSchemas' )` block at the bottom of
`tests/LocalSettings.test.php` (you'll need SemanticSchemas mounted as well).

## Running PHPUnit

Our PHP test classes extend `MediaWikiIntegrationTestCase` because input
classes inherit from PageForms' `PFFormInput`, which only loads inside a
running MediaWiki. The test runner therefore uses MW core's PHPUnit:

```bash
# All integration tests
./tests/scripts/run-docker-tests.sh

# Pretty output
./tests/scripts/run-docker-tests.sh --testdox

# One file
./tests/scripts/run-docker-tests.sh --filter DatetimeInputTest
```

## JS sanity-check

The serializer / parser / `offsetFor` are pure JS and run under Node:

```bash
node tests/scripts/check-shared-js.js
```

(That helper exercises `parseValue`, `serializeValue`, and `offsetFor`
against real DST-boundary dates without needing the wiki running.)

## Common operations

```bash
# View live logs
docker compose logs -f wiki

# Confirm extension loaded
docker compose exec wiki php maintenance/run.php eval \
  'echo ExtensionRegistry::getInstance()->isLoaded("LabkiPageFormsInputs") ? "Loaded\n" : "NOT loaded\n";'

# Confirm input types registered
docker compose exec wiki php maintenance/run.php eval \
  '$p = new PFFormPrinter(); var_dump( in_array( "labki-datetime", array_keys( $p->mInputTypeClasses ) ) );'

# Run jobs once (e.g., after creating Property pages with annotations)
docker compose exec wiki php maintenance/run.php runJobs
```
