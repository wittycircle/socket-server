/**
 * Created by rdantzer on 18/04/17.
 */

'use strict';

const {redis, sql} = require('../cache').db, _ = require('lodash');

const updateProject = e => {
        sql('projects as p')
            .first(
                'p.public_id',
                'p.user_id',
                'p.title',
                'p.picture',
                sql.raw('GROUP_CONCAT(pf.user_id) as followers')
            )
            .join('project_followers as pf', 'p.id', 'pf.project_id')
            .where('p.id', e.id)
            .then(project => {
                const followers = _.split(project.followers, ',')
                        .filter(follower => +follower !== 0) || [+project.followers];
                redis
                    .pipeline()
                    .hmset(`project:${e.id}:meta`, {
                        public_id: project.public_id,
                        owner: project.user_id,
                        title: project.title,
                        picture: project.picture
                    })
                    .sadd(`projects`, e.id)
                    .zadd(`autocomplete:project`, e.id, project.title)
                    .sadd(`projects_public_id`, project.public_id)
                    .sadd(`project:${e.id}`, followers)
                    .sadd(`user:${project.user_id}:projects`, project.id)
                    .exec();
                console.dir(project, {colors: true, depth: null});
            });
    },
    updateUser = e => {
        sql('users')
            .first(
                'users.id',
                'users.email',
                'p.picture',
                'p.user_id as profile_id',
                'p.first_name',
                'p.last_name',
                'users.username'
            )
            .innerJoin('profiles as p', 'p.user_id', 'users.id')
            .where('p.user_id', e.id)
            .then(user => {
                redis
                    .pipeline()
                    .hmset(`user:${e.id}`, {
                        avatar: user.picture,
                        full_name: `${user.first_name} ${user.last_name}`,
                        email: user.email,
                        profile_id: user.profile_id,
                        username: user.username
                    })
                    .set(`profile:${user.profile_id}`, `user:${e.id}`)
                    .exec();
            });
    },
    userFollow = e => {
        redis
            .pipeline()
            .sadd(`user:${e.from}:following`, e.id)
            .sadd(`user:${e.id}:followers`, e.from)
            .sadd(`user:${e.from}:subscribers`, e.id)
            .sadd(`user:${e.id}:subscribers`, e.from)
            .exec();
    },
    userActivity = e => {
        redis
            .pipeline()
            .lpush(`user:${e.id}:recent`, JSON.stringify([e.when, e.route]))
            .ltrim(`user:${e.id}:recent`, 0, 50)
            .exec();
    },
    // RANKING stuff
    createRank = e => {
        redis.zadd('ranking', 300, e.id);
    },
    addPoints = e => {
        return redis.zincrby('ranking', e.points, e.user_id).then(() => {
            Promise.all([
                redis.zrevrank('ranking', e.user_id).then(r => {
                    r += 1;
                    console.log('New ranking', r, 'user:', e.user_id);
                    return sql('ranks').update({rank: r}).where({user_id: e.user_id});
                    // .return();
                }),
                redis.zscore('ranking', e.user_id).then(r => {
                    console.log('New POINTS ', r, 'user:', e.user_id);
                    return sql('rank_points')
                        .update({points: r})
                        .where({user_id: e.user_id});
                    // .return();
                })
            ]);
        });
    };

module.exports = events => {
    events.from('project_creation').subscribe(updateProject);

    events.from('project_update').subscribe(updateProject);

    events.from('user_register').subscribe(updateUser);

    events.from('profile_update').subscribe(updateUser);

    events.from('user_follow').subscribe(userFollow);

    events.from('user_activity').subscribe(userActivity);

    //Ranking style
    events.from('user_register').subscribe(createRank);

    events.from('add_points').subscribe(addPoints);
};
