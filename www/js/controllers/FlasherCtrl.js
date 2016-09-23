/**
 * Created by juergen on 6/3/16.
 * Copyright 2016 Wireless Cables Inc.
 */

appControllers.controller('flasherCtrl', function( $scope, $rootScope, $state, $stateParams, $timeout,
                                                  TXD, CRED ) {

    $scope.credentials = CRED.credentials;

    $scope.flashes = '6';
    $scope.flashlist = [
        { id: 1, flash: '1 flash' },
        { id: 2, flash: '2 flashes' },
        { id: 3, flash: '3 flashes' },
        { id: 4, flash: '4 flashes' },
        { id: 5, flash: '5 flashes' },
        { id: 6, flash: '6 flashes' } ];

    $scope.beeps = '5';
    $scope.beeplist = [
        { id: 2, beep: 'short' },
        { id: 3, beep: 'long' },
        { id: 4, beep: 'double' },
        { id: 5, beep: 'tripple' }];

    console.log("flasherCtrl "+$scope.device.source);

    $scope.callDinner = function( flashes, beeps ) {

        var MCP_ATTENTION = 0x84;

        var attention = new Uint8Array( 5 );

        // AIRcable SerialMesh config block
        attention[0] = MCP_ATTENTION;
        attention[1] = 1; // attract attention
        attention[2] = $scope.flashes; // number of flashes
        attention[3] = $scope.beeps; // encoded 3 beeps
        attention[4] = 1; // suppost to be the TID

        console.log("trigger "+$scope.device.source);

        if( typeof ble !== "undefined" ) {
            // MQTT and WebBluetooth
            TXD.transmit_mesh( $scope.device.source, attention, 100 );
        } else {
            // 10 iBeacons are enough
            TXD.transmit_mesh( $scope.device.source, attention, 10 );
        }
    }

});

appControllers.filter('flasherfilter', function() {

    return function( meshnodes ) {

        return meshnodes.filter( function( element, index, array ) {

            if(( element.device_type )&&( element.device_type == 4189 )) { //0x105D

                // serials send configuration with state as well, since it is more often
                //console.log("serial " + element.device_type + " conf " + element.state);

                try {
                    if( element.state ) {
                        // Status and Config, serial is paired with this (accepting from...)
                        element.internaltemp =  element.state[0];
                        element.triggered = element.state[1];
                        element.edit = false;
                    }

                    //document.getElementById("flasher").style.color = "#ff9933";

                    var button = document.getElementById("trigger_button");

                    if( button ) {
                        if( element.triggered === 1 ) {
                            element.trigger_text = "CALLED...";
                            button.style.backgroundColor = "#ff9933";
                        } else {
                            element.trigger_text = "CLICK TO CALL";
                            button.style.backgroundColor = "#03a9f4";
                        }
                    }
                } catch( e ){
                    console.log( "flasher="+e );
                    // should be true when not editable
                    element.edit = true;
                }

                return true;
            }
        })
    }
});

