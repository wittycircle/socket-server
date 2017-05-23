// 'use strict';

const h = require('../../../app/models/helper');
const dbms = require('../cache'),
  _ = require('lodash'),
  db = dbms.db.sql,
  redis = dbms.db.redis;

const insertMessage = (exports.insertMessage = (message, sender, roomId) => {
  const mess = db('messages').insert({
    message: message,
    user_id: sender,
    room_id: roomId
  });

  const stat = db('room_members')
    .select('user_id')
    .where('room_id', roomId)
    .andWhere('user_id', '<>', sender)
    .then(r => {
      r.forEach(e => (e.room_id = roomId));
      return db.batchInsert('room_status', r);
    });

  return Promise.all([mess, stat]);
});

exports.getAllDiscussions = id => {
  let last_message = db.raw(
    ` SUBSTRING_INDEX(GROUP_CONCAT(message ORDER BY m.creation_date desc), ',', 1) as last_message`
  );
  let query = db('messages as m')
    .join('room_members as rm', 'rm.room_id', 'm.room_id')
    .join('rooms as r', 'r.id', 'rm.room_id')
    .join('users as u', 'u.id', 'm.user_id')
    .join('profiles as p', 'p.user_id', 'u.id')
    .leftJoin('room_status as rs', 'rs.user_id', 'm.user_id')
    .select([
      'u.id as uid',
      db.raw(`CONCAT(p.first_name, ' ', p.last_name) AS full_name`),
      'p.picture',
      'u.username',
      'r.id as room_id',
      'r.name',
      last_message,
      // 'm.message as last_message',
      db.raw('MAX(m.creation_date) as creation_date'),
      'rs.read',
      'rs.mail_sent'
    ])
    .where('rm.user_id', id)
    .groupBy('m.room_id')
    .orderByRaw('MAX(m.creation_date)');
  return redis.smembers(`users:online`).then(onlines => {
    return query.then(discussions =>
      discussions.map((discussion, i) => {
        if (!Array.isArray(onlines)) onlines = [];
        let online = onlines.includes(`${discussion.uid}`);
        return {
          id: discussion.room_id,
          from: {
            id: discussion.room_id,
            online: online,
            full_name: discussion.full_name,
            picture: discussion.picture,
            username: discussion.username
          },
          read: discussion.read || 0,
          last_message: discussion.last_message,
          date: discussion.date
        };
      })
    );
  });
};

// ------------------ fetch ------------------

const fetchMessages = (exports.fetchMessages = roomId => {
  const msgs = db('messages as m')
    // let selection = ['message', 'creation_date', 'from_user_id as sender', 'to_user_id as receiver', 'm_read'];
    .join('profiles as p', 'p.user_id', 'm.user_id')
    .select([
      'm.message',
      'm.creation_date',
      db.raw('1 as m_read'),
      db.raw('1 as receiver'),

      'm.user_id as sender',
      db.raw('CONCAT(p.first_name, " ", p.last_name) as name'),
      'p.picture as sender_picture'
    ])
    .where('m.room_id', roomId)
    .orderBy('m.creation_date');

  const status = db('room_status as rs')
    .join('profiles as p', 'p.user_id', 'rs.user_id')
    .select(
      'rs.read',
      'rs.user_id',
      db.raw('MAX(rs.creation_date) as date'),
      db.raw('CONCAT(p.first_name, " ", p.last_name) as name'),
      'p.picture as sender_picture'
    )
    .where('rs.room_id', roomId)
    .groupBy('rs.user_id');

  // let selection = [
  //     'message',
  //     'creation_date',
  //     'from_user_id as sender',
  //     'to_user_id as receiver',
  //     'm_read'
  //   ];

  // o.messages.forEach(m => {
  //       if (m.sender == o.sender.id) {
  //         m.sender_picture = o.sender.profile_picture;
  //         m.name = o.sender.fullName;
  //       } else if (m.sender == o.receiver.id) {
  //         m.sender_picture = o.receiver.profile_picture;
  //         m.name = o.receiver.fullName;
  //       }

  return Promise.all([msgs, status]).then(([msg, stat]) => {
    // console.log('msg', msg);
    return msg; //.map(
    // e => (e.read = stat.find(s => s.user_id === e.user_id)[0].read)
    // );
  });
});

const setAllRead = (exports.setAllRead = (userId, roomId) => {
  return db('room_status').update('read', 1).where({
    user_id: userId,
    room_id: roomId
  });
});
