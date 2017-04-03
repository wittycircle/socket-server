/**
 * Created by rdantzer on 15/03/17.
 */

'use strict';

const io = require('socket.io')({
        // transports: ['websocket']
    }),
    cache = require('./lib/cache').init();

//Import options
const opts = require('./lib/config');

const Dispatcher = require('./lib/core/dispatch'),
    /**
     * Create a new dispatcher which handles redis and socket.io as streams with observable magic
     */
    dispatcher = new Dispatcher(io, opts);

/**
 * Take a ride into madness
 */
dispatcher.start();

/**
 * Starts socket.io
 */
io.listen(process.env.PORT || 3200);