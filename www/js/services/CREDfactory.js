// LocalStorage service have ability to store data by HTML5 localStorage feature.
//
// The data will store in a json format.

appServices.factory('NVM', function ( $filter, $window ) {
    return {

        /**
         * Set value
         */
        set: function( key, value ) {
            //console.log( "key "+key+" value "+value);
            if (!key || !value) { return; }

            try {
                if (typeof value === "object") {
                    value = angular.toJson(value);
                }
                return $window.localStorage[ key ] = value;

            } catch (e) {
                throw new Error('Storage set error for key: ' + key);
            }
        },

        /**
         * Get value
         */
        get: function(key) {
            try {
                var value = $window.localStorage[ key ];

                if (!value) { return; }

                // assume it is an object that has been stringified
                if (value[0] === "{") {
                    //if( typeof value === "object" ) {
                    value = angular.fromJson( value );
                }

                return value;

            } catch (e) {
                throw new Error('Storage get error '+e+' for key: ' + key);
            }
        },

        /**
         * Remove value
         */
        remove: function( key ) {
            return $window.localStorage.removeItem( key );
        },

        reset: function() {
            return $window.localStorage.clear();
        }
    };
})
;//End LocalStorage service.

// CRED service will call localStorage Services to present data to controller.
appServices.factory('CRED', function ( NVM, $window ) {
    
    function getDevices( devices ) {

        for( var i=0, len = $window.localStorage.length; i<len; i++ ) {
            var key = $window.localStorage.key(i);
            var value = $window.localStorage[key];
            if( key[0] == '#' ) {
                // found device, add if not too old, 8640 = 24h
                obj = JSON.parse( value );
                devices.push( obj );
            }
        }
    }

    function getGroups( groups ) {
        for( var i=0, len = $window.localStorage.length; i<len; i++ ) {
            var key = $window.localStorage.key(i);
            var value = $window.localStorage[key];
            if( key[0] == '$' ) {
                obj = JSON.parse( value );
                devices.push( obj );
            }
        }
    }

    // user string input needs to be converted into an Uint8Array
    function rawStringToBuffer( str ) {
        var idx, len = str.length, arr = new Array( len );
        for ( idx = 0 ; idx < len ; ++idx ) {
            arr[ idx ] = str.charCodeAt(idx) & 0xFF;
        }
        // create an ArrayBuffer from a standard array (of values)
        return new Uint8Array( arr );
    }


    return {
        // global variable holding current credentials
        credentials: {},
        // global devices, for easier access without functions
        devices: [],
        // groups
        groups: [],
        // serial device message, global variable
        serialdata: [],
        serialfilter: 0,
        lastserialseq: 0,


    // function REMOVE
        removeCredentials: function() {

            // delete whole storage, with all devices
            NVM.reset();
            this.devices.length = 0;
            this.groups.length = 0;
            this.serialdata.length = 0;
            this.serialfilter = 0;
            this.credentials = {};

            this.getCredentials();

        },

        // retrieve all credentials and devices and groups from storage

        getCredentials: function () {

            this.credentials.ownid = NVM.get( 'ownid' );
            this.credentials.email = NVM.get( 'email' );
            this.credentials.password = NVM.get( 'password' );
            this.credentials.host = NVM.get( 'host' );
            this.credentials.port = NVM.get( 'port' );
            this.credentials.age = NVM.get( 'age' );
            this.credentials.sequence = NVM.get( 'sequence' );

            // default settings

            // must have ownid and network key
            if( !angular.isDefined( this.credentials.ownid )) {
                // create a random id between 0x8100 and 0x8EFF
                this.credentials.ownid = Math.floor(Math.random() * (36607 - 33024 + 1)) + 33024;
                NVM.set( 'ownid', this.credentials.ownid );
            }
/*
            if( !angular.isDefined( this.credentials.host )){
                this.credentials.host = 'aircable.net';     // must match certificate
                NVM.set( 'host', this.credentials.host );
                this.credentials.port = 8883;               // secure websocket
                NVM.set( 'port', this.credentials.port );
            }
*/
            if( !angular.isDefined( this.credentials.sequence )) {
                this.credentials.sequence = 1 + Math.floor(Math.random() * 50000);
                NVM.set( 'sequence', this.credentials.sequence );
            }

            if( !angular.isDefined( this.credentials.age )) {
                // zero value removes the storage key
                this.credentials.age = 1;
                NVM.set('age', this.credentials.age );
            }

            var networkkeyobject = NVM.get( 'networkkey' );
            // check if we already have a networkkey stored, then display
            //console.log( "got "+networkkeyobject );
            if( typeof networkkeyobject === "object" ) {
                //console.log("got encrypted network key "+angular.toJson( networkkeyobject ));

                // make our privacy key from ownid and nonce
                var inputkey = this.credentials.ownid.toString() + "\0NETK";
                var mcpkey = new Uint8Array( inputkey.length );
                mcpkey = rawStringToBuffer( inputkey );
                //var generated_key = sha256( mcpkey );
                var generated_key = asmCrypto.SHA256.bytes( mcpkey );

                this.credentials.hash = new Uint8Array( 16 );
                this.credentials.hashstr = '';
                for (i = 0; i < 16; i++) {
                    try {
                        var decrypted = networkkeyobject[i] ^ generated_key[i];
                        this.credentials.hash[i]  = decrypted;
                        this.credentials.hashstr += decrypted.toString(16);
                    } catch( e ) {
                        console.log("error" + e);
                    }
                }
                // calculate network ID by hashing it again: dfb5820e0f81
                var hashedid = asmCrypto.SHA256.bytes( this.credentials.hash );
                this.credentials.netid = '';
                for( i=0; i<6; i++ ) {
                    hexnumb = hashedid[31 - i];
                    if( hexnumb < 0x10 ) {
                        this.credentials.netid += '0';
                    }
                    this.credentials.netid += hexnumb.toString(16);
                }
                //console.log( "netid="+this.credentials.netid );

                this.credentials.edit = true; // not editable
                this.credentials.networkkey = "networkkey defined"
                //console.log( "decrypted "+angular.toJson( this.credentials.hash ))


            } else {
                this.credentials.networkkey = "";
                this.credentials.edit = false; // editable
                console.log("no networkkey");
            }




            // get all devices and groups stored
            this.devices.length = 0;
            getDevices( this.devices );
            //console.log("cred: " + this.devices.length + " devices=" + angular.toJson(this.devices));
            this.groups.length = 0;
            getGroups( this.groups );

            // initialize serial data
            this.serialdata.length = 0;
            this.serialfilter = 0;

        },

        // function SET, gets a 32 byte Uint8Array
        // fullhash calculated from networkkey in SettingsCtrl.js
        setCredentials: function ( fullhash, host, port, email, password ) {

            if( fullhash ) {
                // make our privacy key from ownid and nonce
                var inputkey = this.credentials.ownid.toString() + "\0NETK";
                var mcpkey = new Uint8Array( inputkey.length );
                mcpkey = rawStringToBuffer( inputkey );
                //var generated_key = sha256( mcpkey );
                var generated_key = asmCrypto.SHA256.bytes( mcpkey );

                this.credentials.hashstr = "";
                this.credentials.hash = new Uint8Array( 16 );
                var for_store = new Uint8Array( 16 );
                // get last 16 bytes form the hash in reverse order
                for (i = 0; i < 16; i++) {
                    // reverse the elements, keep as array
                    this.credentials.hash[i] = fullhash[31 - i];
                    // encrypt the network key for storage
                    for_store[i] = fullhash[31 - i] ^ generated_key[i];
                }
                for( i=0; i<16; i+=2 ) {
                    // make string for printing, swap bytes
                    if (fullhash[31 - i - 1].toString(16) < 16) {
                        this.credentials.hashstr += "0";
                    }
                    this.credentials.hashstr += fullhash[31 - i - 1].toString(16);

                    if (fullhash[31 - i].toString(16) < 16) {
                        this.credentials.hashstr += "0";
                    }
                    this.credentials.hashstr += fullhash[31 - i].toString(16);
                }
                // save Uint8Array as JSON string, we lose the type information
                NVM.set( 'networkkey', for_store );
                console.log( "saved key " + angular.toJson( this.credentials.hash ));
                console.log( "saved encrypted " + angular.toJson( for_store ));
            }

            //console.log( "set cred:"+host+" "+port);

            if( email ) {
                this.credentials.email = email;
                NVM.set( 'email', email );
                this.credentials.password = password;
                NVM.set( 'password', password );
                // check login maybe
            }
            if( host ) {
                this.credentials.host = host;
                NVM.set('host', host);
            }
            if( port ) {
                this.credentials.port = port;
                NVM.set('port', port);
            }
        },


        // current sequence number, used for sending multiple packages with the
        // same sequence number. Update and increment sequence in the model functions
        saveSequence: function() {
            // update, no remove
            NVM.set( 'sequence', this.credentials.sequence );
        },


        // function addDevice: device object has ID into storage
        updateDevice: function( updatedevice ) {
            var devicekey = '';
            var storedata = {};

            // update device, increase age and store
            this.credentials.age++;
            NVM.set( 'age', this.credentials.age );
            // make key from nodeid number in hex as string
            // only store some information into NVM
            devicekey = '#'+updatedevice.source.toString(16);
            storedata.device_type = updatedevice.device_type;
            storedata.source = updatedevice.source;
            storedata.dest = updatedevice.dest;
            storedata.data = updatedevice.data;
            storedata.name = updatedevice.name;
            storedata.state = updatedevice.state;
            storedata.conf = updatedevice.conf;
            storedata.confage = updatedevice.confage;
            storedata.age = this.credentials.age;

            NVM.set( devicekey, storedata );

            //console.log( "stored "+devicekey );

        },

        removeDevice: function( src ) {
            if (src) {
                // remove device by source number
                devkey = '#' + src.toString(16);
                NVM.remove(devkey);
                console.log("device " + devkey + " removed");
            }
        },

        storeGroup: function( group ) {
            var groupkey = '';
            // make key from nodeid number in hex as string
            groupkey = "$"+group.dest.toString(16);
            NVM.set( devicekey, group );
            console.log( "group "+groupkey );
        },

        setSerialFilter: function( src ) {
            console.log( "setfilter "+ src );
            this.serialfilter = src;
        },

        pushSerialData: function( data, source, seq ) {

            if( source != this.serialfilter ) {
                // filter serial messages we don't want to see
                console.log( "serialfilter "+source+" showing "+this.serialfilter )
                return;
            }

            var top = this.serialdata.pop();

            // check if we lost data, then just print a '.'
            if( seq != this.lastserialseq+1 ){
                this.serialdata.push( '.' );
            }
            this.lastserialseq = seq;

            for( i=0; i<data.length; i++ ){
                if(( data[i].match(/\r/) )||( data[i].match(/\n/) )) {
                    this.serialdata.push( top );
                    top = '';
                } else {
                    top += data[i];
                }
            }
            this.serialdata.push( top );
            //clear quote
            this.customQuote = null;
            while( this.serialdata.length > 10 ) {
                this.serialdata.shift();
            }
        }




    };
})
;//End CRED service.