/**
 * Created by rdantzer on 22/03/17.
 */

'use strict';

const auth = require('./events/auth'),
    profile = require('./events/profile'),
    {notify, SCOPES} = require('./events/notify'),
    prettyjson = require('prettyjson');


const NAMESPACE = 'rest:update';

let detail = {
    debug: data => {
        console.log(`DEBUG START\n${prettyjson.render(data)}\nDEBUG END`)
    },
    login: data => {
        console.log(`User ${data.id} just logged in!`)
    },
    logout: data => {
        console.log(`User ${data.id} just logged out!`)
    },
    register: data => {
        console.log(`User ${data.id} just registered`)
    },
    follow: data => {
        console.log(`User ${data.from} just ${data.value === -1 ? 'unfollowed' : 'followed'} user ${data.to}`)
    },
    profile_update: data => {
        console.log(`User ${data.id} just updated his profile`)
    },
    profile_view: data => {
        console.log(`User ${data.from} just visited profile ${data.to}`)
    },
    opening_creation: data => {
        console.log(`New opening with tags ${data.tags.concat(',')} and description ${data.description}`)
    },
    discussion_reply: data => {
        console.log(`User ${data.from} just replied ${data.message} in discussion ${data.id}`)
    },
    discussion_like: data => {
        console.log(`User ${data.from} just ${data.value === -1 ? 'unupvoted' : 'upvoted'} discussion ${data.id}`)
    },
    project_up: data => {
        console.log(`User ${data.from} just ${data.value === -1 ? 'unupvoted' : 'upvoted'} project ${data.id}`)
    },
    project_update: data => {
        console.log(`Project ${data.id} was just updated`)
    },
    discussion_reply_like: data => {
        console.log(`Reply ${data.from} just ${data.value === -1 ? 'unfollowed' : 'followed'} reply ${data.id}`)
    },
    discussion_reply_update: data => {
        console.log(`User ${data.from} updated reply ${data.id} with message ${data.message}`)
    },
    message: data => {
        console.log(`User ${data.from} send message ${data.content} to user ${data.to}`)
    }
};

const transform = require('./transform');

module.exports = {
    data: [
        {
            event: 'debug',
            apply: [detail.debug]
        },
        {
            event: 'user_online',
            apply: [auth.login],
            notify: SCOPES.ONLINE,
            transform: transform.login
        },
        {
            event: 'user_register',
            apply: [detail.register]
        },
        {
            event: 'message',
            apply: [detail.message]
        },
        {
            event: 'unread_message',
            apply: [console.log]
        },
        {
            event: 'user_offline',
            apply: [detail.logout, auth.logout],
            notify: SCOPES.ONLINE,
            transform: transform.logout
        },
        {
            event: 'user_follow',
            apply: [detail.follow, profile.follow]
        },
        {
            event: 'project_up',
            apply: [detail.project_up]
        },
        {
            event: 'project_update',
            apply: [detail.project_update]
        },
        {
            event: 'discussion_reply',
            apply: [detail.discussion_reply]
        },
        {
            event: 'discussion_reply_like',
            apply: [detail.discussion_reply_like]
        },
        {
            event: 'discussion_reply_update',
            apply: [detail.discussion_reply_update]
        },
        {
            event: 'discussion_like',
            apply: [detail.discussion_like]
        },
        {
            event: 'profile_update',
            apply: [detail.profile_update]
        },
        {
            event: 'profile_view',
            apply: [detail.profile_view]
        },
        {
            event: 'opening_creation',
            apply: [detail.opening_creation]
        }
    ].map(el => {
        return {
            event: `${NAMESPACE}:${el.event}`,
            apply: el.apply,
            notify: ( typeof el.notify === 'undefined' ? null : notify(el.notify) ),
            transform: el.transform || transform._default
        }
    })
};