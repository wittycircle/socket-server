/**
 * Created by rdantzer on 29/03/17.
 */

'use strict';

const Rx = require('rx'),
    cache = require('../cache'),
    Factory = require('../core/factory'),
    _ = require('lodash');

exports.middlewares = require('./middlewares');

exports.streams = {};

const HELPER = exports.HELPERS = {
    SELF: (id) => {
        return Promise.return(id)
    },
    USER_META: (id) => {
        return cache.db.redis
            .hmget(`user:${id}`, 'avatar', 'full_name')
            .then(result => {
                return {
                    id: id,
                    picture: result[0],
                    full_name: result[1]
                }
            })
    },
    PROJECT_META: (id) => {
        return cache.db.redis
            .hmget(`project:${id}:meta`, 'title', 'picture')
            .then(result => {
                return {
                    title: result[0],
                    picture: result[1]
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
    //Register events for recent-activities
    require('./activity')(events);
    let notifications = new Rx.Subject();

    //Who logged in
    // events.from('user_login')
    //     .subscribe(event => {
    //         HELPER.USER_META(event.id)
    //             .then(user => {
    //                 Factory.processEvent('user_login', event, user)
    //                     .subscribe(notification => {
    //                         HELPER.USER_SUBSCRIBERS(event.from)
    //                             .then(users => users.map(user => {
    //                                 notifications.onNext([user, notification])
    //                             }))
    //                     })
    //             })
    //     });
    //
    // //Who logged out
    // events.from('user_logout')
    //     .subscribe(event => {
    //         HELPER.USER_META(event.id)
    //             .then(user => {
    //                 Factory.processEvent('user_logout', event, user)
    //                     .subscribe(notification => {
    //                         HELPER.USER_SUBSCRIBERS(event.from)
    //                             .then(users => users.map(user => {
    //                                 notifications.onNext([user, notification])
    //                             }))
    //                     })
    //             })
    //     });

    //Project feedback

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

    //Message
    events.from('message')
        .subscribe(event => {

        });

    return notifications;
};
