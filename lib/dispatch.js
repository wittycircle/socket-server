/**
 * Created by rdantzer on 20/03/17.
 */

'use strict';

const {db} = require('./cache'),
    _ = require('lodash');

const NAMESPACE = 'rest:update';

const detail = {
    builder: (receivers, from, now) => {
        if (!Array.isArray(receivers))
            return ['zadd', `user::${receivers}::messages`, now, `message::${from}`];
        else
            return _.map(receivers, receiver => {
                return ['zadd', `user::${receiver}::messages`, now, `message::${from}`]
            })[0]
    }
};

exports.message = (from, receivers, content) => {
    let now = _.now();
    return db.redis
        .multi([
            ['zadd', `message::${from}`, now, content],
            detail.builder(receivers, from, now)
        ])
        .exec();
};

const manager = {};

manager.channels = [
    'article_creation',
    'article_like',
    'discussion_like',
    'discussion_reply',
    'discussion_reply_like',
    'discussion_reply_update',
    'opening_creation',
    'profile_update',
    'project_creation',
    'project_up',
    'project_update',
    'ranking',
    'user_follow',
    'user_offline',
    'user_online',
    'user_register'
].map(key => `${NAMESPACE}:${key}`);

manager.events = [];

const Manager = (events) => {
    manager.events = manager.channels.map(channel => {
        return {
            channel: channel,
            action: console.log
        }
    });
    _.merge(manager.events, events);
    return manager
};

exports.watch = (events) => {
    let mgr = Manager(events);

    db.sub.subscribe(manager.channels, (err, count) => {
        if (err) console.error(err);
        else console.log(`Subscribed to ${count} channels`)
    });

    db.sub.on('message', (channel, message) => {
        message = JSON.parse(message);
        let chan = _.find(mgr.events, {event: channel}) || false;
        if (chan !== false)
            chan.apply(message);
        else (console.log('Unknown', chan, message))
    })
};