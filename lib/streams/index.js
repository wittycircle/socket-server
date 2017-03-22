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
                    db.redis.hset('socket::lookup', d.id, socket.id);
                    socket.isAuthenticated = true;
                    socket.auth = d;
                    socket.emit('server::authentication', {code: 200});
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
            dispatch.message(socket.auth.id, data.message.to, data.message.data)
                .then(() => {
                    return db.redis.hget('socket::lookup', data.message.to);
                })
                .then(id => {
                    if (id !== null)
                        socket.to(id).emit('server::data::messages', {
                            from: socket.auth.id,
                            data: data.message.data
                        })
                })
        }
    }
};