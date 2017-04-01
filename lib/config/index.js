/**
 * Created by rdantzer on 29/03/17.
 */

'use strict';
module.exports = {
    notifications: {
        scopes: {
            USERS: {
                'RECIPIENT': 0,
                'FOLLOWERS': 1,
                'FOLLOWING': 2,
                'SUBSCRIBERS': 3
            },
            PROJECTS: {
                'OWNER': 0,
                'FOLLOWING': 1
            },
            GLOBAL: {
                'ONLINE': 0,
                'ALL': 1
            }
        }
    },
    sockets: {
        channels: {
            social_robot: {
                namespace: 'social_robot',
                values: ['here_you_go']
            },
            client: {
                namespace: 'client',
                auth: 'authenticate',
                public: [
                    'autocomplete'
                ],
                private: [
                    'messages'
                ]
            }
        }
    },
    redis: {
        prefix: 'rest:update',
        separator: ':',
        channels: [
            'debug',
            'user_login',
            'user_logout',
            'user_follow',
            'user_register',
            'message',
            'project_up',
            'project_update',
            'discussion_reply',
            'discussion_reply_like',
            'discussion_reply_update',
            'discussion_like',
            'profile_update',
            'profile_view',
            'opening_creation'
        ]
    }
};