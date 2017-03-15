/**
 * Created by rdantzer on 15/03/17.
 */

'use strict';

const Redis = require('ioredis'),
    config = {
        redis: {
            dropBufferSupport: true
        }
    };

const redis = exports.redis = Redis(config.redis);

redis.subscribe('user_follow', (channel, message) => {
    console.log(channel, message)
});