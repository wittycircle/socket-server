// 'use strict';

const h = require('../../../app/models/helper');
const dbms = require('../cache'),
  _ = require('lodash'),
  db = dbms.db.sql,
  redis = dbms.db.redis;

const insertMessage = (exports.insertMessage = (message, sender, roomId) => {
  console.log('sender', sender);
  console.log('roomId', roomId);
  const mess = db('messages').insert({
    message: message,
    user_id: sender,
    room_id: roomId
  });

  const stat = db('room_members')
    .select('user_id', 'room_id')
    .where('room_id', roomId)
    .andWhere('user_id', '<>', sender)
    .then(r => {
      redis.publish(
        'rest:update:add_points',
        JSON.stringify({ user_id: sender, points: 2 })
      );
      return db.batchInsert('room_status', r);
    });
  return Promise.all([mess, stat]);
});

exports.getAllDiscussions = id => {
  let convWith = roomId =>
    db('room_members as rm')
      .distinct([
        db.raw(`CONCAT(p.first_name, ' ', p.last_name) AS full_name`),
        'u.id as uid',
        'rm.room_id',
        'p.picture',
        'u.username'
      ])
      .leftJoin('profiles as p', 'p.user_id', 'rm.user_id')
      .leftJoin('users as u', 'u.id', 'rm.user_id')
      .where('room_id', roomId)
      .orderByRaw(`CASE WHEN rm.user_id <> ${id} THEN 1 ELSE 100 END `);
  let last_message = db.raw(
    ` SUBSTRING_INDEX(GROUP_CONCAT(message ORDER BY m.creation_date desc), ',', 1) as last_message`
  );
  let query = db('messages as m')
    .join('room_members as rm', 'rm.room_id', 'm.room_id')
    .join('rooms as r', 'r.id', 'rm.room_id')
    .leftJoin('room_status as rs', 'rs.user_id', 'm.user_id')
    .distinct([
      'r.id',
      'r.name',
      last_message,
      db.raw('MAX(m.creation_date) as date'),
      'rs.read',
      'rs.mail_sent'
    ])
    .where('rm.user_id', id)
    .groupBy('m.room_id')
    .orderByRaw('MAX(m.creation_date) DESC');
  // return Promise.all([convWith, query]);
  let x = [];
  return redis.smembers(`users:online`).then(onlines => {
    return query.then(r => {
      r.forEach(e => {
        if (!Array.isArray(onlines)) onlines = [];
        x.push(
          convWith(e.id).then(rr => {
            let online = onlines.includes(`${rr.uid}`);
            rr.forEach(e => (e.online = online));
            e.members = rr;
          })
        );
      });

      return Promise.all(x).then(() => {
        console.log('r', r);
        return r;
      });
    });
  });
};

// ------------------ fetch ------------------

const fetchMessages = (exports.fetchMessages = roomId => {
  const msgs = db('messages as m')
    .join('profiles as p', 'p.user_id', 'm.user_id')
    .select([
      'm.message',
      'm.creation_date',
      'm.user_id as sender',
      db.raw('CONCAT(p.first_name, " ", p.last_name) as name'),
      'p.picture as sender_picture'
    ])
    .where('m.room_id', roomId)
    .orderBy('m.creation_date');

  const status = db('room_status as rs')
    .select(['rs.read', 'rs.user_id', db.raw('MAX(rs.creation_date) as date')])
    .where('rs.room_id', roomId)
    .groupBy('rs.user_id');

  return Promise.all([msgs, status]).then(([msg, stat]) => {
    return {
      messages: msg,
      infos: stat
    };
  });
});

const setAllRead = (exports.setAllRead = (roomId, userId) => {
  return db('room_status').update('read', 1).where({
    user_id: userId,
    room_id: roomId
  });
});
