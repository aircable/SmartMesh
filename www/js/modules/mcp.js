/*!
 * Mesh Control Protocol (first style)
 * Copyright 2016 Wireless Cables Inc.
 * See LICENSE in this repository for license information
 */

appServices.factory('MCP', function ( $rootScope ) {

    var duplicates = [];
    var maxlength = 10;
    var dupidx = 0;

    var known_mcp = [
        { name: 'MCP_WATCHDOG_MESSAGE', mcp: 0x00 },
        { name: 'MCP_WATCHDOG_SET_INTERVAL', mcp: 0x01 },
        { name: 'MCP_WATCHDOG_INTERVAL', mcp: 0x02 }, // watchdog interval
        // config model
        { name: 'MCP_CONFIG_LAST_SEQUENCE_NUMBER', mcp: 0x03 },
        { name: 'MCP_CONFIG_RESET_DEVICE', mcp: 0x04 },
        { name: 'MCP_CONFIG_SET_DEVICE_IDENTIFIER', mcp: 0x05 }, // not usually used
        { name: 'MCP_CONFIG_SET_PARAMETERS', mcp: 0x06 }, // set txInterval, txDuration, txPower, TTL...
        { name: 'MCP_CONFIG_GET_PARAMETERS', mcp: 0x07 },
        { name: 'MCP_CONFIG_PARAMETERS', mcp: 0x08 }, // configuration parameters
        { name: 'MCP_CONFIG_DISCOVER_DEVICE', mcp: 0x09 }, // sent to everyone
        { name: 'MCP_CONFIG_DEVICE_IDENTIFIER', mcp: 0x0A }, // answer the discover
        { name: 'MCP_CONFIG_GET_INFO', mcp: 0x0B }, // ask for device config
        { name: 'MCP_CONFIG_INFO', mcp: 0x0C }, // current device information
        { name: 'MCP_CONFIG_SET_MESSAGE_PARAMS', mcp: 0x12 },
        { name: 'MCP_CONFIG_GET_MESSAGE_PARAMS', mcp: 0x13 },
        { name: 'MCP_CONFIG_MESSAGE_PARAMS', mcp: 0x14 },
        // AIRCABLE config blocks
        { name: 'MCP_DATA_MULTIBLOCK', mcp: 0x15 },	// serial data transmission, seq, length, 0-8 data
        { name: 'MCP_DATA_RESEND', mcp: 0x16 },	// resend request sequenceno
        { name: 'MCP_CONFIG_BLOCK', mcp: 0x17 },	// config data block

        // group model
        { name: 'MCP_GET_NUMBER_OF_MODEL_GROUPID', mcp: 0x0D },
        { name: 'MCP_GROUP_NUMBER_OF_MODEL_GROUPS', mcp: 0x0E },
        { name: 'MCP_SET_MODEL_GROUPID', mcp: 0x0F },
        { name: 'MCP_GET_MODEL_GROUPID', mcp: 0x10 },
        { name: 'MCP_GROUP_SET_MODEL_GROUPID', mcp: 0x11 },
        // sensor model
        { name: 'SENSOR_GET_TYPES', mcp: 0x20 }, // get types
        { name: 'SENSOR_TYPES', mcp: 0x21 }, // send types and more ...

        // actuator model
        { name: 'ACTUATOR_GET_TYPES', mcp: 0x30 }, // 0x30-0x35

        // asset model
        { name: 'ASSET_SET_STATE', mcp: 0x40 }, // configure the asset: tx, interval, destination
        { name: 'ASSET_GET_STATE', mcp: 0x41 }, // gets state of the asses
        { name: 'ASSET_STATE', mcp: 0x42 }, // asses state message
        { name: 'ASSET_ANNOUNCE', mcp: 0x43 }, // asset announcement, contains asset info

        // asset model
        { name: 'TRACKER_FIND', mcp: 0x44 }, // find an Asset
        { name: 'TRACKER_FOUND', mcp: 0x45 }, // asset found
        { name: 'TRACKER_REPORT', mcp: 0x46 }, // asset report
        { name: 'TRACKER_CLEAR_CACHE', mcp: 0x47 }, // clear tracker cache
        { name: 'TRACKER_SET_PROXIMITY_CONFIG', mcp: 0x48 }, // set tracker proximity config

        // action model
        { name: 'ACTION_SET_ACTION', mcp: 0x50 }, // 0x50-0x56

        // beacon model
        { name: 'BEACON_SET_STATUS', mcp: 0x60 }, // beacon model 0x60-0x6f

        // time model
        { name: 'TIME_SET_STATE', mcp: 0x75 }, // set Time Broadcast Interval
        { name: 'TIME_GET_STATE', mcp: 0x76 }, // get Time Broadcast Interval
        { name: 'TIME_STATE', mcp: 0x77 }, // set time broadcast interval
        { name: 'TIME_BROADCAST', mcp: 0x7F }, // sync time with this
        // data model
        { name: 'MCP_DATA_STREAM', mcp: 0x70 },
        { name: 'MCP_DATA_STREAM_SEND', mcp: 0x71 }, // sending data
        { name: 'MCP_DATA_STREAM_RECEIVED', mcp: 0x72 }, // ack data received
        { name: 'MCP_DATA_BLOCK', mcp: 0x73 },

        // firmware model
        { name: 'MCP_GET_FIRMWARE_VERSION', mcp: 0x78 },
        { name: 'MCP_FIRMWARE_VERSION_INFO', mcp: 0x79 },
        { name: 'MCP_UPDATE_REQUIRED', mcp: 0x7A },
        { name: 'MCP_SEND_UPDATE_ACK', mcp: 0x7B },
        { name: 'MCP_RESTART', mcp: 0x7F },

        { name: 'MCP_BEARER', mcp: 0x81 },
        { name: 'MCP_PING', mcp: 0x82 },
        { name: 'MCP_BATTERY_STATE', mcp: 0x83 },
        { name: 'MCP_ATTENTION', mcp: 0x84 },
        // light and power
        { name: 'MCP_POWER_SET_STATE', mcp: 0x89 },
        { name: 'MCP_LIGHT_SET_RGB', mcp: 0x8A },

        // largeObjectTransfer model
        { name: 'MCP_LARGEOBJECTTRANSFER_ANNOUNCE', mcp: 0x1A },
        { name: 'MCP_LARGEOBJECTTRANSFER_INTEREST', mcp: 0xEF }, // ready to receive

    ];

    function getMCPbyID( id ) {
        //console.log( 'check '+id );
        var results = known_mcp.filter( function( x ) { return x.mcp == id });
        if( results.length > 0 ){
            //console.log( 'found' + results[0].name );
            return results[0].name;
        } else {
            return 'UNKNOWN'+id.toString(16);
        }
    }

    // check for duplicate hmac packages
    function checkstore( hmac ) {
        for (i = 0; i < maxlength; i++)
            if (duplicates[i] == hmac) {
                return true;
            } else {
            }
        duplicates[dupidx++ % maxlength] = hmac;
        return false;
    }


    // turn an array of uint8 into a number
    function bytevalue( seqbytes ) {
        var val = 0;
        for( var i = seqbytes.length-1; i >= 0; i-- ){
            val = val*256 + seqbytes[i];
        }
        return val;
    }

    // First Mesh implementation uses AES, SHA256 and HMAC
    // SIG Mesh will use AES-CCM: https://github.com/vibornoff/asmcrypto.js
    // aes cmac https://github.com/allan-stewart/node-aes-cmac

    // function raw_aes( input, key ) {
     //   var exp_key = AES.key_expansion( key );
     //   var output_u8 = new Uint8Array( input.length );
     //   var output_u32 = new Uint32Array( output_u8.buffer );
     //   output_u8.set(input);
     // /* AES uses input as output */
     //   AES.cipher( output_u32, exp_key );
     //   return output_u8;
    //}

    // dencrypt an MCP package, payload at [5], length is payload length
    function dencrypt( pkt, len, key ) {

        // create our "initialization vector" and encrypt with AES, fixed 16 bytes
        var iv = new Uint8Array( 16 );
        // copy seq and sourceid into IV, keep one byte zero at [3]
        iv[0] = pkt[0];
        iv[1] = pkt[1];
        iv[2] = pkt[2];

        iv[4] = pkt[3];
        iv[5] = pkt[4];

        // asmCrypto library
        var enc = asmCrypto.AES_ECB.encrypt( iv, key, false );
        //console.log( "enc1="+angular.toJson( enc ));
        //console.log( "enc2="+angular.toJson( enc2 ));


        // decrypt the payload, starts at pkg[5]
        var decrypted = new Uint8Array( len );
        for (var i = 0; i < len; i++) {
            decrypted[i] = pkt[i+5] ^ enc[i];
        }
        return decrypted;
    }


    // returns JSON object
    //mcp_object.source = source id 0x8000 to 0x8fff  <<< KEY in storage
    //    .seq = sequence number << eliminate multiple messages
    //    .dest = number destination, interested only in 0x7FFF
    //    .type = number, type of node, e.g. 0x1060 SmartDimmer_status, 0x9060 SD_settings, 0x1061 Temp sensor etc.
    //    .data = Uint8Array, max 8 bytes after BLOCK and TYPE

    // MASP keys, already generated via input "\0MASP"
    var masp_key = new Uint8Array( [ 0xe9,0xd8,0x04,0xf8,0x86,0x24,0xac,0x0c,
        0x7b,0x1e,0x06,0xd8,0x84,0x78,0x59,0x94 ] );
    var masp_xor = new Uint8Array( [ 0x52,0x20,0x2a,0x39,0x40,0x18,0xc4,0x41,
        0xaa,0xd1,0x7d,0x26,0x05,0xd5,0x7f,0xae,0x2c,0xb3 ] );



    return {

        // serial device message, global variable
        print_mcp: [],

        decode: function ( mcppackage, key ) {
            var mcp_object = {};

            mcp_object.seq = bytevalue( mcppackage.subarray( 0, 3 )); // extract the seq number
            mcp_object.source = bytevalue( mcppackage.subarray( 3, 5 )); // extract the source

            // last byte it time to live number
            mcp_object.ttl = bytevalue( mcppackage.subarray( mcppackage.length-1, mcppackage.length ));

            //console.log( "source "+mcp_object.source+" ttl "+mcp_object.ttl);
            // extract HMAC, 8 bytes at the end before TTL number
            var hmac = mcppackage.subarray( mcppackage.length-1-8, mcppackage.length-1 );

            // extract payload
            var payload = mcppackage.subarray( 5, mcppackage.length-1-8 );
            //console.log( "mcp "+mcppackage.length+"src "+mcp_object.source.toString(16)+" "+payload[0].toString(16)+payload[1].toString(16));
            //console.log( "key "+angular.toJson( key ));

            var decrypted = dencrypt( mcppackage, payload.length, key );

            // decrypt package, for destination, type and data
            mcp_object.dest = bytevalue( decrypted.subarray( 0, 2 )); // extract the destination
            //console.log( "dest "+ mcp_object.dest+" len "+payload.length);

            // copy decrypted payload minus destination
            // type of object and subcode are in the beginning
            mcp_object.data = new Uint8Array( decrypted.length - 2 );
            mcp_object.data = decrypted.subarray( 2, decrypted.length );

            this.describe( mcp_object );

            return mcp_object;
        },


        // performa an HMAC over the input with the key available to check validity of the MCP
        // gets a Uint8Array raw mesh package and a Uint8Array key
        check: function( mcppackage, key ) {
            // package length for checking is without the HMAC and the TTL byte
            var len = mcppackage.length -1;
            var message = new Uint8Array( len );

            // first 8 bytes zero, copy data until MAC info
            // this is length -8 -1
            for( var i=8; i<len; i++ ){
                message[i] = mcppackage[i-8];
            }

            //console.log( "mcp="+mcppackage );
            //console.log( "msg="+message );
            //console.log( "key "+angular.toJson( key ));

            // return Uint8Array(32)
            //var hmac = sha256.hmac( key, message );
            var hmac = asmCrypto.HMAC_SHA256.bytes( message, key );

            // print the last 8 bytes, this is reversed
            //console.log( "gen HMAC="+hmac);
            //console.log( "new HMAC="+hmac2);

            // reverse check the last 8 bytes
            for( i=0; i<8; i++ ){
                if( mcppackage[len-8+i] != hmac[31-i] ) {
                    //console.log( "cmp: "+mcppackage[len-8+i]+"="+hmac[31-i]);
                    return false;
                }
            }
            //console.log( "valid");

            // return true if not duplicate
            return !checkstore( bytevalue( hmac ) );

        },

        // make new MCP package
        MeshControlPackage: function( sequence, source, destination, payload, key ) {
            var index = 0;

            if( payload.length > 11 ) {
                console.log("too large payload");
                return;
            }

            // length of the package we want to send is 3 seq + 2 source + 2 dest + payload + 8 hmac + 1 ttl
            var thisMCP = new Uint8Array( 3+2+2+payload.length+8+1 );

            // sequence is 32 bit number, 3 bytes use
            for(  index = 0; index < 3; index ++ ) {
                byte = sequence & 0xff;
                thisMCP [ index ] = byte;
                sequence = (sequence - byte) / 256 ;
            }
            for(  index = 3; index < 5; index ++ ) {
                byte = source & 0xff;
                thisMCP [ index ] = byte;
                source = (source - byte) / 256 ;
            }
            for(  index = 5; index < 7; index ++ ) {
                byte = destination & 0xff;
                thisMCP [ index ] = byte;
                destination = (destination - byte) / 256 ;
            }
            thisMCP.set( payload, 7 );

            // encrypt package destination plus payload
            var encrypted = dencrypt( thisMCP, payload.length+2, key );

            // overwrite payload with encrypted
            thisMCP.set( encrypted, 5 );

            // generate HMAC
            var message = new Uint8Array( 3 + 2 + 2 + payload.length + 8 );
            // offset 8 for hmac, need to be zero
            for( var i=0; i<(payload.length + 3 + 2 + 2); i++ ){
                message[i+8] = thisMCP[i];
            }

            //var hmac = sha256.hmac( key, message );
            var hmac = asmCrypto.HMAC_SHA256.bytes( message, key );
            // reverse copy the last 8 bytes into MCP
            for( index=0; index<8; index++ ){
                thisMCP[ 3+2+2+payload.length + index ] = hmac[ 31-index ];
            }
            // set fixed TTL
            thisMCP[ 3+2+2+payload.length+8 ] = 15;

            return thisMCP;
        },


        // check if valid MASP package
        masp_check: function( masppackage ){

            // MASP packages
            var len = masppackage.length - 1; // no TTL

            //console.log( "MASP len "+len+" "+angular.toJson( masppackage ) ); // should be 18+8

            var message = new Uint8Array( len );
            // first 8 bytes zero, copy data until MAC info
            for( var i=8; i<len; i++ ){
                message[i] = masppackage[i-8];
            }
            //var hmac = sha256.hmac( masp_key, message );
            var hmac = asmCrypto.HMAC_SHA256.bytes( message, masp_key );
            // reverse check the last 8 bytes
            for( i=0; i<8; i++ ){
                if( masppackage[len-8+i] != hmac[31-i] ) {
                    //console.log( "masp: "+masppackage[len-8+i]+"="+hmac[31-i]);
                    //console.log( "masp error");
                    return null;
                }
            }
            //console.log( "masp valid" );

            var masp_object = {};
            masp_object.data = new Uint8Array( len-8 );
            // decrypt via XOR
            for (var i = 0; i < len-8; i++) {
                masp_object.data[i] = message[i+8] ^ masp_xor[i];
            }
            // return true if not duplicate
            return masp_object;
        },



        // build a new masp package
        // example 9ec0909488d3180c419db8a9ba89e97a79 EC length 17
        // associate 57548 {"0":158,"1":192,
        // "2":144,"3":148,"4":136,"5":211,"6":24,"7":12,"8":65,"9":157,"10":184,"11":169,"12":186,"13":137,"14":233,"15":122,"16":121,"17":20,
        // "18":178,"19":19,"20":62,"21":48,"22":44,"23":66,"24":152,"25":237,
        // "26":1}
        new_masp: function( source, key ){

            // first 8 zero for HMAC, no TTL yet
            var newKey = new Uint8Array( 26 );
            // new key is 2 bytes destination and 16 bytes key

            byte = source / 256 ;
            newKey[ 8 ] = byte | 0x80; // high bit set, to indicate KEY package
            byte = source & 0xff;
            newKey[ 9 ] = byte;
            // copy the key
            for( i=0; i<16; i++ ){
                newKey[ 10+i ] = key[ i ];
            }

            // debug
            var printmasp = 'sendMASP=';
            for( i = 0; i < 18; i++ ) {
                if( newKey[8+i] < 16 )
                    printmasp += '0';
                printmasp += newKey[8+i].toString(16);
            }
            console.log( printmasp );

            //console.log( "kepmasp "+angular.toJson( newKey ));
            // encrypt via XOR
            for ( i=0; i<18; i++) {
                newKey[ i+8 ] = newKey[ i+8 ] ^ masp_xor[ i ];
            }
            //console.log( "encmasp "+angular.toJson( newKey ));
            // generate HMAC
            var hmac = asmCrypto.HMAC_SHA256.bytes( newKey, masp_key );

            // make new package to send
            var package = new Uint8Array( 26+1 ); // add TTL
            // first copy package, 18 bytes payload
            for( i=0; i<18; i++ ){
                package[ i ] = newKey[ 8+i ];
            }
            // reverse copy the last 8 bytes of HMAC into package
            for( i=0; i<8; i++ ){
                package[ 18+i ] = hmac[ 31-i ];
            }
            // set fixed TTL, as short as possible, 2 is minimum
            package[ 26 ] = 2;

            //this.masp_check( package );

            return package;
        },

        // print MCP like the sniffer
        describe: function ( mcp ){
            //console.log( "describe "+angular.toJson( mcp ) );
            var top = '';

            // interprete and write to string

            top  = "#" + mcp.seq.toString(16);
            top += " SRC: " + mcp.source.toString(16);
            top += " DST: " + mcp.dest.toString(16);

            // first element in data is type of MCP
            top += " " + getMCPbyID( mcp.data[0] ) + " ";

            for( var i=1; i<mcp.data.byteLength; i++ ){
                if( mcp.data[i] < 0x10 )
                    top += '0';
                top += mcp.data[i].toString(16);
            }
            top +=  " TTL: " + mcp.ttl.toString(16);

            this.print_mcp.push( top );
            //console.log( angular.toJson( print_mcp ));

            // maintain length of array
            while( this.print_mcp.length > 50 ) {
                this.print_mcp.shift();
            }

        }

    };
})
;//End MCP service