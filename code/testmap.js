// testmap.js
// Copyright (c) 2008 Michael Geary
// http://mg.to/
// Free Beer and Free Speech License (any OSI license)
// http://freebeerfreespeech.org/

// Outer wrapper function
(function( $ ) {

var states = PolyMap.states;
var polyTimer;

function S() {
	return Array.prototype.join.call( arguments, '' );
}

function htmlEscape( str ) {
	var div = document.createElement( 'div' );
	div.appendChild( document.createTextNode( str ) );
	return div.innerHTML;
}

function optionHTML( value, name, selected, disabled ) {
	var id = value ? 'id="option-' + value + '" ' : '';
	var style = disabled ? 'color:#AAA; font-style:italic; font-weight:bold;' : '';
	selected = selected ? 'selected="selected" ' : '';
	disabled = disabled ? 'disabled="disabled" ' : '';
	return S(
		'<option ', id, 'value="', value, '" style="', style, '" ', selected, disabled, '>',
			name,
		'</option>'
	);
}

(function() {
	var index = 0;
	function option( value, name, selected, disabled ) {
		var html = optionHTML( value, name, selected, disabled );
		++index;
		return html;
	}
	function stateOption( state, selected ) {
		state.selectorIndex = index;
		return option( state.abbr, state.name, selected );
	}
	
	stateSelector = function() {
		return S(
			'<select id="stateSelector">',
				option( 'us', '50 States, DC, and Puerto Rico', true ),
				option( 'congressional', 'All US Congressional Districts' ),
				option( 'county', 'All 3199 Counties (slow in IE!)' ),
				states.map( function( state ) {
					return stateOption( state, false );
				}).join(''),
			'</select>'
		);
	}
})();

function load() {
	var state, region, frameStart;
	
	var pm = new PolyMap({
		container: $('#testmap')[0],
		shapes: '../shapes/json/',
		events: {
			load: function( region_ ) {
				region = region_;
				colorize( region );
			},
			drew: function() {
				var counts = region.places.polygonzo.counts;
				log( counts.places, 'places,', counts.shapes, 'shapes,', counts.points, 'points' );
				if( $('#chkAnimate').attr('checked') ) {
					clearTimeout( polyTimer );
					polyTimer = setTimeout( function() {
						log.reset();
						colorize( region );
						pm.redraw();
						var time = +new Date;
						if( frameStart )
							log( 'Frame time ' + ( ( time - frameStart ) / 1000 ).toFixed(3) + ' seconds' );
						frameStart = time;
					}, 25 );
				}
			},
			over: function( place ) {
				$('#status').html( placename(place) );
			},
			click: function( place ) {
				alert( 'Clicked ' + placename(place) );
			}
		}
	});
	
	$('#stateSelector')
		.change( stateSelectorChange )
		.keyup( stateSelectorChange )
		[0].selectedIndex = 0;
	
	$('#chkAnimate').click( function() {
		if( this.checked ) {
			pm.redraw();
		}
		else {
			clearTimeout( polyTimer );
			polyTimer = null;
		}
	});
	
	//$('#chkSubpixel').click( function() {
	//	pm.redraw();
	//});
	
	loadState( 'us' );
	
	function colorize( region ) {
		// Test with random colors
		( region.places || [region] ).forEach( function( place ) {
			//place.fillColor = '#FFFFFF';
			//place.fillOpacity = 0;
			place.fillColor = '#' + Math.random().toString(16).slice(2,8);
			place.fillOpacity = Math.random() * .5 + .1;
			place.strokeColor = '#000000';
			place.strokeOpacity = 0.2;
			place.strokeWidth = 1.5;
		});
	}
	
	function placename( place ) {
		if( ! place ) return 'nowhere';
		var state = PolyMap.stateByAbbr(place.state).name;
		switch( place.type ) {
			case 'cd': return state + ( place.name == 'One' ? ' (one district)' : ' District ' + place.name );
			case 'county': return place.name + ' County, ' + state;
		}
		return state;
	}
	
	function stateSelectorChange() {
		loadState( this.value.replace('!','').toLowerCase() );
	}
	
	function loadState( value ) {
		if( value == state ) return;
		state = value;
		pm.load({ region:state });
	}
}

$(window).bind( 'load', load );

})( jQuery );
// end outer wrapper function
