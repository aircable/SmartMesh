/*
 Copyright 2016 Wireless Cables Inc.
 */
appControllers.controller('serialCtrl', function( $scope, $rootScope, $state, $stateParams, $timeout,
                                                  TXD, CRED ) {

    const MCP_CONFIG = 0x77;

    $scope.credentials = CRED.credentials;

    $scope.baudid = $scope.device.baud;
    $scope.baudlist = [
                { id: 3, speed: '9600' },
                { id: 4, speed: '19200' },
                { id: 5, speed: '38400' },
                { id: 6, speed: '57600' },
                { id: 8, speed: '115200' } ];

    console.log("serialCtrl "+$scope.device.source);

    // start terminal
    $scope.navigateTo = function( targetPage, objectData ) {
        console.log("nav "+objectData.source );
        $state.go( targetPage, {
            device: objectData
        });
    };

    var ConfigTimer;

    function finishConfig() {
        // must send a final package to enable config
        var newconf = new Uint8Array( 2 );
        newconf[0] = MCP_CONFIG;
        newconf[1] = 0xFF; // finish and execute
        TXD.transmit_mesh( $scope.device.source, newconf, 2 );
    }

    function secondConfig() {
        var newconf = new Uint8Array( 4 ); // full config pkg
        newconf[0] = MCP_CONFIG;
        newconf[1] = 3;

        $scope.device.baud = $scope.baudid;
        newconf[2] = $scope.device.baud;

        newconf[3] = 0; //reserved

        console.log("config baud "+$scope.baudid+" on "+$scope.device.source);
        TXD.transmit_mesh( $scope.device.source, newconf, 2 );

        // send finish config after 500ms
        clearTimeout( ConfigTimer );
        ConfigTimer = setTimeout( finishConfig, 250 );
    }


    $scope.configureSerial = function( device ) {
        // group members must be real groups, not devices
        console.log( "config grp "+device.group_0 )
        $scope.device.group_0 = parseInt( device.group_0, 16 );
        if( $scope.device.group_0 >= 0x8000 ){
            $scope.device.group_0 -= 0x8000;
        }

        var newconf = new Uint8Array( 11 ); // full config pkg
        // AIRcable SerialMesh config block
        // first packet: name 01...
        // second 02 02 64 ff 05 00 00 00 00 00
        // third: 03 00 00 03 00
        newconf[0] = MCP_CONFIG;
        newconf[1] = 2;
        newconf[2] = 2;     // density
        newconf[3] = 100;   // dutycycle
        newconf[4] = 0xff;  // behavior (group or individual for transmit)
        // one group only
        newconf[5] = $scope.device.group_0 % 256;
        newconf[6] = Math.floor( $scope.device.group_0 / 256 );
        newconf[7] = 0;
        newconf[8] = 0;
        newconf[9] = 0;
        newconf[10] = 0;

        console.log("config group "+$scope.device.group_0+" on "+$scope.device.source);
        TXD.transmit_mesh( $scope.device.source, newconf, 2 );

        // send finish config after 500ms
        clearTimeout( ConfigTimer );
        ConfigTimer = setTimeout( secondConfig, 250 );
    }
});

appControllers.filter('serialfilter', function() {

    return function( meshnodes ) {

        return meshnodes.filter( function( element, index, array ) {

            if(( element.device_type )&&( element.device_type == 4188 )) { //0x105C

                // serials send configuration with state as well, since it is more often
                //console.log("serial " + element.device_type + " conf " + element.state);

                try {
                    if( element.state ) {
                        // Status and Config, serial is paired with this (accepting from...)
                        element.internaltemp =  element.state[0];
                        element.edit = false;
                    }
                    if( element.conf ) { // all data after standard
                        element.baud = element.conf[0];
                    }
                } catch( e ){
                    // should be true when not editable
                    element.edit = true;
                }

                return true;
            }
        })
    }
});


// Controller of Note Detail Page.
appControllers.controller('serialTerminalCtrl', function ($scope, $state, $stateParams, $timeout,
                                                         TXD, CRED ) {

    // controller is called everytime a config package from serial arrives
    if( $stateParams.device == null )
        return;
    if( $stateParams.device.group_0 && ( $stateParams.device.group_0 != 0 )) {
        $scope.destination = $stateParams.device.group_0;
    } else {
        // make a group number from the device's id by default
        $scope.destination = $stateParams.device.source & 0x7fff;
    }
    $scope.serialid = $stateParams.device.source & 0x7fff;

    $scope.array = CRED.serialdata;
    $scope.cr = true;
    $scope.lf = true;
    $scope.echo = true;
    $scope.credentials = CRED.credentials;

    var sequence = 1;


    // start, get the nodeData from the app controller
    // sent to by the navigateTo button
    // when view is not active, serialdata is NULL

    var timer = setInterval;
    setTimeout(function () {
        $scope.array.length = 0;
        $scope.array.push( "SmartMesh Terminal" );
        $scope.array.push( "" );
        $scope.$apply();
    }, 100);


    // SEND button pressed
    $scope.addListItem = function( quote ) {
        if( $scope.echo ) {
            $scope.array.push(quote);
        }
        console.log( "serial "+quote+" to "+$scope.destination );
        if( $scope.cr ) {
            quote += "\r";
        }
        if( $scope.lf ) {
            quote += "\n";
        }
        sequence = TXD.string_messages( $scope.destination, sequence, quote, 3 );
        //clear quote
        this.customQuote = null;
        // keep array at 10 lines
        while( $scope.array.length > 10 ) {
            $scope.array.shift();
        }
    };
});