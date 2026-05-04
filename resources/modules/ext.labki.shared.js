/*!
 * Shared serializer / parser / TZ helpers for Labki PF inputs.
 *
 * Exposes mw.labki.pfInputs.{ parseValue, serializeValue, offsetFor,
 * parseTimeOnly, serializeTimeOnly, buildTzSelect, formatDate, formatTime,
 * getConfig }.
 *
 * @license GPL-2.0-or-later
 */
( function () {
	'use strict';

	const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
	// Migration aid: PF's built-in `datepicker` saves YYYY/MM/DD, so a
	// property switched from `datepicker` → `labki-*` pre-fills cleanly.
	const SLASH_DATE = /^(\d{4})\/(\d{2})\/(\d{2})$/;
	const ISO_DATETIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/;
	const ISO_DATETIME_TZ = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?([+-]\d{2}:\d{2}|Z)$/;
	const TIME_ONLY = /^(\d{2}:\d{2})(?:\s+(\S+))?$/;
	const OFFSET_PART = /([+-])(\d{2}):?(\d{2})/;

	const SUBMIT_FLAG_KEY = 'labki-pf-just-saved';
	const ALL_ZONES_VALUE = '__all__';
	const WRAPPER_SELECTOR =
		'.labki-pf-input-datetime, .labki-pf-input-date, .labki-pf-input-time';

	/**
	 * @param {string} str
	 * @return {{ date: string, time: string, tz: string, offset: string }}
	 */
	function parseValue( str ) {
		const empty = { date: '', time: '', tz: '', offset: '' };
		if ( !str ) {
			return empty;
		}
		let m = str.match( ISO_DATETIME_TZ );
		if ( m ) {
			return { date: m[ 1 ], time: m[ 2 ], tz: '', offset: m[ 4 ] === 'Z' ? '+00:00' : m[ 4 ] };
		}
		m = str.match( ISO_DATETIME );
		if ( m ) {
			return { date: m[ 1 ], time: m[ 2 ], tz: '', offset: '' };
		}
		m = str.match( ISO_DATE );
		if ( m ) {
			return { date: str, time: '', tz: '', offset: '' };
		}
		m = str.match( SLASH_DATE );
		if ( m ) {
			return { date: m[ 1 ] + '-' + m[ 2 ] + '-' + m[ 3 ], time: '', tz: '', offset: '' };
		}
		return empty;
	}

	/**
	 * If `state.tz` is set, its DST-aware offset wins. Otherwise, preserve a
	 * pre-existing `state.offset` (round-trip from a stored fixed-offset
	 * value) so editing-and-saving doesn't silently rewrite the offset.
	 *
	 * @param {{ date: string, time?: string, tz?: string, offset?: string }} state
	 * @return {string}
	 */
	function serializeValue( state ) {
		const date = state.date || '';
		const time = state.time || '';
		const tz = state.tz || '';
		const offset = state.offset || '';
		if ( !date ) {
			return '';
		}
		if ( !time ) {
			return date;
		}
		// :00 seconds keeps the value parseable as a strict ISO 8601 datetime.
		if ( tz ) {
			return date + 'T' + time + ':00' + offsetFor( tz, date );
		}
		if ( offset ) {
			return date + 'T' + time + ':00' + offset;
		}
		return date + 'T' + time;
	}

	/**
	 * @param {string} tz IANA name, e.g. "America/Los_Angeles"
	 * @param {string} dateStr "YYYY-MM-DD"
	 * @return {string} "±HH:MM" or "" on failure
	 */
	function offsetFor( tz, dateStr ) {
		try {
			const d = new Date( dateStr + 'T12:00:00Z' );
			const fmt = new Intl.DateTimeFormat( 'en-US', {
				timeZone: tz,
				timeZoneName: 'longOffset'
			} );
			const parts = fmt.formatToParts( d );
			const tzPart = parts.find( ( p ) => p.type === 'timeZoneName' );
			if ( tzPart && tzPart.value ) {
				const m = tzPart.value.match( OFFSET_PART );
				if ( m ) {
					return m[ 1 ] + m[ 2 ] + ':' + m[ 3 ];
				}
				if ( /^GMT$/.test( tzPart.value ) || /^UTC$/.test( tzPart.value ) ) {
					return '+00:00';
				}
			}
		} catch ( e ) {
			// Unknown zone — caller falls back to wiki-local serialization.
		}
		return '';
	}

	/**
	 * @param {string} str e.g. "14:30" or "14:30 America/Los_Angeles"
	 * @return {{ time: string, tz: string }}
	 */
	function parseTimeOnly( str ) {
		if ( !str ) {
			return { time: '', tz: '' };
		}
		const m = str.match( TIME_ONLY );
		if ( m ) {
			return { time: m[ 1 ], tz: m[ 2 ] || '' };
		}
		return { time: '', tz: '' };
	}

	/**
	 * @param {{ time: string, tz?: string }} state
	 * @return {string}
	 */
	function serializeTimeOnly( state ) {
		const time = state.time || '';
		const tz = state.tz || '';
		if ( !time ) {
			return '';
		}
		if ( !tz ) {
			return time;
		}
		return time + ' ' + tz;
	}

	/**
	 * Read a date input's canonical "YYYY-MM-DD". Prefers flatpickr's
	 * selectedDates so 12h/locale display formats don't pollute storage.
	 *
	 * @param {HTMLInputElement|null} el
	 * @return {string}
	 */
	function formatDate( el ) {
		if ( !el ) {
			return '';
		}
		const fp = el._flatpickr;
		if ( fp && fp.selectedDates && fp.selectedDates[ 0 ] ) {
			const d = fp.selectedDates[ 0 ];
			return d.getFullYear() + '-' +
				String( d.getMonth() + 1 ).padStart( 2, '0' ) + '-' +
				String( d.getDate() ).padStart( 2, '0' );
		}
		return ( el.value || '' ).trim();
	}

	/**
	 * Read a time input's canonical "HH:MM". Prefers flatpickr's
	 * selectedDates so 12h/AM-PM display formats don't pollute storage.
	 *
	 * @param {HTMLInputElement|null} el
	 * @return {string}
	 */
	function formatTime( el ) {
		if ( !el ) {
			return '';
		}
		const fp = el._flatpickr;
		if ( fp && fp.selectedDates && fp.selectedDates[ 0 ] ) {
			const d = fp.selectedDates[ 0 ];
			return String( d.getHours() ).padStart( 2, '0' ) + ':' +
				String( d.getMinutes() ).padStart( 2, '0' );
		}
		return ( el.value || '' ).trim();
	}

	let configCache = null;

	/**
	 * Read the extension's mw.config knobs with defaults applied. Memoized
	 * because the values don't change after page load and forms with many
	 * widgets call this once per init.
	 *
	 * @return {{ time24h: boolean, firstDayOfWeek: number, defaultTz: string, userTz: string, wikiTz: string }}
	 */
	function getConfig() {
		if ( configCache !== null ) {
			return configCache;
		}
		const raw24h = mw.config.get( 'wgLabkiPageFormsInputsTime24h' );
		const rawFdw = mw.config.get( 'wgLabkiPageFormsInputsFirstDayOfWeek' );
		const fdw = parseInt( rawFdw, 10 );
		configCache = {
			time24h: raw24h === null || raw24h === undefined ? true : !!raw24h,
			firstDayOfWeek: ( fdw >= 0 && fdw <= 6 ) ? fdw : 1,
			defaultTz: mw.config.get( 'wgLabkiPageFormsInputsDefaultTz' ) || '',
			userTz: mw.config.get( 'wgLabkiPageFormsInputsUserTz' ) || '',
			wikiTz: mw.config.get( 'wgLabkiPageFormsInputsWikiTz' ) || 'UTC'
		};
		return configCache;
	}

	/**
	 * Per-wiki TZ fallback chain (no per-state info). Both widgets layer
	 * `state.tz` (and datetime.js a recovered IANA from a stored offset) on
	 * top of this — keeping the chain in one place avoids drift.
	 *
	 * @param {{ userTz: string, defaultTz: string, wikiTz: string }} cfg
	 * @return {string}
	 */
	function tzFallback( cfg ) {
		return cfg.userTz || cfg.defaultTz || cfg.wikiTz || 'UTC';
	}

	/**
	 * Best-effort recovery of an IANA name from a stored offset. When a saved
	 * value carries `+HH:MM` but no zone, scan candidates and pick the first
	 * whose DST-aware offset on `dateStr` matches. Returns "" if none match.
	 *
	 * @param {string} offset e.g. "-07:00"
	 * @param {string} dateStr "YYYY-MM-DD"
	 * @param {Array<string>} candidates IANA names (may include "" / falsy entries)
	 * @return {string}
	 */
	function resolveIanaFromOffset( offset, dateStr, candidates ) {
		if ( !offset || !dateStr || !Array.isArray( candidates ) ) {
			return '';
		}
		for ( let i = 0; i < candidates.length; i++ ) {
			const tz = candidates[ i ];
			if ( !tz ) {
				continue;
			}
			if ( offsetFor( tz, dateStr ) === offset ) {
				return tz;
			}
		}
		return '';
	}

	let compactFragmentCache = null;
	let expandedFragmentCache = null;

	function tzData() {
		return ( mw.labki && mw.labki.pfInputs && mw.labki.pfInputs.tz ) || null;
	}

	function makeOption( value, label ) {
		const opt = document.createElement( 'option' );
		opt.value = value;
		opt.textContent = label;
		return opt;
	}

	function compactFragment() {
		if ( compactFragmentCache !== null ) {
			return compactFragmentCache.cloneNode( true );
		}
		const data = tzData();
		if ( !data ) {
			return null;
		}
		const frag = document.createDocumentFragment();
		data.SHORTLIST.forEach( function ( z ) {
			frag.appendChild( makeOption( z.id, z.label ) );
		} );
		frag.appendChild( makeOption( ALL_ZONES_VALUE, mw.msg( 'labkipageformsinputs-tz-all-zones' ) ) );
		compactFragmentCache = frag;
		return compactFragmentCache.cloneNode( true );
	}

	function expandedFragment() {
		if ( expandedFragmentCache !== null ) {
			return expandedFragmentCache.cloneNode( true );
		}
		const data = tzData();
		if ( !data ) {
			return null;
		}
		const frag = document.createDocumentFragment();
		const seen = new Set();
		data.SHORTLIST.forEach( function ( z ) {
			frag.appendChild( makeOption( z.id, z.label ) );
			seen.add( z.id );
		} );
		const sep = document.createElement( 'option' );
		sep.disabled = true;
		sep.textContent = '──────────';
		frag.appendChild( sep );
		data.getAllZones().forEach( function ( id ) {
			if ( !seen.has( id ) ) {
				frag.appendChild( makeOption( id, id ) );
			}
		} );
		expandedFragmentCache = frag;
		return expandedFragmentCache.cloneNode( true );
	}

	/**
	 * Build a curated TZ <select> inside the wrapper's [data-pf-target="tz"]
	 * slot. If `initialTz` isn't in the shortlist, auto-expand to the full
	 * IANA list so the user's preference is honored visibly.
	 *
	 * @param {HTMLElement} wrapper widget root span
	 * @param {string} initialTz IANA name to preselect, or "" for wiki-local
	 * @return {HTMLSelectElement|null}
	 */
	function buildTzSelect( wrapper, initialTz ) {
		const tzEl = wrapper.querySelector( '[data-pf-target="tz"]' );
		if ( !tzEl || !tzData() ) {
			return null;
		}
		tzEl.replaceChildren();

		const sel = document.createElement( 'select' );
		sel.className = 'labki-pf-tz-select';

		function rebuild( includeAll ) {
			const frag = includeAll ? expandedFragment() : compactFragment();
			sel.replaceChildren();
			if ( frag ) {
				sel.appendChild( frag );
			}
		}

		rebuild( false );
		const wanted = initialTz || '';
		sel.value = wanted;
		// If `wanted` isn't in the shortlist, the assignment silently no-ops
		// and `sel.value` stays at the first option — auto-expand so the
		// user's saved or preferred zone is actually selected.
		if ( wanted !== '' && sel.value !== wanted ) {
			rebuild( true );
			sel.value = wanted;
		}
		sel.dataset.lastValue = sel.value;
		tzEl.appendChild( sel );

		sel.addEventListener( 'change', function () {
			if ( sel.value === ALL_ZONES_VALUE ) {
				const previous = sel.dataset.lastValue || '';
				rebuild( true );
				sel.value = previous;
				sel.dataset.lastValue = sel.value;
			} else {
				sel.dataset.lastValue = sel.value;
			}
		} );

		return sel;
	}

	mw.labki = mw.labki || {};
	mw.labki.pfInputs = mw.labki.pfInputs || {};
	mw.labki.pfInputs.parseValue = parseValue;
	mw.labki.pfInputs.serializeValue = serializeValue;
	mw.labki.pfInputs.offsetFor = offsetFor;
	mw.labki.pfInputs.parseTimeOnly = parseTimeOnly;
	mw.labki.pfInputs.serializeTimeOnly = serializeTimeOnly;
	mw.labki.pfInputs.buildTzSelect = buildTzSelect;
	mw.labki.pfInputs.formatDate = formatDate;
	mw.labki.pfInputs.formatTime = formatTime;
	mw.labki.pfInputs.getConfig = getConfig;
	mw.labki.pfInputs.tzFallback = tzFallback;
	mw.labki.pfInputs.resolveIanaFromOffset = resolveIanaFromOffset;

	// bfcache restore: PageForms' post-submit form state can prevent further
	// saves. Set a flag on submit; reload only when the flag survives bfcache.
	if ( typeof window !== 'undefined' ) {
		document.addEventListener( 'submit', function ( ev ) {
			if ( ev.target instanceof HTMLFormElement &&
				ev.target.querySelector( WRAPPER_SELECTOR ) ) {
				try {
					sessionStorage.setItem( SUBMIT_FLAG_KEY, '1' );
				} catch ( e ) {
					// sessionStorage unavailable (private mode, quota): skip.
				}
			}
		}, true );

		window.addEventListener( 'pageshow', function ( e ) {
			let flagged = false;
			try {
				flagged = sessionStorage.getItem( SUBMIT_FLAG_KEY ) === '1';
				if ( flagged ) {
					sessionStorage.removeItem( SUBMIT_FLAG_KEY );
				}
			} catch ( err ) {
				return;
			}
			if ( e.persisted && flagged ) {
				window.location.reload();
			}
		} );
	}
}() );
