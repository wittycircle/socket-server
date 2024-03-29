/**
 * Created by rdantzer on 04/04/17.
 */

'use strict';

const cache = require('../cache'),
    Notification = require('./notification'),
    Rx = require('rx');

module.exports = {
    /**
     * @deprecated
     */
    createNotification: (type, user_id, data = null) => {
        return Rx.Observable
            .fromPromise(
                cache.db.redis
                    .hmget(`user:${user_id}`, 'avatar', 'full_name', 'username'))
            .map(user => {
                return {
                    picture: user[0],
                    full_name: user[1],
                    username: user[2],
                    id: user_id
                }
            })
            .map(user => new Notification(type, user, data))
    },
    processEvent: (type, event, data = null) => {
        /**
         * TODO get ttl on last notification read
         * set all > to read with [].map
         */
        event.type = type;
        return Rx.Observable
            .fromPromise(cache.db.redis
                .hmget(`user:${event.from}`, 'avatar', 'full_name', 'username')
            )
            .map(user => {
                return {
                    id: event.from,
                    picture: user[0],
                    full_name: user[1],
                    username: user[2]
                }
            })
            .map(user => new Notification(event, user, data))
    },
    createMessage: (sender_id, receiver_id, content) => {

    }
};