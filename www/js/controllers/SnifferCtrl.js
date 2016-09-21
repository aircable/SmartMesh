/**
 * Created by juergen on 6/26/16.
 * Copyright 2016 Wireless Cables Inc.
 */
// Controller of Note Detail Page.
appControllers.controller('snifferCtrl', function ($scope, $rootScope, $state, $stateParams, $timeout,
                                                        $ionicScrollDelegate,  MCP  ) {

    // controller is called everytime a config package from serial arrives

    $scope.mcps = MCP.print_mcp;

    // keep the screen on!
    $rootScope.noSleep.enable();

    //console.log("snifferCtrl "+ angular.toJson( $scope.mcps ));

    setTimeout(function () {
            if ($scope.mcps.length == 0) {
                $scope.mcps.push("SmartMesh Messages");
                $scope.mcps.push("");
                $scope.$apply();
            }

    }, 300);

 /*   $scope.$watch('mcps', function(newValue, oldValue) {
        console.log( "." );
        $timeout(function() {
            $ionicScrollDelegate.scrollBottom(false); // no animation
        } );
    }, true);*/

    // start terminal
    $scope.navigateTo = function( targetPage ) {
        $rootScope.noSleep.disable(); // let the screen turn off.
        $state.go( targetPage );
    };

    $scope.scrollBottom = function() {
        //console.log( ",");
        //$ionicScrollDelegate.scrollBottom(false); // no animation
        //$ionicScrollDelegate.scrollTo( 0, 10 );
        //console.log( document.getElementById('mcp-list').scrollHeight );
    };

    $scope.getScrollPosition = function(){
        console.log( $ionicScrollDelegate.getScrollPosition().top );
    }

});


appControllers.filter('snifffilter', function() {

    return function( element_array ) {


        var messages = [];

        // Using the angular.forEach method, go through the array of devices
        angular.forEach( element_array, function( element ) {
            //console.log("check "+element.masp+" " + angular.toJson(element));
            if( typeof element != 'undefined' ) {
                // one element undefined and the whole ngrepeat shows nothing
                //console.log("adding " + element);
                messages.push( element );
            }
        });

        //console.log("all "+ angular.toJson( devices_in_assoc ));
        return messages;
    }
});

