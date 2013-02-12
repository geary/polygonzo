// polygonzo.js by Ernest Delgado and Michael Geary
// Use under the Unlicense or the MIT License: see LICENSE for details

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
		var canvas, ctx, underlay, underlayer, tracker, markers, zoom, offset;
		var patterns = {};
		
		if( PolyGonzo.isVML() ) {
			canvas = document.createElement( 'div' );
		}
		else {
			canvas = document.createElement( 'canvas' );
			ctx = this.ctx = canvas.getContext('2d');
		}
		
		if( a.underlay ) {
			var underlayer = this.underlayer = addDiv( 'PolyGonzoUnderlay', panes.overlayLayer );
			panes.overlayLayer.appendChild( underlayer );
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
			offset = b.offset || { x:0, y:0 };
			
			if( a.underlay )
				loadUnderlay( offset.x, offset.y );
				
			if( ctx ) {
				ctx.clearRect( 0, 0, canvas.width, canvas.height );
				ctx.lineJoin = 'bevel';
				
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
					if( fillColor.image ) {
						var pattern = patterns[fillColor.image.src];
						if( ! pattern ) {
							pattern = patterns[fillColor.image.src] =
								c.createPattern( fillColor.image, 'repeat' );
						}
						c.fillStyle = pattern;
					}
					else {
						c.fillStyle = fillColor;
					}
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
					vml[iVml++] = '" joinstyle="bevel" weight="';
					vml[iVml++] = strokeWidth;
					vml[iVml++] = 'px" /><pgz_vml_:fill ';
					if( fillColor.image ) {
						vml[iVml++] = 'alignshape="False" type="tile" src="';
						vml[iVml++] = fillColor.image.src;
					}
					else {
						vml[iVml++] = 'color="';
						vml[iVml++] = fillColor;
					}
					vml[iVml++] = '" opacity="';
					vml[iVml++] = fillOpacity;
					vml[iVml++] = '" /></pgz_vml_:shape>';
				});
				vml = vml.join('');
				//log( 'joined VML' );
				
				//log( htmlEscape(vml) );
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
			if( underlayer ) panes.overlayLayer.removeChild( underlayer );
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
				style.OTransform ||
				''
			).replace( / /g, '' );
		};
		
		this.getOffsets = function() {
			if( ! this.converter ) return null;
			var ll00 = new google.maps.LatLng( 0, 0 );
			var canvas = this.converter.fromLatLngToDivPixel( ll00 );
			var container = this.converter.fromLatLngToContainerPixel( ll00 );
			var pan = { x: container.x - canvas.x, y: container.y - canvas.y };
			return { canvas:canvas, container:container, pan:pan };
		};
		
		function onetime() {
			if( PolyGonzo.isVML()  &&  ! document.namespaces.pgz_vml_ ) {
				document.namespaces.add( 'pgz_vml_', 'urn:schemas-microsoft-com:vml', '#default#VML' );
				document.createStyleSheet().cssText = 'pgz_vml_\\:*{behavior:url(#default#VML)}';
			}
		}
		
		function loadUnderlay( offsetX, offsetY ) {
			underlay = a.underlay();
			var html = [];
			var images = underlay && underlay.images;
			if( images ) {
				for( var image, i = -1;  image = images[++i]; ) {
					image.left += offsetX;
					image.top += offsetY;
					if( image.src ) {
						html.push(
							'<div style="position:absolute; overflow:hidden; width:', image.width,
									'px; height:', image.height,
									'px; left:', image.left,
									'px; top:', image.top,
									'px;">',
								'<img src="', image.src, '" style="width:', image.width,
										'px; height:', image.height,
										'px; border:none; position:absolute; left:0; top:0; margin:0; padding:0;" />',
							'</div>'
						);
					}
				}
			}
			underlayer.innerHTML = html.join('');
		}
		
		function eachPoly( geos, zoom, offset, callback ) {
			var offsetX = offset.x, offsetY = offset.y;
			var totalFeatures = 0, totalPolys = 0, totalPoints = 0;
			for( var geo, iGeo = -1;  geo = geos[++iGeo]; ) {
				var features = geo.features;
				var mercator = PolyGonzo.Mercator.isMercator(  geo );
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
					var thecallback =
						geo.draw === false  ||  feature.draw === false ?
							function() {} :
							callback;
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
					
					var featureOffsetX = 0, featureOffsetY = 0;
					if( feature.offset ) {
						featureOffsetX = feature.offset.x;
						featureOffsetY = feature.offset.y;
					}
					
					var bbox = feature.bbox;
					if( bbox ) {
						var box = ( feature.boxes = feature.boxes || [] )[zoom];
						if( ! box ) {
							if( mercator ) {
								box = [
									featureOffsetX + multX * bbox[0],
									featureOffsetY + multY * bbox[1],
									featureOffsetX + multX * bbox[2],
									featureOffsetY + multY * bbox[3]
								];
							}
							else {
								var w = bbox[0], e = bbox[2];
								if( w > e ) w -= 360;
								var s1 = sin( bbox[1] * pi180 );
								var s3 = sin( bbox[3] * pi180 );
								box = [
									featureOffsetX + multX * w,
									featureOffsetY + multY * log( (1+s1) / (1-s1) ),
									featureOffsetX + multX * e,
									featureOffsetY + multY * log( (1+s3) / (1-s3) )
								];
							}
							feature.boxes[zoom] = box;
						}
					}
					
					if( geo.markers && feature.marker ) {
						var marker = feature.marker,
							c = feature.properties.centroid || feature.centroid;
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
									'px; left:', centroid[0] - marker.anchor.x + offsetX + featureOffsetX,
									'px; top:', centroid[1] - marker.anchor.y + offsetY + featureOffsetY,
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
						var polyOffsetX = featureOffsetX, polyOffsetY = featureOffsetY;
						if( poly.offset ) {
							polyOffsetX = poly.offset.x;
							polyOffsetY = poly.offset.y;
						}
						
						for( var ring, iRing = -1;  ring = poly[++iRing]; ) {
							var nPoints = ring.length;
							totalPoints += nPoints;
							var coords = ( ring.coords = ring.coords || [] )[zoom];
							if( ! coords ) {
								coords = ring.coords[zoom] = new Array( nPoints );
								if( mercator ) {
									for( var iPoint = -1, point;  point = ring[++iPoint]; ) {
										coords[iPoint] = [
											polyOffsetX + multX * point[0],
											polyOffsetY + multY * point[1]
										];
									}
								}
								else {
									for( var iPoint = -1, point;  point = ring[++iPoint]; ) {
										var s = sin( point[1] * pi180 );
										coords[iPoint] = [
											polyOffsetX + multX * point[0],
											polyOffsetY + multY * log( (1+s)/(1-s) )
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
							thecallback( offsetX, offsetY, feature, poly, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth );
					}
				}
			}
			
			// Add a dummy polygon at the end to fix missing final poly in IE8
			if( PolyGonzo.isVML() )
				thecallback( offsetX, offsetY, {}, {}, fillColor, fillOpacity, strokeColor, strokeOpacity, strokeWidth );
			
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
			tracker[ 'on' + name ] = function( event ) {
				event = event || window.event;
				var e = event.targetTouches && event.targetTouches[0] || event;
				var offset = PolyGonzo.elementOffset( tracker );
				if( ! offset ) return;
				var x = -offset.left, y = -offset.top;
				if( e.pageX || e.pageY ) {
					x += e.pageX;
					y += e.pageY;
				}
				else {
					x +=
						( e.clientX || 0 ) +
						( document.body.scrollLeft || 0 ) +
						( document.documentElement.scrollLeft || 0 );
					y +=
						( e.clientY || 0 ) +
						( document.body.scrollTop || 0 ) +
						( document.documentElement.scrollTop || 0 );
				}
				//if(
				//   ! hitWhere  ||  ! hitWhere.poly  ||
				//   ! contains( hitWhere.poly, x - hitOffset.x, y - hitOffset.y, hitZoom )
				//) {
					hitWhere = hittest( x, y );
				//}
				a.events[name]( event, hitWhere );
			};
		}
		
		function hittest( x, y ) {
			var images = underlay && underlay.hittest && underlay.images;
			if( images ) {
				for( var image, i = -1;  image = images[++i]; ) {
					if(
					   x >= image.left  &&  x < image.left + image.width  &&
					   y >= image.top  &&  y < image.top + image.height
					) {
						var hit = underlay.hittest( image, x - image.left, y - image.top );
						if( hit )
							return hit;
					}
				}
			}
			x -= offset.x;
			y -= offset.y;
			for( var geo, iGeo = -1;  geo = geos[++iGeo]; ) {
				if( geo.hittest === false ) continue;
				var features = geo.features;
				for( var iFeature = -1, feature;  feature = features[++iFeature]; ) {
					var box = feature.boxes[zoom];
					if( box && (
					   x < box[0]  ||  x > box[2]  ||
					   y < box[3]  ||  y > box[1]
					) ) {
						continue;
					}
					var geometry = feature.geometry, type = geometry.type;
					var polys =
						type == 'Polygon' ? [ geometry.coordinates ] :
						type == 'MultiPolygon' ? geometry.coordinates :
						null;
					for( var iPoly = -1, poly;  poly = polys[++iPoly]; ) {
						if( contains( poly, x, y, zoom ) ) {
							return feature.hittest !== false  &&  {
								geo:geo,
								/*parent:entity,*/
								feature:feature,
								poly:poly
							};
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
					
					if( ( y1 < y ) != ( y2 < y ) )
						if ( x1 + ( y - y1 ) / ( y2 - y1 ) * ( x2 - x1 ) < x )
							inside = ! inside;
					
					x1 = x2, y1 = y2;
				}
			}
			return inside;
		}
	},
	
	// TODO: refactor some other code to use these, but watch performance
	Mercator: {
		coordToLngLat: function( coord ) {
			var pi = Math.PI, pi180 = pi / 180, radius = 6378137,
				x = coord[0], y = coord[1];
			return [
				x / ( radius * pi180 ),
				( 2 * Math.atan( Math.exp( y / radius ) ) - pi / 2 ) / pi180
			];
		},
		
		coordToPixel: function( coord, zoom ) {
			var multX = Math.pow( 2, zoom ) / 156543.03392;
			var multY = -multX;
			return [
				multX * coord[0],
				multY * coord[1]
			];
		},
		
		fitBbox: function( bbox, pix ) {
			return Math.min(
				this.getZoom( Math.abs( bbox[0] - bbox[2] ), pix.width ),
				this.getZoom( Math.abs( bbox[1] - bbox[3] ), pix.height )
			);
		},
		
		getZoom: function( goog, pix ) {
			function log2( n ) { return Math.log(n) / Math.LN2; }
			return log2( pix / goog * 156543.03392 );
		},
		
		isMercator: function( geo ) {
			var crs =
				geo.crs  &&
				geo.crs.type == 'name'  &&
				geo.crs.properties.name || '';
			return /EPSG:+3857$/.test( crs );
		},
		
		lngLatToCoord: function( ll ) {
			var pi = Math.PI, pi180 = pi / 180, radius = 6378137,
				lng = ll[0], lat = ll[1];
			return [
				radius * pi180 * lng,
				radius * Math.log( Math.tan( ( 90 + lat ) * pi180 / 2 ) )
			];
		},
		
		pixelToCoord: function( pixel, zoom ) {
			//function log2( n ) { return Math.log(n) / Math.LN2; }
			//
			//
			//multX = Math.pow( 2, zoom ) / 156543.03392,
			//multY = -multX;
		}
	},
	
	// PolyGonzo.PgOverlay() - Google Maps JavaScript API V2/V3 overlay
	PgOverlay: function( a ) {
		var map = a.map, pane, frame, canvas, underlayer, markers, tracker, moveListener, zoomListener;
		
		var gm = google.maps, gme = gm.event, pg = new gm.OverlayView;
		
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
				underlay: a.underlay,
				geos: a.geos || [ a.geo ],
				events: a.events
			});
			canvas = frame.canvas;
			underlayer = frame.underlayer;
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
			
			//var margin = { x: width / 3, y: height / 3 };
			var margin = { x: 0, y: 0 };
			var canvasSize = { width: width + margin.x * 2, height: height + margin.y * 2 };
			
			frame.converter = converter;
			var offsets = frame.getOffsets();
			if( ! offsets ) return;
			
			function move( element ) {
				if( ! element ) return;
				
				element.width = canvasSize.width;
				element.height = canvasSize.height;
				
				element.style.width = canvasSize.width + 'px';
				element.style.height = canvasSize.height + 'px';	
				
				element.style.left = -( offsets.pan.x + margin.x ) + 'px';
				element.style.top = -( offsets.pan.y + margin.y ) + 'px';
			}
			
			move( canvas );
			move( underlayer );
			move( markers );
			move( tracker );
			
			frame.draw({
				offset: {
					x: offsets.container.x + margin.x,
					y: offsets.container.y + margin.y
				},
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
			var transform = e.style.webkitTransform;
			if( transform ) {
				// Maps V3 uses -webkit-transform:matrix() in some browsers
				var match = transform.match(
					/matrix *\( *1, *0, *0, *1, *([-\.\d]+), *([-\.\d]+) *\)/
				);
				if( match ) {
					left += +match[1];
					top += +match[2];
				}
			}
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
