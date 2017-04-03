/**
 * Created by rdantzer on 29/03/17.
 */

const Rx = require('rx'),
    cache = require('../cache');

'use strict';

exports.middlewares = require('./middlewares');

exports.streams = {};

//UNUSED
const storeForLater = (users, notification) => {
    if (!Array.isArray(users)) users = [users]; //dirty but WHO CARES :+1:
    let query = users.map(user => ['sadd', `user:${user}:notifications`, notification.when, notification.data]);
    return cache.db.redis
        .multi(query)
        .exec();
};

/**
 * Convert redis pub/sub events to future front end notifications
 * @param events
 */
exports.notifications = (events) => {
    //Who logged in
    events.from('user_login')
        .subscribe(event => {

        });

    //Who followed you
    events.from('user_follow')
        .subscribe(event => {
            storeForLater(event.to, {
                data: `user_login:${event.from}`
            })
        });

    //Who upvoted your project
    events.from('project_up')
        .subscribe(event => {

        });

    //Project update
    events.from('project_update')
        .subscribe(event => {
            cache.db.redis.smembers(`project:${event.id}`)
                .then(results => {
                    if (!results.length)
                        console.log('Nobody to notify'); //put actual socket.emit here
                    else
                        console.log(results) //does actually nothing as notification storage will be handled asynchronously
                })
        });

    //Message
    events.from('message')
        .subscribe(event => {

        });

};