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
use MediaWiki\Config\Config;
use MediaWiki\MainConfigNames;
use MediaWiki\MediaWikiServices;
use MediaWiki\User\UserOptionsLookup;
use MediaWiki\User\UserTimeCorrection;
use OutputPage;
use PFFormPrinter;
use Skin;
use User;

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

		$services = MediaWikiServices::getInstance();
		$user = $out->getUser();
		$vars = self::buildJsVars(
			$services->getMainConfig(),
			$services->getUserOptionsLookup(),
			$user->isRegistered() ? $user : null
		);
		$out->addJsConfigVars( $vars );
	}

	/**
	 * Build the mw.config var bag for the widget. Pure function of its inputs
	 * so it can be unit-tested without an OutputPage.
	 *
	 * @internal Public for testability only; do not call from outside the extension.
	 * @param Config $config
	 * @param UserOptionsLookup $lookup
	 * @param User|null $user Registered user, or null for anon/no preference plumbing
	 * @return array<string,mixed>
	 */
	public static function buildJsVars(
		Config $config,
		UserOptionsLookup $lookup,
		?User $user
	): array {
		$vars = [
			'wgLabkiPageFormsInputsTime24h' => (bool)$config->get( 'LabkiPageFormsInputsTime24h' ),
			'wgLabkiPageFormsInputsFirstDayOfWeek' => self::clampDayOfWeek(
				$config->get( 'LabkiPageFormsInputsFirstDayOfWeek' )
			),
			// Plumbing $wgLocaltimezone lets the dropdown's "Wiki local" entry
			// resolve to a real IANA zone — without it, picked values would
			// serialize without an offset and silently mean UTC to SMW.
			'wgLabkiPageFormsInputsWikiTz' => (string)$config->get( MainConfigNames::Localtimezone ),
		];

		$shortlist = self::normalizeShortlist( $config->get( 'LabkiPageFormsInputsTzShortlist' ) );
		if ( $shortlist !== null ) {
			$vars['wgLabkiPageFormsInputsTzShortlist'] = $shortlist;
		}

		$defaultTz = (string)$config->get( 'LabkiPageFormsInputsDefaultTz' );
		if ( $defaultTz !== '' ) {
			$vars['wgLabkiPageFormsInputsDefaultTz'] = $defaultTz;
		}

		if ( $user !== null ) {
			$userTz = self::resolveUserTz( $lookup, $user );
			if ( $userTz !== null ) {
				$vars['wgLabkiPageFormsInputsUserTz'] = $userTz;
			}
		}

		return $vars;
	}

	/**
	 * Resolve a user's `timecorrection` preference to an IANA name.
	 * Returns null unless the preference is ZoneInfo — Offset/System resolve
	 * to numeric DateTimeZones that the widget can't use DST-awarely.
	 */
	private static function resolveUserTz( UserOptionsLookup $lookup, User $user ): ?string {
		$pref = (string)$lookup->getOption( $user, 'timecorrection' );
		if ( $pref === '' ) {
			return null;
		}
		$utc = new UserTimeCorrection( $pref );
		if ( $utc->getCorrectionType() !== UserTimeCorrection::ZONEINFO ) {
			return null;
		}
		$tz = $utc->getTimeZone();
		return $tz !== null ? $tz->getName() : null;
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
