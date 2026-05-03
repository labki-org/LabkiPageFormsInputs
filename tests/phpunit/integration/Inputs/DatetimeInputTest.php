<?php
/**
 * @license GPL-2.0-or-later
 */

namespace Labki\PageFormsInputs\Tests\Inputs;

use Labki\PageFormsInputs\Inputs\DatetimeInput;
use MediaWikiIntegrationTestCase;

/**
 * @covers \Labki\PageFormsInputs\Inputs\DatetimeInput
 */
class DatetimeInputTest extends MediaWikiIntegrationTestCase {

	/** @covers \Labki\PageFormsInputs\Inputs\DatetimeInput::getName */
	public function testGetNameIsStableIdentifier(): void {
		$this->assertSame( 'labki-datetime', DatetimeInput::getName() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DatetimeInput::getDefaultPropTypes */
	public function testIsOptInOnly(): void {
		// We do NOT claim to be the default for any datatype — installing
		// this extension must not silently override PageForms' built-in
		// datepicker. Users opt in via has_input_type=labki-datetime.
		$this->assertSame( [], DatetimeInput::getDefaultPropTypes() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DatetimeInput::getOtherPropTypesHandled */
	public function testHandlesSmwDateProperty(): void {
		$this->assertContains( '_dat', DatetimeInput::getOtherPropTypesHandled() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DatetimeInput::getHtmlText */
	public function testHtmlEmitsHiddenInputAndDataPfTargets(): void {
		$input = new DatetimeInput( 0, '', 'My_field', false, [] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'type="hidden"', $html );
		$this->assertStringContainsString( 'name="My_field"', $html );
		$this->assertStringContainsString( 'data-pf-target="date"', $html );
		$this->assertStringContainsString( 'data-pf-target="time"', $html );
		$this->assertStringContainsString( 'data-pf-target="tz"', $html );
		$this->assertStringContainsString( 'labki-pf-input-datetime', $html );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DatetimeInput::getHtmlText */
	public function testInitialValueSurfacedToWidgetViaDataAttr(): void {
		$input = new DatetimeInput( 0, '2026-09-12T14:30:00-07:00', 'My_field', false, [] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'data-pf-initial="2026-09-12T14:30:00-07:00"', $html );
	}
}
