<?php
/**
 * @license GPL-2.0-or-later
 */

namespace Labki\PageFormsInputs\Tests;

use Labki\PageFormsInputs\Hooks;
use MediaWiki\Config\HashConfig;
use MediaWiki\MainConfigNames;
use MediaWiki\User\Options\StaticUserOptionsLookup;
use MediaWiki\User\UserOptionsLookup;
use MediaWikiIntegrationTestCase;
use User;

/**
 * @covers \Labki\PageFormsInputs\Hooks
 */
class HooksTest extends MediaWikiIntegrationTestCase {

	private function makeConfig( array $overrides = [] ): HashConfig {
		return new HashConfig( $overrides + [
			'LabkiPageFormsInputsTime24h' => true,
			'LabkiPageFormsInputsFirstDayOfWeek' => 1,
			'LabkiPageFormsInputsTzShortlist' => null,
			'LabkiPageFormsInputsDefaultTz' => '',
			MainConfigNames::Localtimezone => 'UTC',
		] );
	}

	private function makeLookup( string $timecorrection ): UserOptionsLookup {
		// Defaults are merged in for any user (incl. mocks without isRegistered),
		// so we don't need to set up a userMap or name the User mock.
		return new StaticUserOptionsLookup( [], [ 'timecorrection' => $timecorrection ] );
	}

	public function testWikiTzAlwaysPlumbedFromLocaltimezone(): void {
		$config = $this->makeConfig( [ MainConfigNames::Localtimezone => 'America/Los_Angeles' ] );
		$vars = Hooks::buildJsVars( $config, $this->makeLookup( '' ), null );
		$this->assertSame( 'America/Los_Angeles', $vars['wgLabkiPageFormsInputsWikiTz'] );
	}

	public function testWikiTzDefaultsToUtcWhenLocaltimezoneIsBlank(): void {
		// HashConfig with explicit empty string; (string) cast yields ''.
		$config = $this->makeConfig( [ MainConfigNames::Localtimezone => '' ] );
		$vars = Hooks::buildJsVars( $config, $this->makeLookup( '' ), null );
		$this->assertSame( '', $vars['wgLabkiPageFormsInputsWikiTz'] );
	}

	public function testAnonUserHasNoUserTz(): void {
		$config = $this->makeConfig();
		$vars = Hooks::buildJsVars( $config, $this->makeLookup( 'ZoneInfo|0|UTC' ), null );
		$this->assertArrayNotHasKey( 'wgLabkiPageFormsInputsUserTz', $vars );
	}

	public function testUserTzPlumbedForZoneInfoPreference(): void {
		$user = $this->createMock( User::class );
		$config = $this->makeConfig();
		$vars = Hooks::buildJsVars(
			$config,
			$this->makeLookup( 'ZoneInfo|-420|America/Los_Angeles' ),
			$user
		);
		$this->assertSame( 'America/Los_Angeles', $vars['wgLabkiPageFormsInputsUserTz'] );
	}

	public function testUserTzNotPlumbedForOffsetPreference(): void {
		$user = $this->createMock( User::class );
		$config = $this->makeConfig();
		// Offset|-420 (numeric only) — DST-ambiguous, shouldn't be exposed.
		$vars = Hooks::buildJsVars( $config, $this->makeLookup( 'Offset|-420' ), $user );
		$this->assertArrayNotHasKey( 'wgLabkiPageFormsInputsUserTz', $vars );
	}

	public function testUserTzNotPlumbedWhenPreferenceUnset(): void {
		$user = $this->createMock( User::class );
		$config = $this->makeConfig();
		$vars = Hooks::buildJsVars( $config, $this->makeLookup( '' ), $user );
		$this->assertArrayNotHasKey( 'wgLabkiPageFormsInputsUserTz', $vars );
	}

	public function testTime24hAndFirstDayOfWeekDefaults(): void {
		$config = $this->makeConfig();
		$vars = Hooks::buildJsVars( $config, $this->makeLookup( '' ), null );
		$this->assertTrue( $vars['wgLabkiPageFormsInputsTime24h'] );
		$this->assertSame( 1, $vars['wgLabkiPageFormsInputsFirstDayOfWeek'] );
	}

	public function testFirstDayOfWeekClampedToValidRange(): void {
		$config = $this->makeConfig( [ 'LabkiPageFormsInputsFirstDayOfWeek' => 99 ] );
		$vars = Hooks::buildJsVars( $config, $this->makeLookup( '' ), null );
		$this->assertSame( 1, $vars['wgLabkiPageFormsInputsFirstDayOfWeek'] );
	}

	public function testDefaultTzOmittedWhenBlank(): void {
		$config = $this->makeConfig();
		$vars = Hooks::buildJsVars( $config, $this->makeLookup( '' ), null );
		$this->assertArrayNotHasKey( 'wgLabkiPageFormsInputsDefaultTz', $vars );
	}

	public function testDefaultTzPlumbedWhenSet(): void {
		$config = $this->makeConfig( [ 'LabkiPageFormsInputsDefaultTz' => 'Europe/Madrid' ] );
		$vars = Hooks::buildJsVars( $config, $this->makeLookup( '' ), null );
		$this->assertSame( 'Europe/Madrid', $vars['wgLabkiPageFormsInputsDefaultTz'] );
	}

	public function testShortlistNormalizedToObjectArray(): void {
		$config = $this->makeConfig( [ 'LabkiPageFormsInputsTzShortlist' => [
			'UTC' => 'UTC',
			'America/Los_Angeles' => 'LA',
		] ] );
		$vars = Hooks::buildJsVars( $config, $this->makeLookup( '' ), null );
		$this->assertSame(
			[
				[ 'id' => 'UTC', 'label' => 'UTC' ],
				[ 'id' => 'America/Los_Angeles', 'label' => 'LA' ],
			],
			$vars['wgLabkiPageFormsInputsTzShortlist']
		);
	}
}
