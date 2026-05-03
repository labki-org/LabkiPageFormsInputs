<?php
/**
 * @license GPL-2.0-or-later
 */

namespace Labki\PageFormsInputs\Tests\Inputs;

use Labki\PageFormsInputs\Inputs\DateTimeTzInput;
use MediaWikiIntegrationTestCase;

/**
 * @covers \Labki\PageFormsInputs\Inputs\DateTimeTzInput
 */
class DateTimeTzInputTest extends MediaWikiIntegrationTestCase {

	/** @covers \Labki\PageFormsInputs\Inputs\DateTimeTzInput::getName */
	public function testGetNameIsStableIdentifier(): void {
		$this->assertSame( 'datetime-tz', DateTimeTzInput::getName() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DateTimeTzInput::getDefaultPropTypes */
	public function testIsOptInOnly(): void {
		// We do NOT claim to be the default for any datatype — installing
		// this extension must not silently override PageForms' built-in
		// datepicker. Users opt in via has_input_type=datetime-tz.
		$this->assertSame( [], DateTimeTzInput::getDefaultPropTypes() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DateTimeTzInput::getOtherPropTypesHandled */
	public function testHandlesSmwDateProperty(): void {
		$this->assertContains( '_dat', DateTimeTzInput::getOtherPropTypesHandled() );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DateTimeTzInput::getHtmlText */
	public function testHtmlEmitsHiddenInputAndDataPfTargets(): void {
		$input = new DateTimeTzInput( 0, '', 'My_field', false, [] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'type="hidden"', $html );
		$this->assertStringContainsString( 'name="My_field"', $html );
		$this->assertStringContainsString( 'data-pf-target="date"', $html );
		$this->assertStringContainsString( 'data-pf-target="time"', $html );
		$this->assertStringContainsString( 'data-pf-target="tz"', $html );
		$this->assertStringContainsString( 'labki-pf-input-datetime-tz', $html );
	}

	/** @covers \Labki\PageFormsInputs\Inputs\DateTimeTzInput::getHtmlText */
	public function testInitialValueSurfacedToWidgetViaDataAttr(): void {
		$input = new DateTimeTzInput( 0, '2026-09-12T14:30:00-07:00', 'My_field', false, [] );
		$html = $input->getHtmlText();
		$this->assertStringContainsString( 'data-pf-initial="2026-09-12T14:30:00-07:00"', $html );
	}
}
