<?php
/**
 * LabkiPageFormsInputs hook handlers.
 *
 * @file
 * @license GPL-2.0-or-later
 */

namespace Labki\PageFormsInputs;

use Labki\PageFormsInputs\Inputs\DateInput;
use Labki\PageFormsInputs\Inputs\DatetimeInput;
use Labki\PageFormsInputs\Inputs\TimeInput;
use MediaWiki\MediaWikiServices;
use MediaWiki\User\UserTimeCorrection;
use OutputPage;
use PFFormPrinter;
use Skin;

class Hooks {

	public static function onPageFormsFormPrinterSetup( PFFormPrinter $formPrinter ): void {
		$formPrinter->registerInputType( DatetimeInput::class );
		$formPrinter->registerInputType( DateInput::class );
		$formPrinter->registerInputType( TimeInput::class );
	}

	/**
	 * Expose the user's TZ preference and per-wiki widget knobs to JS via
	 * mw.config. Gated to PageForms' rendering specials so this doesn't run
	 * a user-prefs lookup on every MW page view.
	 */
	public static function onBeforePageDisplay( OutputPage $out, Skin $skin ): void {
		$title = $out->getTitle();
		if ( $title === null
			|| ( !$title->isSpecial( 'FormEdit' ) && !$title->isSpecial( 'RunQuery' ) )
		) {
			return;
		}

		$config = MediaWikiServices::getInstance()->getMainConfig();
		$vars = [
			'wgLabkiPageFormsInputsTime24h' => (bool)$config->get( 'LabkiPageFormsInputsTime24h' ),
			'wgLabkiPageFormsInputsFirstDayOfWeek' => self::clampDayOfWeek(
				$config->get( 'LabkiPageFormsInputsFirstDayOfWeek' )
			),
		];

		$shortlist = self::normalizeShortlist( $config->get( 'LabkiPageFormsInputsTzShortlist' ) );
		if ( $shortlist !== null ) {
			$vars['wgLabkiPageFormsInputsTzShortlist'] = $shortlist;
		}

		$defaultTz = (string)$config->get( 'LabkiPageFormsInputsDefaultTz' );
		if ( $defaultTz !== '' ) {
			$vars['wgLabkiPageFormsInputsDefaultTz'] = $defaultTz;
		}

		$user = $out->getUser();
		if ( $user->isRegistered() ) {
			$pref = (string)MediaWikiServices::getInstance()
				->getUserOptionsLookup()
				->getOption( $user, 'timecorrection' );
			if ( $pref !== '' ) {
				$utc = new UserTimeCorrection( $pref );
				// Only ZoneInfo carries a real IANA name; Offset/System resolve
				// to a numeric DateTimeZone the widget can't use DST-awarely.
				if ( $utc->getCorrectionType() === UserTimeCorrection::ZONEINFO ) {
					$tz = $utc->getTimeZone();
					if ( $tz !== null ) {
						$vars['wgLabkiPageFormsInputsUserTz'] = $tz->getName();
					}
				}
			}
		}

		$out->addJsConfigVars( $vars );
	}

	/**
	 * Convert the LocalSettings-friendly `[ IANA => label ]` form into the
	 * JS-friendly `[ { id, label } ]` ordered list. Returns null when the
	 * config is unset or unusable, so the JS falls back to its default
	 * shortlist.
	 *
	 * @param mixed $raw
	 * @return array|null
	 */
	private static function normalizeShortlist( $raw ): ?array {
		if ( !is_array( $raw ) || $raw === [] ) {
			return null;
		}
		$out = [];
		foreach ( $raw as $id => $label ) {
			$out[] = [ 'id' => (string)$id, 'label' => (string)$label ];
		}
		return $out;
	}

	private static function clampDayOfWeek( $raw ): int {
		$n = (int)$raw;
		if ( $n < 0 || $n > 6 ) {
			return 1;
		}
		return $n;
	}
}
