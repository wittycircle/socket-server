/**
 * Created by rdantzer on 15/03/17.
 */

'use strict';

const Joi = require('joi');

const schemas = module.exports = {
    'client::authenticate': Joi.object().keys({
        token: Joi.object().keys({
            rest: Joi.string().length(64).required()
        })
    }),
    'client::request::latest_messages': Joi.object().keys({
        from: Joi.object().keys({
            rooms: Joi.array().items(Joi.number()),
            users: Joi.array().items(Joi.number())
        })
    })
};