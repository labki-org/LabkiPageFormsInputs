/*!
 * Curated timezone shortlist + lazy-loaded full IANA list.
 *
 * Exposes mw.labki.pfInputs.tz.{ SHORTLIST, getAllZones }.
 *
 * @license GPL-2.0-or-later
 */
( function () {
	'use strict';

	// Curated set covering the lab's typical workshop locations and most
	// participants. The string label is what the user sees in the dropdown;
	// the IANA name is what we serialize against.
	const SHORTLIST = [
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

	/**
	 * Return the full IANA zone list. Uses Intl.supportedValuesOf when
	 * available (modern browsers); otherwise falls back to the shortlist.
	 *
	 * @return {string[]}
	 */
	function getAllZones() {
		if ( typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function' ) {
			try {
				return Intl.supportedValuesOf( 'timeZone' );
			} catch ( e ) {
				// Some old engines throw rather than returning undefined.
			}
		}
		return SHORTLIST.map( ( z ) => z.id ).filter( ( id ) => id !== '' );
	}

	mw.labki = mw.labki || {};
	mw.labki.pfInputs = mw.labki.pfInputs || {};
	mw.labki.pfInputs.tz = { SHORTLIST: SHORTLIST, getAllZones: getAllZones };
}() );
