<?php
/**
 * @license GPL-2.0-or-later
 */

namespace Labki\PageFormsInputs\Tests\Inputs;

use Labki\PageFormsInputs\Inputs\TimeOnlyInput;
use MediaWikiIntegrationTestCase;

/**
 * @covers \Labki\PageFormsInputs\Inputs\TimeOnlyInput
 */
class TimeOnlyInputTest extends MediaWikiIntegrationTestCase {

	/** @covers \Labki\PageFormsInputs\Inputs\TimeOnlyInput::getName */
	public function testGetNameIsStableIdentifier(): void {
		$this->assertSame( 'time-only', TimeOnlyInput::getName() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\TimeOnlyInput::getOtherPropTypesHandled */
	public function testHandlesSmwTextProperty(): void {
		// Time-only is stored as Text because SMW Date can't hold a bare HH:MM.
		$this->assertContains( '_txt', TimeOnlyInput::getOtherPropTypesHandled() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\TimeOnlyInput::getHtmlText */
	public function testHtmlEmitsTimeAndTzTargetsAndHiddenInput(): void {
		$input = new TimeOnlyInput( 0, '', 'My_field', false, [] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'data-pf-target="time"', $html );
		$this->assertStringContainsString( 'data-pf-target="tz"', $html );
		$this->assertStringContainsString( 'type="hidden"', $html );
		$this->assertStringContainsString( 'name="My_field"', $html );
		$this->assertStringContainsString( 'labki-pf-input-time-only', $html );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\TimeOnlyInput::getHtmlText */
	public function testInitialValueRoundTripsThroughDataAttr(): void {
		$input = new TimeOnlyInput( 0, '14:30 America/Los_Angeles', 'My_field', false, [] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'data-pf-initial="14:30 America/Los_Angeles"', $html );
	}
}
