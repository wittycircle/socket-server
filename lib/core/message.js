/**
 * Created by rdantzer on 06/04/17.
 */

'use strict';

const dbms = require('../cache');

exports.getAllDiscussions = (id) => {
    dbms('messages')
        .distinct(['from_user_id', 'message'])
        .where('to_user_id', '=', id)
        .orderBy('creation_date')
};

exports.fetchMessages = (id) => {
    dbms('messages')
        .select(['message', 'creation_date', 'm_read', 'm_send', 'ask_for_help', 'accept_help', 'ask_project_id'])
        .where('from_user_id', '=', 'id')
        .orderBy('creation_date')
};
