/**
 * Created by rdantzer on 29/03/17.
 */

'use strict';

const Rx = require('rx'),
    cache = require('../cache'),
    _ = require('lodash');

/**
 * Black magic
 * Handles redis persistence and the live map of :
 *  - whose connected with who
 *  - who should be triggered by who
 *  - to define :+1:
 */
class SocialGraph {
    /**
     * Construct evilness with lodash
     * @param opts
     */
    constructor(opts) {
        _.defaults(this, opts, opts, {
            lazy: false
        });
        this._online = new Rx.Subject();
    }

    /**
     * Bind a user with a socket
     * @param user {Object}
     * @param bind {Number} socket.id
     */
    set(user, bind) {
        console.log(`Adding ${user.id} to online users`);
        cache.db.redis.multi()
            .hmset(`user:${user.id}`, 'socket', bind)
            .sadd(`users:online`, user.id)
            .exec()
            .then(() => this._online.onNext({
                who: user,
                status: true
            }));
    }

    /**
     * Remove a user from live map
     * @param user {Object}
     */
    remove(user) {
        console.log(`Removing ${user.id} from online users`);
        cache.db.redis
            .hmset(`user:${user.id}`, 'socket', null)
            .srem(`users:online`, user.id)
            .exec()
            .then(() => this._online.onNext({
                who: user,
                status: false
            }))
    }

    /**
     * Recipients helper
     * @param user
     * @returns {{followers: Promise, following: Promise, subscribers: Promise}}
     */
    to(user) {
        return {
            followers: cache.db.redis.smembers(`user:${user.id}:followers`),
            following: cache.db.redis.smembers(`user:${user.id}:following`),
            subscribers: cache.db.redis.smembers(`user:${user.id}:subscribers`)
        }
    }

    /**
     * user.id to socket.id helper
     * @param id
     * @returns {*}
     */
    getSocket(id) {
        return cache.db.redis.hmget(`user:${id}`, 'socket')
    }

    /**
     * UNUSED
     * @returns {Rx.Subject|Subject<T>}
     */
    online() {
        return this._online;
    }
}

module.exports = SocialGraph;