/**
 * Created by rdantzer on 04/04/17.
 */

'use strict';

/**
 * Notification helper
 * @class Notification
 */
class Notification {
    constructor(event, emitter, data = null) {
        this.type = event.type;
        this.when = event.when;
        this.from = emitter;
        this.data = data;
    }
}

module.exports = Notification;