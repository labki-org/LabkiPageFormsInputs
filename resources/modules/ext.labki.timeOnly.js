/*!
 * `time-only` widget — time + optional timezone, stored as Text.
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
		const initial = wrapper.getAttribute( 'data-pf-initial' ) || '';
		const state = helpers.parseTimeOnly( initial );

		const timeEl = wrapper.querySelector( '[data-pf-target="time"]' );
		const hidden = wrapper.querySelector( '.labki-pf-input-value' );

		const userTz = mw.config.get( 'wgLabkiPageFormsInputsUserTz' );
		const tzSel = helpers.buildTzSelect( wrapper, state.tz || userTz || '' );

		function sync() {
			const next = {
				time: timeEl ? timeEl.value : '',
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
				dateFormat: 'H:i',
				time_24hr: true,
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
		$content.find( '.labki-pf-input-time-only' ).each( function () {
			initWrapper( this );
		} );
	} );

	$( function () {
		document.querySelectorAll( '.labki-pf-input-time-only' ).forEach( initWrapper );
	} );
}() );
