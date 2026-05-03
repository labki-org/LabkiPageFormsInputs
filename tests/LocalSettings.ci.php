<?php
// CI test settings — loaded by the GitHub Actions integration job after
// install.php has generated LocalSettings.php and SMW's store has been set up.

require_once __DIR__ . '/LocalSettings.common.php';

wfLoadExtension( 'LabkiPageFormsInputs' );
