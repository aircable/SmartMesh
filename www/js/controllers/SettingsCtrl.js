/*
 Copyright 2016 Wireless Cables Inc.
 */

// settings page controller
appControllers.controller('settingsCtrl', function( $scope, $mdToast, $mdDialog, $timeout, $state, $stateParams,
                                   MESH, MQTT, CRED ) {

    // get credentials from storage service and keep reference
    CRED.getCredentials();
    // fill in local fields
    $scope.l_cred = {};
    $scope.l_cred.l_passphrase = CRED.credentials.passphrase;
    $scope.l_cred.l_email = CRED.credentials.email;
    $scope.l_cred.l_password = CRED.credentials.password;
    $scope.l_cred.l_host = CRED.credentials.host;
    $scope.l_cred.l_port = CRED.credentials.port;


    // It will initial all variable data and let the function works when page load.
    $scope.initialForm = function () {

        //$scope.isLoading is the variable that use for check statue of process.
        $scope.isLoading = true;

        //$scope.isAnimated is the variable that use for receive object data from state params.
        //For enable/disable row animation.
        $scope.isAnimated = $stateParams.isAnimated;

        // $scope.filterText is the variable that use for searching.
        $scope.filterText = "";

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

            // form control
            $scope.form = {};

            // check if we can go to activiy right away
            //console.log('key=' + $scope.credentials.hashstr);

            if( CRED.credentials.edit ) {
                $scope.l_cred.l_passphrase = "passphrase defined";
            }

            jQuery('#note-list-loading-progress').hide();
            jQuery('#note-list-content').fadeIn();
            $scope.isLoading = false;
        }, 2000);// End loading progress.

    };//End initialForm.


    // delete the network key and refresh page
    $scope.deleteKey = function() {
        CRED.removeCredentials();
        console.log("key removed, form reset");
        //$scope.form.AuthForm.$setPristine();
    };


    // user string input needs to be converted into an Uint8Array
    function rawStringToBuffer( str ) {
        var idx, len = str.length, arr = new Array( len );
        for ( idx = 0 ; idx < len ; ++idx ) {
            arr[ idx ] = str.charCodeAt(idx) & 0xFF;
        }
        // create an ArrayBuffer from a standard array (of values)
        return new Uint8Array( arr );
    }

    // event when full screen changed
    document.addEventListener("webkitfullscreenchange", function () {
        //do something
    }, false);

    // called when the login button pressed
    $scope.generateKey = function( creds ) {

        // form local fields
        if(( creds.l_passphrase.length > 3 )&&
            ( creds.l_passphrase.localeCompare("passphrase defined") != 0 )){

            console.log( "generatekey "+creds.l_passphrase);

            var inputkey = creds.l_passphrase + "\0MCP";
            var mcpkey = new Uint8Array( inputkey.length );
            mcpkey = rawStringToBuffer( inputkey );
            var fullhash = asmCrypto.SHA256.bytes( mcpkey );

            CRED.setCredentials( fullhash, creds.l_host, creds.l_port,
                creds.l_email, creds.l_password );

        } else {
            // store credentials if passphrase has not changed
            CRED.setCredentials( null, creds.l_host, creds.l_port,
                creds.l_email, creds.l_password );
        }

        //console.log( "creds="+angular.toJson( CRED.credentials ));

        // access global variables
        if(( creds.l_passphrase.length > 3 )&&
            ( CRED.credentials.hash )&&
            ( CRED.credentials.hash.length === 16 )) {

            // go full screen mode on Chrome
            if( document.webkitRequestFullscreen ) {
                document.webkitRequestFullscreen();
            }

            // start initial scan
            MESH.scan( CRED.credentials );

            /*
                .then( function(){
                    // allow to go to activity tab with only passphrase
                    $state.go( 'app.meshnodes' );
                }, function(){
                    console.log("failed");
                });
                */

            // as long as you know the server, connect
            if( CRED.credentials.host /*&&  CRED.credentials.email &&  CRED.credentials.password*/ ) {
                // login to MQTT server
                MQTT.connect( CRED.credentials );
            }

            $state.go( 'app.meshnodes' );

        } else {
            // ERROR toast.
            $mdToast.show({
                controller: 'toastController',
                templateUrl: 'toast.html', // in index.html
                hideDelay: 2000,
                position: 'top',
                locals: {
                    displayOption: {
                        title: "at least, please enter a passphrase"
                    }
                }
            });
        }


    };


    $scope.initialForm();


}); // end note list page controller



