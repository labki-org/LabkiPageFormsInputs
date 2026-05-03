/*!
 * `datetime-tz` widget — initializes flatpickr on `.labki-pf-input-datetime-tz`
 * wrappers, builds a TZ selector (curated shortlist + lazy "All zones..."),
 * and keeps the hidden value synced via the shared serializer.
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
		const state = helpers.parseValue( initial );

		const dateEl = wrapper.querySelector( '[data-pf-target="date"]' );
		const timeEl = wrapper.querySelector( '[data-pf-target="time"]' );
		const hidden = wrapper.querySelector( '.labki-pf-input-value' );

		const userTz = mw.config.get( 'wgLabkiPageFormsInputsUserTz' );
		const tzSel = helpers.buildTzSelect( wrapper, state.tz || userTz || '' );

		function sync() {
			const tz = tzSel ? tzSel.value : '';
			// Preserve the original offset only when no IANA zone is selected;
			// picking a zone always wins (DST-aware re-computation).
			const next = {
				date: dateEl ? dateEl.value : '',
				time: timeEl ? timeEl.value : '',
				tz: tz,
				offset: tz ? '' : ( state.offset || '' )
			};
			if ( hidden ) {
				hidden.value = helpers.serializeValue( next );
			}
		}

		if ( dateEl && typeof window.flatpickr === 'function' ) {
			window.flatpickr( dateEl, {
				dateFormat: 'Y-m-d',
				allowInput: true,
				defaultDate: state.date || null,
				onChange: sync,
				onClose: sync
			} );
		} else if ( dateEl ) {
			dateEl.value = state.date;
			dateEl.addEventListener( 'change', sync );
			dateEl.addEventListener( 'input', sync );
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
		$content.find( '.labki-pf-input-datetime-tz' ).each( function () {
			initWrapper( this );
		} );
	} );

	$( function () {
		document.querySelectorAll( '.labki-pf-input-datetime-tz' ).forEach( initWrapper );
	} );
}() );
