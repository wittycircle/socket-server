/**
 * Created by rdantzer on 22/03/17.
 */

'use strict';

const NAMESPACE = 'rest:update';

let detail = {
    online: data => {
        console.log(`User ${data.id} just logged in!`)
    },
    offline: data => {
        console.log(`User ${data.id} just logged out!`)
    },
    follow: data => {
        console.log(`User ${data.from} just ${data.value === -1 ? 'unfollowed' : 'followed'} user ${data.to}`)
    },
    profile_update: function (data) {
        console.log(`User ${data.id} just updated his profile`)
    },
    opening_creation: function (data) {
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
    }
};

module.exports = {
    data: [
        {
            event: 'user_online',
            apply: detail.online
        },
        {
            event: 'user_offline',
            apply: detail.offline
        },
        {
            event: 'user_follow',
            apply: detail.follow
        },
        {
            event: 'project_up',
            apply: detail.project_up
        },
        {
            event: 'project_update',
            apply: detail.project_update
        },
        {
            event: 'discussion_reply',
            apply: detail.discussion_reply
        },
        {
            event: 'discussion_reply_like',
            apply: detail.discussion_reply_like
        },
        {
            event: 'discussion_reply_update',
            apply: detail.discussion_reply_update
        },
        {
            event: 'discussion_like',
            apply: detail.discussion_like
        },
        {
            event: 'profile_update',
            apply: detail.profile_update
        },
        {
            event: 'opening_creation',
            apply: detail.opening_creation
        }
    ].map(el => {
        return {
            event: `${NAMESPACE}:${el.event}`,
            apply: el.apply
        }
    })
};