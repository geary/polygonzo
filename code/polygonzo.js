// polygonzo.js
// Copyright (c) 2008 Ernest Delgado and Michael Geary
// http://ernestdelgado.com/
// http://mg.to/
// Free Beer and Free Speech License (any OSI license)
// http://freebeerfreespeech.org/

PolyGonzo = {
	
	// PolyGonzo.Frame() - Canvas/VML frame
	Frame: function( a ) {
		
		if( ! PolyGonzo.onetime ) {
			onetime();
			PolyGonzo.onetime = true;
		}
		
		var box = a.container, places = a.places, canvas, ctx, tracker, zoom, offset;
		
		if( PolyGonzo.msie ) {
			canvas = document.createElement( 'div' );
			tracker = document.createElement( 'div' );
			canvas.appendChild( tracker );
			tracker.zoom = 1;
			tracker.style.zIndex = '1';
			tracker.style.position = 'absolute';
			tracker.style.left = '0px';
			tracker.style.top = '0px';
			tracker.style.width = '100%';
			tracker.style.height = '100%';
			tracker.style.filter = 'alpha(opacity=0)';
			tracker.style.backgroundColor = '#FFFFFF';
		}
		else {
			canvas = tracker = document.createElement( 'canvas' );
			ctx = this.ctx = canvas.getContext('2d');
		}
		
		this.canvas = canvas;
		canvas.style.position = 'absolute';
		canvas.style.left = '0px';
		canvas.style.top = '0px';
		canvas.style.width = box.offsetWidth + 'px';
		canvas.style.height = box.offsetHeight + 'px';
		canvas.width = box.offsetWidth;
		canvas.height = box.offsetHeight;
		box.appendChild( canvas );
		
		// Temp jQuery dependency
		var $canvas = $(canvas);
		var canvasOffset;
		var hitWhere, hitZoom, hitOffset;
		
		for( var name in ( a.events || {} ) )
			wireEvent( name );
		
		this.draw = function( b ) {
			canvasOffset = hitWhere = null;
			zoom = b.zoom;
			offset = b.offset;
			
			if( ctx ) {
				ctx.clearRect( 0, 0, canvas.width, canvas.height );
				
				eachShape( places, zoom, offset, function( offsetX, offsetY, place, shape, coords, nCoords, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth, round ) {
					var c = ctx;
					c.beginPath();
					
					var coord = coords[0];
					c.moveTo( round( coord[0] + offsetX ) + .5, round( coord[1] + offsetY ) + .5 );
					
					for( var iCoord = 0, coord;  coord = coords[++iCoord]; ) {
						c.lineTo( round( coord[0] + offsetX ) + .5, round( coord[1] + offsetY ) + .5 );
					}
					c.closePath();
					
					c.globalAlpha = strokeOpacity;
					c.strokeStyle = strokeColor;
					c.lineWidth = '' + strokeWidth;
					c.stroke();
					
					c.globalAlpha = fillOpacity;
					c.fillStyle = fillColor;
					c.fill();
				});
			}
			else {
				tracker.nextSibling && canvas.removeChild( tracker.nextSibling );
				
				var vml = [], iVml = 0;
				eachShape( places, zoom, offset, function( offsetX, offsetY, place, shape, coords, nCoords, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth, round ) {
					
					vml[iVml++] = '<pgz_vml_:shape style="position:absolute;width:10;height:10;" coordorigin="';
					vml[iVml++] = -round( offsetX * 10 );
					vml[iVml++] = ' ';
					vml[iVml++] = -round( offsetY * 10 );
					vml[iVml++] = '" coordsize="100 100" path=" m ';
					
					for( var iCoord = -1, coord;  coord = coords[++iCoord]; ) {
						vml[iVml++] = round( coord[0] * 10 );
						vml[iVml++] = ',';
						vml[iVml++] = round( coord[1] * 10 );
						vml[iVml++] = ' l ';
					}
					
					iVml--;  // remove last ' l '
					
					vml[iVml++] = ' x "><pgz_vml_:stroke color="';
					vml[iVml++] = strokeColor;
					vml[iVml++] = '" opacity="';
					vml[iVml++] = strokeOpacity;
					vml[iVml++] = '" joinstyle="miter" miterlimit="10" endcap="flat" weight="';
					vml[iVml++] = strokeWidth;
					vml[iVml++] = 'px" /><pgz_vml_:fill color="';
					vml[iVml++] = fillColor;
					vml[iVml++] = '" opacity="';
					vml[iVml++] = fillOpacity;
					vml[iVml++] = '" /></pgz_vml_:shape>';
				});
				vml = vml.join('');
				//log( 'joined VML' );
				
				//log( htmlEscape( vml.join('') ) );
				var el = canvas.ownerDocument.createElement( 'div' );
				el.style.width =  canvas.clientWidth + 'px';
				el.style.height = canvas.clientHeight + 'px';
				el.style.overflow = 'hidden';
				el.style.position = 'absolute';
				canvas.appendChild( el );
				el.insertAdjacentHTML( "beforeEnd", '<div>' + vml/*.join('')*/ + '</div>' );
				//log( 'inserted VML' );
			}
		};
		
		this.remove = function() {
			a.container.removeChild( canvas );
		};
		
		this.latLngToPixel = function( lat, lng, zoom, offset ) {
			var point = [lng,lat];
			offset = offset || { x:0, y:0 };
			var shape = { points: [ [lng,lat] ] };
			var place = { shapes: [ shape ] };
			eachShape( [ place ], zoom, offset || { x:0, y:0 }, function() {} );
			var coord = shape.coords[zoom][0];
			return { x: Math.round(coord[0]), y: Math.round(coord[1]) };
		};
		
		function onetime() {
			PolyGonzo.msie = !! document.namespaces;
			if( PolyGonzo.msie  &&  ! document.namespaces.pgz_vml_ ) {
				document.namespaces.add( 'pgz_vml_', 'urn:schemas-microsoft-com:vml' );
				document.createStyleSheet().cssText = 'pgz_vml_\\:*{behavior:url(#default#VML)}';
			}
		}
		
		function eachShape( places, zoom, offset, callback ) {
			var pi = Math.PI, log = Math.log, round = Math.round, sin = Math.sin,
				big = 1 << 28,
				big180 = big / 180,
				pi180 = pi / 180,
				radius = big / pi,
				oldZoom = Infinity;
			
			var totalShapes = 0, totalPoints = 0;
			var nPlaces = places.length;
			
			for( var iPlace = -1, place;  place = places[++iPlace]; ) {
				var shapes = place.shapes, nShapes = shapes.length;
				totalShapes += nShapes;
				
				var placeZoom = place.zoom != null ? place.zoom : zoom;
				if( placeZoom != oldZoom ) {
					oldZoom = placeZoom;
					var
						divisor = Math.pow( 2, 21 - placeZoom ),
						multX = big180 / divisor,
						multY = -radius / divisor / 2;
				}
				
				var placeOffset = place.offset || offset,
					offsetX = placeOffset.x,
					offsetY  = placeOffset.y;
				
				var
					fillColor = place.fillColor,
					fillOpacity = place.fillOpacity,
					strokeColor = place.strokeColor,
					strokeOpacity = place.strokeOpacity,
					strokeWidth = place.strokeWidth;
				
				for( var iShape = -1, shape;  shape = shapes[++iShape]; ) {
					var points = shape.points, nPoints = points.length;
					totalPoints += nPoints;
					var coords = ( shape.coords = shape.coords || [] )[zoom];
					if( ! coords ) {
						coords = shape.coords[zoom] = new Array( nPoints );
						for( var iPoint = -1, point;  point = points[++iPoint]; ) {
							var s = sin( point[1] * pi180 );
							coords[iPoint] = [
								multX * point[0],
								multY * log( (1+s)/(1-s) )
							];
						}
					}
					callback( offsetX, offsetY, place, shape, coords, nPoints, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth, round );
				}
			}
			
			places.polygonzo = {
				counts: { places: nPlaces, shapes: totalShapes, points: totalPoints }
			};
		}
		
		function wireEvent( name ) {
			tracker[ 'on' + name ] = function( e ) {
				e = e || window.event;
				canvasOffset = canvasOffset || $canvas.offset();
				var x = e.clientX - canvasOffset.left, y = e.clientY - canvasOffset.top;
				if( ! hitWhere  ||  ! contains( hitWhere.shape, x - hitOffset.x, y - hitOffset.y, hitZoom ) )
					hitWhere = hittest( x, y );
				a.events[name]( e, hitWhere );
			};
		}
		
		function hittest( x, y ) {
			var places = a.places;
			for( var iPlace = -1, place;  place = places[++iPlace]; ) {
				hitZoom = place.zoom != null ? place.zoom : zoom;
				hitOffset = place.offset || offset;
				var placeX = x - hitOffset.x, placeY = y - hitOffset.y
				var shapes = place.shapes;
				for( var iShape = -1, shape;  shape = shapes[++iShape]; )
					if( contains( shape, placeX, placeY, hitZoom ) ) {
						return { /*parent:entity,*/ place:place, shape:shape };
					}
			}
			return null;
		}
		
		function contains( shape, x, y, zoom ) {
			var coords = shape.coords[zoom];
			if( ! coords ) return false;
			var inside = false;
			var n = coords.length;
			var v = coords[n-1], x1 = v[0], y1 = v[1];
		
			for( var i = 0;  i < n;  ++i ) {
				var v = coords[i], x2 = v[0], y2 = v[1];
				
				if( ( y1 < y  &&  y2 >= y ) || ( y2 < y  &&  y1 >= y ) )
					if ( x1 + ( y - y1 ) / ( y2 - y1 ) * ( x2 - x1 ) < x )
						inside = ! inside;
				
				x1 = x2, y1 = y2;
			}
			return inside;
		}
	},
	
	// PolyGonzo.GOverlay() - Google Maps JavaScript API overlay
	GOverlay: function( a ) {
		var map, pane, frame, canvas, moveListener;
		
		var pg = new GOverlay;
		
		function redraw() {
			pg.redraw( null, true );
		}
		
		pg.initialize = function( map_ ) {
			map = map_;
			moveListener = GEvent.addListener( map, 'moveend', function() { pg.redraw( null, true ); } );
			pane = map.getPane( G_MAP_MAP_PANE );
			frame = new PolyGonzo.Frame({
				container: pane,
				//group: a.group,
				places: a.places,
				events: a.events
			});
			canvas = frame.canvas;
		};
		
		pg.remove = function() {
			GEvent.removeListener( moveListener );
			frame.remove();
		};
		
		pg.redraw = function( force1, force2 ) {
			if( !( force1 || force2 ) ) return;
			
			var mapSize = map.getSize();
			var zoom = map.getZoom();
			var margin = { x: mapSize.width / 3, y: mapSize.height / 3 };
			var canvasSize = { width: mapSize.width + margin.x * 2, height: mapSize.height + margin.y * 2 };
			
			var offset = {
				x: canvas.offsetParent.offsetParent.offsetLeft,
				y: canvas.offsetParent.offsetParent.offsetTop
			};
			
			canvas.width = canvasSize.width;
			canvas.height = canvasSize.height;
			
			canvas.style.width = canvasSize.width + 'px';
			canvas.style.height = canvasSize.height + 'px';	
			
			canvas.style.left = ( - offset.x - margin.x ) + 'px';
			canvas.style.top = ( - offset.y - margin.y ) + 'px';
			
			var zero = map.fromLatLngToDivPixel( new GLatLng(0,0) );
			offset.x += margin.x + zero.x;
			offset.y += margin.y + zero.y;
			var zoom = map.getZoom();
			
			frame.draw({
				offset: offset,
				zoom: zoom
			});
		};
		
		return pg;
	}
};
