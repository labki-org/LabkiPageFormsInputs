<?php
/**
 * @license GPL-2.0-or-later
 */

namespace Labki\PageFormsInputs\Tests\Inputs;

use Labki\PageFormsInputs\Inputs\TimeInput;
use MediaWikiIntegrationTestCase;

/**
 * @covers \Labki\PageFormsInputs\Inputs\TimeInput
 */
class TimeInputTest extends MediaWikiIntegrationTestCase {

	/** @covers \Labki\PageFormsInputs\Inputs\TimeInput::getName */
	public function testGetNameIsStableIdentifier(): void {
		$this->assertSame( 'labki-time', TimeInput::getName() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\TimeInput::getOtherPropTypesHandled */
	public function testHandlesSmwTextProperty(): void {
		// labki-time is stored as Text because SMW Date can't hold a bare HH:MM.
		$this->assertContains( '_txt', TimeInput::getOtherPropTypesHandled() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\TimeInput::getHtmlText */
	public function testHtmlEmitsTimeAndTzTargetsAndHiddenInput(): void {
		$input = new TimeInput( 0, '', 'My_field', false, [] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'data-pf-target="time"', $html );
		$this->assertStringContainsString( 'data-pf-target="tz"', $html );
		$this->assertStringContainsString( 'type="hidden"', $html );
		$this->assertStringContainsString( 'name="My_field"', $html );
		$this->assertStringContainsString( 'labki-pf-input-time', $html );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\TimeInput::getHtmlText */
	public function testInitialValueRoundTripsThroughDataAttr(): void {
		$input = new TimeInput( 0, '14:30 America/Los_Angeles', 'My_field', false, [] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'data-pf-initial="14:30 America/Los_Angeles"', $html );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\AbstractDateTimeInput::getParameters */
	public function testCustomPlaceholderHonored(): void {
		$input = new TimeInput( 0, '', 'My_field', false, [ 'placeholder' => 'Pick a moment' ] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'placeholder="Pick a moment"', $html );
	}
}
