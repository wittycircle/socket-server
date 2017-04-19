/**
 * Created by rdantzer on 09/04/17.
 */

'use strict';

const Rx = require('rx'),
    redis = require('../cache').db.redis,
    _ = require('lodash');

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
                    message: 'upvoted',
                    to: {
                        what: results[1].title
                    },
                    route: ['/project', results[1].public_id, results[1].title]
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
                    },
                    route: ['/project', results[1].public_id, results[1].title],
                    params: data.discussion
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
                        full_name: results[0].full_name,
                    },
                    message: 'followed',
                    to: {
                        what: results[1].full_name,
                    },
                    route: ['', results[1].username]
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
                        what: `${data.what} in ${data.tag}`
                    },
                    route: ['/project', results.public_id, results.title],
                    params: data.id
                }
            })
    }
};

module.exports = (events) => {
    let SUB = new Rx.Subject();

    const when = (event) => events.from(event),
        storeEvent = (type) => (data) => {
            HYDRATE[type](data)
                .then(result => {
                    console.log(`New activity: ${result.type} from ${result.from.full_name} route=${result.route} params=${result.params || null}`);
                    SUB.onNext(true);
                    redis.multi()
                        .lpush(`notifications:recent`, JSON.stringify(result))
                        .ltrim(`notifications:recent`, 0, SIZE)
                        .exec()
                })
        };

    EVENTS.forEach(event => {
        let OBS = when(event)
            .filter(event => !(event.hasOwnProperty('value') && event.value == -1)) //remove unfollow notifs
            // .filter(event =>
            // typeof event.full_name === 'string'
            //     && event.from.full_name.length
            //     && typeof event.to.what === 'string'
            //     && event.to.what.length); //remove untracked items

        OBS.subscribe(storeEvent(event));
    });
    console.log(`${EVENTS.length} channels bound to recent-activities`);
    return SUB;
};
