/**
 * Created by rdantzer on 09/04/17.
 */

'use strict';

const Rx = require('rx'),
    redis = require('../cache').db.redis;

const EVENTS = ['project_up', 'discussion_creation', 'user_follow', 'opening_creation'];

const SIZE = 4;

const HELPER = require('./index').HELPERS;

/**
 export class Activity {
    when: number;
    type: string;
    message: string;
    from: {
        id: number;
        picture?: string;
        full_name: string;
    };
    to: {
        what: string;
        data: any
    };
}*/


const HYDRATE = {
    'project_up': (data) => {
        return Promise.all([HELPER.USER_META(data.from), HELPER.PROJECT_META(data.id)])
            .then(results => {
                return {
                    when: data.when,
                    type: 'project_up',
                    from: {
                        id: data.from,
                        picture: results[0].picture,
                        full_name: results[0].full_name
                    },
                    to: {
                        what: results[1].title,
                        data: data.id
                    }
                }
            })
    },
    'discussion_creation': (data) => {
        return Promise.all([HELPER.USER_META(data.from), HELPER.PROJECT_META(data.id)])
            .then(results => {
                return {
                    when: data.when,
                    type: 'discussion_creation',
                    from: {
                        id: data.from,
                        picture: results[0].picture,
                        full_name: results[0].full_name
                    },
                    message: 'commented about',
                    to: {
                        what: results[1].title,
                        data: data.from
                    }
                }
            })
    },
    'user_follow': (data) => {
        return Promise.all([HELPER.USER_META(data.from), HELPER.USER_META(data.id)])
            .then(results => {
                return {
                    when: data.when,
                    type: 'user_follow',
                    from: {
                        id: data.from,
                        picture: results[0].picture,
                        full_name: results[0].full_name
                    },
                    message: 'followed',
                    to: {
                        what: results[1].full_name,
                        data: {
                            route: ``
                        }
                    }
                }
            })
    },
    'opening_creation': (data) => {
        return HELPER.PROJECT_META(data.from)
            .then(results => {
                return {
                    when: data.when,
                    type: 'opening_creation',
                    from: {
                        id: data.from,
                        picture: results.picture,
                        full_name: results.title
                    },
                    message: 'needs',
                    to: {
                        what: `${data.what} in ${data.tag}`,
                        data: data.from
                    }
                }
            })
    }
};

module.exports = (events) => {
    const when = (event) => events.from(event),
        storeEvent = (type) => (data) => {
            HYDRATE[type](data)
                .then(result => redis.multi()
                    .lpush(`notifications:recent`, JSON.stringify(result))
                    .ltrim(`notifications:recent`, 0, SIZE)
                    .exec())
        };

    EVENTS.forEach(event => {
        when(event)
            .filter(event => !(event.hasOwnProperty('value') && event.value == -1)) //remove unfollow notifs
            .subscribe(storeEvent(event))
    });
    console.log(`${EVENTS.length} channels bound to recent-activities`)
};