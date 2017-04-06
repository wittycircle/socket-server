/**
 * Created by rdantzer on 06/04/17.
 */

'use strict';

const {db} = require('../cache'),
    Rx = require('rx'),
    _ = require('lodash');

class NotificationStorage {
    constructor(opts = null) {
        this._length = 50;
        this._key = (id) => `notifications:${id}`;
        this._input = (id) => Rx.Observer.create(
            data => this._store(data[0], data[1]),
            err => Rx.Observable.throw(err),
            () => this._clear()
        );
    }

    _store(id, notification) {
        db.redis.set(this._status, 1);
        db.redis.lpush(this._key(id), JSON.stringify(notification));
        db.redis.ltrim(this._key(id), 0, this._length);
    }

    _clear(id) {
        db.redis.ltrim(this._key(id), 0, 0);
        db.redis.set(this._status, 0);
    }

    status() {
        return db.redis.get(this._status)
    }

    get input() {
        return this._input;
    }

}

module.exports = {
    notification: NotificationStorage,
    message: null
};