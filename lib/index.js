'use strict';
var msg = 
{
  "anonymous_id": "507f191e810c19729de860ea",
  "context": {
    "ip": "8.8.8.8",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.115 Safari/537.36"
  },
  "message_id": "022bb90c-bbac-11e4-8dfc-aa07a5b093db",
  "received_at": "2015-02-23T22:28:55.387Z",
  "sent_at": "2015-02-23T22:28:55.111Z",
  "traits": {
    "name": "Peter Gibbons",
    "email": "peter@initech.com",
    "plan": "premium",
    "logins": 5,
    "organizationName": 'Google'
  },
  "type": "identify",
  "user_id": "97980cfea0067",
  "version": "1.1"
};
var Identify = require('segmentio-facade').Identify;
var integration = require('segmentio-integration');
var mapper = require('./mapper');
var settings = {
  "accessToken": "$BASECRM_ACCESS_TOKEN"
}

var data = new Identify(msg);


var BaseCRM = module.exports = integration('baseCRM')
  .endpoint('https://api.getbase.com')
  .channels(['server', 'mobile', 'client'])
  .retries(2);

BaseCRM.prototype.identify = function(identify, fn){
  return this
    .post('/v2/leads')
    .auth(this.settings.accessToken)
    .set(headers(identify, this.settings))
    .type('json')
    .accept('json')
    .send(mapper.identify(identify))
    .end(this.handle(fn))
}

BaseCRM.prototype.group = function (msg, fn){
  // console.log(msg)
}


function headers (message, settings) {
  console.log(settings)
  var auth = 'Bearer ' + settings.accessToken;
  return {
    Authorization: auth,
    'User-Agent': 'Segment.io/1.0.0'
  };
}

var baseCRM = new BaseCRM(settings)

console.log(baseCRM)
baseCRM.identify(data, function(response){
  console.log(response)
})
