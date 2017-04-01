/**
 * Created by rdantzer on 29/03/17.
 */

'use strict';

const Redis = require('redis-sessions'),
    rs = new Redis(),
    Rx = require('rx'),
    cache = require('../cache'),
    _ = require('lodash');

const rsapp = 'wittycircle';

const getUser = (token) => new Promise((ok, ko) => {
    rs.get({
        app: rsapp,
        token: token
    }, (err, user) => {
        if (err) ko(err);
        else if (_.isEmpty(user))
            ko('Expired token');
        else ok(user);
    })
});

exports.getUser = (token) => Rx.Observable
    .fromPromise(getUser(token));