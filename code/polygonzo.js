// polygonzo.js
// By Ernest Delgado and Michael Geary
// http://ernestdelgado.com/
// http://mg.to/
// See UNLICENSE or http://unlicense.org/ for public domain notice

PolyGonzo = {
	
	// PolyGonzo.Frame() - Canvas/VML frame
	Frame: function( a ) {
		
		var frame = this;
		
		if( ! PolyGonzo.onetime ) {
			onetime();
			PolyGonzo.onetime = true;
		}
		
		var pane = a.container;
		var panes = a.panes || { overlayLayer:pane, overlayImage:pane, overlayMouseTarget:pane };
		
		if( ! a.events )
			delete panes.overlayMouseTarget;
		
		var geos = a.geos || [ a.geo ];
		var canvas, ctx, tracker, markers, zoom, offset;
		
		if( PolyGonzo.isVML() ) {
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
		
		if( panes.overlayImage )
			markers = this.markers = addDiv( 'PolyGonzoMarkers', panes.overlayImage );
		
		if( panes.overlayMouseTarget ) {
			tracker = this.tracker = addDiv( 'PolyGonzoTracker', panes.overlayMouseTarget );
			
			if( ! PolyGonzo.isVML() ) {
				// Tracker needs a background color in IE9, doesn't hurt in
				// other browsers except when VML is used
				tracker.style.backgroundColor = 'white';
				tracker.style.opacity = 0;
			}
		}
		
		var hitWhere, hitZoom, hitOffset;
		
		for( var name in ( a.events || {} ) )
			wireEvent( name );
		
		this.draw = function( b ) {
			hitWhere = null;
			
			zoom = b.zoom;
			offset = b.offset;
			
			if( ctx ) {
				ctx.clearRect( 0, 0, canvas.width, canvas.height );
				
				eachPoly( geos, zoom, offset, function( offsetX, offsetY, feature, poly, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth ) {
					var c = ctx;
					c.beginPath();
					
					for( var ring, iRing = -1;  ring = poly[++iRing]; ) {
						var coords = ring.coords[zoom];
						if( ! coords  ||  coords.length < 3 ) continue;
						
						var coord = coords[0];
						c.moveTo( ~~( coord[0] + offsetX ) + .5, ~~( coord[1] + offsetY ) + .5 );
						
						for( var coord, iCoord = 0;  coord = coords[++iCoord]; ) {
							c.lineTo( ~~( coord[0] + offsetX ) + .5, ~~( coord[1] + offsetY ) + .5 );
						}
						c.closePath();
					}
					
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
				eachPoly( geos, zoom, offset, function( offsetX, offsetY, feature, poly, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth ) {
					
					vml[iVml++] = '<pgz_vml_:shape style="position:absolute;width:10px;height:10px;" coordorigin="';
					vml[iVml++] = -~~( offsetX * 10 - .5 );
					vml[iVml++] = ' ';
					vml[iVml++] = -~~( offsetY * 10 - .5 );
					vml[iVml++] = '" coordsize="100 100" path=" ';
					
					for( var ring, iRing = -1;  ring = poly[++iRing]; ) {
						var coords = ring.coords[zoom];
						if( ! coords  ||  coords.length < 3 ) continue;
						
						vml[iVml++] = ' m ';
						
						for( var iCoord = -1, coord;  coord = coords[++iCoord]; ) {
							vml[iVml++] = ~~( coord[0] * 10 );
							vml[iVml++] = ',';
							vml[iVml++] = ~~( coord[1] * 10);
							vml[iVml++] = ' l ';
						}
						
						iVml--;  // remove last ' l '
						vml[iVml++] = ' x ';
					}
					
					vml[iVml++] = ' "><pgz_vml_:stroke color="';
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
			if( canvas ) panes.overlayLayer.removeChild( canvas );
			if( markers ) panes.overlayImage.removeChild( markers );
			if( tracker ) panes.overlayMouseTarget.removeChild( tracker );
		};
		
		this.getTransform = function( style ) {
			return(
				style.transform ||
				style.WebkitTransform ||
				style.msTransform ||
				style.MozTransform ||
				style.OTransform
			);
		};
		
		this.getTransformOffset = function() {
			// Get the drawing offset from the grandparent element,
			// either from the -webkit-transform style or offsetLeft/Top.
			// TODO: Find a way to do this without using Maps API internals.
			var parent = canvas.offsetParent;
			if( ! parent ) return null;
			var offsetter = parent.offsetParent;
			var transform = this.getTransform( offsetter.style );
			var match = transform && transform.match(
				/translate\s*\(\s*(-?\d+)px\s*,\s*(-?\d+)px\s*\)/
			);
			var offset = match ?
				{ x: +match[1], y: +match[2] } :
				{ x: offsetter.offsetLeft, y: offsetter.offsetTop };
			offset.isTransform = !! match;
			return offset;
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
			if( PolyGonzo.isVML()  &&  ! document.namespaces.pgz_vml_ ) {
				document.namespaces.add( 'pgz_vml_', 'urn:schemas-microsoft-com:vml', '#default#VML' );
				document.createStyleSheet().cssText = 'pgz_vml_\\:*{behavior:url(#default#VML)}';
			}
		}
		
		function eachPoly( geos, zoom, offset, callback ) {
			var totalFeatures = 0, totalPolys = 0, totalPoints = 0;
			for( var geo, iGeo = -1;  geo = geos[++iGeo]; ) {
				var features = geo.features;
				var crs = geo.crs  &&  geo.crs.type == 'name'  &&  geo.crs.properties.name || '';
				var mercator = /EPSG:+3857$/.test( crs );
				if( mercator ) {
				}
				else {
					var pi = Math.PI, log = Math.log, sin = Math.sin,
						big = 1 << 28,
						big180 = big / 180,
						pi180 = pi / 180,
						radius = big / pi;
				}
				var oldZoom = Infinity;
				
				totalFeatures += features.length;
				var markHtml = [];
				
				for( var iFeature = -1, feature;  feature = features[++iFeature]; ) {
					var geometry = feature.geometry, type = geometry.type;
					var polys =
						type == 'Polygon' ? [ geometry.coordinates ] :
						type == 'MultiPolygon' ? geometry.coordinates :
						null;
					if( ! polys ) continue;
					var nPolys = polys.length;
					totalPolys += nPolys;
					
					var featureZoom = feature.zoom != null ? feature.zoom : zoom;
					if( featureZoom != oldZoom ) {
						oldZoom = featureZoom;
						if( mercator ) {
							var
								multX = Math.pow( 2, featureZoom ) / 156543.03392,
								multY = -multX;
						}
						else {
							var
								divisor = Math.pow( 2, 21 - featureZoom ),
								multX = big180 / divisor,
								multY = -radius / divisor / 2;
						}
					}
					
					var bbox = feature.bbox;
					if( bbox ) {
						var box = ( feature.boxes = feature.boxes || [] )[zoom];
						if( ! box ) {
							if( mercator ) {
								box = [
									multX * bbox[0], multY * bbox[1],
									multX * bbox[2], multY * bbox[3]
								];
							}
							else {
								var s1 = sin( bbox[1] * pi180 );
								var s3 = sin( bbox[3] * pi180 );
								box = [
									multX * bbox[0], multY * log( (1+s1) / (1-s1) ),
									multX * bbox[2], multY * log( (1+s3) / (1-s3) )
								];
							}
							feature.boxes[zoom] = box;
						}
					}
					
					var featureOffset = feature.offset || offset,
						offsetX = featureOffset.x,
						offsetY  = featureOffset.y;
					
					if( geo.markers && feature.marker ) {
						var marker = feature.marker, c = feature.centroid;
						var centroid = ( feature.centroids = feature.centroids || [] )[zoom];
						if( ! centroid ) {
							if( mercator ) {
							}
							else {
								var s = sin( c[1] * pi180 );
								centroid = feature.centroids[zoom] = [
									multX * c[0],
									multY * log( (1+s)/(1-s) )
								];
							}
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
						strokeWidth = feature.strokeWidth,
						haveRing = false;
					
					for( var poly, iPoly = -1;  poly = polys[++iPoly]; ) {
						for( var ring, iRing = -1;  ring = poly[++iRing]; ) {
							var nPoints = ring.length;
							totalPoints += nPoints;
							var coords = ( ring.coords = ring.coords || [] )[zoom];
							if( ! coords ) {
								coords = ring.coords[zoom] = new Array( nPoints );
								if( mercator ) {
									for( var iPoint = -1, point;  point = ring[++iPoint]; ) {
										coords[iPoint] = [
											multX * point[0],
											multY * point[1]
										];
									}
								}
								else {
									for( var iPoint = -1, point;  point = ring[++iPoint]; ) {
										var s = sin( point[1] * pi180 );
										coords[iPoint] = [
											multX * point[0],
											multY * log( (1+s)/(1-s) )
										];
									}
								}
							}
							if( coords.length > 2 ) {
								var first = coords[0], last = coords[coords.length-1];
								if( first[0] != last[0]  ||  first[1] != last[1] )
									coords.push( first );  // close polygon
								haveRing = true;
							}
						}
						if( haveRing )
							callback( offsetX, offsetY, feature, poly, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth );
					}
				}
			}
			
			// Add a dummy polygon at the end to fix missing final poly in IE8
			if( PolyGonzo.isVML() )
				callback( offsetX, offsetY, {}, {}, [], 0, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth );
			
			if( markers )
				markers.innerHTML =
					'<div class="PolyGonzoMarkerList">' + markHtml.join('') + '</div>';
			
			a.polygonzo = {
				counts: {
					features: totalFeatures,
					polys: totalPolys,
					points: totalPoints
				}
			};
		}
		
		function wireEvent( name ) {
			tracker[ 'on' + name ] = function( e ) {
				e = e || window.event;
				var offset = PolyGonzo.elementOffset( canvas );
				if( ! offset ) return;
				var x = -offset.left, y = -offset.top;
				var transform = frame.getTransformOffset();
				if( transform.isTransform ) {
					x -= transform.x;
					y -= transform.y;
				}
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
			for( var geo, iGeo = -1;  geo = geos[++iGeo]; ) {
				if( geo.hittest === false ) continue;
				var features = geo.features;
				for( var iFeature = -1, feature;  feature = features[++iFeature]; ) {
					hitZoom = feature.zoom != null ? feature.zoom : zoom;
					hitOffset = feature.offset || offset;
					var featureX = x - hitOffset.x, featureY = y - hitOffset.y;
					var box = feature.boxes[hitZoom];
					if( box && (
					   featureX < box[0]  ||  featureX > box[2]  ||
					   featureY < box[3]  ||  featureY > box[1]
					) ) {
						continue;
					}
					var geometry = feature.geometry, type = geometry.type;
					var polys =
						type == 'Polygon' ? [ geometry.coordinates ] :
						type == 'MultiPolygon' ? geometry.coordinates :
						null;
					for( var iPoly = -1, poly;  poly = polys[++iPoly]; ) {
						if( contains( poly, featureX, featureY, hitZoom ) ) {
							return { /*parent:entity,*/ feature:feature, poly:poly };
						}
					}
				}
			}
			return null;
		}
		
		function contains( poly, x, y, zoom ) {
			var inside = false;
			for( var ring, iRing = -1;  ring = poly[++iRing]; ) {
				var coords = ring.coords[zoom];
				if( ! coords  ||  coords.length < 3 ) continue;
				
				var v = coords[coords.length-1], x1 = v[0], y1 = v[1];
			
				for( var i = -1;  v = coords[++i]; ) {
					var x2 = v[0], y2 = v[1];
					
					if( ( y1 < y  &&  y2 >= y ) || ( y2 < y  &&  y1 >= y ) )
						if ( x1 + ( y - y1 ) / ( y2 - y1 ) * ( x2 - x1 ) < x )
							inside = ! inside;
					
					x1 = x2, y1 = y2;
				}
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
					overlayMouseTarget: a.events && pane
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
				var p = pg.getPanes();
				init({
					overlayLayer: p.overlayLayer,
					overlayImage: p.overlayImage,
					overlayMouseTarget: p.overlayMouseTarget
				});
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
				geos: a.geos || [ a.geo ],
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
			
			var offset = frame.getTransformOffset();
			if( ! offset ) return;
			
			function move( element ) {
				if( ! element ) return;
				
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
			
			var counts = a.polygonzo && a.polygonzo.counts;
			if( a.log && counts ) {
				a.log(
					counts.features, 'places,',
					counts.polys, 'polys,',
					counts.points, 'points'
				);
			}
		}
		
		return pg;
	},
	
	elementOffset: function( e ) {
		var left = 0, top = 0;
		while( e ) {
			left += e.offsetLeft;
			top += e.offsetTop;
			e = e.offsetParent;
		}
		return { left:left, top:top };
	},
	
	isVML: function() {
		if( PolyGonzo.isVML.yes == null )
			PolyGonzo.isVML.yes =
				! document.createElement( 'canvas' ).getContext;
		return PolyGonzo.isVML.yes;
	}
};
