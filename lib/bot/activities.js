/**
 * Created by rdantzer on 26/06/17.
 */

const {Observable} = require('rx');
const _ = require('lodash');

const {pub, sql} = require('../cache').db;
const {redis} = require('../config');

const includes = Array.prototype.includes;

/**
 * @param {Object} options
 * @param {Number} options.minInterval - minimum time interval (in milliseconds)
 * @param {Number} options.maxInterval - maximum time interval (in milliseconds)
 * @param {Number} options.projectCount - number of project to use
 * @param {Number} options.userCount - number of user to use
 * @param {Boolean} options.viewOnFollow - does the bot generates view events on profile follow ?
 * @param {Boolean} options.dontSave - does the bot saves shit in mysql ?
 * @param {Object} options.selector
 * @param {Number} options.selector.userFollowerCount - number of user followers to reach
 * @param {Object} options.blacklist
 * @param {Number[]} options.blacklist.projects - projects id to exclude
 * @param {Number[]} options.blacklist.users - users id to exclude
 */
const generateRecentActivities = (options) => {
  const randomDelay = (min, max) => Math.floor(Math.random() * (1 + max - min)) + max;


  const util = require('util');

  function publish(channel, data) {
    data.when = Date.now();
    if (!options.dontSave)
      pub.publish(`${redis.prefix}:${channel}`, JSON.stringify(data));
    console.log(`${channel}: ${util.inspect(data, {colors: true})}`);
  }

  const followProject = (from, id) => {
    publish('project_up', {from, id});

    const packet = {user_id: from, project_id: id};

    if (!options.dontSave)
      return sql('project_followers')
        .first('id')
        .where(packet)
        .then(r => {
          if (!r) return sql('project_followers').insert(packet)
        })
        .then(() => console.log(`mysql: project_followers ${from} ${id}`))
  };

  const followUser = (from, id) => {
    if (options.viewOnFollow) publish('profile_view', {from, id});

    const packet = {user_id: from, followed: id};

    publish('user_follow', {from, id});

    if (!options.dontSave)
      return sql('user_followers')
        .first('id')
        .where(packet)
        .then(r => {
          if (!r) return sql('user_followers').insert(packet);
        })
        .then(() => console.log(`mysql: user_followers ${from} ${id}`))
  };


  Promise.all([

    sql('users as u')
      .select('u.id')
      .where('u.fake', 1),

    sql('projects as p')
      .select('p.id')
      .orderBy('p.creation_date')
      .where('p.project_visibility', 1)

  ])
    .then(([users, projects]) => {
      return {
        users: _.sampleSize(users.map(u => u.id).filter(u => !includes.call(options.blacklist.users, u)), options.userCount),
        projects: _.sampleSize(projects.map(p => p.id).filter(u => !includes.call(options.blacklist.projects)), options.projectCount)
      }
    })
    .then(({users, projects}) => {
      const botFollower = Observable
        .from(users)
        .concatMap(user => Observable.of(user).delay(randomDelay(options.minInterval, options.maxInterval)));

      botFollower
        .subscribe(user => followProject(user, _.sample(projects)));

      botFollower
        .subscribe(user => followUser(user, _.sample(users)));
    })
};

module.exports = generateRecentActivities;