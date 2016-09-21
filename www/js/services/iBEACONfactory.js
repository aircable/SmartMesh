
// transmit iBeacons

appServices.factory('IBEACON', function( $rootScope, $timeout, $cordovaBeacon, $q, MESH, MCP, CRED ) {

    // data for iBeacon
    var g_iBeacon = {};

    var advertising = false;
    // start advertising timer is running
    var starting = false;
    // new data available, create new iBeacon and start ad timer
    var newdata = false;
    // locked state, when we have to wait for iOS to start ads
    var locked = false;

    // timers so we can cancel them
    var stopTimer;
    var stoppedTimer;
    var startAdTimer;

    const iB_ad_time = 2000;

    // very central iBeacon callback for advertisement start, stops within 2 secs, if not interrupted
    $rootScope.$on('$cordovaBeacon:peripheralManagerDidStartAdvertising', function (event, pluginResult) {
        // event happened when advertisement starts
        // stop adv after 2 seconds
        console.log('os adv started');

        // indicate we have used the provided data
        newdata = false;
        advertising = true;
        locked = false;

        // success, change icon color to blue
        try {
            document.getElementById("wave-logo").style.color='#0099ff'; // blue
        } catch( e ){
            console.log( 'icon '+e );
        }

        // since we can't get a callback from $cordovaBeacon.stopAdvertising when it actually stopped
        stopTimer = setTimeout( $cordovaBeacon.stopAdvertising, iB_ad_time );
        stoppedTimer = setTimeout( adStopped, iB_ad_time+100 );


    });

    function adStopped(){

        advertising = false;
        try {
            document.getElementById("wave-logo").style.color='#333333';
        } catch( e ){} // gray
        console.log('adv stopped' );

        // restart ad for next iBeacon
        if( newdata ) {
            // call startAd again after some timeout
            startAdTimer = setTimeout( startAd, 400);
            starting = true;
        }
    }


    // function called, when we are safe to start the real advertisement
    function startAd() {
        var sequence = CRED.credentials.sequence;

        //console.log( "full ibeacon="+angular.toJson( g_iBeacon ));

        if( typeof cordova !== "undefined" ) {

            var identifier = 'MCP'+sequence.toString();
            var beaconRegion = new cordova.plugins.locationManager.BeaconRegion( identifier, g_iBeacon.uuid, g_iBeacon.major, g_iBeacon.minor );
            $cordovaBeacon.startAdvertising( beaconRegion, g_iBeacon.measuredPower );

            starting = false;
            locked = true;
        }
    }

    // turn an array of uint8 into a number
    function bytevalue( seqbytes ) {
        var val = 0;
        for( var i = seqbytes.length-1; i >= 0; i-- ){
            val = val*256 + seqbytes[i];
        }
        return val;
    }

    function swap16(val) {
        return ((val & 0xFF) << 8)
            | ((val >> 8) & 0xFF);
    }

    function print2bytes( iarray, index ) {
        // print 2 bytes with leading zero
        var outstr = '';
        if( iarray.length < index+2 ) {
            return outstr;
        }
        for ( var i = index; i < index+2; i++) {
            if( iarray[i] < 16 ) {
                outstr += '0';
            }
            outstr += iarray[i].toString(16);
        }
        return outstr;
    }

    function printuuid( iarray ) {
        // make the UUID string
        var uuid = '';
        if( iarray.length < 16 ){
            return uuid;
        }
        uuid  = print2bytes( iarray, 0 );
        uuid += print2bytes( iarray, 2 );
        uuid += '-';
        uuid += print2bytes( iarray, 4 );
        uuid += '-';
        uuid += print2bytes( iarray, 6 );
        uuid += '-';
        uuid += print2bytes( iarray, 8 );
        uuid += '-';
        uuid += print2bytes( iarray, 10 );
        uuid += print2bytes( iarray, 12 );
        uuid += print2bytes( iarray, 14 );
        return uuid;
    }


    return {
        
        // make an iBeacon from the encrypted MCP
        MCPtoiBeacon: function( thisMCP ) {

            g_iBeacon.uuid = ''; // uuid string for g_iBeacon
            g_iBeacon.major = 0;
            g_iBeacon.minor = 0;
            // length of the package is 3 seq + 2 source + 2 dest + payload + 8 hmac + 1 ttl
            // length we set into TX field is payload + 2
            g_iBeacon.measuredPower = thisMCP.length - 3 - 2 - 8 - 1;

            // make the UUID string from payload part
            var index = 0;
            var uuidsource = new Uint8Array(16);
            len = thisMCP.length - 8 - 1;

            if (len <= 16) {

                // copy MCP part into uuid
                for (index = 0; index < (thisMCP.length - 8 - 1); index++) {
                    uuidsource[ index ] = thisMCP[ index ];
                }
                // shorter, just copy the hmac part, after the part we care about
                for (; index < 16; index++) {
                    uuidsource[ index ] = thisMCP[ index + 2 ];
                }
            } else {

                // use major number for the last 2 bytes of payload
                for (index = 0; index < 16; index++) {
                    uuidsource[ index ] = thisMCP[ index ];
                }
                //g_iBeacon.major = ( thisMCP[ 16 ] * 256 ) + thisMCP[ 17 ];
                g_iBeacon.major = swap16( bytevalue( thisMCP.subarray( 16, 18 )));
            }
            // must be exactly 16 bytes long
            g_iBeacon.uuid = printuuid( uuidsource );
            // minor is first 2 bytes of HMAC
            //g_iBeacon.minor = ( thisMCP[ length-8-1 ] * 256 ) + thisMCP[ length-8-1+1 ];
            g_iBeacon.minor = swap16( bytevalue( thisMCP.subarray( thisMCP.length-8-1, thisMCP.length-8-1+2)));

        },

        transmit: function() {

            // the timer for start advertising is running, but hasn't started yet
            if( starting ){
                //console.log('restart ads')
                clearTimeout( startAdTimer );
                startAdTimer = setTimeout( startAd, 400 );
                return;
            }

            // we are advertising already
            if( advertising ) {
                console.log("already advertising");
                // cancel the advertisement by calling stopAd
                clearTimeout( stopTimer );
                clearTimeout( stoppedTimer );
                $cordovaBeacon.stopAdvertising();
                stoppedTimer = setTimeout( adStopped, 100 );

                // indicate we have new data to restart ads, used by adStopped
                newdata = true;
                return;
            }

            if( locked ) {
                // state locked means that we have to wait for the iOS to start the ads
                // otherwise we can't stop them before they have started
                console.log("locked");
                return;
            }
            // first startup
            console.log('first ad start');
            startAdTimer = setTimeout( startAd, 100 );
            starting = true;
        }
    };
})
;