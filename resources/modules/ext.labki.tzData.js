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
		// id:'' is a placeholder rewritten to the wiki's $wgLocaltimezone in
		// resolveShortlist(). A literal empty id would serialize values without
		// any offset, silently meaning UTC to SMW.
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
		const wikiTz = mw.config.get( 'wgLabkiPageFormsInputsWikiTz' ) || 'UTC';
		const override = mw.config.get( 'wgLabkiPageFormsInputsTzShortlist' );
		const filtered = ( Array.isArray( override ) && override.length > 0 ) ?
			override.filter( ( e ) => e && typeof e === 'object' && 'id' in e && 'label' in e ) :
			[];
		const list = filtered.length > 0 ? filtered : DEFAULT_SHORTLIST;
		return list.map( ( e ) => rewriteEmptyId( e, wikiTz ) );
	}

	function rewriteEmptyId( entry, wikiTz ) {
		const id = String( entry.id );
		const label = String( entry.label );
		if ( id !== '' ) {
			return { id: id, label: label };
		}
		return { id: wikiTz, label: label + ' (' + wikiTz + ')' };
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
