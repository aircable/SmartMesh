// MESH services

appServices.factory('MESH', function( $rootScope, CRED, $mdToast, $q ) {

    var that = this;
    // global varialbe devices and groups
    var meshservice = { callback: function(){} };
    // get sequence from storage
    var scanning = false;

    var credentials = CRED.credentials;
    const MESH_SERVICE_UUID                     = 0xFEF1;
    const NETWORK_KEY_UUID                      = "c4edc000-9daf-11e3-8000-00025b000b00";
    const DEVICE_ID_UUID                        = 0xC4EDC0009DAF11E3800200025B000B00;
    const DEVICE_UUID_UUID                      = 0xC4EDC0009DAF11E3800100025B000B00;
    const MTL_CONTINUATION_CP_UUID              = "c4edc000-9daf-11e3-8003-00025b000b00";
    const MTL_COMPLETE_CP_UUID                  = "c4edc000-9daf-11e3-8004-00025b000b00";
    const MTL_TTL_UUID                          = 0xC4EDC0009DAF11E3800500025B000B00;
    const MESH_APPEARANCE_UUID                  = 0xC4EDC0009DAF11E3800600025B000B00;

    // Bluetooth Characteristics and services
    var bluetoothDevice = null;
    var chosenService = null;
    var MCPchar = null;
    var MCPPchar = null;
    var netKeyChar = null;


    meshservice.scan = function( credentials ) {

        var deferred = $q.defer();
        // checks for devices without Bluetooth, no call to ble plugin, scanservice is noop
        if (typeof ble !== "undefined" && ble.startScan) {

            // scan for all services with service result
            // ble.js needs modification,  Uint8Array returned, not just ArrayBuffer
            // import script ble.js in index.html

            if (!scanning) {
                // only call once
                scanning = true;
                ble.startScan([],
                    // .then
                    function (peripheral) {
                        // call controller function on scan result
                        //console.log("mesh device");
                        try {
                            //console.log( '.' );
                            var MCP = new Uint8Array( peripheral.advertising.kCBAdvDataServiceData.FEF1 );
                            //console.log( "MCP: "+ MCP );
                            meshservice.callback( MCP );
                        } catch( e ) {

                            try {
                                var EDDY = new Uint8Array( peripheral.advertising.kCBAdvDataServiceData.FEAA );
                                console.log('Eddystone');
                                // todo
                            } catch (e) {
                            }
                        }

                    },
                    // .error
                    function (error) {
                        scanning = false;
                        console.log("error starting ble scan");
                        // ignore
                    }
                );
            }

        } else if ( navigator.bluetooth ) {

            // Web Bluetooth: https://googlechrome.github.io/samples/web-bluetooth/index.html
            // https://github.com/googlechrome/samples/tree/gh-pages/web-bluetooth
            // https://github.com/WebBluetoothCG/web-bluetooth
            // https://webbluetoothcg.github.io/web-bluetooth/

            console.log("Browser can do BLE");
            // MAC OSX Chrome Canary can do BLE
            deferred.resolve();

            connectfilter = {filters: [{services: [ MESH_SERVICE_UUID ]}]};

            scanfilter = {filters: [{serviceUUID: [ MESH_SERVICE_UUID ]}],
                options: {
                    keepRepeatedDevices: true,
                    acceptAllAdvertisements: true,
                }
            };


/*
            try {
                navigator.bluetooth.requestLEScan( scanfilter )
                    .then(function () {
                        navigator.bluetooth.addEventListener('advertisementreceived', handleConnect );
                    });
            } catch( e ) {
                console.log( 'cannot do scaning yet, '+ e);
            }
*/
            // this function requires a user gesture, before and while to select a device
            navigator.bluetooth.requestDevice( connectfilter )
                .then( function ( device ) {
                    if( !device.gatt.connected ) {
                        console.log('Name: ' + device.name);
                        bluetoothDevice = device;
                        bluetoothDevice.addEventListener( 'gattserverdisconnected', handleDisconnect );
                        //return bluetoothDevice.gatt.connect();
                        // exponential backoff not working yet
                        return connect();
                    } else {
                        // Already connected.
                        console.log( "already connected");
                        return Promise.resolve();
                    }
                })
                .catch( function (error) {
                    console.log('Argh! ' + error);
                    try {
                        document.getElementById("bluetooth-logo").style.display = 'none';
                    } catch( e ){}
                    deferred.reject();
                });

            return deferred.promise;
        }
    };

            function connectServices( server ) {
                console.log('server ' + server);
                server.getPrimaryService(MESH_SERVICE_UUID)
                    .then(function (service) {
                        chosenService = service;
                        console.log('service ' + service);
                        return chosenService.getCharacteristic(MTL_COMPLETE_CP_UUID)
                            .then(function (characteristics) {
                                console.log("start note");
                                MCPchar = characteristics;
                                MCPchar.startNotifications()
                                    .then(function () {
                                        console.log("notification started");
                                        MCPchar.addEventListener('characteristicvaluechanged', onCompletePacket);
                                        // we got one notification, start the second
                                        chosenService.getCharacteristic(MTL_CONTINUATION_CP_UUID)
                                            .then(function (char2) {
                                                MCPPchar = char2;
                                                MCPPchar.startNotifications()
                                                    .then(function () {
                                                        console.log('note 2');
                                                        MCPPchar.addEventListener('characteristicvaluechanged', onContinuationPacket);
                                                        // change icon color to blue
                                                        try {
                                                            document.getElementById("bluetooth-logo").style.display = '';
                                                        } catch (e) {
                                                            console.log("logo display " + e);
                                                        }
                                                    })
                                            })
                                    });
                            })
                    });
            }
/*
                .then( function() {
                    return chosenService.getCharacteristic( NETWORK_KEY_UUID );
                })
                .then( function( char ) {
                    netKeyChar = char;
                    return netKeyChar.readValue();
                })
                .then( function( value ){
                    // Chrome 50+ returns DataView object
                    value = value.buffer;
                    console.log( "bridge key "+value)
                    return value;
                })
                .catch(function (error) {
                    console.log('Argh! ' + error);
                    try {
                        document.getElementById("bluetooth-logo").style.display = 'none';
                    } catch( e ){}
                    deferred.reject();
                });
 */

            // This function keeps calling "toTry" until promise resolves or has
            // retried "max" number of times. First retry has a delay of "delay" seconds.
            // "success" is called upon success.
            function exponentialBackoff( max, delay, toTry, success, fail ) {
                return toTry()
                    .then( function( result ) {
                        return success( result )
                    })
                    .catch( function() {
                        if (max === 0) {
                            return fail();
                        }
                        console.log('Retrying in ' + delay + 's... (' + max + ' tries left)');
                        setTimeout( function() {
                            exponentialBackoff( --max, delay * 2, toTry, success, fail );
                        }, delay * 1000);
                    });
            }


            function connect() {
                var deferred = $q.defer();

                exponentialBackoff(3 /* max retries */, 2 /* seconds delay */,
                    function toTry() {
                        console.log('Connecting to Bluetooth Device... ');
                        return bluetoothDevice.gatt.connect();
                    },
                    function success( server ) {
                        console.log('Bluetooth connected'+angular.toJson( server ));
                        // show icon
                        try {
                            document.getElementById("bluetooth-logo").style.display = '';
                        } catch( e ){}

                        connectServices( server );
                        return deferred.resolve();
                    },
                    function fail() {
                        console.log('Failed to reconnect.');
                        // now object is not longer valid
                        bluetoothDevice = null;
                        try {
                            document.getElementById("bluetooth-logo").style.display = 'none';
                        } catch( e ){}
                        $mdToast.show({
                            controller: 'toastController',
                            templateUrl: 'toast.html', // in index.html
                            hideDelay: 2000,
                            position: 'top',
                            locals: {
                                displayOption: {
                                    title: "SmartMesh Bridge: failed to reconnect"
                                }
                            }
                        });
                        deferred.reject();
                    });

                return deferred.promise;
            }


            function handleConnect( event ) {
                console.log( 'bridge discovered: '+event.serviceData );
                try {
                    navigator.bluetooth.BluetoothLEScan.stop();
                } catch( e ) {}
            }


            function handleDisconnect( event ) {
                console.log( 'bridge disconnected ' );
                try {
                    document.getElementById("bluetooth-logo").style.display = 'none';
                } catch( e ){}
                // try to connect again
                if( bluetoothDevice ) {
                    bluetoothDevice = null;
                }
//                    connect();
//                } else {
                    meshservice.scan( credentials );
//                }
            }

            var MCPPpkt = null;
            var MCPpkt = null;

            function onCompletePacket( event ) {
                // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
                // contains an ArrayBuffer
                MCPpkt = new Uint8Array( event.target.value.buffer );
                if( MCPPpkt != null ) {
                    var MCP = new Uint8Array(MCPPpkt.length + MCPpkt.length);
                    MCP.set(MCPPpkt, 0);
                    MCP.set(MCPpkt, MCPPpkt.length);
                    MCPPpkt = null; // clear packet for next calls
                } else {
                    // already created complete packet
                    var MCP = MCPpkt;
                }

                //console.log( "MCP: "+ MCP );
                // process MCP packet
                meshservice.callback( MCP );

            }

            // first we get a partial packet, then the final
            function onContinuationPacket( event ) {
                // just save packet
                MCPPpkt = new Uint8Array( event.target.value.buffer );
            }



    // gets raw MCP as Uint8Array
    const ATT_MTU = 23;                             // maximum transfer units for GATT write
    const MESH_LONGEST_MSG_LEN = 27;                // longest mesh package
    const ATT_WRITE_MAX_DATALEN = ATT_MTU - 3;      // 3 bytes needed for csr mesh type packet indicator 0x16FEF1
                                                    // ad type is AD_TYPE_SERVICE_DATA_UUID_16BIT = 0x16
    meshservice.sendMCP = function( mcp_pkt ){
        if( MCPchar != null ){
            if( mcp_pkt.length > ATT_WRITE_MAX_DATALEN ) {
                //console.log( 'mcp '+ typeof mcp_pkt + mcp_pkt );
                var first_part = mcp_pkt.subarray( 0, ATT_WRITE_MAX_DATALEN );
                MCPPchar.writeValue( first_part )
                    .then( function(){
                        console.log( 'writeChar1 ' + first_part );
                        // remove the part we have sent
                        mcp_pkt = mcp_pkt.subarray( ATT_WRITE_MAX_DATALEN, mcp_pkt.length );
                        // success
                        try {
                            document.getElementById("bluetooth-logo").style.display = '';
                        } catch( e ){}

                        MCPchar.writeValue( mcp_pkt )
                            .then( function() {
                                console.log( 'writeChar2 ' + mcp_pkt );
                                // success
                                try {
                                    document.getElementById("bluetooth-logo").style.display = '';
                                } catch( e ){}
                            })
                            .catch( function ( e ) {
                                console.log("writeChar2 " + e );
                                try {
                                    document.getElementById("bluetooth-logo").style.display = 'none';
                                } catch( e ){}
                                // just try again
                                MCPchar.writeValue( mcp_pkt )
                                    .then( function() {
                                        console.log( 'writeChar2 second ok')
                                })
                            });
                    })
                    .catch( function ( e ) {
                        // maybe try again....
                        console.log('writeChar1 ' + e );
                        // success
                        try {
                            document.getElementById("bluetooth-logo").style.display = 'none';
                        } catch( e ){}
                        // stop here
                        return false;
                    });
            } else {

                MCPchar.writeValue(mcp_pkt)
                    .then(function () {
                        console.log('writeChar0 ' + mcp_pkt);
                        // success
                        try {
                            document.getElementById("bluetooth-logo").style.display = '';
                        } catch (e) {
                        }
                    })
                    .catch(function (e) {
                        console.log("writeChar0 " + e);
                        try {
                            document.getElementById("bluetooth-logo").style.display = 'none';
                        } catch (e) {
                        }
                    });
            }
        }
    };


    // setup callback to controller on discovery of a new device
    meshservice.onDevice = function( callback ) {
        meshservice.callback = callback;
    };


    meshservice.getNextSequence = function() {
        credentials.sequence++;
        if( credentials.sequence > 0x1FFFFF ) { // 21 bits
            credentials.sequence = 1;
        }
        //  store sequence
        CRED.saveSequence();
        //console.log( "new seq "+credentials.sequence);
        return credentials.sequence;
    };

    return meshservice;

});