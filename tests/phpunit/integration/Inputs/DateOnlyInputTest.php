<?php
/**
 * @license GPL-2.0-or-later
 */

namespace Labki\PageFormsInputs\Tests\Inputs;

use Labki\PageFormsInputs\Inputs\DateOnlyInput;
use MediaWikiIntegrationTestCase;

/**
 * @covers \Labki\PageFormsInputs\Inputs\DateOnlyInput
 */
class DateOnlyInputTest extends MediaWikiIntegrationTestCase {

	/** @covers \Labki\PageFormsInputs\Inputs\DateOnlyInput::getName */
	public function testGetNameIsStableIdentifier(): void {
		$this->assertSame( 'date-only', DateOnlyInput::getName() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DateOnlyInput::getDefaultPropTypes */
	public function testIsOptInOnly(): void {
		$this->assertSame( [], DateOnlyInput::getDefaultPropTypes() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DateOnlyInput::getOtherPropTypesHandled */
	public function testHandlesSmwDateProperty(): void {
		$this->assertContains( '_dat', DateOnlyInput::getOtherPropTypesHandled() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DateOnlyInput::getHtmlText */
	public function testHtmlEmitsHiddenInputAndDateTarget(): void {
		$input = new DateOnlyInput( 0, '', 'My_field', false, [] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'type="hidden"', $html );
		$this->assertStringContainsString( 'name="My_field"', $html );
		$this->assertStringContainsString( 'data-pf-target="date"', $html );
		$this->assertStringContainsString( 'labki-pf-input-date-only', $html );
		$this->assertStringNotContainsString( 'data-pf-target="time"', $html );
		$this->assertStringNotContainsString( 'data-pf-target="tz"', $html );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DateOnlyInput::getHtmlText */
	public function testInitialValueRoundTripsThroughDataAttr(): void {
		$input = new DateOnlyInput( 0, '2026-09-12', 'My_field', false, [] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'data-pf-initial="2026-09-12"', $html );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\AbstractDateTimeInput::getParameters */
	public function testCustomPlaceholderHonored(): void {
		$input = new DateOnlyInput( 0, '', 'My_field', false, [ 'placeholder' => 'Pick a day' ] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'placeholder="Pick a day"', $html );
	}
}
