<?php
// Shared base settings for the LabkiPageFormsInputs dev wiki.
//
// SMW + PageForms must be loaded BEFORE the SMW store is initialized, so
// these go in the "common" file that the entrypoint sources before
// setupStore.php. Anything that depends on the store (including our own
// extension) belongs in LocalSettings.test.php instead.

wfLoadExtension( 'SemanticMediaWiki' );
enableSemantics( 'localhost' );
wfLoadExtension( 'PageForms' );
wfLoadExtension( 'ParserFunctions' );

$smwgChangePropagationProtection = false;
$smwgEnabledDeferredUpdate = false;
$smwgAutoSetupStore = false;
$smwgQMaxInlineLimit = 500;

$wgPageFormsAllowCreateInRestrictedNamespaces = true;
$wgPageFormsLinkAllRedLinksToForms = true;
$wgPageFormsFormCacheType = CACHE_NONE;
$wgNamespacesWithSemanticLinks[NS_CATEGORY] = true;

$wgShowExceptionDetails = true;
