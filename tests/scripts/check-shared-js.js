#!/usr/bin/env node
/*
 * Standalone sanity check for the shared serializer/parser/offsetFor.
 * No wiki, no PHPUnit — just `node tests/scripts/check-shared-js.js`.
 */
'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const vm = require( 'vm' );

const ROOT = path.resolve( __dirname, '../..' );
const SHARED = path.join( ROOT, 'resources/modules/ext.labki.shared.js' );
const TZDATA = path.join( ROOT, 'resources/modules/ext.labki.tzData.js' );

// Build a sandbox with a minimal mw.config implementation so shared.js's
// getConfig() and tzData.js's resolveShortlist() can read mock values.
function makeSandbox( configValues ) {
	const cfg = configValues || {};
	const sandbox = {
		mw: {
			labki: {},
			config: {
				get: ( name ) => ( name in cfg ? cfg[ name ] : null )
			}
		}
	};
	vm.createContext( sandbox );
	vm.runInContext( fs.readFileSync( SHARED, 'utf8' ), sandbox, { filename: SHARED } );
	vm.runInContext( fs.readFileSync( TZDATA, 'utf8' ), sandbox, { filename: TZDATA } );
	return sandbox;
}

const baseSandbox = makeSandbox();
const {
	parseValue,
	serializeValue,
	offsetFor,
	parseTimeOnly,
	serializeTimeOnly,
	resolveIanaFromOffset,
	tzFallback
} = baseSandbox.mw.labki.pfInputs;

let pass = 0;
let fail = 0;

function check( label, got, want ) {
	const ok = JSON.stringify( got ) === JSON.stringify( want );
	console.log( ( ok ? 'PASS' : 'FAIL' ) + ' ' + label );
	if ( !ok ) {
		console.log( '  got : ' + JSON.stringify( got ) );
		console.log( '  want: ' + JSON.stringify( want ) );
	}
	ok ? pass++ : fail++;
}

// parseValue — round-trip from stored wikitext into widget state
check(
	'parse date-only',
	parseValue( '2026-09-12' ),
	{ date: '2026-09-12', time: '', tz: '', offset: '' }
);
check(
	'parse date+time, no tz',
	parseValue( '2026-09-12T14:30' ),
	{ date: '2026-09-12', time: '14:30', tz: '', offset: '' }
);
check(
	'parse date+time+offset',
	parseValue( '2026-09-12T14:30:00-07:00' ),
	{ date: '2026-09-12', time: '14:30', tz: '', offset: '-07:00' }
);
check(
	'parse Z (UTC)',
	parseValue( '2026-09-12T14:30:00Z' ),
	{ date: '2026-09-12', time: '14:30', tz: '', offset: '+00:00' }
);
check( 'parse empty', parseValue( '' ), { date: '', time: '', tz: '', offset: '' } );
check(
	'parse PF datepicker YYYY/MM/DD',
	parseValue( '2026/05/14' ),
	{ date: '2026-05-14', time: '', tz: '', offset: '' }
);
check(
	'parse rejects unknown format',
	parseValue( 'May 14, 2026' ),
	{ date: '', time: '', tz: '', offset: '' }
);

// serializeValue
check( 'serialize date-only', serializeValue( { date: '2026-09-12' } ), '2026-09-12' );
check(
	'serialize date+time, no tz',
	serializeValue( { date: '2026-09-12', time: '14:30' } ),
	'2026-09-12T14:30'
);
check(
	'serialize LA Sep (PDT)',
	serializeValue( { date: '2026-09-12', time: '14:30', tz: 'America/Los_Angeles' } ),
	'2026-09-12T14:30:00-07:00'
);
check(
	'serialize LA Dec (PST)',
	serializeValue( { date: '2026-12-12', time: '14:30', tz: 'America/Los_Angeles' } ),
	'2026-12-12T14:30:00-08:00'
);
check(
	'serialize Madrid Sep (CEST)',
	serializeValue( { date: '2026-09-12', time: '14:30', tz: 'Europe/Madrid' } ),
	'2026-09-12T14:30:00+02:00'
);
check(
	'serialize UTC',
	serializeValue( { date: '2026-09-12', time: '14:30', tz: 'UTC' } ),
	'2026-09-12T14:30:00+00:00'
);

