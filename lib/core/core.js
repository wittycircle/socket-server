/**
 * Created by rdantzer on 29/03/17.
 */

'use strict';

const {redis, pub, sub} = require('../cache').db,
    Rx = require('rx'),
    _ = require('lodash');

if (process.env.NODE_ENV === 'development')
    Rx.config.longStackSupport = true;

/**
 * Constants
 * @type {{NAMESPACE: string, REPLAY_SIZE: number}}
 */
const CONSTANTS = {
    NAMESPACE: 'rest:update',
    REPLAY_SIZE: 25
};

class Core {
    /**
     * @constructor Core
     * @param opts {Object}
     */
    constructor(opts) {
        this._opts = opts;
        //Mount channels as specified in opts
        this._channels = this._opts.channels.map(channel => `${this._opts.prefix}${this._opts.separator}${channel}`);
        this._subjects = {};
        //Create a default observer for debug
        this._defaultListener = Rx.Observer.create(
            x => console.log(`DefaultListener: ${x}`),
            err => console.error(err),
            () => console.log('Completed')
        );

        //Bootstrap the redis system TODO move in constructor
        this._start();
    }

    _start() {
        //Subscribe to redis channels
        sub.subscribe(this._channels, (err, count) => {
            if (err) throw err;
            else
                console.log(`Subscribed to ${count} events`);
        });

        //Create channel observables
        this._channels.forEach(channel => {
            this._subjects[channel] = new Rx.ReplaySubject(CONSTANTS.REPLAY_SIZE);
            this._subjects[channel].subscribe(this._defaultListener)
        });

        //Convert redis pub/sub events to Observable<T>.onNext(T)
        sub.on('message', (channel, message) => {
            this._subjects[channel]
                .onNext(message);
        });
    }

    /**
     * Get channel
     * @param channel
     * @returns {Observable<T>}
     */
    from(channel) {
        let key = `${this._opts.prefix}${this._opts.separator}${channel}`;
        if (this._subjects.hasOwnProperty(key))
            return this._subjects[key];
        else
            throw `No ${key} in Core._channels`
    }
}

module.exports = Core;