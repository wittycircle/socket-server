/**
 * Created by rdantzer on 18/04/17.
 */

'use strict';

const {redis, sql} = require('../cache').db;

const updateProject = e => {
        sql('projects as p')
            .first('*', sql.raw('GROUP_CONCAT(pf.user_id) as followers'))
            .join('project_followers as pf', 'p.id', 'pf.project_id')
            .where('p.id', e.id)
            .then(project => {
                console.log('PIPE', project);
                redis.pipeline()
                    .hmset(`project:${e.id}:meta`, {
                        public_id: project.public_id,
                        owner: project.user_id,
                        title: project.title,
                        picture: project.picture
                    })
                    .sadd(`project:${e.id}`, typeof project.followers === 'undefined' ? [] : project.followers.split(','))
                    .sadd(`user:${project.user_id}:projects`, project.id)
                    .exec()
            })
    },
    updateUser = e => {
        sql('users')
            .first('users.id', 'p.profile_picture', 'p.first_name', 'p.last_name', 'users.username')
            .innerJoin('profiles as p', 'p.id', 'users.profile_id')
            .then(user => {
                redis.pipeline()
                    .hmset(`user:${user.id}`, {
                        avatar: user.profile_picture,
                        full_name: `${user.first_name} ${user.last_name}`,
                        username: user.username
                    })
                    .exec()
            })
    },
    profileView = e => {
    //TODO
    //     redis.pipeline()
    //         .set(`view:${e.from}:${e.id}`)
    //         .expire(`view:${e.from}:${e.id}`, 5000);
        console.log('PERSIST',e);
    },
    userFollow = e => {
    //TODO
        console.log('PERSIST',e);
    };



module.exports = (events) => {
    events.from('project_creation')
        .subscribe(updateProject);

    events.from('project_update')
        .subscribe(updateProject);

    events.from('user_register')
        .subscribe(updateUser);

    events.from('profile_update')
        .subscribe(updateUser);

    events.from('profile_view')
        .subscribe(profileView);

    events.from('user_follow')
        .subscribe(userFollow)
};