// Offset round-trip: parsing a stored fixed-offset value and re-serializing
// without picking an IANA zone must preserve the original offset (otherwise
// editing-and-saving silently rewrites the data).
check(
	'serialize preserves offset when no tz',
	serializeValue( { date: '2026-09-12', time: '14:30', offset: '-07:00' } ),
	'2026-09-12T14:30:00-07:00'
);
check(
	'serialize: tz wins over offset',
	serializeValue( { date: '2026-09-12', time: '14:30', tz: 'UTC', offset: '-07:00' } ),
	'2026-09-12T14:30:00+00:00'
);
const parsed = parseValue( '2026-09-12T14:30:00-07:00' );
check(
	'parse → serialize round-trip with offset',
	serializeValue( parsed ),
	'2026-09-12T14:30:00-07:00'
);

// offsetFor — DST-aware
check( 'offsetFor LA Sep', offsetFor( 'America/Los_Angeles', '2026-09-12' ), '-07:00' );
check( 'offsetFor LA Dec', offsetFor( 'America/Los_Angeles', '2026-12-12' ), '-08:00' );
check( 'offsetFor UTC', offsetFor( 'UTC', '2026-09-12' ), '+00:00' );
check( 'offsetFor unknown zone', offsetFor( 'Mars/Olympus', '2026-09-12' ), '' );

// time-only parse/serialize — separate Text-storage helpers
check( 'parseTimeOnly empty', parseTimeOnly( '' ), { time: '', tz: '' } );
check( 'parseTimeOnly bare', parseTimeOnly( '14:30' ), { time: '14:30', tz: '' } );
check( 'parseTimeOnly with tz', parseTimeOnly( '14:30 America/Los_Angeles' ), { time: '14:30', tz: 'America/Los_Angeles' } );
check( 'parseTimeOnly garbage', parseTimeOnly( 'not a time' ), { time: '', tz: '' } );

check( 'serializeTimeOnly empty', serializeTimeOnly( {} ), '' );
check( 'serializeTimeOnly bare', serializeTimeOnly( { time: '14:30' } ), '14:30' );
check( 'serializeTimeOnly with tz', serializeTimeOnly( { time: '14:30', tz: 'Europe/Madrid' } ), '14:30 Europe/Madrid' );
check( 'serializeTimeOnly tz without time', serializeTimeOnly( { tz: 'Europe/Madrid' } ), '' );

// tzFallback — per-wiki fallback chain (no state.tz layered on top here)
check(
	'tzFallback prefers userTz',
	tzFallback( { userTz: 'Europe/Madrid', defaultTz: 'America/Los_Angeles', wikiTz: 'UTC' } ),
	'Europe/Madrid'
);
check(
	'tzFallback falls back to defaultTz',
	tzFallback( { userTz: '', defaultTz: 'America/Los_Angeles', wikiTz: 'UTC' } ),
	'America/Los_Angeles'
);
check(
	'tzFallback falls back to wikiTz',
	tzFallback( { userTz: '', defaultTz: '', wikiTz: 'America/New_York' } ),
	'America/New_York'
);
check(
	'tzFallback falls back to UTC',
	tzFallback( { userTz: '', defaultTz: '', wikiTz: '' } ),
	'UTC'
);

// resolveIanaFromOffset — best-effort recovery of stored IANA from offset
check(
	'resolveIanaFromOffset matches first candidate',
	resolveIanaFromOffset( '-07:00', '2026-09-12', [ 'America/Los_Angeles', 'UTC' ] ),
	'America/Los_Angeles'
);
check(
	'resolveIanaFromOffset DST-aware (Dec PST)',
	resolveIanaFromOffset( '-08:00', '2026-12-12', [ 'America/Los_Angeles' ] ),
	'America/Los_Angeles'
);
check(
	'resolveIanaFromOffset no match returns ""',
	resolveIanaFromOffset( '+05:30', '2026-09-12', [ 'America/Los_Angeles', 'UTC' ] ),
	''
);
check(
	'resolveIanaFromOffset skips falsy candidates',
	resolveIanaFromOffset( '+00:00', '2026-09-12', [ '', null, undefined, 'UTC' ] ),
	'UTC'
);
check(
	'resolveIanaFromOffset empty inputs',
	resolveIanaFromOffset( '', '2026-09-12', [ 'UTC' ] ),
	''
);
// Regression: edit-page round-trip when the saved zone (Pacific) is *not*
// in the user/default/wiki chain — the shortlist must be searched too,
// otherwise the dropdown silently snaps back to "Wiki local".
check(
	'resolveIanaFromOffset finds shortlist zone outside user/default/wiki',
	resolveIanaFromOffset(
		'-07:00',
		'2026-05-05',
		[ '', '', 'UTC',
			'UTC',
			'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York' ]
	),
	'America/Los_Angeles'
);
// Regression: saved zone (Asia/Kolkata, +05:30) is outside both the
// user/default/wiki chain *and* the SHORTLIST — must fall through to the
// full IANA list so the offset isn't lost on edit. The match might be a
// sibling alias (Calcutta vs Kolkata), so we just assert the recovered
// zone produces the right offset on the anchor date rather than pinning
// a specific name.
( function () {
	const recovered = resolveIanaFromOffset(
		'+05:30',
		'2026-05-05',
		[ '', '', 'UTC' ].concat( [
			'America/Los_Angeles', 'America/Denver', 'America/Chicago',
			'America/New_York', 'UTC', 'Europe/London', 'Europe/Madrid',
			'Europe/Berlin', 'Asia/Tokyo'
		] ).concat( [
			// stand-in for Intl.supportedValuesOf( 'timeZone' )
			'Asia/Calcutta', 'Asia/Kolkata', 'Asia/Colombo'
		] )
	);
	check(
		'resolveIanaFromOffset falls through to all-IANA tier',
		offsetFor( recovered, '2026-05-05' ),
		'+05:30'
	);
}() );

