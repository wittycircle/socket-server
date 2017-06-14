/**
 * Created by rdantzer on 14/06/17.
 */

const _ = require('lodash');
const { Observable } = require('rx');

const { pub } = require('../cache').db;
const config = require('../config');

/**
 * @param {Number[]} from - user ids
 * @param {Number[]} to - user ids
 * @param {Object} options
 * @param {Number} options.fromCount - selected viewers count
 * @param {Number} options.toCount - selected viewed profiles count
 * @param {Number} options.timeInterval - delay between views
 */
module.exports = (from, to, options = {
  fromCount: 10,
  toCount: 10,
  timeInterval: 3000
}) => {
  const selectedFrom = _.sampleSize(from, options.fromCount);
  const selectedTo = _.sampleSize(from, options.toCount);

  Observable.from(selectedFrom)
};
