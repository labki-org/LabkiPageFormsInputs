/*!
 * `labki-time` widget — time + optional timezone, stored as Text.
 *
 * Storage:
 *   "HH:MM"                          (no TZ chosen)
 *   "HH:MM <IANA_zone>"              (e.g., "14:30 America/Los_Angeles")
 *
 * IANA name (not numeric offset) because without an anchor date the offset
 * is DST-ambiguous.
 *
 * @license GPL-2.0-or-later
 */
( function () {
	'use strict';

	function initWrapper( wrapper ) {
		if ( wrapper.dataset.labkiInit === '1' ) {
			return;
		}
		wrapper.dataset.labkiInit = '1';

		const helpers = mw.labki.pfInputs;
		const cfg = helpers.getConfig();
		const initial = wrapper.getAttribute( 'data-pf-initial' ) || '';
		const state = helpers.parseTimeOnly( initial );

		const timeEl = wrapper.querySelector( '[data-pf-target="time"]' );
		const hidden = wrapper.querySelector( '.labki-pf-input-value' );

		const tzSel = helpers.buildTzSelect(
			wrapper,
			state.tz || helpers.tzFallback( cfg )
		);

		function sync() {
			const next = {
				time: helpers.formatTime( timeEl ),
				tz: tzSel ? tzSel.value : ''
			};
			if ( hidden ) {
				hidden.value = helpers.serializeTimeOnly( next );
			}
		}

		if ( timeEl && typeof window.flatpickr === 'function' ) {
			window.flatpickr( timeEl, {
				enableTime: true,
				noCalendar: true,
				dateFormat: cfg.time24h ? 'H:i' : 'h:i K',
				time_24hr: cfg.time24h,
				allowInput: true,
				defaultDate: state.time || null,
				onChange: sync,
				onClose: sync
			} );
		} else if ( timeEl ) {
			timeEl.value = state.time;
			timeEl.addEventListener( 'change', sync );
			timeEl.addEventListener( 'input', sync );
		}

		if ( tzSel ) {
			tzSel.addEventListener( 'change', sync );
		}

		sync();
	}

	mw.hook( 'wikipage.content' ).add( function ( $content ) {
		$content.find( '.labki-pf-input-time' ).each( function () {
			initWrapper( this );
		} );
	} );

	$( function () {
		document.querySelectorAll( '.labki-pf-input-time' ).forEach( initWrapper );
	} );
}() );
