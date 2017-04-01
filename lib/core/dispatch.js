/**
 * Created by rdantzer on 28/03/17.
 */

'use strict';

const Rx = require('rx'),
    SocketServer = require('./server'),
    Core = require('./core'),
    session = require('./session'),
    SocialGraph = require('./graph');

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

    start() {

        this._server = new SocketServer(this._opts.sockets);
        this._core = new Core(this._opts.redis);
        this._server.wrap(this._io);

        this._server.connections()
            .subscribe(client => {
                let graph = this._userGraph(client);

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
                                    socialGraph.set(user, client.socket.id);
                                    client.socket.emit('server::authentication', {code: 200})
                                },
                                error => client.socket.emit('server::authentication', {code: 500}),
                                Rx.helpers.noop
                            )
                    });

                //autocomplete
                client.streams('autocomplete')
                    .subscribe(console.log);

                //messaging
                client.privateStreams('messages')
                    .map(data => data.message)
                    .subscribe(message => {
                        console.log('message', message);
                        socialGraph.getSocket(message.to)
                            .then(id => {
                                if (id[0] !== null) {
                                    this._storage[id].socket.emit('server::data::messages', {
                                        from: client.user.id,
                                        data: message.data
                                    })
                                }
                            })
                    })

            });

        require('../client').notifications(this._core);
    }
}

module.exports = Dispatcher;