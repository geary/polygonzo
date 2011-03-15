// polygonzo.js
// By Ernest Delgado and Michael Geary
// http://ernestdelgado.com/
// http://mg.to/
// See UNLICENSE or http://unlicense.org/ for public domain notice

PolyGonzo = {
	
	// PolyGonzo.Frame() - Canvas/VML frame
	Frame: function( a ) {
		
		if( ! PolyGonzo.onetime ) {
			onetime();
			PolyGonzo.onetime = true;
		}
		
		var pane = a.container;
		var panes = a.panes || { overlayLayer:pane, overlayImage:pane, overlayMouseTarget:pane };
		
		var geo = a.geo, features = geo.features, canvas, ctx, tracker, markers, zoom, offset;
		
		if( PolyGonzo.useVML ) {
			canvas = document.createElement( 'div' );
		}
		else {
			canvas = document.createElement( 'canvas' );
			ctx = this.ctx = canvas.getContext('2d');
		}
		
		this.canvas = canvas;
		canvas.className = 'PolyGonzoCanvas';
		canvas.style.position = 'absolute';
		canvas.style.left = '0px';
		canvas.style.top = '0px';
		canvas.style.width = panes.overlayLayer.offsetWidth + 'px';
		canvas.style.height = panes.overlayLayer.offsetHeight + 'px';
		canvas.width = panes.overlayLayer.offsetWidth;
		canvas.height = panes.overlayLayer.offsetHeight;
		panes.overlayLayer.appendChild( canvas );
		
		function addDiv( className, pane ) {
			var div = document.createElement( 'div' );
			div.className = className;
			div.zoom = 1;
			div.style.position = 'absolute';
			div.style.left = '0px';
			div.style.top = '0px';
			div.style.width = '100%';
			div.style.height = '100%';
			pane.appendChild( div );
			return div;
		}
		
		markers = this.markers = addDiv( 'PolyGonzoMarkers', panes.overlayImage );
		tracker = this.tracker = addDiv( 'PolyGonzoTracker', panes.overlayMouseTarget );
		
		if( ! PolyGonzo.useVML ) {
			// Tracker needs a background color in IE9, doesn't hurt in
			// other browsers except when VML is used
			tracker.style.backgroundColor = 'white';
			tracker.style.opacity = 0;
		}
		
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
				if( canvas.firstChild ) canvas.removeChild( canvas.firstChild );
				
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
				el.className = 'PolyGonzoVmlOuter';
				el.style.width =  canvas.clientWidth + 'px';
				el.style.height = canvas.clientHeight + 'px';
				el.style.overflow = 'hidden';
				el.style.position = 'absolute';
				canvas.appendChild( el );
				el.insertAdjacentHTML( "beforeEnd", '<div class="PolyGonzoVmlInner">' + vml/*.join('')*/ + '</div>' );
				//log( 'inserted VML' );
			}
		};
		
		this.remove = function() {
			panes.overlayLayer.removeChild( canvas );
			panes.overlayImage.removeChild( markers );
			panes.overlayMouseTarget.removeChild( tracker );
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
			PolyGonzo.useVML = ! document.createElement( 'canvas' ).getContext;
			if( PolyGonzo.useVML  &&  ! document.namespaces.pgz_vml_ ) {
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
			var markHtml = [];
			
			for( var iFeature = -1, feature;  feature = features[++iFeature]; ) {
				var geometry = feature.geometry, type = geometry.type;
				var polys =
					type == 'Polygon' ? [ feature.geometry.coordinates ] :
					type == 'MultiPolygon' ? feature.geometry.coordinates :
					null;
				if( ! polys ) continue;
				var nPolys = polys.length;
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
				
				if( geo.markers && feature.marker ) {
					var marker = feature.marker, c = feature.properties.centroid;
					var centroid = ( feature.centroids = feature.centroids || [] )[zoom];
					if( ! centroid ) {
						var s = sin( c[1] * pi180 );
						centroid = feature.centroids[zoom] = [
							multX * c[0],
							multY * log( (1+s)/(1-s) )
						];
					}
					markHtml.push(
						'<div style="position:absolute; overflow:hidden; width:', marker.size.x,
								'px; height:', marker.size.y,
								'px; left:', centroid[0] - marker.anchor.x + offsetX,
								'px; top:', centroid[1] - marker.anchor.y + offsetY,
								'px;">',
							'<img src="', marker.url, '" style="width:', marker.size.x,
									'px; height:', marker.size.y,
									'px; border:none; position:absolute; left:0; top:0; margin:0; padding:0;" />',
						'</div>'
					);
				}
				
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
					if( coords.length > 2 ) {
						var first = coords[0], last = coords[coords.length-1];
						if( first[0] != last[0]  ||  first[1] != last[1] )
							coords.push( first );  // close polygon
						callback( offsetX, offsetY, feature, poly, coords, nPoints, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth );
					}
				}
			}
			
			// Add a dummy polygon at the end to fix missing final poly in IE8
			if( PolyGonzo.useVML )
				callback( offsetX, offsetY, {}, {}, [], 0, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth );
			
			markers.innerHTML =
				'<div class="PolyGonzoMarkerList">' + markHtml.join('') + '</div>';
			
			geo.polygonzo = {
				counts: { features: nPlaces, polys: totalPolys, points: totalPoints }
			};
		}
		
		function wireEvent( name ) {
			tracker[ 'on' + name ] = function( e ) {
				e = e || window.event;
				canvasOffset = canvasOffset || $canvas.offset();
				var x = -canvasOffset.left, y = -canvasOffset.top;
				if( e.pageX || e.pageY ) {
					x += e.pageX;
					y += e.pageY;
				}
				else {
					x += e.clientX +
						document.body.scrollLeft +
						document.documentElement.scrollLeft;
					y += e.clientY +
						document.body.scrollTop +
						document.documentElement.scrollTop;
				}
				if(
				   ! hitWhere  ||
				   ! contains( hitWhere.poly, x - hitOffset.x, y - hitOffset.y, hitZoom )
				)
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
		var map = a.map, pane, frame, canvas, markers, tracker, moveListener, zoomListener;
		
		var gm = google.maps;
		var v2 = ! gm.event;
		if( v2 ) {
			var gme = gm.Event, pg = new gm.Overlay;
			
			pg.initialize = function( map_ ) {
				map = map_;
				moveListener = gme.addListener( map, 'moveend', function() {
					pg.redraw( null, true );
				});
				var pane = map.getPane( G_MAP_MAP_PANE );
				init({
					overlayLayer: pane,
					overlayImage: pane,
					overlayMouseTarget: pane
				});
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
				function listener() {
					if( ! map._PolyGonzo_fitting )
						pg.onAddOneshot( pg.draw, 100 );
				}
				moveListener = gme.addListener( map, 'bounds_changed', listener );
				// TODO: This shouldn't be necessary - bounds_changed is
				// supposed to be sufficient. But it doesn't always redraw if
				//  you zoom without moving the map. The oneshot timer
				// shouldn't be needed either.
				zoomListener = gme.addListener( map, 'zoom_changed', listener );
				init( pg.getPanes() );
			};
			
			pg.onRemove = remove;
			
			pg.draw = function() {
				var div = map.getDiv();
				draw( pg.getProjection(), div.clientWidth, div.clientHeight );
			};
		};
		
		pg.onAddOneshot = Oneshot();
		
		function Oneshot() {
			var timer;
			return function( fun, time ) {
				clearTimeout( timer );
				timer = setTimeout( fun, time );
			};
		}
		
		function init( panes ) {
			frame = new PolyGonzo.Frame({
				panes: panes,
				//group: a.group,
				geo: a.geo,
				events: a.events
			});
			canvas = frame.canvas;
			markers = frame.markers;
			tracker = frame.tracker;
		}
		
		function remove() {
			gme.removeListener( moveListener );
			zoomListener && gme.removeListener( zoomListener );
			frame.remove();
		}
		
		function draw( converter, width, height ) {
			if( a.log ) {
				a.log.reset( true );
				a.log( 'Drawing...' );
			}
			
			var margin = { x: width / 3, y: height / 3 };
			var canvasSize = { width: width + margin.x * 2, height: height + margin.y * 2 };
			
			// Get the drawing offset from the grandparent element,
			// either from the -webkit-transform style or offsetLeft/Top.
			// TODO: Find a way to do this without using Maps API internals.
			var offsetter = canvas.offsetParent.offsetParent;
			var transform = offsetter.style['-webkit-transform'];
			var match = transform && transform.match(
				/translate\s*\(\s*(-?\d+)px\s*,\s*(-?\d+)px\s*\)/
			);
			var offset = match ?
				{ x: +match[1], y: +match[2] } :
				{ x: offsetter.offsetLeft, y: offsetter.offsetTop };
			
			function move( element ) {
				element.width = canvasSize.width;
				element.height = canvasSize.height;
				
				element.style.width = canvasSize.width + 'px';
				element.style.height = canvasSize.height + 'px';	
				
				element.style.left = ( - offset.x - margin.x ) + 'px';
				element.style.top = ( - offset.y - margin.y ) + 'px';
			}
			
			move( canvas );
			move( markers );
			move( tracker );
			
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
