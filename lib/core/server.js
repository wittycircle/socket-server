/**
 * Created by rdantzer on 29/03/17.
 */

'use strict';

const Rx = require('rx'),
    _ = require('lodash'),
    {middlewares} = require('../client');

class SocketWrapper {
    /**
     * @constructor SocketWrapper
     * @param socket the current socket instance from io.on('connection') event
     * @param channels {Object} config
     */
    constructor(socket, channels) {
        this.authenticated = false;

        //Public events observables
        this._clientEvents = channels.client.public
            .map(channel => Rx.Observable.fromEvent(socket, `${channels.client.namespace}::${channel}`));

        //Private events (authenticated) observables
        this._privateClientEvents = channels.client.private
            .map(channel => Rx.Observable.fromEvent(socket, `${channels.client.namespace}::${channel}`));

        //Public events hash table {channel_name: Rx.Observable}
        this._streams = _.zipObject(channels.client.public, this._clientEvents);
        //Private channels hash table {channel_name: Rx.Observable}
        this._privateStreams = _.zipObject(channels.client.private, this._privateClientEvents);

        //Authentication event
        this._authStream = Rx.Observable.fromEvent(socket, `${channels.client.namespace}::${channels.client.auth}`);
        //Logout event
        this._logoutStream = Rx.Observable.fromEvent(socket, 'disconnect', () => socket.id);

        //bind middlewares to socket
        //Here joi validation
        socket.use(middlewares.validate);

        //Bind socket.io socket to current SocketWrapper entity
        this.socket = socket;
    }


    /**
     *
     * @returns {Observable<T>}
     */
    authenticate() {
        return this._authStream;
    }

    /**
     *
     * @returns {Observable<T>}
     */
    offline() {
        return this._logoutStream;
    }

    /**
     * Public streams getter
     * @param channel
     * @returns {Observable<T>}
     * @throws
     */
    streams(channel) {
        if (!this._streams.hasOwnProperty(channel))
            throw `${channel} is not a public stream of this socket`;
        return this._streams[channel]
    }

    /**
     * Private streams getter
     * @param channel
     * @returns {Observable<T>}
     * @throws
     */
    privateStreams(channel) {
        if (!this._privateStreams.hasOwnProperty(channel))
            throw `${channel} is not a private stream of this socket`;
        else if (!this.authenticated)

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

    /**
     * Client stream
     * @returns {Observable<SocketWrapper>}
     */
    connections() {
        return this._connection;
    }
}

module.exports = SocketServer;