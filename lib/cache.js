/**
 * Created by rdantzer on 19/02/17.
 */

'use strict';

const {db, TABLES} = require('../../app/models/index'),
    _ = require('lodash');

let Redis = require('ioredis');

/**
 * Intercept all publish payload and transform it to string whenever an Object is present
 */
Redis.Command.setArgumentTransformer('publish', function (args) {
    if (args.length === 2 && typeof args[1] === 'object')
        args[1] = JSON.stringify(args[1]);
    return args;
});

const config = require('../../app/private/index').redis,
    redis = Redis(config),
    pub = Redis(config),
    sub = Redis(config);

exports.match = (key, min, max) => {
    return redis.zrangebylex(key, min, max);
};

exports.db = {
    redis: redis,
    pub: pub,
    sub: sub
};

exports.keys = {
    user: id => `socket::lookup::${id}`
};

exports.init = () => {
    /**
     * Fetch all skills and store them in Redis for ZRANGEBYLEX autocomplete
     */
    db(TABLES.SKILLS)
        .select(['name', 'priority'])
        .orderBy('name')
        .then(skills => skills.map(skill => [0, skill.name.toLowerCase()]))
        .then(skills => redis.zadd('skills::autocomplete', _.flattenDeep(skills)))
        .catch(console.error);
};

