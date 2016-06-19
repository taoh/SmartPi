var Queue = require( 'firebase-queue' );

function getQueueRef( firebase ) {
	return { tasksRef: firebase.database().ref( 'dispatch' ), specsRef: firebase.database().ref( 'spec/queue' ) };
}

module.exports = {};

module.exports.createGatewayWorker = function ( firebase, gatewayKey, processFunction ) {
	gatewayKey = gatewayKey.replace( '/', '_' );
	var specRef = firebase.database().ref( 'spec/queue/' ).child( gatewayKey );
	specRef.once( 'value' ).then( function( snapshot ) {
		if ( ! snapshot.val() ) {
			specRef.set( {
				'start_state': gatewayKey + '_start',
				'in_progress_state': 'in_progress',
				'finished_state': null,
				'error_state': 'error',
				'timeout': 300000, // 5 minutes
				'retries': 0 // don't retry
			} );
		}
	} );
	new Queue(
		getQueueRef( firebase ),
		{ specId: gatewayKey },
		processFunction
	);
};

module.exports.createMainWorker = function( firebase ) {
	new Queue( getQueueRef( firebase ), function( data, progress, resolve, reject ) {
		if ( ! data.id || ! data.action ) {
			//Malformed request
			//Resolve without doing anything - maybe log ?
			return resolve();
		}

		firebase.database().ref( 'things/' + data.id ).once( 'value' )
		.then( function( snapshot ) {
			//Is the device online, does it exist?
			if ( ! snapshot.exists() ) {
				return reject( 'device does not exist' );
			} else {
				resolve( Object.assign( data, {
					_new_state: data.id.replace( '/', '_' ) + '_start'
				} ) );
			}
		} );
	} );
};