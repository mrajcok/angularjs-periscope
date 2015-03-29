'use strict';
// app server
var express   = require('express'),
  //appRoutes = require('./your_app_routes_module_here'),
  app         = express(),
  SERVER_PORT = 3000;  // must match gulpfile.js EXPRESS_PORT
app.use(express.static(__dirname + '/public'));
app.use('/bower_components', express.static(__dirname + '/bower_components'));
//app.use('/', appRoutes);
var server = app.listen(SERVER_PORT, function() {
  console.log('App server listening on port %d', server.address().port);
});
