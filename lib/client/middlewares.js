/**
 * Created by rdantzer on 15/03/17.
 */

'use strict';

const Joi = require('joi'),
    schemas = require('./schemas');

const middlewares = module.exports = {
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
