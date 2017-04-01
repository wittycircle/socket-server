/**
 * Created by rdantzer on 29/03/17.
 */

'use strict';

exports.middlewares = require('./middlewares');

exports.streams = {};

exports.notifications = (events) => {
    //Who logged in
    events.from('user_login')
        .subscribe();

    //Who followed you
    events.from('user_follow')
        .subscribe();

    //Who upvoted your project
    events.from('project_up')
        .subscribe();

    //Project update
    events.from('project_update')
        .subscribe();

    //Message
    events.from('message')
        .subscribe();

};