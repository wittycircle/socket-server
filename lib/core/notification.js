/**
 * Created by rdantzer on 04/04/17.
 */

'use strict';

/**
 * Notification helper
 * @class Notification
 */
class Notification {
    constructor(type, emitter, data = null) {
        this.type = type;
        this.from = emitter;
        this.data = data;
    }
}

module.exports = Notification;