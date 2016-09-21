/*
 Copyright 2016 Wireless Cables Inc.
 */
//Welcome to app.js
//This is main application config of project. You can change a setting of :
//  - Global Variable
//  - Theme setting
//  - Icon setting
//  - Register View
//  - Spinner setting
//  - Custom style
//
//Global variable use for setting color, start page, message, oAuth key.

window.globalVariable = {
    //custom color style variable
    color: {
        appPrimaryColor: "",
        aircableColor: "#0082ba"
    }, // End custom color style variable
    startPage: {
        url: "/app/settings", //Url of start page.
        state: "app.settings" //State name of start page.
    },
    message: {
        errorMessage: "Technical error please try again later." //Default error message.
    }
};// End Global variable


angular.module('starter', ['ionic','ngIOS9UIWebViewPatch',
    'starter.controllers', 'starter.services', 'scrollglue.directives',
    'ngMaterial', 'ngMessages', 'ngCordova', 'ngCordovaBeacon'])

    .run(function ($ionicPlatform, $rootScope, $ionicHistory, $state, $mdDialog, $mdBottomSheet, $cordovaBeacon) {

        // Create custom defaultStyle.
        function getDefaultStyle() {
            return "" +
                ".material-background-nav-bar { " +
                "   background-color        : " + appPrimaryColor + " !important; " +
                "   border-style            : none;" +
                "   background-image        : none !important;" +
                "   background-position-y   : 4px !important;" +
                "   background-size         : initial !important;" +
                "}" +
                ".md-primary-color {" +
                "   color                     : " + appPrimaryColor + " !important;" +
                "}";
        }// End create custom defaultStyle

        // Create custom style for Social Network view.
        function getSocialNetworkStyle(socialColor) {
            return "" +
                ".material-background-nav-bar {" +
                "   background              : " + socialColor + " !important;" +
                "   border-style            : none;" +
                "} " +
                "md-ink-bar {" +
                "   color                   : " + socialColor + " !important;" +
                "   background              : " + socialColor + " !important;" +
                "}" +
                "md-tab-item {" +
                "   color                   : " + socialColor + " !important;" +
                "}" +
                " md-progress-circular.md-warn .md-inner .md-left .md-half-circle {" +
                "   border-left-color       : " + socialColor + " !important;" +
                "}" +
                " md-progress-circular.md-warn .md-inner .md-left .md-half-circle, md-progress-circular.md-warn .md-inner .md-right .md-half-circle {" +
                "    border-top-color       : " + socialColor + " !important;" +
                "}" +
                " md-progress-circular.md-warn .md-inner .md-gap {" +
                "   border-top-color        : " + socialColor + " !important;" +
                "   border-bottom-color     : " + socialColor + " !important;" +
                "}" +
                "md-progress-circular.md-warn .md-inner .md-right .md-half-circle {" +
                "  border-right-color       : " + socialColor + " !important;" +
                " }" +
                ".spinner-android {" +
                "   stroke                  : " + socialColor + " !important;" +
                "}" +
                ".md-primary-color {" +
                "   color                   : " + socialColor + " !important;" +
                "}" +
                "a.md-button.md-primary, .md-button.md-primary {" +
                "   color                   : " + socialColor + " !important;" +
                "}";
        }// End create custom style for Social Network view.

        function initialRootScope() {
            $rootScope.appPrimaryColor = appPrimaryColor;// Add value of appPrimaryColor to rootScope for use it to base color.
            //$rootScope.aircableColor = aircableColor;
            $rootScope.isAndroid = ionic.Platform.isAndroid();// Check platform of running device is android or not.
            $rootScope.isIOS = ionic.Platform.isIOS();// Check platform of running device is ios or not.
        };

        function hideActionControl() {
            //For android if user tap hardware back button, Action and Dialog should be hide.
            $mdBottomSheet.cancel();
            $mdDialog.cancel();
        };

        // createCustomStyle will change a style of view while view changing.
        // Parameter :
        // stateName = name of state that going to change for add style of that page.
        function createCustomStyle(stateName) {
            var customStyle =
                ".material-background {" +
                "   background-color          : " + appPrimaryColor + " !important;" +
                "   border-style              : none;" +
                "}" +
                ".spinner-android {" +
                "   stroke                    : " + appPrimaryColor + " !important;" +
                "}";

            switch (stateName) {
                case "app.settings":
                    customStyle += getSocialNetworkStyle(window.globalVariable.color.aircableColor);
                    break;

                default:
                    customStyle += getDefaultStyle();
                    break;
            }
            return customStyle;
        }// End createCustomStyle

        // Add custom style while initial application.
        $rootScope.customStyle = createCustomStyle(window.globalVariable.startPage.state);

        $ionicPlatform.ready(function () {
            //console.log( "starting")
            ionic.Platform.isFullScreen = true;
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
                cordova.plugins.Keyboard.disableScroll(true);
            }

            initialRootScope();

            //Checking if view is changing it will go to this function.
            $rootScope.$on('$ionicView.beforeEnter', function () {
                //hide Action Control for android back button.
                hideActionControl();
            });

            // keep screen from turning black on Android
            $rootScope.noSleep = new NoSleep();

            // hide address bar
            $(function() {
                function orientationChange(e) {
                    $("body").scrollTop(1);
                }
                if( $rootScope.isAndroid ) {
                    $("body").css({height: "+=300"}).scrollTop(1);
                    window.scrollTo(0,1);
                }
                $(window).bind("orientationchange", orientationChange);
            });

            //  checking if the BLE plugin works
            if( typeof ble !== "undefined" && ble.isEnabled ) {
                ble.isEnabled(
                    function () {
                        console.log("Bluetooth is enabled");

                        if( typeof cordova !== "undefined" ) {
                            $cordovaBeacon.requestWhenInUseAuthorization();
                            //alert( 'Ready' );
                        }

                    },
                    function () {
                        console.log("Bluetooth is *not* enabled");
                        alert( 'Bluetooth is *not* enabled' );
                    }
                );
            }

        });

    })

    .config(function ($ionicConfigProvider, $stateProvider, $urlRouterProvider,
                      $mdThemingProvider, $mdIconProvider, $mdColorPalette ) {


        // Use for change ionic spinner to android pattern.
        $ionicConfigProvider.spinner.icon("android");
        $ionicConfigProvider.views.swipeBackEnabled(false);

        // mdIconProvider is function of Angular Material.
        // It use for reference .SVG file and improve performance loading.
        $mdIconProvider
            .icon('dimmable', 'img/icons/dimmable.svg')
            .icon('moon', 'img/icons/moon.svg')
            .icon('close', 'img/icons/close.svg')
            .icon('home', 'img/icons/home.svg')
            .icon('bulb', 'img/icons/lightbulb.svg')
            .icon('cloud', 'img/icons/cloud_queue.svg')
            .icon('history', 'img/icons/history.svg')
            .icon('mail', 'img/icons/mail.svg')
            .icon('message', 'img/icons/message.svg')
            .icon('share-arrow', 'img/icons/share-arrow.svg')
            .icon('more', 'img/icons/more_vert.svg')
            .icon('signal', 'img/icons/signal.svg')
            .icon('mesh', 'img/icons/mesh.svg')
            .icon('serial', 'img/icons/serial.svg')
            .icon('cloud_queue', 'img/icons/cloud_queue.svg')
            .icon('history', 'img/icons/history.svg')
            .icon('ibeacon', 'img/icons/ibeacon.svg')
            .icon('mail', 'img/icons/mail.svg')
            .icon('open_browser', 'img/icons/open_browser.svg')
            .icon('vpn_key', 'img/icons/vpn_key.svg')
            .icon('exit', 'img/icons/exit.svg')
            .icon('lock_open', 'img/icons/lock_open.svg')
            .icon('waterdrop', 'img/icons/waterdrop.svg')
            .icon('antenna', 'img/icons/antenna.svg');


        //mdThemingProvider use for change theme color of Ionic Material Design Application.
        /* You can select color from Material Color List configuration :
         * indigo blue light-blue cyan teal blue-grey
         */
        //Learn more about material color patten: https://www.materialpalette.com/
        //Learn more about material theme: https://material.angularjs.org/latest/#/Theming/01_introduction
        $mdThemingProvider
            .theme('default')
            .primaryPalette('light-blue')
            .accentPalette('blue');

        appPrimaryColor = $mdColorPalette[$mdThemingProvider._THEMES.default.colors.primary.name]["500"]; //Use for get base color of theme.

        //$stateProvider is using for add or edit HTML view to navigation bar.
        //
        //Schema :
        //state_name(String)      : Name of state to use in application.
        //page_name(String)       : Name of page to present at localhost url.
        //cache(Bool)             : Cache of view and controller default is true. Change to false if you want page reload when application navigate back to this view.
        //html_file_path(String)  : Path of html file.
        //controller_name(String) : Name of Controller.
        //
        //Learn more about ionNavView at http://ionicframework.com/docs/api/directive/ionNavView/
        //Learn more about  AngularUI Router's at https://github.com/angular-ui/ui-router/wiki
        $stateProvider.state('app', {
                url: "/app",
                abstract: true,
                templateUrl: "views/menu.html",
                controller: 'menuCtrl'
            })
            .state('app.settings', {
                url: "/settings",
                cache: false,
                views: {
                    'menuContent': {
                        templateUrl: "views/settings.html",
                        controller: 'settingsCtrl'
                    }
                }
            })
            .state('app.meshnodes', {
                url: "/nodelist",
                cache: false,
                params:{
                    isAnimated:true
                },
                views: {
                    'menuContent': {
                        templateUrl: "views/node-list.html",
                        controller: 'nodeListCtrl'
                    }
                }
            })
            .state('app.pairing', {
                url: '/pairing',
                params: {
                    device: null,
                },
                views: {
                    'menuContent': {
                        templateUrl: 'views/associate.html',
                        controller: 'associationCtrl'
                    }
                }
            })
            .state('app.nodedetail', {
                url: "/nodedetail",
                params: {
                    device: null,
                    actionDelete: false
                },
                views: {
                    'menuContent': {
                        templateUrl: "views/LightDetail.html",
                        controller: 'lightDetailCtrl'
                    }
                }
            })
            .state('app.gatewaydetail', {
                url: "/gatewaydetail",
                params: {
                    device: null,
                    actionDelete: false
                },
                views: {
                    'menuContent': {
                        templateUrl: "views/GatewayDetail.html",
                        controller: 'gatewayDetailCtrl'
                    }
                }
            })
            .state('app.terminal', {
                url: '/terminal',
                params: {
                    device: null,
                },
                views: {
                    'menuContent': {
                        templateUrl: 'views/Terminal.html',
                        controller: 'serialTerminalCtrl'
                    }
                }
            })
            .state('app.sniffer', {
                url: '/sniffer',
                params: {
                    device: null,
                },
                views: {
                    'menuContent': {
                        templateUrl: 'views/Sniffer.html',
                        controller: 'snifferCtrl'
                    }
                }
            })
            .state('app.groups', {
                url: '/groups',
                views: {
                    'menuContent': {
                        templateUrl: 'views/groups.html',
                        controller: 'groupCtrl'
                    }
                }
            })
        ;// End $stateProvider

        //Use $urlRouterProvider.otherwise(Url);
        //console.log( "going to " + window.globalVariable.startPage.url )
        $urlRouterProvider.otherwise(window.globalVariable.startPage.url);

    })

;
