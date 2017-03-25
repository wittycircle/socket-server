/**
 * Created by rdantzer on 25/03/17.
 */

'use strict';

module.exports = {
    get_sockets_from_users: `
        
    `,
    authenticate: `
    redis.call('HMSET', 'user:'..ARGV[1], 'auth', true)
    redis.call('SADD', 'user:'..ARGV[1]..':follower', ARGV[2])
    redis.call('SADD', 'user:'..ARGV[1]..':following', ARGV[3])
    return true
    `,
    get_json: `
    if redis.call('EXISTS', KEYS[1]) == 1 then
        local payload = redis.call('GET', KEYS[1])
        return cjson.decode(payload)[ARGV[1]]
    else
        return nil
    end`,
    rate_limit: `
    local cnt = redis.call('INCR', KEYS[1])
    if cnt > tonumber(ARGV[1]) then
        return 1
    end
    if cnt == 1 then
        redis.call('PEXPIRE', KEYS[1], ARGV[2])
    end
    return 0`
};