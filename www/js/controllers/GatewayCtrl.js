/*
 Copyright 2016 Wireless Cables Inc.
 */


appControllers.controller('GatewayCtrl', function( $scope, $state ) {

    //console.log( "gwCtrl "+$scope.device.source );

    // start terminal
    $scope.navigateTo = function( targetPage, objectData ) {
        console.log("nav "+objectData.source );
        $state.go( targetPage, {
            device: objectData
        });
    };

});

appControllers.filter('gatewayfilter', function() {
    return function( meshnodes ) {

        return meshnodes.filter(function (element, index, array) {


            if(( element.device_type )&&( element.device_type == 4191 )) { // 0x105F

                //console.log("gw " + element.device_type+" from "+element.source.toString(16) );
                try {
                    if( element.conf ) {
                        var config = new Uint8Array( element.conf );
                        // data may not be in the device object yet
                         element.ssid =     String.fromCharCode.apply(String, config.subarray(  0,  16)).replace(/\0/g, ''); // 16
                         element.key =      String.fromCharCode.apply(String, config.subarray( 16,  32)).replace(/\0/g, ''); // 16
                         element.server =   String.fromCharCode.apply(String, config.subarray( 32,  48)).replace(/\0/g, ''); // 16
                         // devport is different than device.port
                         element.devport =  String.fromCharCode.apply(String, config.subarray( 48, 56)).replace(/\0/g, ''); // 8

                    }
                    if( element.state ) {
                        // Status
                        var status = new Uint8Array( element.state );
                        // internal temperature
                        element.temperature = status[0];
                        // location string
                        element.location = String.fromCharCode.apply(String, status.subarray(1, 21)).replace(/\0/g, ''); // 20
                        // convert 32 bit epoch time to date string
                        var localtime = new Date()
                        var offset = localtime.getTimezoneOffset() * 60; // in seconds

                        element.date = new Date(( element.time-offset) * 1000 );

                        if (status[21] == 1) {
                            element.status = "AP disconnected";
                            document.getElementById("signal" + element.source).style.color = '#333333'; // gray
                        } else if (status[21] == 2) {
                            element.status = "Cloud disconnected";
                            document.getElementById("signal" + element.source).style.color = '#BBDEFB'; // blue
                        } else if (status[21] >= 3) {
                            element.status = "Cloud connected";
                            document.getElementById("signal" + element.source).style.color = '#52FF00'; // green
                        }
                    }

                } catch( e ){
                    //console.log( "gwfilt "+e )
                    element.edit = true;
                }

                //console.log( "seq complete "+angular.toJson( element ));

                return true;
            }
        })
    }
});



