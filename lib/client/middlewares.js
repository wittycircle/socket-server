/**
 * Created by rdantzer on 15/03/17.
 */

'use strict';

const Joi = require('joi'),
    schemas = require('./schemas');

/**
 * Mount Joi validation on socket.io events
 * Automatic schema fetching from a hash table (schemas)
 */
const middlewares = module.exports = {
    validate: (packet, next) => {
        if (packet.length != 2)
            next(new Error(JSON.stringify({
                code: 400,
                error: 'Empty body'
            })));
        //If event isn't found use default validation
        /**
         * Todo when all event schemas are done remove the dirty Joi.any()
         */
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
