/**
 * Created by rdantzer on 29/03/17.
 */

'use strict';

const Rx = require('rx'),
    cache = require('../cache'),
    _ = require('lodash');

class SocialGraph {
    constructor(opts) {
        _.defaults(this, opts, opts, {
            lazy: false
        });
        this._online = new Rx.Subject();
    }

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

    to(user) {
        return {
            followers: cache.db.redis.smembers(`user:${user.id}:followers`),
            following: cache.db.redis.smembers(`user:${user.id}:following`),
            subscribers: cache.db.redis.smembers(`user:${user.id}:subscribers`)
        }
    }

    getSocket(id) {
        return cache.db.redis.hmget(`user:${id}`, 'socket')
    }

    online() {
        return this._online;
    }
}

module.exports = SocialGraph;