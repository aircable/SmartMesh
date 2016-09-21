/**
 * Created by juergen on 7/17/16.
 * Copyright 2016 Wireless Cables Inc.
 */


appControllers.controller('flowCtrl', function ($scope, $rootScope, $state ) {

    // controller is called everytime a config package arrives

    //console.log("snifferCtrl "+ angular.toJson( $scope.mcps ));

    // start terminal
    $scope.navigateTo = function( targetPage ) {
        $rootScope.noSleep.disable(); // let the screen turn off.
        $state.go( targetPage );
    };


});

appControllers.filter('flowfilter', function() {

    return function( meshnodes ) {

        return meshnodes.filter( function( element, index, array ) {

            if(( element.device_type )&&( element.device_type == 0x1059 )) {

                // sconfiguration with state as well
                //console.log( "flow " + element.device_type + " conf " + element.state );

                try {
                    // Status and Config, serial is paired with this (accepting from...)
                    element.flow = element.state[0].toString(2);
                    element.edit = false;
                } catch( e ){
                    // should be true when not editable
                    element.edit = true;
                }

                return true;
            }
        })
    }
});