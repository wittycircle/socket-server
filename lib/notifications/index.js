/**
 * Created by rdantzer on 19/03/17.
 */

'use strict';

const {db} = require('../cache');

exports.subscribe = user_id => {
    db.sub.subscribe(`user${user_id}::notification`, `user${user_id}::messages`, (err, count) => {
        console.log('err, count', err, count);
    });

    db.sub.on('message', (channel, message) => {
        console.log(`Received ${message} from ${channel}`);
    })
};

exports.punsubscribe = user_id => {
    db.sub.unsubscribe(`user${user_id}::?`)
};