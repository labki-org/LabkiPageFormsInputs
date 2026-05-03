<?php
// Server config (matches docker-compose port mapping)
$wgServer = 'http://localhost:8890';

// LabkiPageFormsInputs — load after SMW store has been set up, the way a
// real admin would install our extension into an existing wiki.
wfLoadExtension( 'LabkiPageFormsInputs', '/mw-user-extensions/LabkiPageFormsInputs/extension.json' );

// Verifies SemanticSchemas integration on the dev wiki when SemanticSchemas
// is also installed alongside this extension. Disabled by default — flip on
// when you want to E2E the cross-extension config.
// wfLoadExtension( 'SemanticSchemas' );
// $wgSemanticSchemasDatatypeInputOverrides = [ 'Date' => 'labki-datetime' ];

// Debugging
$wgDebugLogGroups['labkipageformsinputs'] = '/var/log/mediawiki/labki-pf-inputs.log';
$wgDebugLogFile = '/var/log/mediawiki/debug.log';

// Cache
$wgCacheDirectory = "$IP/cache-labki-pf-inputs";

// Skin
wfLoadSkin( 'Vector' );
$wgDefaultSkin = 'vector';
