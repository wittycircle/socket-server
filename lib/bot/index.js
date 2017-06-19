/**
 * Created by rdantzer on 14/06/17.
 */

const _ = require('lodash');
const { Observable } = require('rx');

const { pub } = require('../cache').db;
const {redis} = require('../config');

/**
 * @param {Number[]} from - user ids
 * @param {Number[]} to - user ids
 * @param {Object} options
 * @param {Number} options.fromCount - selected viewers count
 * @param {Number} options.toCount - selected viewed profiles count
 * @param {Number} options.timeInterval - delay between views
 * @param {String} options.action - type of action to send to the event bus
 */
const bot = (from, to, options) => {
  const selectedFrom = _.sampleSize(from, options.fromCount);
  const selectedTo = _.sampleSize(to, options.toCount);

  Observable
    .interval(options.timeInterval)
    .take(selectedFrom.length)
    .map(index => selectedFrom[index])
    .subscribe(from => selectedTo.forEach(id => publish(options.action, {from, id})))
};

function publish(channel, data) {
  data.when = Date.now();
  pub.publish(`${redis.prefix}:${channel}`, JSON.stringify(data));
}

module.exports = bot;