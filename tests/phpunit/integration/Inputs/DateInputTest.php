<?php
/**
 * @license GPL-2.0-or-later
 */

namespace Labki\PageFormsInputs\Tests\Inputs;

use Labki\PageFormsInputs\Inputs\DateInput;
use MediaWikiIntegrationTestCase;

/**
 * @covers \Labki\PageFormsInputs\Inputs\DateInput
 */
class DateInputTest extends MediaWikiIntegrationTestCase {

	/** @covers \Labki\PageFormsInputs\Inputs\DateInput::getName */
	public function testGetNameIsStableIdentifier(): void {
		$this->assertSame( 'labki-date', DateInput::getName() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DateInput::getDefaultPropTypes */
	public function testIsOptInOnly(): void {
		$this->assertSame( [], DateInput::getDefaultPropTypes() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DateInput::getOtherPropTypesHandled */
	public function testHandlesSmwDateProperty(): void {
		$this->assertContains( '_dat', DateInput::getOtherPropTypesHandled() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DateInput::getHtmlText */
	public function testHtmlEmitsHiddenInputAndDateTarget(): void {
		$input = new DateInput( 0, '', 'My_field', false, [] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'type="hidden"', $html );
		$this->assertStringContainsString( 'name="My_field"', $html );
		$this->assertStringContainsString( 'data-pf-target="date"', $html );
		$this->assertStringContainsString( 'labki-pf-input-date', $html );
		$this->assertStringNotContainsString( 'data-pf-target="time"', $html );
		$this->assertStringNotContainsString( 'data-pf-target="tz"', $html );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DateInput::getHtmlText */
	public function testInitialValueRoundTripsThroughDataAttr(): void {
		$input = new DateInput( 0, '2026-09-12', 'My_field', false, [] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'data-pf-initial="2026-09-12"', $html );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\AbstractDateTimeInput::getParameters */
	public function testCustomPlaceholderHonored(): void {
		$input = new DateInput( 0, '', 'My_field', false, [ 'placeholder' => 'Pick a day' ] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'placeholder="Pick a day"', $html );
	}
}
