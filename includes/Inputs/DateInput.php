<?php
/**
 * `labki-date` — date input on the same flatpickr base as DatetimeInput,
 * for visual consistency across forms that mix date and datetime fields.
 *
 * Saves: YYYY-MM-DD
 *
 * @file
 * @license GPL-2.0-or-later
 */

namespace Labki\PageFormsInputs\Inputs;

use MediaWiki\Html\Html;

class DateInput extends AbstractDateTimeInput {

	public static function getName(): string {
		return 'labki-date';
	}

	public function getResourceModuleNames(): array {
		return [ 'ext.labki.pfInputs.date' ];
	}

	public function getHtmlText(): string {
		$cur = (string)$this->mCurrentValue;

		$dateInput = Html::element( 'input', [
			'type' => 'text',
			'class' => 'labki-pf-date',
			'data-pf-target' => 'date',
			'placeholder' => $this->mOtherArgs['placeholder']
				?? wfMessage( 'labkipageformsinputs-date-placeholder' )->plain(),
			'disabled' => $this->mIsDisabled,
		] );

		$inner = $dateInput . $this->hiddenInput( $cur );

		return Html::rawElement( 'span', [
			'class' => $this->wrapperClass( 'date' ),
			'data-pf-initial' => $cur,
		], $inner );
	}
}
