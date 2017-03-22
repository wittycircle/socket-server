/**
 * Created by rdantzer on 19/03/17.
 */

'use strict';

const {db} = require('../cache');

module.exports = () => {
    db.sub.subscribe('wittycircle::rest::event');

    // db.
};