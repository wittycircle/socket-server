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
                    db.redis.zadd(`users:online`, d.id, socket.id);
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
            process.nextTick(() => {
                db.pub.publish('message', data)
            })
        },
        user_info: data => {
            db.redis.hmget(`user:${data.id}`, 'username', 'avatar')
                .then(results => {
                    socket.emit(`server::resources::user`, results);
                })
        }
    }
};