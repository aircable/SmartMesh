/*
 Copyright 2016 Wireless Cables Inc.
 */

appControllers.controller('associationCtrl', function( $scope, $filter, $rootScope, $state, $stateParams, $timeout,
                                                  MCP, TXD, MESH, CRED ) {



    // It will initial all variable data and let the function works when page load.
    $scope.initialForm = function () {

        //$scope.isLoading is the variable that use for check statue of process.
        $scope.isLoading = true;

        //$scope.isAnimated is the variable that use for receive object data from state params.
        //For enable/disable row animation.
        $scope.isAnimated = $stateParams.isAnimated;

        // reference to the devices in CRED factory, have been initialized through SETTINGS
        $scope.devices = CRED.devices;

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

        }, 5000);// End loading progress.

        //console.log("associationCtrl setup");
    };//End initialForm.



    // back to nodelist
    $scope.navigateTo = function( targetPage, objectData ) {
        console.log("nav "+objectData.source );
        $state.go( targetPage, {
            device: objectData
        });
    };

    $scope.associate = function() {

        var assocKey = MCP.new_masp( $scope.device.source, CRED.credentials.hash );
        var sequencekey = MCP.new_masp( MESH.getNextSequence(), CRED.credentials.hash );
        console.log( "associate "+ $scope.device.source+" "+ angular.toJson( assocKey ));

        // The function for association progress.
        $timeout( function () {
            if ($scope.isAndroid) {
                jQuery('#gateway-config-progress').show();
            } else {
                jQuery('#gateway-config-progress').fadeIn(700);
            }
        }, 200);
        // for some reason, sending a sequence first and then the key works on the firmware
        TXD.transmit_masp( sequencekey );
        // send key 3 seconds later
        $timeout( function() {
            TXD.transmit_masp( assocKey );
        }, 5000 );

    };

    // call initiate list
    $scope.initialForm();

});

appControllers.filter('assocfilter', function() {

    return function( element_array ) {

        var devices_in_assoc = [];
        // Using the angular.forEach method, go through the array of devices
        angular.forEach( element_array, function( element ) {
            //console.log("check "+element.masp+" " + angular.toJson(element));
            if(( typeof element.masp != 'undefined')&&( element.masp == 0 )) { // MASP Appearance Package
                // all data elements are already interpreted
                console.log("in assoc mode " + element.name + " age "+element.age );
                //devices_in_assoc.push( element );

                if (typeof element.name != 'undefined') {
                    // one element undefined and the whole ngrepeat shows nothing
                    //console.log("adding " + element.name);
                    devices_in_assoc.push(element);
                }
                if( element.name.indexOf( '_' ) < 0 ) {
                    // device not longer in association mode, remove all
                    devices_in_assoc.length = 0;
                }
            }
        });
        //console.log("all "+ angular.toJson( devices_in_assoc ));
        return devices_in_assoc;
    }
});

