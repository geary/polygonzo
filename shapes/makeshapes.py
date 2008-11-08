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
	'ME': ( 'town', 'cs23_d00' ),
	'MA': ( 'town', 'cs25_d00' ),
	'NH': ( 'town', 'cs33_d00' ),
	'RI': ( 'town', 'cs44_d00' ),
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
			shapes.append( '{"area":%.4f,"bounds":[[%.4f,%.4f],[%.4f,%.4f]],"centroid":[%.4f,%.4f],"points":[%s]}' %(
				area,
				bounds[0][0], bounds[0][1], 
				bounds[1][0], bounds[1][1], 
				centroid[0], centroid[1],
				','.join(pts)
			) )
		bounds = place['bounds']
		center = getCenter( bounds[0][1], bounds[0][0], bounds[1][1], bounds[1][0] )
		place['center'] = [ center[1], center[0] ]
	print '%d points in %d places' %( nPoints, len(places) )
	return shapefile, places

def keysplit( key ):
	type, statenum, name = key.split(keysep)
	return type, states.byNumber[statenum], name

def writeUS( places, path ):
	json = []
	keys = places.keys()
	keys.sort()
	for key in keys:
		json.append( getPlaceJSON( places, key, states.byNumber[ places[key]['state'] ]['abbr'].lower(), 'state' ) )
	writeJSON( path, 'country', 'us', { 'state': json } )

# TODO: almost the same code as writeUS
def writeCongressional( places, path ):
	json = []
	keys = places.keys()
	keys.sort()
	for key in keys:
		json.append( getPlaceJSON( places, key, states.byNumber[ places[key]['state'] ]['abbr'].lower(), 'cd' ) )
	writeJSON( path, 'district', 'congressional', { 'district': json } )

# TODO: almost the same code as writeUS
def writeCounties( places, path ):
	json = []
	keys = places.keys()
	keys.sort()
	for key in keys:
		type, statenum, name = key.split(keysep)
		if type == 'county':
			json.append( getPlaceJSON( places, key, states.byNumber[ places[key]['state'] ]['abbr'].lower(), 'county' ) )
	writeJSON( path, 'country', 'county', { 'county': json } )

def writeStates( places, path ):
	p = {}
	for k in places:
		if places[k] != None:
			p[k] = places[k]
	places = p
	keys = places.keys()
	keys.sort()
	for key in keys:
		type, state, name = keysplit(key)
		if type not in state['json']: state['json'][type] = []
		state['json'][type].append( getPlaceJSON( places, key, state['abbr'].lower(), type ) )
	for state in states.array:
		writeJSON( path, 'state', state['abbr'].lower(), state['json'] )

def writeJSON( path, type, abbr, json ):
	file = 'shapes/%s.json' % abbr
	print 'Writing %s' % file
	types = []
	for t in json:
		types.append( '\n\t\t"%s": [\n\t\t\t%s\n\t\t]' %( t, ',\n\t\t\t'.join(json[t]) ) )
	writeFile( file, '''{
	"abbr": "%s",
	"type": "%s",
	"places": {%s
	}
}
''' %( abbr, type, ','.join(types) ) )

def getPlaceJSON( places, key, state, type ):
	place = places[key]
	if not place: return ''
	bounds = place['bounds']
	center = place['center']
	centroid = place['centroid']
	return '{"type":"%s","state":"%s","name":"%s","bounds":[[%.4f,%.4f],[%.4f,%.4f]],"center":[%.4f,%.4f],"centroid":[%.4f,%.4f],"shapes":[%s]}' %(
		type, state, key.split(keysep)[2],
		bounds[0][0], bounds[0][1], 
		bounds[1][0], bounds[1][1], 
		center[0], center[1],
		centroid[0], centroid[1],
		','.join(place['shapes'])
	)

def generateUS( detail, path='' ):
	shapefile, places = readShapefile( 'state', 'shapes/state/st99_d00_shp-%s/st99_d00.shp' % detail )
	for key in places:
		type, number, name = key.split(keysep)
		state = states.byName[name]
		state['json'] = {}
		state['county'] = []
		state['number'] = number
		states.byNumber[number] = state
	writeUS( places, path )

def generateCongressional( detail, path='' ):
	shapefile, places = readShapefile( 'district', 'shapes/congressional/cd99_110_shp-%s/cd99_110.shp' % detail )
	for key, place in places.iteritems():
		type, state, name = keysplit(key)
		if type not in state: state[type] = []
		state[type].append( place )
	writeCongressional( places, path )
	
def generateStates( detail, path ):
	writeStates( getPlaces(detail), path )
	
def generateCounties( detail, path ):
	writeCounties( getPlaces(detail), path )

def getPlaces( detail ):
	shapefile, places = readShapefile( 'county', 'shapes/county/co99_d00_shp-%s/co99_d00.shp' % detail )
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
			'shapes/%(base)s/%(file)s_shp-%(detail)s/%(file)s.shp' %{
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

generateUS( 75, 'us' )
generateCongressional( 50, 'congressional' )
generateCounties( 90, 'county' )
generateStates( 80, 'state' )

print 'Done!'
