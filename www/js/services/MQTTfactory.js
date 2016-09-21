// MQTT service functions

appServices.factory('MQTT', function( $rootScope, CRED ) {

    var mqttservice = { callback: [ function(){} ]};
    var mqttclient = {};
    var options = {};
    var connected = false;
    creds = CRED.credentials;

    mqttservice.connect = function( credentials ) {

        options = {
            username: "aircable", // fix user, passwd
            password: "aircable",
            port: creds.port,
            reconnectPeriod: 5000,
            keepalive: 60,
            clean: true,
            will: null
        };



        if( creds.port > 9000 ) {
            // not secure web sockets
            mqttclient = mqtt.connect(  'ws://' + creds.host, options );
        } else {
            mqttclient = mqtt.connect('wss://' + creds.host, options);
        }

        mqttclient.on( 'connect', function () {
            console.log("mqtt connected")
            connected = true;
            try {
                document.getElementById("wave-logo").style.color = '#52FF00'; // bright green
            } catch( e ){}
            // use calculated hash id from the network key
            mqttclient.subscribe( creds.netid, {qos: 0, dup: false});
            console.log("subscribe to MQTT Broker " + creds.netid );
        });

        mqttclient.on( 'error', function(err) {
            console.log('mqtt error', err);
            connected = false;
            try {
                document.getElementById("wave-logo").style.color = '#0f0f0f'; // gray
            } catch( e ){}
            mqttclient.end();
        });

        mqttclient.on( 'message', function( topic, message ) {
            mqttservice.callback( topic, message );
            //console.log( 'mqtt message '+angular.toJson( message ) );
        });

        mqttclient.on( 'reconnect', function() {
            console.log( 'mqtt reconnect' );
            // update credentials
            options.username = "aircable";
            options.password = "aircable";
            options.port = creds.port;
            if( creds.port > 9000 ) {
                // not secure web sockets
                mqttclient = mqtt.connect(  'ws://' + creds.host, options );
            } else {
                mqttclient = mqtt.connect('wss://' + creds.host, options);
            }
        });

        mqttclient.on( 'offline', function() {
            console.log( 'mqtt offline' );
            mqttclient.end();
        });

    };

    mqttservice.reconnect = function() {
        if( typeof mqttclient.end !== "undefined" ) {
            // seems like we have been disconnected, connect again
            console.log("no reconnect");
            return false;
        } else {
            console.log("must reconnect");
            connected = false;
            return true;
        }
    };

    mqttservice.publish = function( topic, payload ) {
        if( typeof mqttclient.publish !== "undefined" ) {
            mqttclient.publish(topic, payload, {retain: false});
            //console.log( 'publish '+ payload + ' with topic: ' + topic );
        }
    };

    mqttservice.onMessage = function(callback) {
        mqttservice.callback = callback;
    };

    return mqttservice;
})
;
