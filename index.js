/**
 * Created by rdantzer on 15/03/17.
 */

'use strict';


const io = require('socket.io')({
        transports: ['websocket']
    }),
    cache = require('./lib/cache').init();

io.on('connection', socket => {
    console.log(socket.id);

    socket.isAuthenticated = false;

    const middlewares = require('./lib/middlewares')(socket),
        streams = require('./lib/streams')(socket);

    socket.use(middlewares.log);
    socket.use(middlewares.authenticate);
    socket.use(middlewares.validate);

    socket.on('client::authenticate', streams.authenticate);
    socket.on('client::request::latest_messages', console.log);
    socket.on('client::request::invite', console.log);
    socket.on('client::autocomplete', streams.autocomplete);
    socket.on('client::messages', streams.message)

});

io.listen(process.env.PORT || 3200);