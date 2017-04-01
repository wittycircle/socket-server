/**
 * Created by rdantzer on 29/03/17.
 */

'use strict';

const Rx = require('rx'),
    _ = require('lodash'),
    {middlewares} = require('../client');

class SocketWrapper {
    constructor(socket, channels) {
        this.authenticated = false;
        this._clientEvents = channels.client.public
            .map(channel => Rx.Observable.fromEvent(socket, `${channels.client.namespace}::${channel}`));

        this._privateClientEvents = channels.client.private
            .map(channel => Rx.Observable.fromEvent(socket, `${channels.client.namespace}::${channel}`));

        this._streams = _.zipObject(channels.client.public, this._clientEvents);
        this._privateStreams = _.zipObject(channels.client.private, this._privateClientEvents);
        this._authStream = Rx.Observable.fromEvent(socket, `${channels.client.namespace}::${channels.client.auth}`);
        this._logoutStream = Rx.Observable.fromEvent(socket, 'disconnect', () => socket.id);

        //bind middlewares to socket
        socket.use(middlewares.validate);

        this.socket = socket;
    }


    authenticate() {
        return this._authStream;
    }

    offline() {
        return this._logoutStream;
    }

    streams(channel) {
        if (!this._streams.hasOwnProperty(channel))
            throw `${channel} is not a public stream of this socket`;
        return this._streams[channel]
    }

    privateStreams(channel) {
        if (!this._privateStreams.hasOwnProperty(channel))
            throw `${channel} is not a private stream of this socket`;
        else if (!this.authenticated)
            this.socket.emit('server::authentication', {code: 401});
        return this._privateStreams[channel]
    }
}
/**
 * Handles everything and does the magic
 * Sockets are wrapped into Rx.Subject(s)
 * @class SocketServer
 * @constructor {socket.io}
 */
class SocketServer {
    constructor(opts) {
        this._opts = opts;
    }

    /**
     * Boostraps socket.io listeners
     * @param io
     */
    wrap(io) {
        this._connection = Rx.Observable.fromEvent(io, 'connection', socket => {
            return new SocketWrapper(socket, this._opts.channels);
        });
    }

    connections() {
        return this._connection;
    }
}

module.exports = SocketServer;