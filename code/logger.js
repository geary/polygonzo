// logger.js
// By Michael Geary - http://mg.to/
// See UNLICENSE or http://unlicense.org/ for public domain notice

function log() {
	var text = Array.prototype.join.call( arguments, ' ' );
	var elapsed = +new Date - log.time;
	$('#log').append( [
		'<div style="position:relative;">',
			'<div style="float:left; text-align:right; width:4em;">',
				( elapsed / 1000 ).toFixed(3),
			'</div>',
			'<div style="float:left; padding-left:8px;">',
				text,
			'</div>',
			'<div style="clear:left;">',
			'</div>',
		'</div>'
	].join('') );
	log.time = +new Date;
}

log.reset = function( empty ) {
	if( empty ) $('#log').empty();
	log.time = +new Date;
};

log.reset( true );
