/*
 Copyright 2016 Wireless Cables Inc.
 */
appControllers.controller('LightCtrl', function( $scope, $rootScope, $timeout, $interval, $state, $stateParams,
                                                 $mdDialog, $mdToast,
                                                 MQTT, MESH, MCP, IBEACON, CRED, TXD ) {

    // block type we receive
    var MCP_BLK_ACK = 0x70;         // block requires an ack package
    var MCP_BLOCK = 0x73;         // for status messages
    var MCP_LIGHT = 0x8A;         // setRGB and light status, for discovering new bulbs
    var MCP_POWER_SET_STATE = 0x89;         // only used in SmartDimmer
    var MCP_PING = 0x82;         // request subcode 0, response subcode 1
    var MCP_LIGHT_STATUS = 8;    // subcode 8 is response from light getting command
    var MCP_LIGHT_SETLEVEL_NOACK = 0;    // subcode set level command with ack, 1
    var MCP_LIGHT_SETLEVEL = 1;    // subcode set level command with ack, 2 bytes payload
    var MCP_LIGHT_SETWHITE = 10; // set level, no ack, one byte payload

    var credentials = CRED.credentials;


    // CSRlights
    $scope.newid = null;

    // only display STREAM BLOCK packages
    $scope.dimmer = function (device) {
        // raw status data from dimmer starts with 0x1060
        return device.data[2] === 115;
    };

    $scope.alertMe = function(){
        console.log('sending alert on load');
    };

    // change function called by screen interaction, slide
    $scope.light = function ( device ) {

        if( device.data ) {
            var newlevel = device.data[0];
        }
        if( device.state ) {
            // for some reason we can't modify device.lightlevel directly, not in scope???
            newlevel = device.state[1];
            device.lightlevel = newlevel;
        }
        console.log( 'changed: ' + device.source + ' value: ' + newlevel );

        // send MCP_LIGHT message as iBeacon to the source
        meshcmd = new Uint8Array(4);
        meshcmd[0] = MCP_LIGHT;                 // main package type light
        meshcmd[1] = MCP_LIGHT_SETLEVEL;        // subcode set level with response index 10
        meshcmd[2] = newlevel * 51 / 20;      // modify into 0-255 range
        meshcmd[3] = 0;                         // TID sequence number for ack

        TXD.transmit_mesh( device.source, meshcmd, 1 );

    };



    $scope.removeCSRlight = function ( device ) {
        for (i = 0; i < $scope.devices.length; i++) {
            if(( $scope.devices[i].source == device.source )&&
                ( $scope.devices[i].device_type == 0x1061 )) {
                CRED.removeDevice( $scope.devices[i].source );
                $scope.devices.splice( i, 1 );
                break;
            }
        }
    };

    $scope.setID = function ( device ){

        newdevice = {};
        newdevice.device_type = 0x1061;
        newdevice.lightlevel = device.lightlevel;

        console.log("setid "+ $scope.newid);
        newsource = parseInt( $scope.newid, 16 );
        if(( newsource >= 0x8001 )&&( newsource < 0xC000 )) {

            for (i = 0; i < $scope.devices.length; i++) {
                if( $scope.devices[i].source == device.source ) {
                    // remove
                    CRED.removeDevice( $scope.devices[i].source );
                    $scope.devices.splice( i, 1 );
                    // add
                    newdevice.source = newsource;
                    $scope.newid = newsource.toString(16);
                    CRED.updateDevice( newdevice );
                    $scope.devices.push( newdevice );
                    break;
                }
            }
            $timeout(function () {
                try{ $scope.$apply(); } catch(e){}
            });
        } else {
            $mdToast.show({
                controller: 'toastController',
                templateUrl: 'toast.html', // in index.html
                hideDelay: 2000,
                position: 'top',
                locals: {
                    displayOption: {
                        title: "New ID must be between 0x8001 and 0xBFFF"
                    }
                }
            });
        }
    };


    return {}

}); // .controller


// newest SmartDimmer status and config information

// data packets
// PING 01105e16ca0000008221: product, vendor, time, voltage
// PING 021c01170c00120003: temp, light, extemp, ambient, power, ontime
// CONFIG 0141495264696d6d6572 first packet: name AIRdimmer
// CONFIG 020164ff000000000000 second: device config, groups
// CONFIG 03006407170000 3rd packet:
// dimmer_disabled, default_brightness;, default_nightlight;, nightlight_threshold;, switchoff_timer, porchlight_feature;

appControllers.filter('lightfilter', function() {
    return function( meshnodes ) {
        return meshnodes.filter(function ( element, index, array ) {

            if (element.device_type && element.device_type == 4190) {

                //console.log("light " + element.device_type + " data " + element.data);

                // interpret data field
                try{
                    if( element.state ) {
                        // Status
                        var status = new Uint8Array( element.state );
                        element.internaltemp = status[0];
                        element.lightlevel = status[1];
                        element.temperature = status[2];
                        element.ambient = status[3];
                        element.usepower = (status[4] * 256 + status[5])/10; // in 100mW
                        element.ontime = status[6] * 256 + status[7];
                        element.edit = false; // not disabled
                    }
                    if( element.conf ) { // all data after standard
                        // config
                        var config = new Uint8Array(element.conf);
                        element.dimmable = !config[0];      // not dimmer enabled
                        element.defaultlight = config[1];
                        element.nightlight = config[2];
                        element.threshold = config[3];
                        element.offtime = config[4];
                        if( config[5] > 0 ) {
                            element.porch = true;
                        } else {
                            element.porch = false;
                        }

                    }

                } catch( e ){
                    element.edit = true;
                }
                return true;
            }
        })
    }
}); // .filter



