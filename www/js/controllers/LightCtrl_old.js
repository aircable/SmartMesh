
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


    // only display STREAM BLOCK packages
    $scope.dimmer = function (device) {
        // raw status data from dimmer starts with 0x1060
        return device.data[2] === 115;
    };

    $scope.alertMe = function(){
        console.log('sending alert on load');
    };

    // change function called by screen interaction, slide
    $scope.light = function (device) {

        if (typeof device.data[0] === "undefined") {
            return;
        }
        console.log( 'changed: ' + device.source + ' value: ' + device.data[0]);

        //// send an iBeacon with BLOCK command as string
        //str = device.data[0].toString();
        //payload.cmd = new Uint8Array( str.length + 4 );
        //payload.cmd[0] = MCP_BLOCK;
        //payload.cmd[1] = '@'.charCodeAt(0);
        //payload.cmd[2] = 'L'.charCodeAt(0);
        //for( var i=0, j=str.length; i < j; ++i ) {
        //    payload.cmd[ i+3 ] = str.charCodeAt(i);
        //}
        //payload.cmd[i + 3] = 0;

        // send MCP_LIGHT message as iBeacon to the source
        meshcmd = new Uint8Array(4);
        meshcmd[0] = MCP_LIGHT;                 // main package type light
        meshcmd[1] = MCP_LIGHT_SETLEVEL;        // subcode set level with response index 10
        meshcmd[2] = device.data[0] * 51 / 20;  // modify into 0-255 range
        meshcmd[3] = 0;                         // TID sequence number for ack

        TXD.transmit_mesh( device.source, meshcmd, 1 );

    };

    return {}

}); // .controller

appControllers.filter('lightfilter', function() {
    return function( meshnodes ) {
        return meshnodes.filter(function ( element, index, array ) {

            if (element.device_type && element.device_type == 4192) {

                //console.log("light " + element.device_type + " data " + element.data);

                // interpret data field
                try{

                    // first config
                    element.dimmerenabled = element.data[0];
                    element.defaultlight  = element.data[1];
                    element.nightlight    = element.data[2];
                    element.threshold     = element.data[3];
                    element.offtime       = element.data[4];
                    element.porch         = element.data[5];
                    element.offtimer      = element.data[6];

                    // status
                    element.light       = element.data[7];
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

// Controller of Note Detail Page.
appControllers.controller('lightDetailCtrl', function ($scope, $state, $stateParams, MCP, MESH, MQTT, IBEACON, CRED ) {

    var unchanged_device = {};
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
        unchanged_device = $scope.getNoteData($scope.actionDelete, $stateParams.device);

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


    // sending a BLOCK command with string content
    function sendConfigString( command, destination ) {

        var MCP_BLOCK = 0x73;         // for status messages

        // send an iBeacon with BLOCK command as string
        meshcmd = new Uint8Array( command.length + 1 );
        meshcmd[0] = MCP_BLOCK;
        for( var i=0, j=command.length; i < j; ++i ) {
            meshcmd[ i+1 ] = command.charCodeAt(i);
        }
        meshcmd[i + 1] = 0;

        TXD.transmit_mesh( destination, meshcmd, 1 );

    }


    // device(object) = note object that presenting on the view.
    // $event(object) = position of control that user tap.
    $scope.saveLight = function( device, $event ) {

        // all config commands start with '@'
        // 'i' configure device_id
        // 'g' configure group membership
        // 'N' configure mesh name
        // 'd' configure default light level
        // 'x' configure disable dimmer
        // 'n' configure default nightlight level
        // 'h' configure nightlight threshold
        // 'c' configure timer (enable)
        // 'f' configure porchlight feature


        // switch is reversed!
        if( unchanged_device.data[10] == device.data[10] ) {
            console.log( "dimmer enable changed")
        }
        if( unchanged_device.data[11] != device.data[11] ) {
            console.log( "default brightnes changed")
        }
        if( unchanged_device.data[12] != device.data[12] ) {
            sendConfigString( "@n" + device.data[12], device.source );
            console.log( "nichtlight @n" + device.data[12]);
        }
        if( unchanged_device.data[13] != device.data[13] ) {
            console.log( "threshold changed")
        }
        if( unchanged_device.data[14] != device.data[14] ) {
            console.log( "timer changed")
        }
        if( unchanged_device.data[15] != device.data[15] ) {
            console.log( "porch light feature changed")
        }

        $state.go( 'app.meshnodes' );

    }

    $scope.initialForm();
});// End of Notes Detail Page  Controller.
