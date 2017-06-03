/**
 * Created by rdantzer on 20/04/17.
 */

'use strict';

const message = require('./message'),
  cache = require('../cache'),
  helpers = require('../core/helpers'),
  _ = require('lodash');

module.exports = (client, socialGraph) => user => {
  client.user = user;

  //messaging storage
  client.privateStreams('messages').map(data => data.message).subscribe(data => {
    console.log('Messagin storage [private]');
    console.log('data', data);
    return message
      .insertMessage(data)
      .then(r => console.log('Message inserted', r));
  });

  //messaging socket
  client
    .privateStreams('messages')
    .map(data => data.message)
    .subscribe(message => {
      //Fetch the associated socket from the social graph
      socialGraph.getSocket(message.to).then(id => {
        if (id[0] !== null) {
          helpers.USER_META(client.user.id).then(user => {
            client.socket.to(id).emit('server::data::messages::partials', {
              from: user,
              data: message.data
            });
          });
        }
      });
    });

  client.privateStreams('discussions').subscribe(data => {
    message.getAllDiscussions(client.user.id).then(results => {
      console.log(`User:${client.user.id} - ${results.length} discussions`);
      client.socket.emit('server::data::discussions', {
        discussions: results
      });
    });
  });

  client.privateStreams('messages::fetch').subscribe(data => {
    message.fetchMessages(data.id).then(results => {
      client.socket.emit('server::data::messages', results);
    });
  });

  client.privateStreams('notifications::fetch').subscribe(() => {
    //Serve stored notifications
    console.log(`User:${client.user.id} - notifications request`);
    cache.db.redis
      .multi()
      .lrange(`notifications:${client.user.id}`, 0, -1)
      .get(`notifications:${client.user.id}:last`)
      .exec()
      .then(notifications => {
        const hydrate_notif = raw => {
          let n = JSON.parse(raw);
          return n;
        };

        if (Array.isArray(notifications[0][1])) {
          console.log(
            `User:${client.user.id} - ${notifications[0][1].length} notifications in storage`
          );
          client.socket.emit(
            'server::notification',
            notifications[0][1].map(hydrate_notif)
          );
        }
      });
  });

  //clear notifs
  client.privateStreams('notification::mark_as_read').subscribe(data => {
    let key = `notifications:${client.user.id}`;
    console.log(`User:${client.user.id} - read notifications`);
    if (data == null)
      cache.db.redis
        .lrange(key, 0, -1)
        .then(values => {
          let pipeline = cache.db.redis.pipeline();
          values.forEach((value, i) => {
            let n = JSON.parse(value);
            n.read = true;
            pipeline.lset(key, i, JSON.stringify(n));
          });
          return pipeline.exec();
        })
        .then(() => console.log('Cleared all notifications'));
    else
      cache.db.redis.lrange(key, data, data).then(value => {
        let n = JSON.parse(value);
        n.read = true;
        cache.db.redis.lset(key, data, JSON.stringify(n));
      });
  });

  client.privateStreams('message::mark_as_read').subscribe(choice => {
    message.setAllRead(choice.id, client.user.id).then(() => {
      console.log(`Cleared discussion ${client.user.id}/${choice.id}`);
    });
  });
};
