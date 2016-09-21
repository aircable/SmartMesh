
appServices.factory('TXD', function ( $timeout, CRED, MCP, MQTT, MESH, IBEACON ) {

    return {

        transmit_masp: function( maspblk_typed ) {

            if( typeof ble !== "undefined" ) {
                // iBeacon probably enabled, so switch to 2 second repeats
                var density = 2; // one interval iBeacon
                var repeat_time = 2500;
            } else {
                var density = 20;
                // no iBeacon, we can send faster, 100ms
                var repeat_time = 100;
            }

            // execute one transmit cycle and wait for 500ms, then return
            var timerId = setInterval( function() {
                if( density > 0 ) {
                    // store MCP package into the IBEACON factory variable
                    IBEACON.MCPtoiBeacon( maspblk_typed );
                    // initiate transmit, safe to call anytime
                    IBEACON.transmit();

                    // masp block is typed
                    var mqttpackage = {};
                    mqttpackage.gateway = parseInt( CRED.credentials.ownid ); // must be number
                    mqttpackage.rssi = 0;
                    mqttpackage.mesh = Array.prototype.slice.call( maspblk_typed );
                    MQTT.publish( CRED.credentials.netid, angular.toJson( mqttpackage ));

                    density--;
                } else {
                    // finished, after transmit, wait for 500ms before return
                    clearInterval( timerId );
                    $timeout(function () {
                        return;
                    }, repeat_time );
                }
            }, repeat_time ); // send a new iBeacon every 500ms

        },

        transmit_mesh: function( destination, meshblk, density ) {
            // console.log('publish:' + credentials.email + '/set' + angular.toJson(payload))
            if( density > 5 ) density = 5;
            if( density == 0 ) density = 1;

            if( typeof ble !== "undefined" ) {
                // iBeacon probably enabled, so switch to 2 second repeats
                var repeat_time = 2500;
            } else {
                // no iBeacon, we can send faster, 100ms
                var repeat_time = 100;
            }


            // execute one transmit cycle and wait for 500ms, then return
            var timerId = setInterval( function() {
                if( density > 0 ) {
                    var mcp_typed = MCP.MeshControlPackage(
                        MESH.getNextSequence(),      // new sequence number
                        CRED.credentials.ownid,      // device id (the source)
                        destination,                 // send to gateway
                        meshblk,                     // mesh package
                        CRED.credentials.hash );     // encryption key

                    // store MCP package into the IBEACON factory variable
                    IBEACON.MCPtoiBeacon( mcp_typed );
                    // initiate transmit, safe to call anytime
                    IBEACON.transmit( density );

                    // transmit package if a MeshBridge is connected
                    MESH.sendMCP( mcp_typed );

                    // make package for MQTT
                    var mqttpackage = {};
                    mqttpackage.gateway = parseInt( CRED.credentials.ownid ); // must be number
                    mqttpackage.rssi = 0;
                    mqttpackage.mesh = Array.prototype.slice.call( mcp_typed );
                    MQTT.publish( CRED.credentials.netid, angular.toJson( mqttpackage ));

                    density--;

                } else {
                    // finished, after transmit, wait for 500ms before return
                    clearInterval( timerId );
                    $timeout(function () {
                        return;
                    }, repeat_time );
                }
            }, repeat_time ); // send a new iBeacon every 500ms

        },

        string_message: function( destination, seq, data, len, density ) {

            // create MULTIBLOCK command from data, max 8 bytes
            var MCP_MULTIBLOCK = 0x75;

            meshblk = new Uint8Array( 2+len );
            meshblk[0] = MCP_MULTIBLOCK;
            meshblk[1] = seq;
            if( data ) {
                for (var i = 0; i < len; i++) {
                    meshblk[i + 2] = data.charCodeAt(i);
                }
            }
            this.transmit_mesh( destination, meshblk, density );

        },

        // create MULTIBLOCK from string, set sequence number
        string_messages: function( destination, sequence, text, density ) {
            if( text ) {
                for (var i = 0, j = text.length; i < j; i = i + 8) {
                    if (( j - i ) >= 8) {
                        // full block
                        console.log(sequence + " slice " + i + " " + (i + 8) + " " + text.slice(i, i + 8));
                        this.string_message( destination, sequence, text.slice( i, i + 8 ), 8, density );
                        sequence++;
                        if( sequence > 255 ) sequence = 1;
                    } else {
                        //partial block, last
                        console.log(sequence + " slice " + i + " " + j + " " + text.slice(i, j));
                        this.string_message( destination, sequence, text.slice( i, j ), j-i, density );
                        sequence++;
                        if( sequence > 255 ) sequence = 1;
                    }
                }
            } else {
                // empty block
                this.string_message( destination, sequence, null, density );
                sequence++;
                if( sequence > 255 ) sequence = 1;
            }
            // next sequence
            return sequence;
        }

    };

})
;//End TXD service

