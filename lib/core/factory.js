/**
 * Created by rdantzer on 04/04/17.
 */

'use strict';

const cache = require('../cache'),
    Notification = require('./notification'),
    Rx = require('rx');

module.exports = {
    createNotification: (type, user_id, data = null) => {
        return Rx.Observable.fromPromise(cache.db.redis.hmget(`user:${user_id}`, 'avatar', 'full_name'))
            .map(user => {
                return {
                    picture: user[0],
                    full_name: user[1],
                    id: user_id
                }
            })
            .map(user => new Notification(type, user, data))
    },
    createMessage: (sender_id, receiver_id, content) => {

    }
};