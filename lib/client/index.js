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

const HELPER = {
    SELF: (id) => {
        return Promise.return(id)
    },
    PROJECT_META: (id) => {
        return cache.db.redis.hmget(`project:${id}:meta`, 'title')
            .then(result => {
                return {title: result}
            })
    },
    PROJECT_FOLLOWERS: (id) => {
        return cache.db.redis.smembers(`projects:${id}`)
            .then(result => result || [])
    },
    USER_SUBSCRIBERS: (id) => {
        return cache.db.redis.smembers(`user:${id}:subscribers`)
            .then(result => result || [])
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
    let notifications = new Rx.Subject();

    //Who logged in
    events.from('user_login')
        .subscribe(event => {
            Factory.createNotification('user_login', event.from)
                .map(notification => {
                    notification.when = event.when;
                    return notification
                })
                .subscribe(notification => notifications.onNext(notification))
        });

    //Who followed you
    events.from('user_follow')
        .filter(event => event.value === 1) //remove all un_follow notifications
        .subscribe(event => {
            Factory.createNotification('user_follow', event.from)
                .map(notification => {
                    notification.when = event.when;
                    return notification
                })
                .subscribe(notification => notifications.onNext(notification))
        });

    //Who upvoted your project
    events.from('project_up')
        .filter(event => event.value === 1) //remove all un_upvote notifications
        .subscribe(event => {
            HELPER.PROJECT_META(event.id)
                .then(project => Factory.createNotification('project_up', event.from, project)
                    .map(notification => {
                        notification.when = event.when;
                        return notification
                    })
                    .subscribe(notification => notifications.onNext(notification)))
        });

    //Project update
    events.from('project_update')
        .subscribe(event => {
            HELPER.PROJECT_META(event.id)
                .then(project => Factory.createNotification('project_update', event.from, project)
                    .map(notification => {
                        notification.when = event.when;
                        return notification
                    })
                    .subscribe(notification => notifications.onNext(notification)))
        });

    //Message
    events.from('message')
        .subscribe(event => {

        });

    return notifications;
};