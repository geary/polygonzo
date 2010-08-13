#!/usr/bin/env python

# makepolys.py

import codecs
import math
import os
import random
import re
import shutil
import stat
import sys
import time

from geo import Geo
import shpUtils
import states

from globalmaptiles import GlobalMercator

gm = GlobalMercator()

def getCenter( lat1, lng1, lat2, lng2 ):
	zoom = 22
	
	mx1, my1 = gm.LatLonToMeters( lat1, lng1 )
	mx2, my2 = gm.LatLonToMeters( lat2, lng2 )
	
	px1, py1 = gm.MetersToPixels( mx1, my1, zoom )
	px2, py2 = gm.MetersToPixels( mx2, my2, zoom )
	
	px = ( px1 + px2 ) / 2.0
	py = ( py1 + py2 ) / 2.0
	
	mx, my = gm.PixelsToMeters( px, py, zoom )
	lat, lng = gm.MetersToLatLon( mx, my )
	return lat, lng

geo = Geo()
keysep = '|'
states.byNumber = {}

useOther = {
	'CT': ( 'town', 'cs09_d00' ),
	#'ME': ( 'town', 'cs23_d00' ),
	'MA': ( 'town', 'cs25_d00' ),
	'NH': ( 'town', 'cs33_d00' ),
	#'RI': ( 'town', 'cs44_d00' ),
	'VT': ( 'town', 'cs50_d00' ),
	#
	#'KS': ( 'district', 'cd20_110' ),
	#'NE': ( 'district', 'cd31_110' ),
	#'NM': ( 'district', 'cd35_110' ),
}

def loadshapefile( filename ):
	print 'Loading shapefile %s' % filename
	t1 = time.time()
	shapefile = shpUtils.loadShapefile( filename )
	t2 = time.time()
	print '%0.3f seconds load time' %( t2 - t1 )
	return shapefile
	
#def randomColor():
#	def hh(): return '%02X' %( random.random() *128 + 96 )
#	return hh() + hh() + hh()

featuresByName = {}
def featureByName( feature ):
	info = feature['info']
	name = info['NAME']
	if name not in featuresByName:
		featuresByName[name] = {
			'feature': feature #,
			#'color': randomColor()
		}
	return featuresByName[name]

def featuresBounds( features ):
	bounds = [ [ None, None ], [ None, None ] ]
	for feature in features:
		shape = feature['shape']
		if shape['type'] == 5:
			for part in shape['parts']:
				bounds = geo.extendBounds( bounds, part['bounds'] )
	return bounds

def writeFile( filename, data ):
	f = open( filename, 'wb' )
	f.write( data )
	f.close()

def readShapefile( type, filename ):
	print '----------------------------------------'
	print 'Loading %s' % filename
	
	shapefile = loadshapefile( filename )
	features = shapefile['features']
	print '%d features' % len(features)
	
	#writeFile( 'features.csv', shpUtils.dumpFeatureInfo(features) )
	
	nPoints = nPolys = 0
	places = {}
	for feature in features:
		shape = feature['shape']
		if shape['type'] != 5: continue
		info = feature['info']
		name = info['NAME'].decode( 'cp850' ).encode( 'utf-8' )
		name = re.sub( '\x00', '', name )
		statenum = info['STATE']
		key = keysep.join([ type, statenum, name ])
		if key not in places:
			places[key] = {
				'name': name,
				'state': statenum,
				'maxarea': 0.0,
				'bounds': [ [ None, None ], [ None, None ] ],
				'shapes': []
			}
		place = places[key]
		shapes = place['shapes']
		for part in shape['parts']:
			nPolys += 1
			points = part['points']
			n = len(points) - 1
			nPoints += n
			pts = []
			area = part['area']
			if area == 0: continue
			bounds = part['bounds']
			place['bounds'] = geo.extendBounds( place['bounds'], bounds )
			centroid = part['centroid']
			if area > place['maxarea']:
				place['centroid'] = centroid
				place['maxarea'] = area
			points = part['points']
			for j in xrange(n):
				point = points[j]
				pts.append( '[%.4f,%.4f]' %( point[0], point[1] ) )
			shapes.append( '[[%s]]' %( ','.join(pts) ) )
		bounds = place['bounds']
		center = getCenter( bounds[0][1], bounds[0][0], bounds[1][1], bounds[1][0] )
		place['center'] = [ center[1], center[0] ]
	print '%d points in %d places' %( nPoints, len(places) )
	return shapefile, places

def keysplit( key ):
	type, statenum, name = key.split(keysep)
	return type, states.byNumber[statenum], name

def writeUsaStates( places, path ):
	json = []
	keys = places.keys()
	keys.sort()
	for key in keys:
		json.append( getPlaceJSON( places, key, states.byNumber[ places[key]['state'] ]['abbr'].lower(), 'state' ) )
	writeJSON( path, 'country', 'us', '-states', { 'state': json } )

# TODO: almost the same code as writeUsaStates
def writeUsaCongressional( places, path ):
	json = []
	keys = places.keys()
	keys.sort()
	for key in keys:
		type, statenum, name = key.split(keysep)
		if type == 'district':
			json.append( getPlaceJSON( places, key, states.byNumber[ places[key]['state'] ]['abbr'].lower(), 'cd' ) )
	for state in states.array:
		del state['json']['county']
	writeJSON( path, 'district', 'us', '-house', { 'district': json } )

