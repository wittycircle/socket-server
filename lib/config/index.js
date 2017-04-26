/**
 * Created by rdantzer on 29/03/17.
 */

'use strict';
module.exports = {
    //UNUSED
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
    //List of sockets events
    //let event = `${namespace}${separator || :}${value}`
    sockets: {
        channels: {
            //Social_robot (scrapper)
            social_robot: {
                namespace: 'social_robot',
                values: ['here_you_go']
            },
            //front end user
            client: {
                namespace: 'client',
                auth: 'authenticate',
                public: [
                    'autocomplete',
                    'activities'
                ],
                private: [
                    'messages',
                    'messages::fetch',
                    'discussions',
                    'notification::mark_as_read',
                    'message::mark_as_read'
                ]
            }
        }
    },
    //Redis list of event to subscribe to
    redis: {
        prefix: 'rest:update',
        separator: ':',
        channels: [
            'debug',
            'user_activity',
            'user_login',
            'user_logout',
            'user_follow',
            'user_register',
            'message',
            'project_creation',
            'project_up',
            'project_update',
            'discussion_creation',
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