appControllers.filter('lightfilter2', function() {
    return function( meshnodes ) {
        return meshnodes.filter(function ( element, index, array ) {
            if (element.device_type && element.device_type == 4192) {

                //console.log("light " + element.device_type + " data " + element.data);

                // interpret data field
                try{

                    // first config
                    element.dimmable        = !element.data[0];
                    element.defaultlight    = element.data[1];
                    element.nightlight      = element.data[2];
                    element.threshold       = element.data[3];
                    element.offtime         = element.data[4];
                    element.porch           = element.data[5];

                    // status
                    element.lightlevel       = element.data[7];
                    element.temperature = element.data[8];
                    element.ambient     = element.data[9];
                    element.battery     = element.data[10];
                    element.usepower    = element.data[11]*256 + element.data[12];
                    element.ontime      = element.data[13]*256 + element.data[14];
                    element.edit        = false; // not disabled

                } catch( e ){
                    element.edit = true;
                }
                return true;
            }
        })
    }
}); // .filter

appControllers.filter('lightfilter3', function() {

    return function( meshnodes ) {

        return meshnodes.filter( function( element, index, array ) {

            if(( element.device_type )&&( element.device_type == 4193 )) { //0x1061 (CSRswitch)
                // just display
                return true;
            }
        })
    }
});


// Controller of Note Detail Page.
appControllers.controller('lightDetailCtrl', function ($scope, $state, $stateParams, MCP, MESH, MQTT, IBEACON, CRED, TXD ) {

    const MCP_CONFIG = 0x17;

    var credentials = CRED.credentials;

    // initialForm is the first activity in the controller.
    // It will initial all variable data and let the function works when page load.
    $scope.initialForm = function () {

        // $scope.actionDelete is the variable for allow or not allow to delete data.
        // It will allow to delete data when found data in the database.
        // $stateParams.actionDelete(bool) = status that pass from note list page.
        $scope.actionDelete = $stateParams.actionDelete;

        // $scope.note is the variable that store note detail data that receive form note list page.
        // Parameter :
        // $scope.actionDelete = status that pass from note list page.
        // $stateParams.contractdetail(object) = note data that user select from note list page.
        $scope.device = $scope.getNoteData($scope.actionDelete, $stateParams.device);

    };// End initialForm.

    //getNoteData is for get note detail data.
    $scope.getNoteData = function (actionDelete, lightDetail) {

        try {
            // switch is reversed, showing enabled as 0 and disabled as 1
            lightDetail.data[10] = !lightDetail.data[10];
        } catch (e) {
        }
        return ( angular.copy(lightDetail) );
    };// End getNoteData.




    var ConfigTimer;

    function finishConfig() {
        // must send a final package to enable config
        var newconf = new Uint8Array( 2 );
        newconf[0] = MCP_CONFIG;
        newconf[1] = 0xFF; // finish and execute
        TXD.transmit_mesh( $scope.device.source, newconf, 2 );

        $state.go( 'app.meshnodes' );
    }

    function secondConfig() {
        var newconf = new Uint8Array( 8 ); // full config pkg
        newconf[0] = MCP_CONFIG;
        newconf[1] = 3;

        newconf[2] = !$scope.device.dimmable;
        newconf[3] = $scope.device.defaultlight;
        newconf[4] = $scope.device.nightlight;
        newconf[5] = $scope.device.threshold;
        newconf[6] = $scope.device.offtimer;
        if( $scope.device.porch ) {
            newconf[7] = 1;
        } else {
            newconf[7] = 0;
        }

        TXD.transmit_mesh( $scope.device.source, newconf, 2 );

        // send finish config after 500ms
        clearTimeout( ConfigTimer );
        ConfigTimer = setTimeout( finishConfig, 250 );
    }


    // device(object) = note object that presenting on the view.
    // $event(object) = position of control that user tap.
    $scope.saveLight = function( device, $event ) {
        var newconf = new Uint8Array( 11 ); // full config pkg

        // AIRcable SerialMesh config block
        // first packet: name 01...
        // second 02 02 64 ff 05 00 00 00 00 00
        // third: 03 00 00 03 00
        newconf[0] = MCP_CONFIG;
        newconf[1] = 2;
        newconf[2] = 1;     // density
        newconf[3] = 100;   // dutycycle
        newconf[4] = 0xff;  // behavior (group or individual for transmit)
        // one group only
        newconf[5] = device.group_0 % 256;
        newconf[6] = Math.floor( device.group_0 / 256 );
        newconf[7] = 0;
        newconf[8] = 0;
        newconf[9] = 0;
        newconf[10] = 0;

        console.log("light group "+device.group_0+" on "+$scope.device.source);
        TXD.transmit_mesh( $scope.device.source, newconf, 2 );

        // send finish config after 500ms
        clearTimeout( ConfigTimer );
        ConfigTimer = setTimeout( secondConfig, 250 );
    };

    $scope.initialForm();
});// End of Notes Detail Page  Controller.
