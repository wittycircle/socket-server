// 'use strict';

const dbms = require('../cache'),
    _ = require('lodash'),
    db = dbms.db.sql,
    redis = dbms.db.redis;

const insertMessage = exports.insertMessage = (message, sender, receiver) => {
    return dbms.db.sql('old_messages').insert({
        message: message,
        from_user_id: sender,
        to_user_id: receiver,
        m_read: false
    });
};

const nik = (d) => {
    let x = d.myread.split('_');
    console.log(x);
    if (x[0] == 'A')
        return true;
    else
        return x[1] == 1
};

const getAllDiscussions = exports.getAllDiscussions = (id) => {
    let last_message = db.raw(` SUBSTRING_INDEX(GROUP_CONCAT(message ORDER BY creation_date desc), ',', 1) as last_message`),
        mess_select = ['to_user_id as from', 'from_user_id as to', db.raw('CONCAT("A_", m_read) as myread'), db.raw('MAX(creation_date) as date'), last_message],
        mess_select2 = ['from_user_id as from', 'to_user_id as to', db.raw('CONCAT("B_", m_read) as myread'), db.raw('MAX(creation_date) as date'), last_message],
        profile_select = ['u.id as uid', db.raw(`CONCAT(p.first_name, ' ', p.last_name) AS full_name`), 'p.profile_picture as picture', 'u.username'],
        mt = db('old_messages').distinct(mess_select).where('from_user_id', id).groupBy('to_user_id').as('mt'),
        mf = db('old_messages').distinct(mess_select2).where('to_user_id', id).groupBy('from_user_id').as('mf'),
        userprofile = db.select(profile_select).from('users as u').join('profiles as p', 'p.id', 'u.profile_id').as('p'),
        yy = db.from(db.raw(`( (${mt.toString()}) union (${mf.toString()}) ) as m`)).join(userprofile, 'p.uid', 'm.from').distinct('*').orderByRaw('date DESC');

    return redis.smembers(`users:online`).then(onlines => {
        return yy.then(r => _.uniqBy(r, e => e.from))
            .then(discussions => Promise.all(discussions.map((discussion, i) => {
                if (!Array.isArray(onlines)) onlines = [];
                let online = onlines.includes(`${discussion.uid}`);
                return redis.get(`message:${id}:${discussion.uid}`)
                    .then(timestamp => {
                        return {
                            id: discussion.uid,
                            from: {
                                id: discussion.uid,
                                online: online,
                                full_name: discussion.full_name,
                                picture: discussion.picture,
                                username: discussion.username
                            },
                            read: discussion.date < timestamp,
                            bail_to: discussion.to,
                            bail_from: discussion.from,
                            last_message: discussion.last_message,
                            date: discussion.date
                        }
                    })
            })));
    })
};

// ------------------ fetch ------------------
const h = require('../../../app/models/helper');

const fetchMessages = exports.fetchMessages = (sender, id) => {
    let selection = ['message', 'creation_date', 'from_user_id as sender', 'to_user_id as receiver', 'm_read'];
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

const setAllRead = exports.setAllRead = (to, from) => {
    return db('old_messages').update('m_read', 1).where('to_user_id', from).andWhere('from_user_id', to)
        .then(() => {
            redis.set(`message:${from}:${to}`, Date.now())
        })
};
