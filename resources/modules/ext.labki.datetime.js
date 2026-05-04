/*!
 * `labki-datetime` widget — initializes flatpickr on
 * `.labki-pf-input-datetime` wrappers, builds a TZ selector, and keeps the
 * hidden value synced via the shared serializer.
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
		const state = helpers.parseValue( initial );

		const dateEl = wrapper.querySelector( '[data-pf-target="date"]' );
		const timeEl = wrapper.querySelector( '[data-pf-target="time"]' );
		const hidden = wrapper.querySelector( '.labki-pf-input-value' );

		// Stored values carry a numeric offset but no IANA name; recover one
		// so the dropdown reflects the saved zone instead of an unrelated
		// fallback.
		const recoveredTz = ( !state.tz && state.offset ) ?
			helpers.resolveIanaFromOffset(
				state.offset,
				state.date,
				[ cfg.userTz, cfg.defaultTz, cfg.wikiTz ]
			) :
			'';

		const tzSel = helpers.buildTzSelect(
			wrapper,
			state.tz || recoveredTz || helpers.tzFallback( cfg )
		);

		function sync() {
			const next = {
				date: helpers.formatDate( dateEl ),
				time: helpers.formatTime( timeEl ),
				tz: tzSel ? tzSel.value : ''
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
				locale: { firstDayOfWeek: cfg.firstDayOfWeek },
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
		$content.find( '.labki-pf-input-datetime' ).each( function () {
			initWrapper( this );
		} );
	} );

	$( function () {
		document.querySelectorAll( '.labki-pf-input-datetime' ).forEach( initWrapper );
	} );
}() );
