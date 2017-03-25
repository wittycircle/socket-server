/**
 * Created by rdantzer on 15/03/17.
 */

'use strict';

const Redis = require('ioredis'),
    config = {
        redis: {
            dropBufferSupport: true
        }
    },
    Session = require('redis-sessions'),
    session = new Session(),
    autocomplete = require('./autocomplete'),
    dispatch = require('../dispatch'),
    notifications = require('../notifications');

const {db, keys} = require('../cache');

const streams = module.exports = socket => {
    return {
        authenticate: data => {
            session.get({
                app: 'wittycircle',
                token: data.token.rest
            }, (err, d) => {
                if (err)
                    socket.emit('server::authentication', {code: 400});
                else {
                    db.redis.hmset(`user:${d.id}`, {
                        socket: socket.id,
                        socket_auth: true
                    });
                    db.redis.set(`socket:${socket.id}`, `user:${d.id}`);
                    socket.isAuthenticated = true;
                    socket.auth = d;
                    socket.emit('server::authentication', {code: 200});
                    socket.emit('server::notification', {desbails: '.js'})
                }
            });
        },
        autocomplete: data => {
            autocomplete(data)
                .then(matches => {
                    socket.emit(`server::autocomplete::${data.query.resource}`, {
                        matches: matches
                    })
                })
        },
        message: data => {
            db.pub.publish('message', data)
        }
    }
};