// Controller of Note Detail Page.
appControllers.controller('gatewayDetailCtrl', function ($scope, $state, $stateParams, $timeout,
                                                         MCP, MESH, MQTT, IBEACON, CRED ) {

    var unchanged_device = {};
    var credentials = CRED.credentials;
    // array of sequence blocks to transmit
    var config_sequence = [];
    var config_locked = false;

    // initialForm is the first activity in the controller.
    // It will initial all variable data and let the function works when page load.
    $scope.initialForm = function ( latlong, marker ) {

        // $scope.actionDelete is the variable for allow or not allow to delete data.
        // It will allow to delete data when found data in the database.
        // $stateParams.actionDelete(bool) = status that pass from note list page.
        $scope.actionDelete = $stateParams.actionDelete;

        // $scope.note is the variable that store note detail data that receive form note list page.
        // Parameter :
        // $scope.actionDelete = status that pass from note list page.
        // $stateParams.contractdetail(object) = note data that user select from note list page.
        $scope.device = $scope.getNoteData($scope.actionDelete, $stateParams.device);
        unchanged_device = $scope.getNoteData($scope.actionDelete, $stateParams.device);

        coordinates = latlong.split( ',' );

        var minZoomLevel = 18;
        var position = new google.maps.LatLng( parseFloat( coordinates[0] ), parseFloat( coordinates[1] ));
        var map = new google.maps.Map(document.getElementById('map_canvas'), {
            zoom: minZoomLevel,
            center: position,
            mapTypeId: google.maps.MapTypeId.ROADMAP
        });
        if( marker ) {
            var mkr = new google.maps.Marker({
                position: position,
                map: map,
                title: 'WCI'
            });
        }

    };// End initialForm.

    //getNoteData is for get note detail data.
    $scope.getNoteData = function (actionDelete, gatewayDetail) {

        return ( angular.copy(gatewayDetail) );
    };// End getNoteData.


    // writes 8 bytes of string data to the sequence block
    function writeBlockToSequence( seq, data, density ) {
        var MCP_MULTIBLOCK = 0x75;

        if( seq == 0 ){
            //create new config_sequence
            config_sequence = [];
            return;
        }

        // create MULTIBLOCK command from data, max 8 bytes
        meshblk = new Uint8Array(10);
        meshblk[0] = MCP_MULTIBLOCK;
        meshblk[1] = seq;
        if( data ) {
            for (var i = 0; i < 8; i++) {
                meshblk[i + 2] = data.charCodeAt(i);
                // also update the internal Gateway data block device.data
                //console.log( "also write to "+seq+" idx "+ i +" = "+ (((seq-1)*8) + 32 + i));
                if ($scope.device.conf) {
                    $scope.device.conf[((seq - 1) * 8) + 32 + i] = data.charCodeAt(i);
                }
            }
        }
        for( i=0; i<density; i++ ) {
            // console.log('publish:' + credentials.email + '/set' + angular.toJson(payload))
            // encrypt
            var mcp_typed = MCP.MeshControlPackage(
                MESH.getNextSequence(), // new sequence number
                CRED.credentials.ownid,      // device id (the source)
                $scope.device.source,          // send to gateway
                meshblk,                // mesh package
                CRED.credentials.hash);     // encryption key

            // push
            config_sequence.push(mcp_typed);
        }
    }


    // create MULTIBLOCK from string, set sequence number
    function writeStringToSequence( sequence, text ) {
        if( text ) {
            for (var i = 0, j = text.length; i < j; i = i + 8) {
                if (( j - i ) >= 8) {
                    // full block
                    //console.log(sequence + " slice " + i + " " + (i + 8) + " " + text.slice(i, i + 8));
                    writeBlockToSequence(sequence, text.slice(i, i + 8), 3 ); // DENSITY 2
                    sequence++;
                } else {
                    //partial block
                    //console.log(sequence + " slice " + i + " " + j + " " + text.slice(i, j));
                    writeBlockToSequence(sequence, text.slice(i, j), 3 ); // DENSITY 2
                    sequence++;
                }
            }
        } else {
            // empty block
            writeBlockToSequence( sequence, null )
        }
        // next sequence
        return sequence;
    }

    function transmitSequence( ){

        config_locked = true;

        var count = 0;
        //console.log( "fullseq:"+angular.toJson( config_sequence ));
        var timerId = setInterval( function() {
            count++;

            if( count < config_sequence.length ) {
                //console.log( "block "+count );

                // store MCP package into the IBEACON factory variable
                IBEACON.MCPtoiBeacon( config_sequence[ count ] );
                // initiate transmit, safe to call anytime
                IBEACON.transmit();

                // make package for MQTT
                var mqttpackage = {};
                mqttpackage.gateway = parseInt( CRED.credentials.ownid ); // must be number
                mqttpackage.rssi = 0;
                mqttpackage.mesh = Array.prototype.slice.call( config_sequence[ count ] );
                MQTT.publish( CRED.credentials.email + '/mesh', angular.toJson( mqttpackage ));

            } else {
                // finished
                clearInterval( timerId );
                config_locked = false;

                $timeout(function () {
                    jQuery('#gateway-config-progress').hide();
                    $scope.isLoading = false;
                }, 400);// End loading progress.
                // now go to nodes page
                $state.go( 'app.meshnodes' );
            }
        }, 500 ); // send a new iBeacon every 500ms
    }




    // send configuration sequence to gateway, MULTIBLOCKS
    $scope.configureGateway = function( device, $event ) {

        //console.log( "conf "+ device.email )
        // credentials have changed
        CRED.setCredentials( null, device.server, null,
            device.email, device.password );

        writeBlockToSequence( 0, null );

        // gateway config contains: ssid(16), key(16), email(32), passwd(16), host(16), port (6)
        nextsequence = writeStringToSequence( 1, device.ssid );
        for( var i=nextsequence; i<3; i++ ) writeStringToSequence( i, null );
        nextsequence = writeStringToSequence( 3, device.key );
        for( i=nextsequence; i<5; i++ ) writeStringToSequence( i, null );
        nextsequence = writeStringToSequence( 5, device.email );
        for( i=nextsequence; i<9; i++ ) writeStringToSequence( i, null );
        nextsequence = writeStringToSequence( 9, device.password );
        for( i=nextsequence; i<11; i++ ) writeStringToSequence( i, null );
        nextsequence = writeStringToSequence( 11, device.server );
        for( i=nextsequence; i<13; i++ ) writeStringToSequence( i, null );
        // not changeable in GatewayDetail.html
        writeStringToSequence( 13, device.devport );

        // end block
        writeBlockToSequence( -1, null );

        // The function for loading progress.
        $timeout( function () {
            if ($scope.isAndroid) {
                jQuery('#gateway-config-progress').show();
            } else {
                jQuery('#gateway-config-progress').fadeIn(700);
            }
        }, 200);

        // start transmitter, 2 blocks per second
        transmitSequence();


    };

    // initialize the screen with the location
    if( $scope.device ) {
        $scope.initialForm( $scope.device.location, false );
    } else {
        $scope.initialForm( '37.3959717, -121.92842459999997', true );
    }
});
