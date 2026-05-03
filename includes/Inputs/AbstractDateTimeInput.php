<?php
/**
 * Shared scaffolding for the Labki datetime-family PageForms inputs.
 *
 * Subclasses implement `getName()` and `getHtmlText()`. This base provides:
 *  - SMW Date (`_dat`) declared as the default property type
 *  - Shared parameter list (mandatory, placeholder, class)
 *  - Helper to render a hidden input that holds the serialized value
 *
 * @file
 * @license GPL-2.0-or-later
 */

namespace Labki\PageFormsInputs\Inputs;

use MediaWiki\Html\Html;
use PFFormInput;

abstract class AbstractDateTimeInput extends PFFormInput {

	/**
	 * Empty by design — these inputs are strictly opt-in via
	 * `has_input_type=…`. We don't want installing the extension to silently
	 * override PageForms' default `datepicker` for every Date property on
	 * the wiki. The SemanticSchemas `$wgSemanticSchemasDatatypeInputOverrides`
	 * config is the supported mechanism for making one of these the default.
	 *
	 * @return array
	 */
	public static function getDefaultPropTypes() {
		return [];
	}

	/**
	 * Compatible SMW datatypes — datetime/date subclasses handle Date (`_dat`),
	 * time-only handles Text (`_txt`). Subclasses extend as needed.
	 *
	 * @return string[]
	 */
	public static function getOtherPropTypesHandled() {
		return [ '_dat' ];
	}

	public static function getDefaultCargoTypes() {
		return [];
	}

	public static function getOtherCargoTypesHandled() {
		return [ 'Date', 'Datetime' ];
	}

	public static function getParameters() {
		$params = parent::getParameters();
		$params[] = [
			'name' => 'placeholder',
			'type' => 'string',
			'description' => 'Placeholder text for the date sub-input',
		];
		$params[] = [
			'name' => 'class',
			'type' => 'string',
			'description' => 'CSS class applied to the wrapper element',
		];
		return $params;
	}

	/**
	 * Renders the hidden input PageForms posts on submit. JS keeps it in sync
	 * with the visible date/time/tz fields.
	 */
	protected function hiddenInput( string $value ): string {
		return Html::element( 'input', [
			'type' => 'hidden',
			'name' => $this->mInputName,
			'value' => $value,
			'class' => 'labki-pf-input-value',
		] );
	}

	/**
	 * CSS class applied to the wrapper div so JS can find this widget.
	 */
	protected function wrapperClass( string $kind ): string {
		$extra = $this->mOtherArgs['class'] ?? '';
		return trim( "labki-pf-input labki-pf-input-$kind $extra" );
	}
}
