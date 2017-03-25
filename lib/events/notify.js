/**
 * Created by rdantzer on 25/03/17.
 */

'use strict';

const dbms = require('../cache'),
    _ = require('lodash');

const SCOPES = exports.SCOPES = {
    FOLLOWERS: 0,
    FOLLOWING: 1,
    SUBSCRIBERS: 2,
    ONLINE: 3
};

// const lua = require('../scripts');

exports.notify = (SCOPE) => {
    return [
        (data, sockets) => {
            dbms.db.redis
                .smembers(`user:${data.from}:follower`)
                .then(subscribers => {
                    return subscribers.map(subscriber => ['hmget', `user:${subscriber}`, 'socket'])
                })
                .then(query => {
                    return dbms.db.redis
                        .multi(query)
                        .exec()
                })
                .then(results => {
                    results.forEach(result => {
                        if (result[0] !== null) {
                            console.log(result[0])
                            sockets[result[0]].emit('server::notification', data)
                        }
                    })
                })
                .catch(console.error)
        },
        (data, sockets) => {
            dbms.db.redis
                .smembers(`user:${data.from}:following`)
                .then(subscribers => {
                    return subscribers.map(subscriber => ['hmget', `user:${subscriber}`, 'socket'])
                })
                .then(query => {
                    return dbms.db.redis
                        .multi(query)
                        .exec()
                })
                .then(results => {
                    results.forEach(result => {
                        if (result[0] !== null) {
                            console.log(result)
                            sockets[result[0]].emit('server::notification', data)
                        }
                    })
                })
                .catch(console.error)
        },
        (data, sockets) => {
            dbms.db.redis
                .smembers(`user:${data.from}:subscribers`)
                .then(subscribers => {
                    return subscribers.map(subscriber => ['hmget', `user:${subscriber}`, 'socket'])
                })
                .then(query => {
                    return dbms.db.redis
                        .multi(query)
                        .exec()
                })
                .then(results => {
                    results.forEach(result => {
                        if (result[0] !== null) {
                            console.log(result[0])
                            sockets[result[0]].emit('server::notification', data)
                        }
                    })
                })
                .catch(console.error)
        },
        (data, sockets) => {
            _.each(sockets, socket => socket.emit('server::notification', data))
        }
    ][SCOPE]
};