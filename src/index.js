var path = require("path")
const express = require('express')
var app = require('express')()
var http = require('http').Server(app)
var io = require('socket.io')(http)
var port = process.env.PORT || 3000

var rooms = {}

app.use('/static', express.static(path.join(__dirname, 'public')))

app.get('/', function(req, res){
  res.sendFile(__dirname + '/templates/index.html')
})

app.get('/session/:sessionId', function(req, res){
  res.sendFile(__dirname + '/templates/session.html')
})

io.on('connection', function(socket){
  socket.on('join-room', function(roomid) {
    socket.join(roomid)
    if(!(roomid in rooms)) {
      rooms[roomid] = {}
    }
  })
  socket.on('add-user', function(data) {
    socket.roomid = data.roomid
    socket.username = data.username
    rooms[socket.roomid][socket.username] = null
    io.sockets.in(socket.roomid).emit('new-state', rooms[socket.roomid])
  })
  socket.on('disconnect', function() {
    if (socket.roomid || socket.username) {
      delete rooms[socket.roomid][socket.username]
    }
    if (rooms[socket.roomid]) {
      if (Object.keys(rooms[socket.roomid]).length == 0) {
        delete rooms[socket.roomid]
      }
    }
    io.sockets.in(socket.roomid).emit('new-state', rooms[socket.roomid])
  })
  socket.on('vote', function(data) {
    socket.roomid = data.roomid
    socket.username = data.username
    socket.vote = data.vote
    rooms[socket.roomid][socket.username] = socket.vote
    io.sockets.in(socket.roomid).emit('new-state', rooms[socket.roomid])
  })
  socket.on('show-votes', function(roomid){
    io.sockets.in(socket.roomid).emit('show-votes', rooms[socket.roomid])
  })
  socket.on('clear-votes', function(roomid){
    Object.keys(rooms[roomid]).forEach(x => {rooms[x] = null}) // clear votes
    io.sockets.in(socket.roomid).emit('hide-votes', rooms[socket.roomid])
    io.sockets.in(socket.roomid).emit('new-state', rooms[socket.roomid]) // update state to users
  })
})

http.listen(port, function(){
  console.log('listening on *:' + port)
})
