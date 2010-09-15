// polygonzo.js
// Copyright 2008-2010 Ernest Delgado and Michael Geary
// http://ernestdelgado.com/
// http://mg.to/
// Use under any OSI license: http://www.opensource.org/

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
			var v = coords[coords.length-1], x1 = v[0], y1 = v[1];
		
			for( var i = -1;  v = coords[++i]; ) {
				var x2 = v[0], y2 = v[1];
				
				if( ( y1 < y  &&  y2 >= y ) || ( y2 < y  &&  y1 >= y ) )
					if ( x1 + ( y - y1 ) / ( y2 - y1 ) * ( x2 - x1 ) < x )
						inside = ! inside;
				
				x1 = x2, y1 = y2;
			}
			return inside;
		}
	},
	
	// PolyGonzo.PgOverlay() - Google Maps JavaScript API V2/V3 overlay
	PgOverlay: function( a ) {
		var map = a.map, pane, frame, canvas, moveListener;
		
		var gm = google.maps;
		var v2 = ! gm.event;
		if( v2 ) {
			var gme = gm.Event, pg = new gm.Overlay;
			
			pg.initialize = function( map_ ) {
				map = map_;
				moveListener = gme.addListener( map, 'moveend', function() {
					pg.redraw( null, true );
				});
				init( map.getPane( G_MAP_MAP_PANE ) );
			};
			
			pg.remove = remove;
			
			pg.redraw = function( force1, force2 ) {
				var size = map.getSize();
				if( force1 || force2 ) draw( map, size.width, size.height );
			};
		}
		else {  // v3
			var gme = gm.event, pg = new gm.OverlayView;
			
			pg.onAdd = function() {
				moveListener = gme.addListener( map, 'center_changed', function() {
					if( ! map._PolyGonzo_fitting )
						pg.draw();
				});
				init( pg.getPanes().overlayLayer );
			};
			
			pg.onRemove = remove;
			
			pg.draw = function() {
				var div = map.getDiv();
				draw( pg.getProjection(), div.clientWidth, div.clientHeight );
			};
		};
		
		function init( pane ) {
			frame = new PolyGonzo.Frame({
				container: pane,
				//group: a.group,
				geo: a.geo,
				events: a.events
			});
			canvas = frame.canvas;
		}
		
		function remove() {
			gme.removeListener( moveListener );
			frame.remove();
		}
		
		function draw( converter, width, height ) {
			if( a.log ) {
				a.log.reset( true );
				a.log( 'Drawing...' );
			}
			
			var margin = { x: width / 3, y: height / 3 };
			var canvasSize = { width: width + margin.x * 2, height: height + margin.y * 2 };
			
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
			
			var zero = converter.fromLatLngToDivPixel(
				new gm.LatLng( 0, 0 )
			);
			offset.x += margin.x + zero.x;
			offset.y += margin.y + zero.y;
			
			frame.draw({
				offset: offset,
				zoom: map.getZoom()
			});
			
			if( a.log ) {
				var counts = a.geo.polygonzo.counts;
				a.log(
					counts.features, 'places,',
					counts.polys, 'polys,',
					counts.points, 'points'
				);
			}
		}
		
		return pg;
	}
};
