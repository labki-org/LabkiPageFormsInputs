/*!
 * Curated timezone shortlist + lazy-loaded full IANA list.
 * Exposes mw.labki.pfInputs.tz.{ SHORTLIST, getAllZones }.
 *
 * The SHORTLIST may be overridden per-wiki via the
 * `$wgLabkiPageFormsInputsTzShortlist` LocalSettings global.
 *
 * @license GPL-2.0-or-later
 */
( function () {
	'use strict';

	const DEFAULT_SHORTLIST = [
		{ id: '', label: 'Wiki local' },
		{ id: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
		{ id: 'America/Denver', label: 'Mountain (Denver)' },
		{ id: 'America/Chicago', label: 'Central (Chicago)' },
		{ id: 'America/New_York', label: 'Eastern (New York)' },
		{ id: 'UTC', label: 'UTC' },
		{ id: 'Europe/London', label: 'London' },
		{ id: 'Europe/Madrid', label: 'Madrid' },
		{ id: 'Europe/Berlin', label: 'Berlin' },
		{ id: 'Asia/Tokyo', label: 'Tokyo' }
	];

	function resolveShortlist() {
		const override = mw.config.get( 'wgLabkiPageFormsInputsTzShortlist' );
		if ( !Array.isArray( override ) || override.length === 0 ) {
			return DEFAULT_SHORTLIST;
		}
		const out = [];
		override.forEach( function ( entry ) {
			if ( entry && typeof entry === 'object' && 'id' in entry && 'label' in entry ) {
				out.push( { id: String( entry.id ), label: String( entry.label ) } );
			}
		} );
		return out.length > 0 ? out : DEFAULT_SHORTLIST;
	}

	const SHORTLIST = resolveShortlist();
	let cachedAllZones = null;

	function getAllZones() {
		if ( cachedAllZones !== null ) {
			return cachedAllZones;
		}
		if ( typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function' ) {
			try {
				cachedAllZones = Intl.supportedValuesOf( 'timeZone' );
				return cachedAllZones;
			} catch ( e ) {
				// Some old engines throw rather than returning undefined.
			}
		}
		cachedAllZones = SHORTLIST.map( ( z ) => z.id ).filter( ( id ) => id !== '' );
		return cachedAllZones;
	}

	mw.labki = mw.labki || {};
	mw.labki.pfInputs = mw.labki.pfInputs || {};
	mw.labki.pfInputs.tz = { SHORTLIST: SHORTLIST, getAllZones: getAllZones };
}() );
