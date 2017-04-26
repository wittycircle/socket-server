/**
 * Created by rdantzer on 20/04/17.
 */

'use strict';

const message = require('./message'),
    cache = require('../cache'),
    helpers = require('../core/helpers');

module.exports = (client, socialGraph) => (user) => {
    client.user = user;

    //messaging storage
    client.privateStreams('messages')
        .map(data => data.message)
        .subscribe(data => {
            return message.insertMessage(data.data, client.user.id, data.to)
                .then(r => console.log("Message inserted", r))
        });

    //messaging socket
    client.privateStreams('messages')
        .map(data => data.message)
        .subscribe(message => {
            console.log('message', message);
            //Fetch the associated socket from the social graph
            socialGraph.getSocket(message.to)
                .then(id => {
                    if (id[0] !== null) {
                        helpers.USER_META(client.user.id).then(user => {
                            client.socket.to(id).emit('server::data::messages::partials', {
                                from: user,
                                data: message.data
                            })
                        })

                    }
                })
        });

    client.privateStreams('discussions')
        .subscribe((data) => {
            message.getAllDiscussions(client.user.id)
                .then(results => {
                    console.log(`User:${client.user.id} - ${results.length} discussions`);
                    client.socket.emit('server::data::discussions', {
                        discussions: results
                    })
                });
        });

    client.privateStreams('messages::fetch')
        .subscribe((data) => {
            message.fetchMessages(data.id, client.user.id)
                .then(results => {
                    client.socket.emit('server::data::messages', results)
                })
        });

    //clear notifs
    client.privateStreams('notification::mark_as_read')
        .subscribe(() => {
            let key = `notifications:${client.user.id}`;
            cache.db.redis.set(`${key}:last`, Date.now())
        });

    client.privateStreams('message::mark_as_read')
        .subscribe(choice => {
            message.setAllRead(choice.id, client.user.id)
                .then(console.log)
        })
};
