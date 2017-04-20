/**
 * Created by rdantzer on 20/04/17.
 */

'use strict';

const cache = require('../cache');

const HELPER = module.exports = {
    SELF: (id) => {
        return Promise.return(id)
    },
    USER_META: (id) => {
        return cache.db.redis
            .hmget(`user:${id}`, 'avatar', 'full_name', 'username', 'email')
            .then(result => {
                return {
                    id: id,
                    picture: result[0],
                    full_name: result[1],
                    username: result[2],
                    email: result[3]
                }
            })
    },
    USER_ONLINE: (id) => {

    },
    USER_META_FROM_PROFILE: (profile_id) => {
        return cache.db.redis
            .get(`profile:${profile_id}`)
            .then(HELPER.USER_META)
    },
    PROJECT_META: (id) => {
        return cache.db.redis
            .hmget(`project:${id}:meta`, 'title', 'picture', 'public_id')
            .then(result => {
                return {
                    title: result[0],
                    picture: result[1],
                    public_id: result[2]
                }
            })
    },
    PROJECT_FOLLOWERS: (id) => {
        return cache.db.redis
            .smembers(`project:${id}`)
            .then(result => result || [])
    },
    USER_SUBSCRIBERS: (id) => {
        return cache.db.redis
            .smembers(`user:${id}:subscribers`)
            .then(result => result || [])
    },
    USER_FOLLOWERS: (id) => {
        return cache.db.redis
            .smembers(`user:${id}:followers`)
            .then(result => result || [])
    },
    USER_FOLLOWING: (id) => {
        return cache.db.redis
            .smembers(`user:${id}:following`)
            .then(result => result || [])
    },
    PROJECT_OWNER: (id) => {
        return cache.db.redis
            .hmget(`project:${id}:meta`, 'owner')
            .then(result => result[1] || [])
    }
};
