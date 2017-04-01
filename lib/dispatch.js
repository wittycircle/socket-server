/**
 * Created by rdantzer on 20/03/17.
 */

'use strict';

const {db} = require('./cache'),
    _ = require('lodash');

const Rx = require('rx');

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
            db.redis.get(`sockets:${socket.id}`)
                .then(result => {
                    Manager.publish('user_logout', {
                        id: result
                    });
                    db.redis.del(`socket:${socket.id}`);
                    console.log(`${socket.id} removed from dispatcher`)
                });
        });
    }
}

module.exports = (events) => {
    let mgr = new Manager(events);

    const Core = require('./core').core;

    let core = new Core({
        channels: mgr.channels
    });

    core.from(`${NAMESPACE}:user_online`)
        .subscribe(
            console.log,
            console.error,
            console.log
        );

    return mgr;
};
