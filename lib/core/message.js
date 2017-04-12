'use strict';

const dbms = require('../cache'),
    _ = require('lodash'),
    db = dbms.db.sql;

const insertMessage = exports.insertMessage = (message, sender, receiver) => {
    return dbms.db.sql('old_messages').insert({
        message: message,
        from_user_id: sender,
        to_user_id: receiver,
    });
};
const getAllDiscussions = exports.getAllDiscussions = (id) => {
    let selection = ['m.from_user_id as id', db.raw(`CONCAT(p.first_name, ' ', p.last_name) AS full_name`),
        'p.profile_picture as picture', db.raw('MAX(m.creation_date) as date'), 'm.m_read', 'u.username',
        db.raw(`SUBSTRING_INDEX(GROUP_CONCAT(m.message order by m.creation_date desc), ',', 1) as last_message`),
    ];

    return dbms.db.sql
        .from('old_messages as m').distinct(selection)
        .join('users as u', 'u.id', 'm.from_user_id')
        .join('profiles as p', 'p.id', 'u.profile_id')
        .where('m.to_user_id', id)
        .orWhere('m.from_user_id', id)
        .groupBy('m.from_user_id')
        .orderByRaw('date DESC')
        .then(discussions => discussions.map(discussion => {
            return {
                id: discussion.id,
                from: {
                    id: discussion.id,
                    online: false,
                    full_name: discussion.full_name,
                    picture: discussion.picture
                },
                read: discussion.m_read,
                last_message: discussion.last_message,
                date: discussion.date
            }
        }))
};

const h = require('../../../app/models/helper');

const fetchMessages = exports.fetchMessages = (sender, id) => {
    let selection = ['message', 'creation_date', 'from_user_id as sender', 'to_user_id as receiver'];
    let from = dbms.db.sql('old_messages').select(selection)
        .where({from_user_id: sender, to_user_id: id})
        .join(h.sub_profile, 'p.uid', 'from_user_id');

    let to = dbms.db.sql('old_messages').select(selection)
        .where({from_user_id: id, to_user_id: sender})
        .join(h.sub_profile, 'p.uid', 'to_user_id');

    let x = from.union(to).orderBy('creation_date');

    let y = dbms.db.sql('users as u').join('profiles as p', 'p.id', 'u.profile_id')
        .first('u.id', 'p.profile_picture', dbms.db.sql.raw('CONCAT (first_name, " ", last_name) as fullName'))
        .where({'u.id': id});

    let z = dbms.db.sql('users as u').join('profiles as p', 'p.id', 'u.profile_id')
        .first('u.id', 'p.profile_picture', dbms.db.sql.raw('CONCAT (first_name, " ", last_name) as fullName'))
        .where({'u.id': sender});

    return Promise.all([x, y, z])
        .then(r => {
            let o = {
                messages: r[0],
                sender: r[1],
                receiver: r[2]
            };
            o.messages.forEach(m => {
                if (m.sender == o.sender.id) {
                    m.sender_picture = o.sender.profile_picture;
                    m.name = o.sender.fullName;

                }
                else if (m.sender == o.receiver.id) {
                    m.sender_picture = o.receiver.profile_picture;
                    m.name = o.receiver.fullName;
                }
            });
            return o
        })
};

