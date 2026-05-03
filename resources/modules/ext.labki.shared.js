/*!
 * Shared serializer / parser / TZ-offset helper for Labki PF inputs.
 *
 * Exposes mw.labki.pfInputs.{ parseValue, serializeValue, offsetFor,
 * parseTimeOnly, serializeTimeOnly, buildTzSelect }.
 *
 * @license GPL-2.0-or-later
 */
( function () {
	'use strict';

	const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
	const ISO_DATETIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/;
	const ISO_DATETIME_TZ = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?([+-]\d{2}:\d{2}|Z)$/;
	const TIME_ONLY = /^(\d{2}:\d{2})(?:\s+(\S+))?$/;
	const OFFSET_PART = /([+-])(\d{2}):?(\d{2})/;

	const SUBMIT_FLAG_KEY = 'labki-pf-just-saved';
	const ALL_ZONES_VALUE = '__all__';
	const WRAPPER_SELECTOR =
		'.labki-pf-input-datetime-tz, .labki-pf-input-date-only, .labki-pf-input-time-only';

	/**
	 * Parse a stored value back into widget state.
	 *
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
		return empty;
	}

	/**
	 * Serialize widget state into the wikitext value PageForms posts.
	 * If `state.tz` is non-empty, its DST-aware offset wins. If `state.tz`
	 * is empty but `state.offset` is set (round-trip from a stored
	 * fixed-offset value), preserve that offset rather than dropping it.
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
	 * Compute the UTC offset of an IANA zone at a given date (DST-aware).
	 * Uses Intl.DateTimeFormat with timeZoneName: 'longOffset', which yields
	 * strings like "GMT-07:00" or "GMT+05:30". Returns "±HH:MM".
	 *
	 * @param {string} tz IANA name, e.g. "America/Los_Angeles"
	 * @param {string} dateStr "YYYY-MM-DD"
	 * @return {string}
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
	 * Parse a stored time-only value (Text-typed property).
	 *
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
	 * Serialize widget state for time-only into wikitext.
	 *
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

	// bfcache restore: if the user just submitted a Labki form and then hit
	// Back, PageForms' post-submit form state prevents subsequent saves.
	// Reload only when we know a submission happened (not on every Back to
	// any page that contains a wrapper).
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
