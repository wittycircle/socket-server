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

const socialGraph = new SocialGraph();

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

        //Observable<SocketWrapper>
        this._server.connections()
            .subscribe(client => {
                let graph = this._userGraph(client),
                    //create a new Subject<Notification>
                    notifs = notifications(this._core);

                //register socket
                graph.connected.onNext();

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
                            .subscribe(
                                user => {
                                    client.user = user;
                                    //Add user to the SocialGraph
                                    socialGraph.set(user, client.socket.id);
                                    //Handle notifications
                                    notifs
                                        .filter(notification => notification.from !== client.user.id)
                                        .subscribe(notification => client.socket.emit('server::notification', notification));
                                    client.socket.emit('server::authentication', {code: 200})
                                },
                                error => client.socket.emit('server::authentication', {code: 403}),
                                Rx.helpers.noop
                            )
                    });

                //autocomplete
                client.streams('autocomplete')
                    .subscribe(data => {
                        cache.match(`autocomplete:${data.query.resource}`, `[${data.query.match}`, `[${data.query.match}\xff`)
                            .then(results => {
                                client.socket.emit(`server::autocomplete::${data.query.resource}`, results);
                            })
                    });

                //messaging
                client.privateStreams('messages')
                    .map(data => data.message)
                    .subscribe(message => {
                        console.log('message', message);
                        //Fetch the associated socket from the social graph
                        //TODO handle offline case
                        socialGraph.getSocket(message.to)
                            .then(id => {
                                if (id[0] !== null) {
                                    this._storage[id].socket.emit('server::data::messages', {
                                        from: client.user.id,
                                        data: message.data
                                    })
                                }
                            })
                    });
            });

        //Boostraps client notifications with redis pub/sub
    }
}

module.exports = Dispatcher;