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

const user = (id) => {
    return {
        follower: () => {
            return dbms.db.redis.smembers(`user:${id}:follower`)
        },
        following: () => {
            return dbms.db.redis.smembers(`user:${id}:following`)
        },
        subscribers: () => {
            return dbms.db.redis.smembers(`user:${id}:subscribers`)
        }
    }
};

const socket = (id) => {
    if (Array.isArray(id))
        return id.map(socket);
    else
        return ['hmget', `user:${id}`, 'socket']
};

exports.notify = (SCOPE) => {
    return [
        (data, sockets) => {
            user(data.from).follower()
                .then(socket)
                .then(results => {
                    console.log('SOCKET_LOOKUP_RESULTS', results)
                    results.forEach(result => {
                        if (result[0] !== null) {
                            console.log(result[0]);
                            sockets[result[0]].emit('server::notification', data)
                        }
                    })
                })
                .catch(console.error)
        },
        (data, sockets) => {
            user(data.from).following()
                .then(socket)
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
            user(data.from).subscribers()
                .then(socket)
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