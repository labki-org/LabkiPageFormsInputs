/*!
 * `labki-date` widget — visual sibling of labki-datetime for forms that mix
 * date-only and datetime fields.
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
		const dateEl = wrapper.querySelector( '[data-pf-target="date"]' );
		const hidden = wrapper.querySelector( '.labki-pf-input-value' );
		const initial = wrapper.getAttribute( 'data-pf-initial' ) || '';

		const sync = function () {
			if ( hidden ) {
				hidden.value = helpers.formatDate( dateEl );
			}
		};

		if ( dateEl && typeof window.flatpickr === 'function' ) {
			window.flatpickr( dateEl, {
				dateFormat: 'Y-m-d',
				allowInput: true,
				defaultDate: initial || null,
				locale: { firstDayOfWeek: cfg.firstDayOfWeek },
				onChange: sync,
				onClose: sync
			} );
		} else if ( dateEl ) {
			dateEl.value = initial;
			dateEl.addEventListener( 'change', sync );
			dateEl.addEventListener( 'input', sync );
		}

		sync();
	}

	mw.hook( 'wikipage.content' ).add( function ( $content ) {
		$content.find( '.labki-pf-input-date' ).each( function () {
			initWrapper( this );
		} );
	} );

	$( function () {
		document.querySelectorAll( '.labki-pf-input-date' ).forEach( initWrapper );
	} );
}() );
