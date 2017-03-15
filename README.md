#Architecture
##Client stream
###`client::authenticate` - _public_
Authenticate client
```js
const options = {
    token: {
        rest: '',   //the bearer token issued by wittycircle REST api
        // socket: '' current socket session issued by socket api UNUSED
    }
}
```
###`client::request::latest_messages` - _authenticated_  
Fetch multiple discussions history
```js
const options = {
    from: {
        rooms: [], //array of room id
        users: []  //array of user id
    }
}
```

###`client::request::invite` - _authenticated_  
Invite users to a specific room for group messages
```js
const options = {
   who: {
       users: [], //array of user id
       projects: [], //project collaborators
       message: '' //optional invite message
   }
}
```

###`client::autocomplete` - _public_
```js
//The following options will allow to populate auto-complete for multiple resources
const options = {
    query: {
        resource: 'skills',
        match: 'java',
        results: 10
    }
}
```

##Server stream
###`server::data::messages` - _authenticated_
Latest discussion updates
```js
const data = {
    messages: [
        {
            from: {
                type: 'USER', //the sender ['USER', 'PROJECT', 'SERVER']
                id: 10 //the sender identifier
            },
            content: 'anything', //what could it be ? Markdown ?
            meta: new Meta()
        }
    ]
};
```
###`server::statistics::{resource}` - _admin_
Currently everything :thumbsup:  
###`server::notification::follow` - _authenticated_
```js
const data = {
    follow: {
        from: 3,                //User.id
        to: 10                  //User.id
    }
}
````
###`server::notification::up` - _authenticated_
```js
const data = {
    upvote: {
        what: 'project',        //What was upvoted/liked
        from: 1,                //User.id
        resource_id: 1346       //Resource.id
    }
}
```
###`server::notification::openings` - _authenticated_
```js
const data = {
    match: {
       id: 312,                     //Opening.id
       fields: {
           skills: ['js', 'cpp'],   //matching skills
           position: ''             //position didn't match the client preferences in this case
       }
    }
}
```

###`server::notification::project_discussion` - _authenticated_
```js
const data = {
    discussion: {
        id: 420,                    //Discussion.id
        message: 'Hey this is awesome'
    }
}
```


###`server::authentication` - _public_
Authentication stream
```js
const data = {
   code: 200
   /**
    * Follows http error codes, thx twitter for the 420 rate limiter idea 
    * 200: current session is ok
    * 401: session doesn't exists
    * 403: forbidden endpoint
    * 410: token is expired or user was kicked (socket.disconnect)
    * 420: rate limit triggered, CHILL OUT DUDE
    */
}
```
