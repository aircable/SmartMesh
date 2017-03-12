/**
 * Created by juergen on 6/3/16.
 * Copyright 2016 Wireless Cables Inc.
 */

appControllers.controller('assetCtrl', function( $scope, $rootScope, $state, $stateParams, $timeout,
                                                   TXD, CRED ) {

    $scope.credentials = CRED.credentials;

});

appControllers.filter('assetfilter', function() {

    return function( meshnodes ) {

        return meshnodes.filter( function( element, index, array ) {

            if(( element.device_type )&&( element.device_type == 0x1111 )) { //0x105D

                element.edit = true;
                console.log( "asset="+element.asset );
                return true;
            }
        })
    }
});