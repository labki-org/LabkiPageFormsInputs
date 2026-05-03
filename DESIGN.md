# LabkiPageFormsInputs — design notes

Captures the non-obvious decisions for v1 so future maintainers can reason about edge cases without re-deriving them.

## Storage format: preserve offset, not UTC

For `datetime-tz`, when the user picks a timezone, we save:

```
YYYY-MM-DDTHH:MM:SS±HH:MM
```

with the offset computed *at that date* (DST-aware). We do **not** normalize to UTC because:

1. **Round-trip clarity.** Re-editing a value should land the user back on the date, time, and zone they originally entered. Normalizing to UTC drops the user's intent (was it 9am Madrid or 9am London?), and reconstructing the IANA zone from a raw offset is ambiguous.
2. **`_dat` accepts it.** SMW's `Date` datatype is variable-precision; all three forms (`YYYY-MM-DD`, `YYYY-MM-DDTHH:MM`, `YYYY-MM-DDTHH:MM:SS±HH:MM`) parse cleanly into the same property without schema changes.
3. **Human-readable wikitext.** `[[Has start date::2026-09-12T09:00:00-07:00]]` is interpretable on inspection. UTC-normalized values surprise editors looking at the raw page.

The trade-off: `?Has start date#-F[Y-m-d H:i T]` rendering may show the offset rather than a friendly zone name. If that becomes annoying, post-v1 we can store an additional `Has start date timezone` companion property — but v1 doesn't need it.

## TZ default: user pref, then "wiki local"

Read order on a fresh form:

1. `MediaWikiServices::getInstance()->getUserOptionsLookup()->getOption( $user, 'timecorrection' )` — if `ZoneInfo|<minutes>|<IANA>`, use the IANA portion.
2. Otherwise, "wiki local" sentinel (empty TZ field). Saved value omits the offset suffix.

We deliberately do **not** infer from `Offset|<minutes>` because an offset can map to many IANA zones with different DST behavior.

## TZ list UI: shortlist + expander

A curated shortlist of ~10 zones (PT/MT/CT/ET, UTC, London, Madrid, Berlin, Tokyo) covers >90% of the lab's workshops. "All zones…" lazy-loads `Intl.supportedValuesOf('timeZone')` (Safari 15.4+, Chrome 99+, Firefox 93+ — full coverage of users we care about). On older browsers, the shortlist is the cap; users who need something else can edit the wikitext directly.

## Why three inputs instead of one

`date-only` and `time-only` are visually consistent siblings of `datetime-tz`. PageForms ships `datepicker` and `timepicker` already — ours exist so a form mixing date, datetime+TZ, and time fields renders with one cohesive look, not three different pickers. Opt-in is per-property; we do not register them as wiki-wide replacements.

## time-only stores Text, not Date

SMW's `_dat` requires a date component — a bare `HH:MM` is rejected at save time. `time-only` therefore targets `Text`-typed properties. The widget includes a TZ selector so the user can record intent (e.g., "9am Pacific") and the saved format is `HH:MM` or `HH:MM <IANA_zone>` (space-delimited, IANA name verbatim). We deliberately do **not** store a numeric offset for time-only because, without an anchor date, the offset is ambiguous across DST boundaries — `9am Pacific` could be `-07:00` or `-08:00` depending on the day. The IANA name preserves the user's actual intent without that ambiguity.

## getDefaultPropTypes returns []

Each input's `getDefaultPropTypes()` is intentionally empty: installing the extension must not silently override PageForms' built-in `datepicker` for every existing Date property on the wiki. Users opt in per-property via `has_input_type=…`, or wiki-wide via `$wgSemanticSchemasDatatypeInputOverrides` when SemanticSchemas is also installed. `getOtherPropTypesHandled` declares the SMW types each input is compatible with (`_dat` for the date-family, `_txt` for time-only) — that's "this input can render values of these types," not "this input is the default for these types."

## Hidden-input + visible-fields pattern

PageForms POSTs the value of one input named `$this->mInputName`. Our widgets render *several* visible fields (date / time / tz) and one hidden field carrying the serialized result. JS keeps the hidden field in sync with the visible ones on every change. This is a deliberate divergence from `PFDateTimePicker`, which uses an OOUI `DateTimeInputWidget` with a single underlying input.

## flatpickr vs alternatives

- **MIT licensed**, ~50KB minified, vendored under `resources/lib/flatpickr/`.
- The project is in maintenance mode (last 1.x release Feb 2024). If it's ever abandoned, `<input type="datetime-local">` is a viable swap with minor UX regressions — no API surface area is lost.

## Round-trip parsing

The JS `parseValue(str)` accepts:

- `YYYY-MM-DD` → `{ date, time: '', tz: '' }`
- `YYYY-MM-DDTHH:MM` (or `:SS`) → `{ date, time, tz: '' }`
- `YYYY-MM-DDTHH:MM:SS±HH:MM` → reverse-lookup the offset against the user's last-picked TZ to confirm DST match; if the offset doesn't match any known IANA zone at that date, fall back to displaying the raw offset as a synthetic "UTC±HH:MM" choice.

The synthetic-zone fallback is a v1 compromise — it preserves user data without forcing a re-pick, but discloses that we couldn't recover the original IANA name.
