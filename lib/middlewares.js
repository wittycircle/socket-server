/**
 * Created by rdantzer on 15/03/17.
 */

'use strict';

const Joi = require('joi'),
    schemas = require('./schemas');

const middlewares = module.exports = socket => {
    return {
        log: (packet, next) => {
            console.log(packet);
            next()
        },
        authenticate: (packet, next) => {
            if (socket.isAuthenticated || packet[0] === 'client::authenticate') next();
            else next(new Error(JSON.stringify({
                code: 401,
                error: 'Unauthorized'
            })))
        },
        validate: (packet, next) => {
            if (packet.length != 2)
                next(new Error(JSON.stringify({
                    code: 400,
                    error: 'Empty body'
                })));
            Joi.validate(packet[1], schemas[packet[0]] || Joi.any(), {
                abortEarly: true
            }, (err, value) => {
                if (err)
                    next(new Error(JSON.stringify({
                        code: 400,
                        error: err.details
                    })));
                else
                    next();
            })
        }
    };
};
