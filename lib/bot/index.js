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

  console.log(
    `VIEW BOT:
Selected users for bot
  emitters: ${selectedFrom.join(', ')} count: ${options.fromCount}/${from.length}
  receivers: ${selectedTo.join(', ')} count: ${options.toCount}/${to.length}
  action: ${options.action}
  interval: ${options.timeInterval}
`);
  if (!selectedTo.length || !selectedFrom.length)
    return;

  Observable
    .interval(options.timeInterval)
    .take(selectedFrom.length)
    .map(index => selectedFrom[index])
    .subscribe(from => {
      const id = _.sample(selectedTo);
      publish(options.action, {from, id});
    })
};

function publish(channel, data) {
  data.when = Date.now();
  data.fake = 'view bot';
  pub.publish(`${redis.prefix}:${channel}`, JSON.stringify(data));
}

module.exports = bot;
