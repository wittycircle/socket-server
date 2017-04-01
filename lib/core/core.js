/**
 * Created by rdantzer on 29/03/17.
 */

'use strict';

const {redis, pub, sub} = require('../cache').db,
    Rx = require('rx'),
    _ = require('lodash');

if (process.env.NODE_ENV === 'development')
    Rx.config.longStackSupport = true;

const CONSTANTS = {
    NAMESPACE: 'rest:update',
    REPLAY_SIZE: 25
};

class Core {
    constructor(opts) {
        this._opts = opts;
        this._channels = this._opts.channels.map(channel => `${this._opts.prefix}${this._opts.separator}${channel}`);
        this._subjects = {};
        this._defaultListener = Rx.Observer.create(
            x => console.log(`DefaultListener: ${x}`),
            err => console.error(err),
            () => console.log('Completed')
        );
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

        //Demultiplexer
        sub.on('message', (channel, message) => {
            this._subjects[channel]
                .onNext(message);
        });
    }

    from(channel) {
        return this._subjects[`${this._opts.prefix}${this._opts.separator}${channel}`];
    }
}

module.exports = Core;