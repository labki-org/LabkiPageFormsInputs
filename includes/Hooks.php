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
use MediaWiki\User\UserTimeCorrection;
use OutputPage;
use PFFormPrinter;
use Skin;

class Hooks {

	public static function onPageFormsFormPrinterSetup( PFFormPrinter $formPrinter ): void {
		$formPrinter->registerInputType( DateTimeTzInput::class );
		$formPrinter->registerInputType( DateOnlyInput::class );
		$formPrinter->registerInputType( TimeOnlyInput::class );
	}

	/**
	 * Expose the user's preferred IANA timezone to JS via mw.config so the
	 * widget can pre-select it on fresh forms.
	 *
	 * Gated to PageForms' rendering specials so this doesn't run a user-prefs
	 * lookup on every MW page view. Inline-form articles (#forminput etc.)
	 * navigate to Special:FormEdit before any widget renders, so we still
	 * cover that path.
	 */
	public static function onBeforePageDisplay( OutputPage $out, Skin $skin ): void {
		$title = $out->getTitle();
		if ( $title === null
			|| ( !$title->isSpecial( 'FormEdit' ) && !$title->isSpecial( 'RunQuery' ) )
		) {
			return;
		}
		$user = $out->getUser();
		if ( !$user->isRegistered() ) {
			return;
		}
		$pref = (string)MediaWikiServices::getInstance()
			->getUserOptionsLookup()
			->getOption( $user, 'timecorrection' );
		if ( $pref === '' ) {
			return;
		}
		$utc = new UserTimeCorrection( $pref );
		// Only ZoneInfo carries a real IANA name; Offset/System resolve to a
		// numeric DateTimeZone that the widget can't use for DST-aware display.
		if ( $utc->getCorrectionType() !== UserTimeCorrection::ZONEINFO ) {
			return;
		}
		$tz = $utc->getTimeZone();
		if ( $tz !== null ) {
			$out->addJsConfigVars( 'wgLabkiPageFormsInputsUserTz', $tz->getName() );
		}
	}
}
