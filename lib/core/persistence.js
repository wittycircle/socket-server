/**
 * Created by rdantzer on 18/04/17.
 */

'use strict';

const {redis, sql} = require('../cache').db,
    _ = require('lodash');

const updateProject = e => {
        sql('projects as p')
            .first('p.public_id', 'p.user_id', 'p.title', 'p.picture', sql.raw('GROUP_CONCAT(pf.user_id) as followers'))
            .join('project_followers as pf', 'p.id', 'pf.project_id')
            .where('p.id', e.id)
            .then(project => {
                redis.pipeline()
                    .hmset(`project:${e.id}:meta`, {
                        public_id: project.public_id,
                        owner: project.user_id,
                        title: project.title,
                        picture: project.picture
                    })
                    .sadd(`projects`, e.id)
                    .zadd(`autocomplete:project`, e.id, project.title)
                    .sadd(`projects_public_id`, project.public_id)
                    .sadd(`project:${e.id}`, _.split(project.followers, ','))
                    .sadd(`user:${project.user_id}:projects`, project.id)
                    .exec()
            })
    },
    updateUser = e => {
        sql('users')
            .first('users.id', 'p.profile_picture', 'u.profile_id', 'p.first_name', 'p.last_name', 'users.username')
            .innerJoin('profiles as p', 'p.id', 'users.profile_id')
            .where('p.id', e.id)
            .then(user => {
                redis.pipeline()
                    .hmset(`user:${e.id}`, {
                        avatar: user.profile_picture,
                        full_name: `${user.first_name} ${user.last_name}`,
                        username: user.username
                    })
                    .set(`profile:${user.profile_id}`, `user:${e.id}`)
                    .exec()
            })
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

    events.from('user_follow')
        .subscribe(userFollow);

    events.from('user_register')
        .subscribe(updateUser)
};