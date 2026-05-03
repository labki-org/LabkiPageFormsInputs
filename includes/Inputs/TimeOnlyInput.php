<?php
/**
 * `time-only` — time + optional timezone, stored as Text.
 *
 * SMW's Date type can't hold a bare `HH:MM` (it requires at minimum a
 * date), so this input targets Text-typed (`_txt`) properties instead.
 * The TZ is preserved as the IANA zone name rather than a numeric offset
 * because without an anchor date the offset is DST-ambiguous.
 *
 * Storage formats:
 *   - HH:MM                              (no TZ chosen)
 *   - HH:MM <IANA_zone>                  (e.g., "14:30 America/Los_Angeles")
 *
 * @file
 * @license GPL-2.0-or-later
 */

namespace Labki\PageFormsInputs\Inputs;

use MediaWiki\Html\Html;

class TimeOnlyInput extends AbstractDateTimeInput {

	public static function getName() {
		return 'time-only';
	}

	public static function getOtherPropTypesHandled() {
		return [ '_txt' ];
	}

	public static function getOtherCargoTypesHandled() {
		return [ 'String', 'Text' ];
	}

	public function getResourceModuleNames() {
		return [ 'ext.labki.pfInputs.timeOnly' ];
	}

	public function getHtmlText() {
		$cur = (string)$this->mCurrentValue;

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

		$inner = $timeInput . $tzSelect . $this->hiddenInput( $cur );

		return Html::rawElement( 'span', [
			'class' => $this->wrapperClass( 'time-only' ),
			'data-pf-initial' => $cur,
		], $inner );
	}
}