# TODO: almost the same code as writeUsaStates
def writeUsaCounties( places, path ):
	json = []
	keys = places.keys()
	keys.sort()
	for key in keys:
		type, statenum, name = key.split(keysep)
		if type == 'county':
			json.append( getPlaceJSON( places, key, states.byNumber[ places[key]['state'] ]['abbr'].lower(), 'county' ) )
	writeJSON( path, 'country', 'us', '-counties', { 'county': json } )

def writeStatesCounties( places, path ):
	p = {}
	for k in places:
		if places[k] != None:
			p[k] = places[k]
	places = p
	keys = places.keys()
	keys.sort()
	for key in keys:
		type, state, name = keysplit(key)
		if type == 'county':
			if type not in state['json']: state['json'][type] = []
			state['json'][type].append( getPlaceJSON( places, key, state['abbr'].lower(), type ) )
	for state in states.array:
		writeJSON( path, 'state', state['abbr'].lower(), '-counties', state['json'] )

# TODO: almost the same code as writeStatesCounties
def writeStatesCongressional( places, path ):
	p = {}
	for k in places:
		if places[k] != None:
			p[k] = places[k]
	places = p
	keys = places.keys()
	keys.sort()
	for key in keys:
		type, state, name = keysplit(key)
		if type == 'district':
			if type not in state['json']: state['json'][type] = []
			state['json'][type].append( getPlaceJSON( places, key, state['abbr'].lower(), type ) )
		#json.append( getPlaceJSON( places, key, states.byNumber[ places[key]['state'] ]['abbr'].lower(), 'cd' ) )
	for state in states.array:
		#del state['json']['county']
		writeJSON( path, 'state', state['abbr'].lower(), '-house', state['json'] )

def writeJSON( path, type, abbr, suffix, json ):
	file = 'json/%s%s.json' %( abbr, suffix )
	print 'Writing %s' % file
	types = []
	for t in json:
		types.append( '\n\t\t%s\n\t\t' %( ',\n\t\t'.join(json[t]) ) )
	writeFile( file,
'''{
	"type": "FeatureCollection",
	"properties": {
		"kind": "%s",
		"abbr": "%s"
	},
	"features": [%s
	]
}
''' %( type, abbr, ','.join(types) ) )

def getPlaceJSON( places, key, state, type ):
	place = places[key]
	if not place: return ''
	bounds = place['bounds']
	center = place['center']
	centroid = place['centroid']
	if type == "state": abbr = '"abbr":"%s",' % state
	else: abbr = ''
	return '{"type":"Feature","bbox":[%.4f,%.4f,%.4f,%.4f],"properties":{"kind":"%s",%s"name":"%s","center":[%.4f,%.4f],"centroid":[%.4f,%.4f]},"geometry":{"type":"MultiPolygon","coordinates":[%s]}}' %(
		bounds[0][0], bounds[0][1], 
		bounds[1][0], bounds[1][1], 
		type, abbr, key.split(keysep)[2],
		center[0], center[1],
		centroid[0], centroid[1],
		','.join(place['shapes'])
	)

def generateUsaStates( detail, path='' ):
	print 'generateUsaStates'
	shapefile, places = readShapefile( 'state', 'shapefiles/state/st99_d00_shp-%s/st99_d00.shp' % detail )
	for key in places:
		type, number, name = key.split(keysep)
		state = states.byName[name]
		state['json'] = {}
		state['county'] = []
		state['number'] = number
		states.byNumber[number] = state
	writeUsaStates( places, path )

def generateUsaCongressional( detail, path='' ):
	print 'generateUsaCongressional'
	shapefile, places = readShapefile( 'district', 'shapefiles/congressional/cd99_110_shp-%s/cd99_110.shp' % detail )
	for key, place in places.iteritems():
		type, state, name = keysplit(key)
		if type not in state: state[type] = []
		state[type].append( place )
	writeUsaCongressional( places, path )
	
def generateStatesCounties( detail, path ):
	print 'generateStatesCounties'
	writeStatesCounties( getPlaces(detail), path )
	
def generateStatesCongressional( detail, path ):
	print 'generateStatesCongressional'
	shapefile, places = readShapefile( 'district', 'shapefiles/congressional/cd99_110_shp-%s/cd99_110.shp' % detail )
	for key, place in places.iteritems():
		type, state, name = keysplit(key)
		if type not in state: state[type] = []
		state[type].append( place )
	writeStatesCongressional( places, path )
	
def generateUsaCounties( detail, path ):
	print 'generateUsaCounties'
	writeUsaCounties( getPlaces(detail), path )

def getPlaces( detail ):
	shapefile, places = readShapefile( 'county', 'shapefiles/county/co99_d00_shp-%s/co99_d00.shp' % detail )
	for key, place in places.iteritems():
		type, state, name = keysplit(key)
		abbr = state['abbr']
		state[type].append( place )
	for abbr, info in useOther.iteritems():
		type = info[0]
		file = info[1]
		state = states.byAbbr[abbr]
		if type not in state: state[type] = []
		othershapefile, otherplaces = readShapefile( type,
			'shapefiles/%(base)s/%(file)s_shp-%(detail)s/%(file)s.shp' %{
				'base': type,
				'file': file,
				'detail': detail
			} )
		for key, place in otherplaces.iteritems():
			type, state, name = keysplit(key)
			if type not in state: state[type] = []
			state[type].append( place )
			places[key] = place
	return places

generateUsaStates( 75, 'us' )
generateUsaCounties( 90, 'county' )
generateStatesCounties( 80, 'state' )

generateUsaCongressional( 50, 'congressional' )
generateStatesCongressional( 50, 'state' )

print 'Done!'