// getConfig — defaults applied when config keys absent
( function () {
	const cfg = makeSandbox( {} ).mw.labki.pfInputs.getConfig();
	check( 'getConfig defaults: time24h', cfg.time24h, true );
	check( 'getConfig defaults: firstDayOfWeek', cfg.firstDayOfWeek, 1 );
	check( 'getConfig defaults: defaultTz', cfg.defaultTz, '' );
	check( 'getConfig defaults: userTz', cfg.userTz, '' );
	check( 'getConfig defaults: wikiTz=UTC', cfg.wikiTz, 'UTC' );
}() );

// getConfig — values read from mw.config
( function () {
	const cfg = makeSandbox( {
		wgLabkiPageFormsInputsTime24h: false,
		wgLabkiPageFormsInputsFirstDayOfWeek: 0,
		wgLabkiPageFormsInputsDefaultTz: 'Europe/Madrid',
		wgLabkiPageFormsInputsUserTz: 'America/Los_Angeles',
		wgLabkiPageFormsInputsWikiTz: 'America/New_York'
	} ).mw.labki.pfInputs.getConfig();
	check( 'getConfig reads time24h', cfg.time24h, false );
	check( 'getConfig reads firstDayOfWeek', cfg.firstDayOfWeek, 0 );
	check( 'getConfig reads defaultTz', cfg.defaultTz, 'Europe/Madrid' );
	check( 'getConfig reads userTz', cfg.userTz, 'America/Los_Angeles' );
	check( 'getConfig reads wikiTz', cfg.wikiTz, 'America/New_York' );
}() );

// tzData — "Wiki local" entry rewritten to real wikiTz at load time
( function () {
	const tz = makeSandbox( { wgLabkiPageFormsInputsWikiTz: 'America/New_York' } )
		.mw.labki.pfInputs.tz;
	const wikiLocal = tz.SHORTLIST[ 0 ];
	check( 'shortlist[0].id rewritten to wikiTz', wikiLocal.id, 'America/New_York' );
	check(
		'shortlist[0].label includes wikiTz',
		wikiLocal.label.includes( 'America/New_York' ),
		true
	);
}() );

// tzData — wikiTz absent falls back to UTC
( function () {
	const tz = makeSandbox( {} ).mw.labki.pfInputs.tz;
	check( 'shortlist[0].id falls back to UTC', tz.SHORTLIST[ 0 ].id, 'UTC' );
}() );

// tzData — custom override with empty id is also rewritten
( function () {
	const tz = makeSandbox( {
		wgLabkiPageFormsInputsWikiTz: 'Europe/Berlin',
		wgLabkiPageFormsInputsTzShortlist: [
			{ id: '', label: 'Wiki local' },
			{ id: 'UTC', label: 'UTC' }
		]
	} ).mw.labki.pfInputs.tz;
	check( 'override empty-id rewritten', tz.SHORTLIST[ 0 ].id, 'Europe/Berlin' );
	check( 'override real-id passthrough', tz.SHORTLIST[ 1 ].id, 'UTC' );
}() );

console.log( '' );
console.log( pass + ' passed, ' + fail + ' failed' );
process.exit( fail ? 1 : 0 );
