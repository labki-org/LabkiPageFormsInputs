<?php
/**
 * `datetime-tz` — date (required) + optional time + optional timezone.
 *
 * Storage formats (preserve offset):
 *   - YYYY-MM-DD                           (date only)
 *   - YYYY-MM-DDTHH:MM                     (date + time, no TZ → wiki-local)
 *   - YYYY-MM-DDTHH:MM:SS±HH:MM            (date + time + TZ; offset DST-aware
 *                                            for that date)
 *
 * @file
 * @license GPL-2.0-or-later
 */

namespace Labki\PageFormsInputs\Inputs;

use MediaWiki\Html\Html;

class DateTimeTzInput extends AbstractDateTimeInput {

	public static function getName() {
		return 'datetime-tz';
	}

	public function getResourceModuleNames() {
		return [ 'ext.labki.pfInputs.dateTimeTz' ];
	}

	public function getHtmlText() {
		$cur = (string)$this->mCurrentValue;

		$dateInput = Html::element( 'input', [
			'type' => 'text',
			'class' => 'labki-pf-date',
			'data-pf-target' => 'date',
			'placeholder' => $this->mOtherArgs['placeholder']
				?? wfMessage( 'labkipageformsinputs-date-placeholder' )->plain(),
			'disabled' => $this->mIsDisabled,
		] );

		$timeInput = Html::element( 'input', [
			'type' => 'text',
			'class' => 'labki-pf-time',
			'data-pf-target' => 'time',
			'placeholder' => wfMessage( 'labkipageformsinputs-time-placeholder' )->plain(),
			'disabled' => $this->mIsDisabled,
		] );

		$tzSelect = Html::rawElement( 'span', [
			'class' => 'labki-pf-tz',
			'data-pf-target' => 'tz',
		], '' );

		$inner = $dateInput . $timeInput . $tzSelect . $this->hiddenInput( $cur );

		return Html::rawElement( 'span', [
			'class' => $this->wrapperClass( 'datetime-tz' ),
			'data-pf-initial' => $cur,
		], $inner );
	}
}
