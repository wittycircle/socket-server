/**
 * Created by rdantzer on 29/03/17.
 */

'use strict';

const Rx = require('rx'),
    cache = require('../cache'),
    redis = cache.db.redis,
    Factory = require('../core/factory'),
    _ = require('lodash'),
    HELPER = require('../core').helpers;

exports.middlewares = require('./middlewares');

exports.streams = {};

/**
 * Convert redis pub/sub events to future front end notifications
 * @param events
 * class Notification
 *      when: number;
 *      type: string;
 *      message: string;
 *      read: boolean = false;
 *      from: {
 *          id: number;
 *          picture: string;
 *          fullname: string;
 *      }
 *
 */
exports.notifications = (events) => {
    let notifications = new Rx.Subject();

    //Who followed you
    events.from('user_follow')
        .filter(event => event.value === 1) //remove all un_follow notifications
        .subscribe(event => {
            HELPER.USER_META(event.id)
                .then(user => {
                    Factory.processEvent('user_follow', event, {from: user})
                        .subscribe(notification => {
                            HELPER.USER_SUBSCRIBERS(event.from)
                                .then(users => {
                                    users.map(user => notifications.onNext([user, notification]));
                                    if (users.find(usr => usr.id === user.id))
                                        notifications.onNext([user.id, notification])
                                })
                        })
                })
        });

    //Who upvoted your project
    events.from('project_up')
        .filter(event => event.value === 1) //remove all un_upvote notifications
        .subscribe(event => {
            HELPER.PROJECT_META(event.id)
                .then(project => Factory.processEvent('project_up', event, project)
                    .subscribe(notification => {
                        HELPER.USER_FOLLOWERS(event.from)
                            .then(users => users.map(user => {
                                notifications.onNext([user, notification])
                            }));
                        HELPER.PROJECT_OWNER(event.id)
                            .then(users => users.map(user => {
                                notifications.onNext([user, notification])
                            }))
                    }))
        });

    //Project update
    events.from('project_update')
        .subscribe(event => {
            HELPER.PROJECT_META(event.id)
                .then(project => Factory.processEvent('project_update', event, project)
                    .subscribe(notification => {
                        HELPER.PROJECT_FOLLOWERS(event.id)
                            .then(users => users.map(user => {
                                notifications.onNext([user, notification])
                            }))
                    }))
        });

    const ONE_DAY = 24 * 3600;

    //Profile view
    events.from('profile_view')
        .subscribe(event => {
            HELPER.USER_META_FROM_PROFILE(event.id)
                .then(user => Factory.processEvent('profile_view', event, user)
                    .filter(e => e.from != user.id)
                    .subscribe(notification => {
                        let key = `profile_view:${event.from}:${user.id}`;

                        redis
                            .ttl(key)
                            .then(value => value == -2)
                            .then(value => {
                                if (value)
                                    return redis
                                        .multi()
                                        .set(key, event.when)
                                        .expire(key, ONE_DAY)
                                        .exec()
                                        .then(() => notifications.onNext([user.id, notification]));
                                else
                                    console.log('Discarded view')
                            })
                    }))
        });

    return notifications;
};
