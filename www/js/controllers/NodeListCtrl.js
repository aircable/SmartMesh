/*
 Copyright 2016 Wireless Cables Inc.
 */
// node list page controller, uses CRED service to to present stored data to html view.
appControllers.controller('nodeListCtrl', function( $scope, $rootScope, $timeout, $interval, $state, $stateParams,
                                      $mdDialog, $mdToast,
                                      MESH, IBEACON, MCP, MQTT, CRED, TXD ) {


    const CONFIG_PKT_LENGTH = 9;

    // block type we receive
    const MCP_BLK_ACK = 0x70;         // block requires an ack package
    const MCP_BLOCK = 0x73;         // for status messages
    const MCP_LIGHT = 0x8A;         // setRGB and light status, for discovering new bulbs
    const MCP_POWER_SET_STATE = 0x89;         // only used in SmartDimmer
    const MCP_PING = 0x82;         // request subcode 0, response subcode 1
    const MCP_PING_REQUEST = 0;
    const MCP_PING_RESPONSE = 1;
    const MCP_PING_STATUS = 2;    // and beyond is status
    const MCP_CONFIG = 0x77;      // config packet
    const MCP_CONFIG_NAME = 1;    // first packet is name
    const MCP_CONFIG_DATA = 2;    // second is fixed config data
    const MCP_LIGHT_STATUS = 8;    // subcode 8 is response from light getting command
    const MCP_LIGHT_SETLEVEL_NOACK = 0;    // subcode set level command with ack, 1
    const MCP_LIGHT_SETLEVEL = 1;    // subcode set level command with ack, 2 bytes payload
    const MCP_LIGHT_SETWHITE = 10; // set level, no ack, one byte payload
    const MCP_MULTIBLOCK = 0x75; // sequence and length


    var credentials = CRED.credentials;

    function uniq(a, param){
        return a.filter(function(item, pos, array){
            return array.map(function(mapItem){ return mapItem[param]; }).indexOf(item[param]) === pos;
        })
    }

    // It will initial all variable data and let the function works when page load.
    $scope.initialForm = function () {

        //$scope.isLoading is the variable that use for check statue of process.
        $scope.isLoading = true;

        //$scope.isAnimated is the variable that use for receive object data from state params.
        //For enable/disable row animation.
        $scope.isAnimated = $stateParams.isAnimated;

        // $scope.filterText is the variable that use for searching.
        $scope.filterText = "";

        $scope.serialdata = CRED.serialdata;

        // reference to the devices in CRED factory, have been initialized through SETTINGS
        $scope.devices = CRED.devices;

        $scope.ownid = CRED.credentials.ownid;


        //console.log("start: " + $scope.devices.length + " devices=" + angular.toJson($scope.devices));
        uniq( $scope.devices, "source" );
        //console.log("uniq: " + $scope.devices.length + " devices=" + angular.toJson($scope.devices));
        // send ping request to everybody in the list
        for( i = 0; i < $scope.devices.length; i++ ) {
            //console.log( "start ping "+$scope.devices[i].source );
            $scope.devices[i].edit = true; // show it grayed out
            sendPing( $scope.devices[i].source );
        }


        // The function for loading progress.
        $timeout(function () {
            if ($scope.isAndroid) {
                jQuery('#note-list-loading-progress').show();
            }
            else {
                jQuery('#note-list-loading-progress').fadeIn(700);
            }
        }, 400);


        $timeout(function () {

            jQuery('#note-list-loading-progress').hide();
            jQuery('#note-list-content').fadeIn();
            $scope.isLoading = false;

            try {
                // show interfaces BT and MQTT as disconnected
                document.getElementById("bluetooth-logo").style.color = '#0f0f0f'; // gray
                document.getElementById("wave-logo").style.color = '#0f0f0f'; // gray
            } catch( e ) {}

        }, 5000);// End loading progress.

    };//End initialForm.

    // navigateTo is for navigate to other page
    // by using targetPage to be the destination page
    // and sending objectData to the destination page.
    // Parameter :
    // targetPage = destination page.
    // objectData = object that will sent to destination page.
    $scope.navigateTo = function( targetPage, objectData ) {
        $state.go( targetPage, {
            device: objectData,
            actionDelete: (objectData != null)
        });
    };// End navigateTo.


    // click icons on top of page to reconnect
    $scope.reconnectBT = function() {
        // reconnect BT and MQTT
        console.log( "reconnect");
        MESH.scan( CRED.credentials );
    };


    $scope.addCSRlight = function( csrid ){

        newdevice = {};
        newdevice.source = csrid; // default value
        newdevice.device_type = 0x1061;
        newdevice.lightlevel = 0;
        newdevice.newid = "8001";
        console.log( "new CSRlight");
        $scope.devices.push(newdevice);
        $timeout(function () {
            try{ $scope.$apply(); } catch(e){}
        });
        // update the device in localstorage
        newdevice.age = 0;
        CRED.updateDevice( newdevice );

    };




    function sendPing( destination ) {
        // send MCP_LIGHT message as iBeacon to the source
        meshcmd = new Uint8Array(4);
        meshcmd[0] = MCP_PING;                // main package type ping
        meshcmd[1] = MCP_PING_REQUEST;        // subcode request
        meshcmd[2] = 1;                       // non-zero for request config
        meshcmd[3] = 0;                       // TID

        TXD.transmit_mesh( destination, meshcmd, 1 );

    }


    function storeDeviceStatus( updatedevice, length, index ) {
        var device_copy = {};
        index = index | 0;

        //console.log("#dev " + $scope.devices.length);
        // find the device corresponding device in the global array
        for (i = 0; i < $scope.devices.length; i++) {
            // found it
            if ($scope.devices[i].source == updatedevice.source) {
                //console.log("removing the element from the array, index: ", index);
                // gives an array back, we need object
                device_copy = $scope.devices.splice(i, 1)[0];
                // check for multiples
                continue;
            }
            if( !$scope.devices[i].source ){
                // error, is undefined
                $scope.devices.splice(i, 1)[0];
                continue;
            }
            //console.log("check " + $scope.devices[i].source + " age " + CRED.credentials.age + " " + $scope.devices[i].age);

            // check how old the device in storage is, remove it when too old
            if (( $scope.devices[i] ) && (( CRED.credentials.age - $scope.devices[i].age ) > 100)) {
                // remove from NVM
                console.log("remove " + $scope.devices[i].source + " age " + (CRED.credentials.age - $scope.devices[i].age));
                CRED.removeDevice($scope.devices[i].source);
                $scope.devices.splice(i, 1);
            }

            // check config age and request update
            if (( $scope.devices[i] ) && (( CRED.credentials.age - $scope.devices[i].confage ) > 300)) {
                console.log("ping request to " + updatedevice.source + " age " + (CRED.credentials.age - $scope.devices[i].confage));
                sendPing(updatedevice.source);
                // one ping is enough
                $scope.devices[i].confage = CRED.credentials.age;
            } else if (( $scope.devices[i] ) && (( CRED.credentials.age - $scope.devices[i].confage ) > 500)) {
                // remove from NVM
                console.log("noanswer " + updatedevice.source + " age " + (CRED.credentials.age - $scope.devices[i].age));
                CRED.removeDevice($scope.devices[i].source);
                $scope.devices.splice(i, 1);
            }
        }

        // merge the new property into the existing device
        for (var lattr in updatedevice) {
            // do not overwrite old state and conf yet, we do that later correctly
            if (( lattr !== "state" ) && ( lattr !== "conf" )) {
                device_copy[lattr] = updatedevice[lattr];
            }
        }

        // if config is available, add to existing or increase size
        if (updatedevice.conf) {
            if( index == 0 ) return;
            if( !device_copy.conf )
                device_copy.conf = [];

            var newconf = {};
            var newmaxlength = ((( index-1 ) * CONFIG_PKT_LENGTH ) + length );
            if( newmaxlength <= device_copy.conf.length ) {
                // same size and existing
                newconf = new Uint8Array( device_copy.conf.length );
            } else {
                // getting bigger or new
                newconf = new Uint8Array( newmaxlength );
            }
            // copy existing
            for (i = 0; i < device_copy.conf.length; i++) {
                newconf[i] = device_copy.conf[i];
            }

            // overwrite with conf package
            //console.log( "CONF: "+angular.toJson( updatedevice.conf ));
            for (i = 0; i < length; i++) {
                newconf[ ((index - 1) * CONFIG_PKT_LENGTH) + i ] = updatedevice.conf[ i ];
            }

            // make primitive array
            device_copy.conf = Array.from(newconf);
            //record when we go the last conf update
            device_copy.confage = CRED.credentials.age;
        }

        // if state is available, copy state and make it primitive array
        if (updatedevice.state) {
            if (index == 0) return;
            if (!device_copy.state)
                device_copy.state = [];

            var newstate = {};
            var newmaxlength = ((( index - 1 ) * CONFIG_PKT_LENGTH ) + length );

            if (newmaxlength <= device_copy.state.length) {
                // same size and existing
                newstate = new Uint8Array(device_copy.state.length);
            } else {
                // getting bigger or new
                newstate = new Uint8Array(newmaxlength);
            }
            // copy existing
            for (i = 0; i < device_copy.state.length; i++) {
                newstate[i] = device_copy.state[i];
            }
            // overwrite with conf package
            //console.log("STAT: "+index+"/"+length+":" + angular.toJson(updatedevice.state));
            for (i = 0; i < length; i++) {
                newstate[((index - 1) * CONFIG_PKT_LENGTH) + i] = updatedevice.state[i];
            }
            // make primitive array
            device_copy.state = Array.from(newstate);
            // record when we got the last state update
            device_copy.statage = CRED.credentials.age;
        }

        // enter object back into storage
        if (!device_copy.masp) {
            device_copy.age = CRED.credentials.age;
        } else {
            device_copy.age = CRED.credentials.age+80; // MASP packages don't live long
        }
        console.log("store " + angular.toJson(device_copy));
        $scope.devices.push(device_copy);
        // update the device in localstorage
        CRED.updateDevice(device_copy);
        uniq( $scope.devices, 'source');

        //if(( !device_copy.conf )&&( !device_copy.masp )){
        //    console.log("ping request to " + device_copy.source);
        //    sendPing(device_copy.source);
        //}
        // update the screen with the devices content, ngrepeat
        $timeout(function () {
            try{ $scope.$apply(); } catch(e){}
        });

    }


    function updateDeviceDisplay(updatedevice) {

        //LightCtrl.displaySmartDimmer( )

        //Search for corresponding device in the global array and update the values
        // $scope.devices is MESH.devices
        var didupdate = false;

        angular.forEach($scope.devices, function (knowndevice) {
            if (knowndevice.source == updatedevice.source) {
                if (updatedevice.data[1] == 0x10) {
                    // first status package, copy from index 3 , max 8 bytes
                    knowndevice.enabled = true;
                    for (var i = 3; i < updatedevice.data.length; i++) {
                        knowndevice.data[i - 3] = updatedevice.data[i];
                    }
                } else if (updatedevice.data[1] == 0x90) {
                    // second status package, overwrite second part
                    for (var i = 3; i < updatedevice.data.length; i++) {
                        knowndevice.data[i + 8 - 3] = updatedevice.data[i];
                    }
                }
                knowndevice.device_type = 0x1060; // type 4186
                didupdate = true;
                // update the device in localstorage
                knowndevice.age = CRED.credentials.age;
                //console.log( 'chg '+ angular.toJson(knowndevice) );
                CRED.updateDevice( knowndevice );
            }
        });

        if (!didupdate) {
            //console.log( 'new '+ angular.toJson(updatedevice) );
            newdevice = {};
            newdevice.seq = updatedevice.seq;
            newdevice.source = updatedevice.source;
            newdevice.dest = updatedevice.dest;
            newdevice.device_type = updatedevice.device_type;

            newdevice.data = [];
            for( i=0; i<18; i++ ){
                newdevice.data[i] = 0;
            }
// checking for two status messages from smartdimmer 0x1060 and 0x9060
// REMOVE
            try {
                if (updatedevice.data[1] == 0x10) {
                    // first status package, copy from index 3 , max 8 bytes
                    for (var i = 3; i < updatedevice.data.length; i++) {
                        newdevice.data[i - 3] = updatedevice.data[i];
                    }
                } else if (updatedevice.data[1] == 0x90) {
                    // second status package, contains only settings, second part
                    for (var i = 3; i < updatedevice.data.length; i++) {
                        newdevice.data[i + 8 - 3] = updatedevice.data[i];
                    }
                }
            } catch( e ){
                return;
            }
// REMOVE

            $scope.devices.push(newdevice);
            $timeout(function () {
                $scope.$apply();
            });
            // update the device in localstorage
            newdevice.age = CRED.credentials.age;
            CRED.updateDevice( newdevice );
            didupdate = false;
        }

        // update the screen with the devices content, ngrepeat
        //$timeout(function () {
            $scope.$apply();
        //});

    }



    // process mesh package we get from MQTT and from MESH
    // collect status messages to build full package
    var config_msg = {};
    var last_serial_sequence = 0;


    function processMeshPackage( meshpackage ) {
        //console.log( "mesh "+ angular.toJson( meshpackage ));
        var meshdata = {};
        // decrypt package
        try {
            var encrypted = new Uint8Array( meshpackage );
            if( MCP.check( encrypted, credentials.hash )) {
                meshdata = MCP.decode( encrypted, credentials.hash );
            } else {
                // not a valid mcp package, check MASP package
                meshdata = MCP.masp_check( encrypted );
                //meshdata = MCP.decode( encrypted, credentials.hash );
                //console.log( "not valid "+(meshpackage.mesh[3]*256+meshpackage.mesh[4]).toString(16));

                if( meshdata.data ) {
                    //console.log( "masp "+angular.toJson( meshdata ));
                    // interpret the data
                    // 0: type, 1-4 hash, 5-6 source, 7 org, 8-16 name
                    if( meshdata.data[0] == 0 ) {
                        // appearance name, length fixed 9
                        if( meshdata.data[7]== 202 ) { // must be AIRcable organization 0xCA from USB 0x16ca
                            meshdata.masp = meshdata.data[0];
                            /**/meshdata.name = String.fromCharCode.apply(String, meshdata.data.subarray(8, 17)).replace(/\0/g, '');
                            meshdata.source = (meshdata.data[5] + meshdata.data[6] * 256);
                            meshdata.name += "_";
                            for( i=1; i<5; i++ ) {
                                // append hash number to name
                                var num = meshdata.data[i];
                                if( num < 16 ) {
                                    meshdata.name += "0";
                                }
                                meshdata.name += num.toString(16);
                            }
                            console.log( "assoc from " + meshdata.source + ", name " + meshdata.name );
                        }

                    } else if( meshdata.data[0] ==  1 ) {
                        // get UUID
                        console.log( "got uuid");
                    }
                    delete meshdata.data;
                    storeDeviceStatus( meshdata, 0 );
                }
                return;
            }
        } catch (e) {
            // ignore when HMAC failed
            //console.log( "mcp error "+ e);
            return;
        }

        //console.log( "mesh "+meshdata.source+" dest "+meshdata.dest+" type "+ meshdata.data[0]+" len "+meshdata.data.length);
        // ignore packages sent by myself
        if( meshdata.source == credentials.ownid ) {
            console.log( "own "+meshdata.source+" dest "+meshdata.dest+" type "+ meshdata.data[0]+" len "+meshdata.data.length);
            return;
        }

        //console.log( 'config '+ angular.toJson(meshdata) );

        if (( meshdata.data[0] === MCP_BLOCK ) && ( meshdata.dest === 0x7FFF )) {
            // old style, status and config via data block
            meshdata.device_type = 4192;
            updateDeviceDisplay( meshdata );


        } else if (( meshdata.data[0] === MCP_LIGHT ) && ( meshdata.data[1] == MCP_LIGHT_STATUS )) {
            // CSR light status messages
            var lightno = meshdata.source;
            var level = Math.floor(meshdata.data[3] * 20 / 51);
            console.log("light 0x" + lightno.toString(16) + " level " + level.toString(10));

        // standard status information
        } else if(( meshdata.data[0] === MCP_PING )
            &&( meshdata.data[1] === MCP_PING_RESPONSE )) { // 1
            if( meshdata.data.length < 11 ) return;
            meshdata.device_type = meshdata.data[2] * 256 + meshdata.data[3];
            meshdata.vendor = meshdata.data[4] * 256 + meshdata.data[5];
            meshdata.time = 0;
            for (i = 6; i < 10; i++) {
                meshdata.time = meshdata.time * 256 + meshdata.data[i];
            }
            meshdata.battery = meshdata.data[10]/10;

            // remove data object since we processed all
            delete meshdata.data;
            //console.log( "ping from "+meshdata.source+" type "+meshdata.device_type );
            storeDeviceStatus( meshdata, 0 );


        } else if(( meshdata.data[0] === MCP_PING )
            &&( meshdata.data[1] >= MCP_PING_STATUS )) {  // >=2

            //console.log("state "+angular.toJson(meshdata));
            // receiving status information, create status array
            // seq is packet number for device specific stat
            var seq = meshdata.data[1] - MCP_PING_STATUS + 1;
            var len = meshdata.data.length - 2;

            config_msg = {};
            config_msg.source = meshdata.source;
            config_msg.state = new Uint8Array( CONFIG_PKT_LENGTH );

            for (i = 0; i < len; i++) {
                // copy received part into the places
                config_msg.state[ i ] = meshdata.data[ 2 + i ];
            }
            //console.log( "state "+config_msg.source+ " idx "+seq+" "+angular.toJson( config_msg.state ));
            storeDeviceStatus( config_msg, len, seq );


        } else if(( meshdata.data[0] == MCP_CONFIG )&&
                ( meshdata.data[1] == MCP_CONFIG_NAME )){  // 1
            if( meshdata.data.length < 11 ) return;
            // fist config msg is name, one full pkg
            meshdata.name = "";
            for (i = 2; i < meshdata.data.length; i++) {
                meshdata.name += String.fromCharCode( meshdata.data[i] );
            }
            // remove data object since we processed all
            //console.log("name " + meshdata.name);
            delete meshdata.data;
            storeDeviceStatus( meshdata, 0 );

        } else if(( meshdata.data[0] == MCP_CONFIG )&&
            ( meshdata.data[1] == MCP_CONFIG_DATA )){  // 2
            if( meshdata.data.length < 11 ) return;
            // second part is standard configuration
            meshdata.density = meshdata.data[2];
            meshdata.duty_cycle = meshdata.data[3];
            meshdata.behavior = meshdata.data[4];
            // groups
            meshdata.group_0 = meshdata.data[5] + ( meshdata.data[6] * 256 )
            meshdata.group_1 = meshdata.data[7] + ( meshdata.data[8] * 256 )
            meshdata.group_2 = meshdata.data[9] + ( meshdata.data[10] * 256 )

            // remove data object since we processed all
            delete meshdata.data;
            //console.log("state "+angular.toJson(meshdata));
            storeDeviceStatus( meshdata, 0 );


        } else if(( meshdata.data[0] == MCP_CONFIG )&&
            ( meshdata.data[1] > MCP_CONFIG_DATA )){  // >2

            // rest of config contains device specifics
            var seq = meshdata.data[1] - MCP_CONFIG_DATA ;
            // index is sequence * 9 for the 9 byte data block
            var len = meshdata.data.length - 2;

            if(( len > 0 )&&( seq < 253 )) { // don't store config FF packets

                config_msg = {};
                config_msg.source = meshdata.source;
                config_msg.conf = new Uint8Array(CONFIG_PKT_LENGTH);

                for (i = 0; i < len; i++) {
                    // copy received part into the places
                    config_msg.conf[i] = meshdata.data[2 + i];
                }

                console.log("conf " + config_msg.source + " idx " + seq + " len " + len + " " + angular.toJson(config_msg.conf));
                // remove data object since we processed all
                storeDeviceStatus(config_msg, len, seq);

            }

        // SERIAL DATA STREAM
        } else if( meshdata.data[0] === MCP_MULTIBLOCK ) {

            // serial messages, just keep one package in store as is, with sequence no
            // just mark it device type serial data
            meshdata.device_type = 0x105B;
            // modify source to be the same as destination for storage
            // not to overwrite the status messages from the same source
            meshdata.source++;
            console.log("ser " + meshdata.data[1] + " " + angular.toJson(meshdata));

            // eliminate duplicates
            if (meshdata.data[1] === last_serial_sequence) return;
            if (meshdata.data[1] + 1 === last_serial_sequence) return;
            if (meshdata.data[1] + 2 === last_serial_sequence) return;
            if ((meshdata.data[1] === 1 )&&( last_serial_sequence === 1 )) return;

            var sermsg = '';
            for( i = 2; i < meshdata.data.length; i++ ) {
                sermsg += String.fromCharCode(meshdata.data[i]);
            }
            console.log( "send "+meshdata.data[1]+" ser "+sermsg);
            CRED.pushSerialData( sermsg );

            last_serial_sequence = meshdata.data[1];
            // update the screen with the devices content, ngrepeat
            $timeout(function () {
                try{ $scope.$apply(); } catch(e){}
            });

        } else {
            console.log("mcp" + meshdata.data[0].toString(16)+" sub "+meshdata.data[1].toString(10)+" dest "+meshdata.dest);
        }
    }



    var noMQTTTimer = null;
    function showNoData() {
        try {
            document.getElementById("wave-logo").style.color = '#333333'; // gray
        } catch( e ){}
    }

    // initialize the major callbacks from the factories

    MQTT.onMessage( function( topic, payload ) {
        //console.log( 'incoming topic: ' + topic + ' and payload: ' + payload );
        // show connected
        try {
            document.getElementById("wave-logo").style.color = '#52FF00'; // bright green
            // restart 30 seconds timer
            clearTimeout( noMQTTTimer );
            noMQTTTimer = setTimeout( showNoData, 30000 );
        } catch( e ){}

        // mesh topic is single object with update for devices
        if( topic == CRED.credentials.netid ) {

            var meshpackage = JSON.parse(payload);

            // should be a single JSON object, not array
            if (typeof meshpackage === 'object') {
               processMeshPackage( meshpackage.mesh );
            }
        }
    });


    var noDataTimer = null;
    function showNoBluetooth() {
        try {
            document.getElementById("bluetooth-logo").style.color = '#333333'; // gray
        } catch( e ){
            console.log( 'bticon ' + e );
        }
    }


    // callback for Bluetooth scanner

    MESH.onDevice( function ( MCP ) {
        //console.log( 'discovered a peripheral '+ peripheral );
        // show we receive Bluetooth data, any data is fine
        try {
            document.getElementById("bluetooth-logo").style.color = '#BBDEFB'; // light blue
            // restart 30 seconds timer
        } catch( e ){
            console.log( 'bticon ' + e );
        }
        clearTimeout( noDataTimer );
        noDataTimer = setTimeout( showNoBluetooth, 3000 );

        if (!credentials.hash && credentials.hash.length !== 16) {
            // no network key, must have length 16
            console.log("*** no key");
            return;
        }

        //console.log("got mesh ad pkg from BLE")
        processMeshPackage( MCP );

    });


    // call initiate list
    $scope.initialForm();

    // send initial PING message to everybody to get updates quickly
    //sendiBeacon( 0, pingmessage );



}); // end note list page controller

