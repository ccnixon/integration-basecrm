var Identify = require('segmentio-facade').Identify;
var Group = require('segmentio-facade').Group;

exports.identify = function(msg){
  var payload = msg.traits()
  payload.last_name = msg.lastName()
  console.log(payload)
  return {
    data: payload
  }
};