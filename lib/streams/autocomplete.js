/**
 * Created by rdantzer on 15/03/17.
 */

'use strict';

const cache = require('../cache');

module.exports = data => {
    return cache.match('skills::autocomplete', `[${data.query.match}`, `[${data.query.match}\xff`)
};