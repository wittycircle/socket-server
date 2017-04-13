/**
 * Created by rdantzer on 28/03/17.
 */

'use strict';

const Rx = require('rx'),
    SocketServer = require('./server'),
    Core = require('./core'),
    session = require('./session'),
    SocialGraph = require('./graph'),
    cache = require('../cache'),
    message = require('./message');

const socialGraph = new SocialGraph();

//TODO remove
const USER_META = (id) => {
    return cache.db.redis
        .hmget(`user:${id}`, 'avatar', 'full_name')
        .then(result => {
            return {
                id: id,
                picture: result[0],
                full_name: result[1]
            }
        })
};

/**
 * Bootstraps socket.io and Rxjs
 * @class Dispatcher
 */
class Dispatcher {
    constructor(io, opts) {
        this._opts = opts;
        this._io = io;
        this._storage = {};
        /**
         * The internal dispatcher socket storage manager
         * When a client connects it is added to _storage
         * On disconnection it is removed
         * @param client
         * @returns {{connected: Observer<SocketWrapper>}}
         * @private
         */
        this._userGraph = (client) => {
            return {
                connected: Rx.Observer.create(
                    () => {
                        console.log(`Adding ${client.socket.id} to storage`);
                        this._storage[client.socket.id] = client;
                    },
                    (error) => Rx.Observable.throw(error),
                    () => {
                        console.log(`Removing ${client.socket.id} from storage`);
                        if (client.authenticated) {
                            socialGraph.remove(client.user);
                        }
                        delete this._storage[client.socket.id]
                    }
                ),
            }
        };
    };

    /**
     * Bootstraps dispatcher
     */
    start() {
        //Create a new socket.io stream instance
        this._server = new SocketServer(this._opts.sockets);
        //Start redis pub/sub
        this._core = new Core(this._opts.redis);

        //Bootstraps socket.io
        this._server.wrap(this._io);

        //Get the notification stream (all processed event as Notification)
        const notifications = require('../client').notifications;

        //create a new Subject<Notification>
        let notifs = notifications(this._core);

        //Store all notifications in database
        notifs.subscribe(notification => {
            cache.db.redis.sadd(`notifications:${notification[0]}`, JSON.stringify(notification[1]))
        });

        //Observable<SocketWrapper>
        this._server.connections()
            .subscribe(client => {
                let graph = this._userGraph(client);

                //register socket
                graph.connected.onNext();

                //Fetch recent activities
                cache.db.redis.lrange('notifications:recent', 0, -1)
                    .then(notifications => {
                        console.log(`Sending recent activities feed to ${client.socket.id}`);
                        client.socket.emit('server::recent::activities', notifications.map(JSON.parse))
                    });

                //unregister socket on disconnect
                client.offline()
                    .subscribe(id => {
                        graph.connected.onCompleted()
                    });

                //authenticate client
                client.authenticate()
                    .map(data => data.token.rest)
                    .subscribe(token => {
                        session.getUser(token)
                            .then(
                                user => {
                                    client.user = user;
                                    //Add user to the SocialGraph
                                    socialGraph.set(user, client.socket.id);
                                    //Handle notifications
                                    notifs
                                        .filter(notification => notification[0] === client.user.id)
                                        .map(notification => notification[1])
                                        .subscribe(notification => client.socket.emit('server::notification', notification));

                                    //Fetch discussions
                                    message.getAllDiscussions(client.user.id)
                                        .then(results => {
                                            console.log(`User:${client.user.id} - ${results.length} discussions`);
                                            client.socket.emit('server::data::discussions', {
                                                discussions: results
                                            })
                                        });

                                    //Serve stored notifications
                                    cache.db.redis.smembers(`notifications:${client.user.id}`)
                                        .then(notifications => {
                                            console.log(`User:${client.user.id} - ${notifications.length} notifications in storage`);
                                            notifications
                                                .forEach(notification => client.socket.emit('server::notification', JSON.parse(notification)))
                                        });

                                    //Send authentication status
                                    client.socket.emit('server::authentication', {code: 200})
                                }
                            )
                            .catch(error => {
                                console.error(error);
                                client.socket.emit('server::authentication', {code: 403})
                            })
                    });

                //autocomplete
                client.streams('autocomplete')
                    .subscribe(data => {
                        cache.match(`autocomplete:${data.query.resource}`, `[${data.query.match}`, `[${data.query.match}\xff`)
                            .then(results => {
                                client.socket.emit(`server::autocomplete::${data.query.resource}`, results);
                            })
                    });

                //messaging storage
                client.privateStreams('messages')
                    .map(data => data.message)
                    .subscribe(data => {
                        return message.insertMessage(data.data, client.user.id, data.to)
                            .then(r => console.log("it worked", r))
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
                                    USER_META(client.user.id).then(user => {
                                        this._storage[id].socket.emit('server::data::messages::partials', {
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
                                client.socket.emit('server::data::discussions', {
                                    discussions: results
                                })
                            })
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
                        cache.db.redis.smembers(key)
                            .then(results => cache.db.redis.spop(key, results.length))
                            .then(() => console.log(`User:${client.user.id} - cleared notifications`))
                    })
            });

        //Boostraps client notifications with redis pub/sub

        /**
         * Starts socket.io
         */
        this._io.listen(process.env.PORT || 3200, {secure: true});
    }
}

module.exports = Dispatcher;