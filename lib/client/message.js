// 'use strict';

const h = require('../../../app/models/helper');
const dbms = require('../cache'),
  _ = require('lodash'),
  db = dbms.db.sql,
  redis = dbms.db.redis;
//recheck and finish this
const createNewRoom = members => {
  let x = [];
  console.log('CREATE NEW ROOM CALLED', members);
  return db('room_members')
    .select('room_id')
    .where('user_id', members[0])
    .whereIn(
      'room_id',
      db('room_members').select('room_id').where('user_id', members[1])
    )
    .then(r => {
      if (r && r.length && r[0].room_id) {
        console.log('R CREATE ROOM FOUND', r, r[0].room_id);
        return [r[0].room_id];
      } else {
        console.log('CREATING NEW ROOM');
        const name = members.join('_');
        return db('rooms').insert({ name }).then(r => {
          members.forEach(e => {
            x.push(db('room_members').insert({ room_id: r[0], user_id: e }));
          });
          return Promise.all(x).then(() => r);
        });
      }
    });
};

const insertMessage = (exports.insertMessage = ({
  message,
  sender,
  members,
  roomId
}) => {
  console.log('INSERT CALLED');
  console.log('message', message);
  console.log('sender', sender);
  console.log('members', members);
  console.log('roomId', roomId);
  const mess = (message, sender, roomId) =>
    db('messages').insert({
      message: message,
      user_id: sender,
      room_id: roomId
    });

  const stat = (sender, roomId) =>
    db('room_members')
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

  if (!roomId)
    return createNewRoom(members).then(r => {
      console.log('AFTER CREATE', r);
      roomId = r;
      return Promise.all([mess(message, sender, roomId), stat(sender, roomId)]);
    });
  else {
    return Promise.all([mess(message, sender, roomId), stat(sender, roomId)]);
  }
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
    .join('room_status as rs', 'rs.room_id', 'm.room_id')
    .distinct([
      'r.id',
      'r.name',
      last_message,
      'rs.creation_date as realDate',
      'rs.id as hope',
      db.raw('MAX(m.creation_date) as date'),
      db.raw(`if(rs.id = ${id}, 1, rs.read) as 'read'`),
      'rs.mail_sent'
    ])
    .where('rm.user_id', id)
    .groupBy('m.room_id')
    .orderByRaw('MAX(m.creation_date) DESC'); // return Promise.all([convWith, query]);
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
        console.log('fetchdiscussions called');
        // console.log('r', r);
        return r;
      });
    });
  });
};

// ------------------ fetch ------------------

const fetchMessages = (exports.fetchMessages = roomId => {
  const last_read = db.raw(
    ` SUBSTRING_INDEX(GROUP_CONCAT(rs.read ORDER BY rs.creation_date desc), ',', 1) as "read"`
  );

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
    .select([last_read, 'rs.user_id', db.raw('MAX(rs.creation_date) as date')])
    .where('rs.room_id', roomId)
    .orderByRaw('rs.creation_date DESC')
    .groupBy('rs.user_id');

  return Promise.all([msgs, status]).then(([msg, stat]) => {
    console.log('Fetch messages called');
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
