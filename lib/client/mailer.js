/**
 * Created by rdantzer on 20/04/17.
 */

'use strict';

const helpers = require('../core').helpers;

const dummyMailer = (user) => console.log(`Mail could have been sent to ${user.email}`);
const dummySEOProfileWhateverGrowthHacking = (whatever) => ([from, to]) =>
    console.log(`Hey ${to.full_name} - ${to.email} ! ${from.full_name} - ${from.email} ${whatever}`);

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
    events.from('user_register')
        .subscribe(event =>
            helpers.USER_META(event.id)
                .then(dummyMailer)
        );

    //stupid example
    events.from('profile_view')
        .subscribe(event =>
            Promise.all([
                helpers.USER_META(event.from),
                helpers.USER_META_FROM_PROFILE(event.id) //profile_view
            ])
                .then(dummySEOProfileWhateverGrowthHacking('viewed your profile'))
        );

    events.from('user_follow')
        .filter(event => event.value === 1) //remove all un-follow
        .subscribe(event =>
            Promise.all([
                helpers.USER_META(event.from),
                helpers.USER_META(event.id) //user_follow
            ])
                .then(dummySEOProfileWhateverGrowthHacking('followed you'))
        );

    //
};