/*
  Module dependencies:

  - Express
  - Http (to run Express)
  - Body parser (to parse JSON requests)
  - Underscore (because it's cool)
  - Socket.IO(Note: we need a web server to attach Socket.IO to)

  It is a common practice to name the variables after the module name.
  Ex: http is the "http" module, express is the "express" module, etc.
  The only exception is Underscore, where we use, conveniently, an
  underscore. Oh, and "socket.io" is simply called io. Seriously, the
  rest should be named after its module name.

*/
var express      = require('express');
var http         = require("http");
var io           = require("socket.io");
var path         = require('path');
var favicon      = require('serve-favicon');
var logger       = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var _            = require("underscore");

// var routes = require('./routes/index');
// var users = require('./routes/users');

var app = express(),
    server = http.createServer(app),
    sockets = io.listen(server).sockets;

/*
  The list of participants in our chatroom.
  The format of each participant will be:
  {
    id: "sessionId",
    name: "participantName"
  }
*/
var participants = [];

//Server's IP address
app.set("ipaddr", "127.0.0.1");

//Server's port number
app.set("port", 8080);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', routes);
// app.use('/users', users);

// catch 404 and forward to error handler
// app.use(function(req, res, next) {
//     var err = new Error('Not Found');
//     err.status = 404;
//     next(err);
// });

// error handlers

// development error handler
// will print stacktrace
// if (app.get('env') === 'development') {
//     app.use(function(err, req, res, next) {
//         res.status(err.status || 500);
//         res.render('error', {
//             message: err.message,
//             error: err
//         });
//     });
// }

// // production error handler
// // no stacktraces leaked to user
// app.use(function(err, req, res, next) {
//     res.status(err.status || 500);
//     res.render('error', {
//         message: err.message,
//         error: {}
//     });
// });

//Handle route "GET /", as in "http://localhost:8080/"
app.get("/", function(request, response) {

  	//Show a simple response message
  	// response.send("Server is up and running");

  	//Render the view called "index"
  	response.render("index");

});

//POST method to create a chat message
app.post("/message", function(request, response) {

    //The request body expects a param named "message"
    var message = request.body.message;

    //If the message is empty or wasn't sent it's a bad request
    if(_.isUndefined(message) || _.isEmpty(message.trim())) {
        return response.json(400, {error: "Message is invalid"});
    }

    //We also expect the sender's name with the message
    var name = request.body.name;

    //Let our chatroom know there was a new message
    sockets.emit("incomingMessage", {message: message, name: name});

    //Looks good, let the client know
    response.json(200, {message: "Message received"});

});

/* Socket.IO events */
sockets.on("connection", function(socket){

    /*
    When a new user connects to our server, we expect an event called "newUser"
    and then we'll emit an event called "newConnection" with a list of all
    participants to all connected clients
    */
    socket.on("newUser", function(data) {
        participants.push({id: data.id, name: data.name});
        sockets.emit("newConnection", {participants: participants});
    });

    /*
    When a user changes his name, we are expecting an event called "nameChange"
    and then we'll emit an event called "nameChanged" to all participants with
    the id and new name of the user who emitted the original message
    */
    socket.on("nameChange", function(data) {
        _.findWhere(participants, {id: socket.id}).name = data.name;
        sockets.emit("nameChanged", {id: data.id, name: data.name});
    });

    /*
    When a client disconnects from the server, the event "disconnect" is automatically
    captured by the server. It will then emit an event called "userDisconnected" to
    all participants with the id of the client that disconnected
    */
    socket.on("disconnect", function() {
        participants = _.without(participants,_.findWhere(participants, {id: socket.id}));
        sockets.emit("userDisconnected", {id: socket.id, sender:"system"});
    });

});

//Start the http server at port and IP defined before
server.listen(app.get("port"), app.get("ipaddr"), function() {
    console.log("Server up and running. Go to http://" + app.get("ipaddr") + ":" + app.get("port"));
});

module.exports = app;
