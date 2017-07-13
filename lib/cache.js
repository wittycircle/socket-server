/**
 * Created by rdantzer on 19/02/17.
 */

'use strict';

const {db, TABLES} = require('../../app/models/index'),
  _ = require('lodash'),
  Promise = require('bluebird');

let Redis = require('ioredis');

/**
 * Intercept all publish payload and transform it to string whenever an Object is present
 */
Redis.Command.setArgumentTransformer('publish', function (args) {
  if (args.length === 2 && typeof args[1] === 'object')
    args[1] = JSON.stringify(args[1]);
  return args;
});

//We need 2 clients min, but we have 3 because we deserve it
//cf https://redis.io/commands/subscribe
const config = require('../../app/private/index').redis,
  redis = Redis(config),
  pub = Redis(config),
  sub = Redis(config);

//ZRANGEBYLEX helper (for autocomplete)
//TODO move in its own file
exports.match = (key, min, max) => {
  return redis.zrangebylex(key, min, max);
};

//External access to `les bails de db`
exports.db = {
  redis: redis,
  pub: pub,
  sub: sub,
  sql: db
};

const needsBootstrap = (duration) =>
  redis.ttl(key).then(value => {
    if (value == -2)
      return redis
        .multi()
        .set('cache:boostrap', Date.now())
        .expire('cache:bootstrap', duration)
        .exec()
        .then(() => true);
    return Promise.resolve(false);
  });

//A BIG PROMISE.ALL
//Bootstraps all the redis livemap of `tout les bails`
const init = () => {
  return Promise.all([
    /**
     * Fetch all skills and store them in Redis for ZRANGEBYLEX autocomplete
     */
    db(TABLES.SCORE)
      .select(['points', 'user_id'])
      .then(scores =>
        scores.map(score => ['zadd', 'ranking', score.points, score.user_id])
      )
      .then(queries => redis.multi(queries).exec()),
    /**
     * Fetch all usernames and store them in Redis for ZRANGEBYLEX autocomplete + user.id lookup
     */
    db(`${TABLES.USERS} as u`)
      .select([
        'u.id',
        'u.email',
        'u.username',
        'p.first_name',
        'p.last_name',
        'user_id as profile_id',
        'picture',
        'n.id as network_id'
      ])
      .orderBy('u.id')
      .leftJoin(`${TABLES.PROFILES} as p`, 'u.id', 'p.user_id')
      .leftJoin(`${TABLES.NETWORKS_LIST} as n`, 'p.network_id', 'n.id')
      .then(users => {
        return {
          username: users.map(user => [user.id, user.username]),
          users: users.map(user => {
            return [
              'hmset',
              `user:${user.id}`,
              'username',
              user.username,
              // 'first_name', user.first_name,
              // 'last_name', user.last_name,
              'full_name',
              `${user.first_name} ${user.last_name}`,
              'avatar',
              user.picture,
              'profile_id',
              user.profile_id,
              'email',
              user.email
            ];
          }),
          profiles: users.map(user => [
            'set',
            `profile:${user.profile_id}`,
            user.id
          ]),
          networks: users.map(user => ['sadd', `network:${user.network_id}`, +user.id])
        };
      })
      .then(query => {
        redis
          .multi(_.concat(query.users, query.profiles, query.networks))
          .zadd('autocomplete:username', query.username)
          .exec();
      })
      .catch(console.error),
    /**
     * Fetch all projects and their upvoters for the notification graph
     * And a project owner lookup
     */
    db
      .raw(
        `SELECT p.id, p.title, p.public_id, p.project_visibility, p.picture, p.user_id, p_f.upvoters FROM projects AS p
            LEFT JOIN (SELECT p_f.project_id, GROUP_CONCAT(DISTINCT p_f.user_id SEPARATOR ',') AS upvoters
            FROM project_followers AS p_f GROUP BY p_f.project_id) AS p_f ON p_f.project_id = p.id`
      )
      .then(results => {
        results = results[0];
        let pipeline = redis.pipeline();

        results.forEach(result => {
          pipeline.sadd(
            `project:${result.id}`,
            result.upvoters ? result.upvoters.split(',') : null
          );
          pipeline.sadd('projects', result.id);
          pipeline.sadd('projects_public_id', result.public_id);
          pipeline.hmset(`project:${result.id}:meta`, {
            owner: result.user_id,
            title: result.title,
            picture: result.picture,
            public_id: result.public_id
          });
          pipeline.sadd(`user:${result.user_id}:projects`, result.id);
          if (
            result.project_visibility //TRIGGER TRIGGER wtf column name
          )
            pipeline.zadd('autocomplete::project', [result.id, result.title]);
        });
        pipeline.exec();
        return results.length;
      }),
    /**
     * Create social graph (followers, following, subscribers)
     */
    db
      .raw(
        `SELECT DISTINCT f.user_id, o.following, e.follower FROM user_followers f
            LEFT JOIN
            (
            SELECT user_followers.user_id, GROUP_CONCAT(DISTINCT followed SEPARATOR ',') as following
                FROM user_followers GROUP BY user_id
            ) as o ON f.user_id = o.user_id
            LEFT JOIN
            (
                SELECT user_followers.followed, GROUP_CONCAT(DISTINCT user_id SEPARATOR ',') as follower
                    FROM user_followers GROUP BY followed
            ) as e ON f.user_id = e.followed`
      )
      .then(results => {
        results = results[0];
        let pipeline = redis.pipeline();

        results.forEach(result => {
          let followers = result.follower ? result.follower.split(',') : null,
            following = result.following ? result.following.split(',') : null;

          pipeline.sadd(`user:${result.user_id}:followers`, followers);
          pipeline.sadd(`user:${result.user_id}:following`, following);
          pipeline.sadd(
            `user:${result.user_id}:subscribers`,
            _.uniq(_.concat(followers, following))
          );
          pipeline.sadd(`users`, result.user_id); //to check id availability
        });
        pipeline.exec();
        return results.length;
      })
  ]).then(results => {
    return true;
  });
};

exports.init = needsBootstrap(20)
  .then(state => {
    if (state) init();
    else console.log('Cache bootstrap prevented');
  });