# LabkiPageFormsInputs

[![CI](https://github.com/labki-org/LabkiPageFormsInputs/actions/workflows/ci.yml/badge.svg)](https://github.com/labki-org/LabkiPageFormsInputs/actions/workflows/ci.yml)

A MediaWiki extension that registers additional [PageForms](https://www.mediawiki.org/wiki/Extension:Page_Forms) input types. The first set covers date/time entry with optional time precision and timezone preservation:

| Input type     | SMW property type | Saves as |
| -------------- | --------------- | --------- |
| `datetime-tz`  | `Date` (`_dat`) | `YYYY-MM-DD`, `YYYY-MM-DDTHH:MM`, or `YYYY-MM-DDTHH:MM:SS±HH:MM` (preserves the user's chosen offset, DST-aware for that date) |
| `date-only`    | `Date` (`_dat`) | `YYYY-MM-DD` |
| `time-only`    | `Text` (`_txt`) | `HH:MM` or `HH:MM <IANA_zone>` (e.g., `14:30 America/Los_Angeles`) |

`datetime-tz` and `date-only` round-trip through SMW's variable-precision `Date` datatype. `time-only` is stored as **Text** rather than Date because SMW's `_dat` requires a date component — a bare `HH:MM` is not a valid Date value. The IANA zone name (rather than a numeric offset) is stored because without an anchor date the offset would be DST-ambiguous.

## Why

PageForms ships `datepicker` (date only) and `datetimepicker` (forces a time, UTC only). Many real-world fields need to be date-or-datetime depending on the page (e.g., a workshop session that may or may not have a known start time yet) and need a timezone other than UTC. `datetime-tz` covers all three cases on a single SMW Date property without changing the data model.

## Installation

```php
wfLoadExtension( 'LabkiPageFormsInputs' );
```

Requires MediaWiki ≥ 1.39 and PageForms ≥ 6.0.

## Usage

On a property page (Property:Has start date):

```
{{Property
|has_type=Date
|has_input_type=datetime-tz
}}
```

PageForms picks up the input type when generating the form.

### SemanticSchemas integration

If you use [SemanticSchemas](https://github.com/labki-org/SemanticSchemas) to auto-generate forms, you can flip the wiki-wide default for all `Date` properties:

```php
$wgSemanticSchemasDatatypeInputOverrides['Date'] = 'datetime-tz';
```

## License

GPL-2.0-or-later. Bundles [flatpickr](https://flatpickr.js.org/) (MIT) under `resources/lib/flatpickr/`.
