<?php
/**
 * LabkiPageFormsInputs hook handlers.
 *
 * @file
 * @license GPL-2.0-or-later
 */

namespace Labki\PageFormsInputs;

use Labki\PageFormsInputs\Inputs\DateOnlyInput;
use Labki\PageFormsInputs\Inputs\DateTimeTzInput;
use Labki\PageFormsInputs\Inputs\TimeOnlyInput;
use MediaWiki\MediaWikiServices;
use OutputPage;
use PFFormPrinter;
use Skin;

class Hooks {

	/**
	 * Register our custom input types with PageForms.
	 *
	 * Hook fires once per request when PFFormPrinter is constructed.
	 *
	 * @param PFFormPrinter $formPrinter
	 */
	public static function onPageFormsFormPrinterSetup( PFFormPrinter $formPrinter ): void {
		$formPrinter->registerInputType( DateTimeTzInput::class );
		$formPrinter->registerInputType( DateOnlyInput::class );
		$formPrinter->registerInputType( TimeOnlyInput::class );
	}

	/**
	 * Expose the user's preferred IANA timezone (if any) to JS via mw.config,
	 * so the widget can pre-select it on fresh forms.
	 *
	 * @param OutputPage $out
	 * @param Skin $skin
	 */
	public static function onBeforePageDisplay( OutputPage $out, Skin $skin ): void {
		$user = $out->getUser();
		if ( !$user->isRegistered() ) {
			return;
		}
		$lookup = MediaWikiServices::getInstance()->getUserOptionsLookup();
		$pref = $lookup->getOption( $user, 'timecorrection' );
		$iana = self::extractIanaZone( (string)$pref );
		if ( $iana !== null ) {
			$out->addJsConfigVars( 'wgLabkiPageFormsInputsUserTz', $iana );
		}
	}

	/**
	 * MW stores `timecorrection` as one of:
	 *   - "ZoneInfo|<minutes>|<IANA>"   → return the IANA name
	 *   - "Offset|<minutes>"            → no IANA name available, return null
	 *   - "System|<minutes>" / unset    → null
	 */
	private static function extractIanaZone( string $pref ): ?string {
		if ( $pref === '' ) {
			return null;
		}
		$parts = explode( '|', $pref );
		if ( count( $parts ) >= 3 && $parts[0] === 'ZoneInfo' && $parts[2] !== '' ) {
			return $parts[2];
		}
		return null;
	}
}
