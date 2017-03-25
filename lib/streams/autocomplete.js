/**
 * Created by rdantzer on 15/03/17.
 */

'use strict';

const cache = require('../cache');

module.exports = (data) => {
    return cache.match(`autocomplete:${data.query.resource}`, `[${data.query.match}`, `[${data.query.match}\xff`)
};