// apiloader-polygonzo.googlecode.com.js
// Copyright 2010 Michael Geary - http://mg.to/
// Free Beer and Free Speech License. Enjoy!
// http://freebeerfreespeech.org/

// To run the PolyGonzo code in a different domain, copy this file
// to a new file with a name like this:
// apiloader-yourhostname.js
// apiloader-yourhostname-yourportnumber.js
// apiloader-www.example.com.js
// apiloader-www.example.com-exampleportnumber.js
//
// Then edit the new file and change the key value below to your
// Google API key for your host/domain name (and port number
// if you have one):
// http://code.google.com/apis/maps/signup.html

(function() {
	
	var key = 'ABQIAAAAgNQJhbWKFHRJJiHCXotPZxRjD_g9JWob_BY_bvArK_nQq_fZHhRbCusPq8UtDEYXGnyRj6wwa3Mbvw';
	
	document.write(
		'<script type="text/javascript" src="http://www.google.com/jsapi?key=', key, '">',
		'<\/script>'
	);

}());
