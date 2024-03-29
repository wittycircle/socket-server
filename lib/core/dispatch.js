/**
 * Created by rdantzer on 28/03/17.
 */

'use strict';

const Rx = require('rx'),
    SocketServer = require('./server'),
    Core = require('./core'),
    session = require('./session'),
    SocialGraph = require('./graph'),
    cache = require('../cache');

const redis = cache.db.redis;

const PRIVATE_STREAMS = require('../client/private');

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
                        if (client.user) {
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
        //Recent activities
        const activities = require('../client/activity')(this._core);
        //sync redis with mysql
        const persistence = require('./persistence')(this._core);
        //mailer listener
        const mailer = require('../client/mailer')(this._core);

        //create a new Subject<Notification>
        let notifs = notifications(this._core);

        //Store all notifications in database
        notifs
            .filter(n => n[0] != n[1].from.id)
            .subscribe(notification => {
                cache.db.redis.multi()
                    .lpush(`notifications:${notification[0]}`, JSON.stringify(notification[1]))
                    .ltrim(`notifications:${notification[0]}`, 0, 50)
                    .exec()
            });

        //Observable<SocketWrapper>
        this._server.connections()
            .subscribe(client => {
                let graph = this._userGraph(client);

                //register socket
                graph.connected.onNext();

                //authenticate client
                client.authenticate()
                    .map(data => data.token.rest)
                    .subscribe(token => {
                            session.getUser(token)
                                .then(user => socialGraph.set(user, client.socket.id))
                                .then(user => {
                                    client.authenticated.onNext(user);

                                    client.authStream
                                        .subscribe(PRIVATE_STREAMS(client, socialGraph));

                                    //Add user to the SocialGraph
                                    //Handle notifications
                                    notifs
                                        .filter(notification => notification[0] === user.id && notification[1].from.id != client.user.id)
                                        .map(notification => {
                                            let n = notification[1];
                                            n.read = false;
                                            return n;
                                        })
                                        .subscribe(notification => client.socket.emit('server::notification::partials', notification));

                                    //Send authentication status
                                    client.socket.emit('server::authentication', {code: 200})
                                })
                                .catch(Rx.Observable.throw)
                        },
                        error => {
                            console.error(error);
                            client.socket.emit('server::authentication', {code: 403})
                        });

                /**
                 * PUBLIC STREAMS
                 */

                //Fetch recent activities
                client.streams('activities')
                  .subscribe((opts) => {
                    if (!opts || !opts.network_id) {
                      cache.db.redis.lrange('notifications:recent', 0, 6)
                        .then(notifications => {
                          console.log(`Sending recent activities feed to ${client.socket.id}`);
                          client.socket.emit('server::recent::activities', notifications.map(JSON.parse))
                        });
                    } else {
                      cache.db.redis.smembers(`network:${opts.network_id}`)
                        .then(users => {
                          return cache.db.redis.lrange('notifications:recent', 0, -1)
                            .then(notifications => notifications.map(JSON.parse))
                            .then(notifications => notifications
                              .filter(n => users.includes(n.from.id))
                              .slice(0, 5)
                            )
                        })
                    }
                  });

                //unregister socket on disconnect
                client.offline()
                    .subscribe(id => {
                        //remove from local graph
                        graph.connected.onCompleted();
                        //remove from redis
                        if (client.user)
                            socialGraph.remove(client.user);
                    });
            });

        /**
         * Starts socket.io
         */
        this._io.listen(process.env.PORT || 3200);
    }
}

module.exports = Dispatcher;