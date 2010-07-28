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
		
		var box = a.container, geo = a.geo, features = geo.features, canvas, ctx, tracker, zoom, offset;
		
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
				
				eachPoly( geo, features, zoom, offset, function( offsetX, offsetY, feature, poly, coords, nCoords, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth ) {
					var c = ctx;
					c.beginPath();
					
					var coord = coords[0];
					c.moveTo( ~~( coord[0] + offsetX ) + .5, ~~( coord[1] + offsetY ) + .5 );
					
					for( var iCoord = 0, coord;  coord = coords[++iCoord]; ) {
						c.lineTo( ~~( coord[0] + offsetX ) + .5, ~~( coord[1] + offsetY ) + .5 );
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
				eachPoly( geo, features, zoom, offset, function( offsetX, offsetY, feature, poly, coords, nCoords, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth ) {
					
					vml[iVml++] = '<pgz_vml_:shape style="position:absolute;width:10px;height:10px;" coordorigin="';
					vml[iVml++] = -~~( offsetX * 10 - .5 );
					vml[iVml++] = ' ';
					vml[iVml++] = -~~( offsetY * 10 - .5 );
					vml[iVml++] = '" coordsize="100 100" path=" m ';
					
					for( var iCoord = -1, coord;  coord = coords[++iCoord]; ) {
						vml[iVml++] = ~~( coord[0] * 10 );
						vml[iVml++] = ',';
						vml[iVml++] = ~~( coord[1] * 10);
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
		
/*	Untested and out of date
		this.latLngToPixel = function( lat, lng, zoom, offset ) {
			debugger;
			var point = [lng,lat];
			offset = offset || { x:0, y:0 };
			var poly = { points: [ [lng,lat] ] };
			var feature = { polys: [ poly ] };
			eachPoly( [ feature ], zoom, offset, function() {} );
			var coord = poly.coords[zoom][0];
			return { x: ~~coord[0], y: ~~coord[1] };
		};
*/
		
		function onetime() {
			PolyGonzo.msie = !! document.namespaces;
			if( PolyGonzo.msie  &&  ! document.namespaces.pgz_vml_ ) {
				document.namespaces.add( 'pgz_vml_', 'urn:schemas-microsoft-com:vml', '#default#VML' );
				document.createStyleSheet().cssText = 'pgz_vml_\\:*{behavior:url(#default#VML)}';
			}
		}
		
		function eachPoly( geo, features, zoom, offset, callback ) {
			var pi = Math.PI, log = Math.log, sin = Math.sin,
				big = 1 << 28,
				big180 = big / 180,
				pi180 = pi / 180,
				radius = big / pi,
				oldZoom = Infinity;
			
			var totalPolys = 0, totalPoints = 0;
			var nPlaces = features.length;
			
			for( var iFeature = -1, feature;  feature = features[++iFeature]; ) {
				var polys = feature.geometry.coordinates, nPolys = polys.length;
				totalPolys += nPolys;
				
				var featureZoom = feature.zoom != null ? feature.zoom : zoom;
				if( featureZoom != oldZoom ) {
					oldZoom = featureZoom;
					var
						divisor = Math.pow( 2, 21 - featureZoom ),
						multX = big180 / divisor,
						multY = -radius / divisor / 2;
				}
				
				var featureOffset = feature.offset || offset,
					offsetX = featureOffset.x,
					offsetY  = featureOffset.y;
				
				var
					fillColor = feature.fillColor,
					fillOpacity = feature.fillOpacity,
					strokeColor = feature.strokeColor,
					strokeOpacity = feature.strokeOpacity,
					strokeWidth = feature.strokeWidth;
				
				for( var iPoly = -1, poly;  poly = polys[++iPoly]; ) {
					var points = poly[0], nPoints = points.length;
					totalPoints += nPoints;
					var coords = ( poly.coords = poly.coords || [] )[zoom];
					if( ! coords ) {
						coords = poly.coords[zoom] = new Array( nPoints );
						for( var iPoint = -1, point;  point = points[++iPoint]; ) {
							var s = sin( point[1] * pi180 );
							coords[iPoint] = [
								multX * point[0],
								multY * log( (1+s)/(1-s) )
							];
						}
					}
					callback( offsetX, offsetY, feature, poly, coords, nPoints, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth );
				}
			}
			
			geo.polygonzo = {
				counts: { features: nPlaces, polys: totalPolys, points: totalPoints }
			};
		}
		
		function wireEvent( name ) {
			tracker[ 'on' + name ] = function( e ) {
				e = e || window.event;
				canvasOffset = canvasOffset || $canvas.offset();
				var x = e.clientX - canvasOffset.left, y = e.clientY - canvasOffset.top;
				if( ! hitWhere  ||  ! contains( hitWhere.poly, x - hitOffset.x, y - hitOffset.y, hitZoom ) )
					hitWhere = hittest( x, y );
				a.events[name]( e, hitWhere );
			};
		}
		
		function hittest( x, y ) {
			for( var iFeature = -1, feature;  feature = features[++iFeature]; ) {
				hitZoom = feature.zoom != null ? feature.zoom : zoom;
				hitOffset = feature.offset || offset;
				var featureX = x - hitOffset.x, featureY = y - hitOffset.y
				var polys = feature.geometry.coordinates;
				for( var iPoly = -1, poly;  poly = polys[++iPoly]; )
					if( contains( poly, featureX, featureY, hitZoom ) ) {
						return { /*parent:entity,*/ feature:feature, poly:poly };
					}
			}
			return null;
		}
		
		function contains( poly, x, y, zoom ) {
			var coords = poly.coords[zoom];
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
				geo: a.geo,
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
