# LabkiPageFormsInputs — Usage

This guide covers everything an admin or form author needs to know after installation. For the elevator pitch and minimum install steps, see [README.md](README.md).

## The three input types

### `labki-datetime` — date + optional time + optional timezone

Use when a field may carry just a date *or* a full datetime, and when timezone matters. Backs onto an SMW property with `[[Has type::Date]]`.

**Property page** (`Property:Has start date`):
```
{{Property
|has_type=Date
|has_input_type=labki-datetime
}}
```

**Form snippet** (inside a `{{{for template|...}}}` block):
```
{{{field|has_start_date|input type=labki-datetime}}}
```

**Storage forms (preserves user intent):**
- `2026-09-12` — date only (user left time empty)
- `2026-09-12T14:30` — date + time, no zone (interpreted as wiki-local)
- `2026-09-12T14:30:00-07:00` — date + time + offset (offset is DST-aware for *that date*)

### `labki-date` — date only

A visual sibling of `labki-datetime` for forms that mix date-only and datetime fields. Without this, a form using `datepicker` for some fields and `labki-datetime` for others would look inconsistent.

**Property page**:
```
{{Property
|has_type=Date
|has_input_type=labki-date
}}
```

**Form snippet**:
```
{{{field|has_birthday|input type=labki-date}}}
```

**Storage**: `YYYY-MM-DD`. Pre-fill also accepts `YYYY/MM/DD`, the format used by PageForms' built-in `datepicker`, so switching a property from `datepicker` → `labki-date` keeps existing values visible without re-entry.

### `labki-time` — time + optional timezone (stored as Text)

> **Important**: `labki-time` requires `[[Has type::Text]]`, **not** `Date`. SMW's `Date` cannot hold a bare `HH:MM` (no calendar anchor). The IANA zone name is stored verbatim because, without a date, a numeric offset is DST-ambiguous.

**Property page**:
```
{{Property
|has_type=Text
|has_input_type=labki-time
}}
```

**Form snippet**:
```
{{{field|daily_standup|input type=labki-time}}}
```

**Storage forms**:
- `14:30` — time only (user left timezone empty)
- `14:30 America/Los_Angeles` — time + IANA zone (space-delimited)

## Per-field arguments

Both arguments are optional and accepted by all three input types.

| Argument      | Effect |
| ------------- | --- |
| `placeholder` | Override the default placeholder text on the date/time sub-input. |
| `class`       | Append CSS classes to the wrapper `<span>`, e.g. for custom theming. |

Example:
```
{{{field|has_start_date|input type=labki-datetime|placeholder=When did it happen?|class=highlighted}}}
```

## LocalSettings configuration (wiki-wide)

All four knobs are optional; sensible defaults apply.

### `$wgLabkiPageFormsInputsTzShortlist`

Per-wiki override for the curated timezone shortlist that appears at the top of the TZ dropdown. Pass an associative array `'IANA_name' => 'Display label'`. Order is preserved.

Use the empty string `''` to mean "wiki local"; the widget rewrites it to MediaWiki's `$wgLocaltimezone` at render time, so the dropdown carries a real IANA value (e.g. `America/Los_Angeles`) and saved values get a proper offset.

**Default**: a 10-zone shortlist (`Wiki local (<your-tz>)`, US Pacific/Mountain/Central/Eastern, UTC, London, Madrid, Berlin, Tokyo).

```php
// LocalSettings.php
$wgLabkiPageFormsInputsTzShortlist = [
    ''                      => 'Wiki local',
    'America/Los_Angeles'   => 'Pacific',
    'UTC'                   => 'UTC',
    'Europe/Berlin'         => 'Central European',
    'Asia/Singapore'        => 'Singapore',
];
```

Users can still pick any IANA zone via the "All zones…" expander; the shortlist is just a fast-access list.

### `$wgLabkiPageFormsInputsTime24h`

Whether the time picker displays 24-hour mode (`true`, default) or 12-hour AM/PM mode (`false`). **Storage format is always `HH:MM` regardless**, so wikitext stays canonical.

```php
$wgLabkiPageFormsInputsTime24h = false;  // show "2:30 PM" in the picker
```

### `$wgLabkiPageFormsInputsFirstDayOfWeek`

First day of week shown in the calendar grid. `0` = Sunday, `1` = Monday (default, matches ISO 8601), through `6` = Saturday.

```php
$wgLabkiPageFormsInputsFirstDayOfWeek = 0;  // Sunday-first calendar
```

### `$wgLabkiPageFormsInputsDefaultTz`

Fallback IANA timezone for users who don't have `timecorrection` set in their preferences. Useful for wikis with a known geographic context. Empty (default) means the widget falls back to MediaWiki's `$wgLocaltimezone`.

```php
$wgLabkiPageFormsInputsDefaultTz = 'America/Los_Angeles';
```

The selection precedence on a fresh form is:

1. The user's `timecorrection` preference (when it's a `ZoneInfo|...|<IANA>` value)
2. `$wgLabkiPageFormsInputsDefaultTz`
3. MediaWiki's `$wgLocaltimezone` (default `UTC`)

When re-editing a saved value: a stored IANA name always wins. A stored numeric offset (no IANA) is matched best-effort against the user/default/wiki TZ candidates above; if one matches the offset on that date, it's preselected. Otherwise the dropdown falls back to the candidate chain — selecting a real zone before save.

## Wiki-wide override via SemanticSchemas

If you use [SemanticSchemas](https://github.com/labki-org/SemanticSchemas), you can flip the wiki-wide default for all `Date` properties without touching individual property pages:

```php
// LocalSettings.php
$wgSemanticSchemasDatatypeInputOverrides['Date'] = 'labki-datetime';
```

Per-property `has_input_type=` still wins over this default.

## Round-trip behavior

Editing a saved value does **not** silently rewrite it:

- A stored `2026-09-12T14:30:00-07:00` re-edited and saved without picking an IANA zone preserves the original `-07:00` offset.
- Picking a new IANA zone in the dropdown computes a fresh DST-aware offset for the saved date.
- A stored `labki-time` `14:30 America/Los_Angeles` round-trips zone-and-all.

## Visual styling

Each widget renders as `<span class="labki-pf-input labki-pf-input-{kind}">…</span>` where `{kind}` is `datetime`, `date`, or `time`. Internally each sub-input has a `data-pf-target` (`date`, `time`, `tz`) and the dropdown gets `.labki-pf-tz-select`. Style with custom CSS as needed.

## Accessibility / fallback

If JavaScript is disabled (or flatpickr fails to load), the inputs render as plain `<input type="text">` boxes that accept the canonical formats above directly. The hidden field stays in sync via `change`/`input` listeners. Forms remain submittable with no JS at all.

## Constraints

- **MediaWiki ≥ 1.43**, **PageForms ≥ 6.0**, **SemanticMediaWiki** required (for `_dat`/`_txt` property types).
- Browsers: `Intl.supportedValuesOf('timeZone')` is required for the "All zones…" expander; supported in Safari 15.4+, Chrome 99+, Firefox 93+. On older browsers users see only the shortlist.
- `labki-time` is **not** suitable for an SMW `Date` property — use `Text`.
