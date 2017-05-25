/**
 * Created by rdantzer on 15/03/17.
 */

'use strict';

const Joi = require('joi');

//Allowed resources to query for server::autocomplete
const ALLOWED = {
  RESOURCES: ['skills', 'username']
};

//Self explanatory
const schemas = (module.exports = {
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
  }),
  'client::autocomplete': Joi.object().keys({
    query: Joi.object().keys({
      resource: Joi.string().allow(ALLOWED.RESOURCES).required(),
      match: Joi.string().lowercase().required(),
      results: Joi.number().required()
    })
  }),
  'client::messages': Joi.object().keys({
    message: Joi.object().keys({
      to: Joi.number().required(),
      roomId: Joi.number().required(),
      data: Joi.string().required()
    })
  })
});
