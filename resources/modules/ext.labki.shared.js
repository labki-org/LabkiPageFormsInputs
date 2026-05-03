/*!
 * Shared serializer / parser / TZ-offset helper for Labki PF inputs.
 *
 * Exposes mw.labki.pfInputs.{ parseValue, serializeValue, offsetFor }.
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
	 *
	 * @param {{ date: string, time?: string, tz?: string }} state
	 * @return {string}
	 */
	function serializeValue( state ) {
		const date = state.date || '';
		const time = state.time || '';
		const tz = state.tz || '';
		if ( !date ) {
			return '';
		}
		if ( !time ) {
			return date;
		}
		if ( !tz ) {
			return date + 'T' + time;
		}
		const offset = offsetFor( tz, date );
		// :00 seconds keeps the value parseable as a strict ISO 8601 datetime.
		return date + 'T' + time + ':00' + offset;
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

	/**
	 * Build a curated TZ <select> inside a wrapper's [data-pf-target="tz"]
	 * slot, with the curated shortlist and a lazy "All zones…" expander.
	 *
	 * The `mw` and `tzData` globals must be loaded before this is called
	 * — guaranteed by the ResourceLoader dependency chain.
	 *
	 * @param {HTMLElement} wrapper widget root span
	 * @param {string} initialTz IANA name to preselect, or "" for wiki-local
	 * @return {HTMLSelectElement|null}
	 */
	function buildTzSelect( wrapper, initialTz ) {
		const tzEl = wrapper.querySelector( '[data-pf-target="tz"]' );
		if ( !tzEl ) {
			return null;
		}
		tzEl.replaceChildren();

		const tzData = ( mw.labki && mw.labki.pfInputs && mw.labki.pfInputs.tz ) || null;
		if ( !tzData ) {
			return null;
		}

		const sel = document.createElement( 'select' );
		sel.className = 'labki-pf-tz-select';
		const allZonesValue = '__all__';

		function rebuild( includeAll ) {
			sel.replaceChildren();
			tzData.SHORTLIST.forEach( function ( z ) {
				const opt = document.createElement( 'option' );
				opt.value = z.id;
				opt.textContent = z.label;
				sel.appendChild( opt );
			} );
			if ( includeAll ) {
				const all = tzData.getAllZones();
				const seen = new Set( tzData.SHORTLIST.map( ( z ) => z.id ) );
				const sep = document.createElement( 'option' );
				sep.disabled = true;
				sep.textContent = '──────────';
				sel.appendChild( sep );
				all.forEach( function ( id ) {
					if ( seen.has( id ) ) {
						return;
					}
					const opt = document.createElement( 'option' );
					opt.value = id;
					opt.textContent = id;
					sel.appendChild( opt );
				} );
			} else {
				const opt = document.createElement( 'option' );
				opt.value = allZonesValue;
				opt.textContent = mw.msg( 'labkipageformsinputs-tz-all-zones' );
				sel.appendChild( opt );
			}
		}

		rebuild( false );
		sel.value = initialTz || '';
		tzEl.appendChild( sel );

		sel.addEventListener( 'change', function () {
			if ( sel.value === allZonesValue ) {
				const previous = sel.dataset.lastValue || '';
				rebuild( true );
				sel.value = previous;
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

	// On bfcache restore (browser Back after a successful save), PageForms'
	// post-submit form state prevents subsequent saves from firing. Reloading
	// is simpler than reverse-engineering PF's internal state. The typeof
	// guard keeps shared.js loadable in the Node sanity-check sandbox, which
	// only stubs `mw`.
	if ( typeof window !== 'undefined' ) {
		window.addEventListener( 'pageshow', function ( e ) {
			if ( e.persisted && document.querySelector(
				'.labki-pf-input-datetime-tz, .labki-pf-input-date-only, .labki-pf-input-time-only'
			) ) {
				window.location.reload();
			}
		} );
	}
}() );
