/**
 * Created by rdantzer on 15/03/17.
 */

'use strict';

const streams = module.exports = socket => {
    return {
        authenticate: data => {
            socket.isAuthenticated = true;
            socket.emit('server::authentication', {code: 200})
        },
        autocomplete: require('./streams/autocomplete')
    }
};