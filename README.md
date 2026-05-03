# LabkiPageFormsInputs

[![CI](https://github.com/labki-org/LabkiPageFormsInputs/actions/workflows/ci.yml/badge.svg)](https://github.com/labki-org/LabkiPageFormsInputs/actions/workflows/ci.yml)

A MediaWiki extension that registers three [PageForms](https://www.mediawiki.org/wiki/Extension:Page_Forms) input types for date/time entry with optional time precision and timezone preservation:

| Input type        | SMW property type | Saves as |
| ----------------- | ----------------- | --------- |
| `labki-datetime`  | `Date` (`_dat`)   | `YYYY-MM-DD`, `YYYY-MM-DDTHH:MM`, or `YYYY-MM-DDTHH:MM:SS±HH:MM` (DST-aware offset for that date) |
| `labki-date`      | `Date` (`_dat`)   | `YYYY-MM-DD` |
| `labki-time`      | `Text` (`_txt`)   | `HH:MM` or `HH:MM <IANA_zone>` (e.g., `14:30 America/Los_Angeles`) |

`labki-datetime` and `labki-date` round-trip through SMW's variable-precision `Date` datatype. `labki-time` stores as **Text** because SMW's `_dat` requires a date component, and a stored IANA zone name (rather than a numeric offset) avoids DST ambiguity when there is no anchor date.

## Why

PageForms ships `datepicker` (date only) and `datetimepicker` (forces a time, UTC only). Many real-world fields need to be date-or-datetime depending on the page (e.g., a workshop session that may or may not have a known start time yet) and need a timezone other than UTC. `labki-datetime` covers all three cases on a single SMW Date property without changing the data model.

## Installation

```php
// LocalSettings.php
wfLoadExtension( 'LabkiPageFormsInputs' );
```

Requires:
- MediaWiki ≥ 1.43
- PageForms ≥ 6.0
- SemanticMediaWiki (for the `_dat` / `_txt` property types)

That's the minimum. The extension self-registers the three input types via PageForms' `FormPrinterSetup` hook — nothing else is required to start using them.

## Quick example

On a property page (`Property:Has start date`):

```
{{Property
|has_type=Date
|has_input_type=labki-datetime
}}
```

In a form (`Form:Workshop session`):

```
{{{field|has_start_date|input type=labki-datetime}}}
```

Done. PageForms picks up the input type when generating the form.

## Configuration

All knobs are optional. See [USAGE.md](USAGE.md) for the full reference, including:

- All four `$wgLabkiPageFormsInputs*` LocalSettings (TZ shortlist, 24h/12h, first day of week, default TZ)
- Per-field arguments (`placeholder`, `class`)
- The wiki-wide `$wgSemanticSchemasDatatypeInputOverrides` integration
- `labki-time` Text-storage caveat
- Storage-format reference for round-tripping

## License

GPL-2.0-or-later. Bundles [flatpickr](https://flatpickr.js.org/) (MIT) under `resources/lib/flatpickr/`.
