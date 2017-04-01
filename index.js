/**
 * Created by rdantzer on 15/03/17.
 */

'use strict';

const io = require('socket.io')({
        // transports: ['websocket']
    }),
    cache = require('./lib/cache').init();

const opts = require('./lib/config');

const Dispatcher = require('./lib/core/dispatch'),
    dispatcher = new Dispatcher(io, opts);

dispatcher.start();


// io.on('connection', socket => {
//     socket.isAuthenticated = false;
//
//     const middlewares = require('./lib/middlewares')(socket),
//         streams = require('./lib/streams')(socket);
//
//     socket.use(middlewares.log);
//     socket.use(middlewares.authenticate);
//     socket.use(middlewares.validate);
//
//     socket.on('client::authenticate', streams.authenticate);
//     socket.on('client::autocomplete', streams.autocomplete);
//
//     socket.on('client::request::latest_messages', console.log);
//     socket.on('client::request::invite', console.log);
//     socket.on('client::request::user', streams.user_info);
//     socket.on('client::messages', streams.message);
//
//     dispatch.register(socket)
//
//     require('./lib/core');
// });

io.listen(process.env.PORT || 3200);