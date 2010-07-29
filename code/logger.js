// logger.js
// Copyright 2010 Michael Geary - http://mg.to/
// Free Beer and Free Speech License. Enjoy!
// http://freebeerfreespeech.org/

function log() {
	var text = Array.prototype.join.call( arguments, ' ' );
	var elapsed = +new Date - log.time;
	$('#log').append( [
		'<div style="position:relative;">',
			'<div style="float:left; text-align:right; width:4.5em;">',
				( elapsed / 1000 ).toFixed(3),
			'</div>',
			'<div style="float:left; padding-left:12px;">',
				text,
			'</div>',
			'<div style="clear:left;">',
			'</div>',
		'</div>'
	].join('') );
	log.time = +new Date;
}

log.reset = function() {
	$('#log').empty();
	log.time = +new Date;
};

log.reset();
