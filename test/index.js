'use strict';

var Test = require('segmentio-integration-tester');
var Webhooks = require('..');
var assert = require('assert');
var express = require('express');

// Available API versions
['1', '2'].forEach(function(version){
  describe('Webhooks v' + version, function(){
    var types = ['track', 'identify', 'alias', 'group', 'page', 'screen'];
    var webhooks;
    var settings;
    var server;
    var test;
    var app;

    before(function(done){
      app = express();
      app.use(express.bodyParser());
      server = app.listen(4000, done);
    });

    after(function(done){
      server.close(done);
    });

    beforeEach(function(){
      settings = {
        globalHook: 'http://localhost:4000',
        version: version
      };
      webhooks = new Webhooks(settings);
      test = Test(webhooks, __dirname);
    });

    it('should have the correct settings', function(){
      test
      .name('Webhooks')
      .channels(['server', 'mobile', 'client'])
      .timeout('3s')
      .retries(1);
    });

    describe('.validate()', function(){
      it('should be invalid if .globalHook isnt a url', function(){
        test.invalid({}, { globalHook: true, version: version });
        test.invalid({}, { globalHook: '', version: version });
        test.invalid({}, { globalHook: 'aaa', version: version });
      });

      it('should be valid if globalHook is a url', function(){
        test.valid({}, settings);
      });

      it('should be invalid if .version is omitted', function(){
        test.invalid({}, { globalHook: 'http://test.com' });
      });
    });

    types.forEach(function(type){
      describe('#' + type, function(){
        var json;

        beforeEach(function(){
          json = test.fixture(type + '-basic-v' + version);
        });

        it('should succeed on valid call', function(done){
          var route = '/' + type + '/success';
          settings.globalHook += route;

          app.post(route, function(req, res){
            assert.deepEqual(req.body, json.output);
            res.send(200);
          });

          test
            .set(settings)
            [type](json.input)
            .expects(200)
            .end(done);
        });

        it('should error on invalid calls', function(done){
          var route = '/' + type + '/error';
          settings.globalHook += route;

          app.post(route, function(req, res){
            assert.deepEqual(req.body, json.output);
            res.send(503);
          });

          test
            .set(settings)
            [type](json.input)
            .expects(503)
            .error(done);
        });

        // TODO: test limit
      });
    });
  });
});
