/**
 * Created by rdantzer on 20/03/17.
 */

'use strict';

const {db} = require('./cache'),
    _ = require('lodash');

const NAMESPACE = 'rest:update';

class Manager {
    constructor(events) {
        this.events = events;
        this.channels = events.map(event => event.event);
        this.sockets = {};
        console.log(`New manager built with ${this.channels.length} channels\n`, this.channels);
    }

    static publish(channel, event) {
        db.pub.publish(`${NAMESPACE}:${channel}`, event)
    }

    register(socket) {
        console.log(`${socket.id} added to dispatcher`);

        db.redis.hmset(`socket:${socket.id}`, {
            auth: false
        });

        this.sockets[socket.id] = socket;

        socket.on('disconnect', () => {
            delete this.sockets[socket.id];
            db.redis.del(`socket:${socket.id}`);
            if (typeof socket.auth !== 'undefined')
                db.redis.hmset(`user:${socket.auth.id}`, 'socket', null);
            console.log(`${socket.id} removed from dispatcher`)
        });
    }
}

module.exports = (events) => {
    let mgr = new Manager(events);

    db.sub.subscribe(mgr.channels, (err, count) => {
        if (err) console.error(err);
        else console.log(`Subscribed to ${count} channels`)
    });

    db.sub.on('message', (channel, message) => {
        message = JSON.parse(message);
        let chan = _.find(mgr.events, {event: channel}) || false;
        if (chan !== false) {
            Promise.all(chan.apply.map(e => e(message)))
                .then(() => {
                    if (chan.notify !== null)
                        chan.notify(chan.transform(message), mgr.sockets);
                });
        }
        else (console.log('Unknown', chan, message))
    });

    return mgr;
};
