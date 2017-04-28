/**
 * Created by rdantzer on 20/04/17.
 */

'use strict';

const helpers = require('../core').helpers;
const mailer = require('../../../app/services/mailer');


//Mailer playground
/**
 * @param events (redis pub/sub wrapper)
 */
module.exports = (events) => {
    //Whenever a user registers
    /**
     * .from() takes a channel defined in `lib/config/index.js` l54
     * Data from req.broadcastEvent + .when timestamp
     */

     events.from('mailer_welcome').subscribe(r => mailer.welcome(r))

     events.from('mailer_validate_account').subscribe(r => mailer.validate_account(r))

};