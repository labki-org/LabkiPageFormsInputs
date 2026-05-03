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

const sandbox = { mw: { labki: {} } };
vm.createContext( sandbox );
vm.runInContext( fs.readFileSync( SHARED, 'utf8' ), sandbox, { filename: SHARED } );

const {
	parseValue,
	serializeValue,
	offsetFor,
	parseTimeOnly,
	serializeTimeOnly
} = sandbox.mw.labki.pfInputs;

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

console.log( '' );
console.log( pass + ' passed, ' + fail + ' failed' );
process.exit( fail ? 1 : 0 );
