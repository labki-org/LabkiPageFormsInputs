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

/**
 * Hand-rolled DOM stub. Supports the subset our widget JS uses:
 *
 *   matches: `.cls` and `[attr="value"]`
 *   closest: walks up `.parent` chain
 *   querySelector(All): recursive tree walk using matches()
 *   appendChild: sets child.parent and pushes to children[]
 *   dataset: Proxy backed by attrs[ "data-foo" ]
 *   getAttribute / setAttribute / hasAttribute
 *   addEventListener / dispatchEvent: list-based, ignores capture/options
 *
 * Deliberately not using JSDOM — the repo has no node_modules and we want
 * to keep CI dependency-free. Trade-off: must hand-roll any new DOM API
 * the widgets start using.
 */
function makeNode( opts ) {
	opts = opts || {};
	const attrs = Object.assign( {}, opts.attrs || {} );
	const node = {
		tagName: ( opts.tagName || 'div' ).toUpperCase(),
		classList: new Set( opts.classes || [] ),
		children: [],
		parent: null,
		value: opts.value !== undefined ? opts.value : '',
		_attrs: attrs,
		_listeners: {}
	};
	function camelToKebab( s ) {
		return s.replace( /([A-Z])/g, '-$1' ).toLowerCase();
	}
	function matchesSelector( n, sel ) {
		let m = sel.match( /^\.([\w-]+)$/ );
		if ( m ) {
			return n.classList && n.classList.has( m[ 1 ] );
		}
		m = sel.match( /^\[([\w-]+)="([^"]*)"\]$/ );
		if ( m ) {
			return n._attrs && n._attrs[ m[ 1 ] ] === m[ 2 ];
		}
		return false;
	}
	Object.defineProperty( node, 'dataset', {
		get: () => new Proxy( {}, {
			get( _, p ) {
				return attrs[ 'data-' + camelToKebab( p ) ];
			},
			set( _, p, v ) {
				attrs[ 'data-' + camelToKebab( p ) ] = String( v );
				return true;
			}
		} )
	} );
	node.getAttribute = ( n ) => ( attrs[ n ] !== undefined ? attrs[ n ] : null );
	node.setAttribute = ( n, v ) => {
		attrs[ n ] = String( v );
	};
	node.hasAttribute = ( n ) => attrs[ n ] !== undefined;
	node.matches = ( sel ) => matchesSelector( node, sel );
	node.closest = ( sel ) => {
		let cur = node;
		while ( cur ) {
			if ( cur.matches && cur.matches( sel ) ) {
				return cur;
			}
			cur = cur.parent;
		}
		return null;
	};
	node.querySelectorAll = ( sel ) => {
		const out = [];
		( function walk( n ) {
			n.children.forEach( ( c ) => {
				if ( c.matches && c.matches( sel ) ) {
					out.push( c );
				}
				walk( c );
			} );
		}( node ) );
		return out;
	};
	node.querySelector = ( sel ) => {
		const all = node.querySelectorAll( sel );
		return all.length > 0 ? all[ 0 ] : null;
	};
	node.appendChild = ( c ) => {
		c.parent = node;
		node.children.push( c );
		return c;
	};
	node.addEventListener = ( type, fn ) => {
		( node._listeners[ type ] = node._listeners[ type ] || [] ).push( fn );
	};
	node.dispatchEvent = ( ev ) => {
		( node._listeners[ ev.type ] || [] ).forEach( ( fn ) => fn( ev ) );
		return true;
	};
	return node;
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

// initAll — multi-instance / subobject support. Uses the module-level
// makeNode DOM stub plus hook/dom-ready stubs (avoids a JSDOM dependency).
( function () {
	const SELECTOR = '.labki-pf-input-datetime';
	const WRAPPER_CLASS = 'labki-pf-input-datetime';

	const hooks = {};
	const fakeMw = {
		labki: {},
		config: { get: () => null },
		hook: ( name ) => ( {
			add: ( fn ) => {
				hooks[ name ] = hooks[ name ] || [];
				hooks[ name ].push( fn );
			},
			fire: ( arg ) => ( hooks[ name ] || [] ).forEach( ( fn ) => fn( arg ) )
		} )
	};
	let domReadyFn = null;
	const fake$ = function ( arg ) {
		if ( typeof arg === 'function' ) {
			domReadyFn = arg;
			return;
		}
		// Treat `arg` as an array-like; provide .each().
		const list = Array.isArray( arg ) ? arg : [ arg ];
		return {
			each: function ( fn ) {
				list.forEach( ( item, i ) => fn.call( item, i, item ) );
			}
		};
	};

	const sandbox = { mw: fakeMw, $: fake$, document: makeNode( {} ) };
	vm.createContext( sandbox );
	vm.runInContext( fs.readFileSync( SHARED, 'utf8' ), sandbox, { filename: SHARED } );

	// Build a DOM:
	//   document
	//   ├─ .multipleTemplateStarter
	//   │   └─ wrapper#starter   (matches selector — must be skipped)
	//   └─ .multipleTemplateInstance
	//       └─ wrapper#existing  (matches — must init on DOM-ready)
	const initialized = [];
	const starterParent = makeNode( { classes: [ 'multipleTemplateStarter' ] } );
	const starterWrap = makeNode( { classes: [ WRAPPER_CLASS ] } );
	starterWrap.id = 'starter';
	starterParent.appendChild( starterWrap );

	const instanceParent = makeNode( { classes: [ 'multipleTemplateInstance' ] } );
	const existingWrap = makeNode( { classes: [ WRAPPER_CLASS ] } );
	existingWrap.id = 'existing';
	instanceParent.appendChild( existingWrap );

	sandbox.document.appendChild( starterParent );
	sandbox.document.appendChild( instanceParent );

	sandbox.mw.labki.pfInputs.initAll( SELECTOR, ( el ) => initialized.push( el.id ) );

	// Trigger DOM-ready and existing-content hook.
	if ( domReadyFn ) {
		domReadyFn();
	}
	check( 'initAll: skips wrappers inside .multipleTemplateStarter on DOM-ready',
		initialized.includes( 'starter' ), false );
	check( 'initAll: inits existing wrappers on DOM-ready',
		initialized.includes( 'existing' ), true );

	// Simulate "Add another" click — PF clones the starter into a new instance.
	const newInstance = makeNode( { classes: [ 'multipleTemplateInstance' ] } );
	const clonedWrap = makeNode( { classes: [ WRAPPER_CLASS ] } );
	clonedWrap.id = 'cloned';
	newInstance.appendChild( clonedWrap );
	// PF appends to the form *before* firing the hook.
	sandbox.document.appendChild( newInstance );

	fakeMw.hook( 'pf.addTemplateInstance' ).fire( fake$( newInstance ) );
	check( 'initAll: pf.addTemplateInstance triggers init on cloned wrapper',
		initialized.includes( 'cloned' ), true );

	// Re-firing must not double-init (idempotency relies on caller's guard,
	// but initAll itself shouldn't re-walk the same node multiple times when
	// the user holds Ctrl-clicks Add another, etc.). Sanity-check the order
	// stays stable.
	const before = initialized.length;
	fakeMw.hook( 'pf.addTemplateInstance' ).fire( fake$( newInstance ) );
	check( 'initAll: re-firing pf.addTemplateInstance calls initFn again ' +
		'(caller is responsible for idempotency)',
		initialized.length, before + 1 );
}() );

// Full widget pipeline — loads ext.labki.date.js into a stub-DOM sandbox
// and drives it through the multi-instance lifecycle to lock in the user-
// reported regressions:
//
//   (a) hidden cloning template (.multipleTemplateStarter) must NOT be
//       initialized — otherwise the cloned row inherits a dead listener
//       set;
//   (b) existing pre-rendered instances must be initialized on DOM-ready
//       and have their hidden submit input seeded by sync();
//   (c) clones added via "Add another" (mw.hook( 'pf.addTemplateInstance' ))
//       must be initialized;
//   (d) typing into the cloned input must update the hidden input PageForms
//       actually submits — this is the silent-data-loss path the user hit.
//
// Tests the bare-input branch (window.flatpickr is left undefined). The
// flatpickr branch is library code we don't own; integration testing it
// would need a real browser. The bare-input branch is what powers manual
// typing, which was the third symptom and the most important one.
( function () {
	const DATE_JS = path.join( ROOT, 'resources/modules/ext.labki.date.js' );
	const SELECTOR = '.labki-pf-input-date';
	const WRAPPER_CLASS = 'labki-pf-input-date';

	const hooks = {};
	const fakeMw = {
		labki: {},
		config: { get: () => null },
		hook: ( name ) => ( {
			add: ( fn ) => {
				( hooks[ name ] = hooks[ name ] || [] ).push( fn );
			},
			fire: ( arg ) => ( hooks[ name ] || [] ).forEach( ( fn ) => fn( arg ) )
		} )
	};
	let domReadyFn = null;
	const fake$ = function ( arg ) {
		if ( typeof arg === 'function' ) {
			domReadyFn = arg;
			return;
		}
		const list = Array.isArray( arg ) ? arg : [ arg ];
		return {
			each: function ( fn ) {
				list.forEach( ( item, i ) => fn.call( item, i, item ) );
			}
		};
	};

	// Minimal window stub: widget code probes `typeof window.flatpickr` to
	// pick the bare-input branch, and shared.js's bfcache helper at the
	// bottom registers a `pageshow` listener via `window.addEventListener`.
	// Leaving flatpickr undefined keeps us on the bare-input path (which is
	// the path that handles manual typing — the third reported symptom).
	const fakeWindow = {
		flatpickr: undefined,
		addEventListener: () => {}
	};
	const sandbox = {
		mw: fakeMw,
		$: fake$,
		window: fakeWindow,
		document: makeNode( {} )
	};
	vm.createContext( sandbox );
	vm.runInContext( fs.readFileSync( SHARED, 'utf8' ), sandbox, { filename: SHARED } );
	vm.runInContext( fs.readFileSync( TZDATA, 'utf8' ), sandbox, { filename: TZDATA } );
	vm.runInContext( fs.readFileSync( DATE_JS, 'utf8' ), sandbox, { filename: DATE_JS } );

	function buildWrapper( id, initial ) {
		const wrap = makeNode( {
			classes: [ WRAPPER_CLASS ],
			attrs: initial !== undefined ? { 'data-pf-initial': initial } : {}
		} );
		wrap.id = id;
		wrap.appendChild( makeNode( {
			tagName: 'input',
			attrs: { 'data-pf-target': 'date' }
		} ) );
		wrap.appendChild( makeNode( {
			tagName: 'input',
			classes: [ 'labki-pf-input-value' ]
		} ) );
		return wrap;
	}

	const starter = makeNode( { classes: [ 'multipleTemplateStarter' ] } );
	starter.appendChild( buildWrapper( 'starter' ) );

	const existing = makeNode( { classes: [ 'multipleTemplateInstance' ] } );
	existing.appendChild( buildWrapper( 'existing', '2026-01-15' ) );

	sandbox.document.appendChild( starter );
	sandbox.document.appendChild( existing );

	// Trigger DOM-ready: initAll registered the handler when date.js loaded.
	if ( domReadyFn ) {
		domReadyFn();
	}

	const starterWrap = starter.children[ 0 ];
	const existingWrap = existing.children[ 0 ];

	// (a) Starter must not be initialized.
	check( 'date pipeline: starter wrapper NOT initialized on DOM-ready',
		starterWrap.dataset.labkiInit, undefined );
	const starterHidden = starterWrap.querySelector( '.labki-pf-input-value' );
	check( 'date pipeline: starter\'s hidden input untouched',
		starterHidden.value, '' );

	// (b) Existing instance is initialized and its hidden field seeded.
	check( 'date pipeline: existing instance IS initialized on DOM-ready',
		existingWrap.dataset.labkiInit, '1' );
	const existingHidden = existingWrap.querySelector( '.labki-pf-input-value' );
	check( 'date pipeline: existing instance hidden input seeded from data-pf-initial',
		existingHidden.value, '2026-01-15' );

	// (c) "Add another" — PF clones the starter into a fresh instance,
	// rewrites IDs/names, then fires pf.addTemplateInstance($newDiv).
	const newInstance = makeNode( { classes: [ 'multipleTemplateInstance' ] } );
	newInstance.appendChild( buildWrapper( 'cloned' ) );
	sandbox.document.appendChild( newInstance );

	fakeMw.hook( 'pf.addTemplateInstance' ).fire( fake$( newInstance ) );

	const clonedWrap = newInstance.children[ 0 ];
	check( 'date pipeline: cloned wrapper IS initialized after pf.addTemplateInstance',
		clonedWrap.dataset.labkiInit, '1' );

	// (d) The silent-data-loss path: typing into the cloned input must
	// update the hidden field PageForms submits. Pre-fix, this assertion
	// would have failed because the change/input listeners that drive
	// sync() were never attached on the clone.
	const clonedDateInput = clonedWrap.querySelector( '[data-pf-target="date"]' );
	const clonedHidden = clonedWrap.querySelector( '.labki-pf-input-value' );
	check( 'date pipeline: cloned hidden input starts empty (no data-pf-initial)',
		clonedHidden.value, '' );

	clonedDateInput.value = '2026-07-01';
	clonedDateInput.dispatchEvent( { type: 'change' } );
	check( 'date pipeline: typing on cloned input syncs through to hidden field',
		clonedHidden.value, '2026-07-01' );

	// `input` event path (e.g., autofill, IME composition end) — same wiring.
	clonedDateInput.value = '2026-08-15';
	clonedDateInput.dispatchEvent( { type: 'input' } );
	check( 'date pipeline: \'input\' event also syncs through',
		clonedHidden.value, '2026-08-15' );

	// Idempotency: re-firing pf.addTemplateInstance on the same node must
	// not double-attach listeners (would otherwise be a memory leak per
	// "Add another" click). Verified by counting listener invocations: a
	// single dispatch of 'change' should write once. The widget's per-
	// wrapper guard (data-labki-init) handles this; we just smoke-test it
	// here so a future refactor that drops the guard would fail loudly.
	fakeMw.hook( 'pf.addTemplateInstance' ).fire( fake$( newInstance ) );
	const listenerCount = clonedDateInput._listeners.change.length;
	check( 'date pipeline: re-fire does NOT double-attach \'change\' listener',
		listenerCount, 1 );
}() );

console.log( '' );
console.log( pass + ' passed, ' + fail + ' failed' );
process.exit( fail ? 1 : 0 );
