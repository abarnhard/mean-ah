'use strict';

var Game = require('../models/game');

module.exports = function(socket){
  var roomId,
      // save off reference to io object
      io = this;

  socket.on('create-game', function(data, cb){
    // console.log('raw in', data);
    Game.create(data, function(err, gameInfo){
      // console.log('gameInfo', gameInfo);
      roomId = gameInfo.roomId;
      socket.join(roomId);
      socket.join(data.player);
      cb(err, gameInfo);
    });
  });

  socket.on('join-game', function(data, cb){
    // console.log('I Fired', 'socket.on join-game');
    Game.join(data, function(err, gameInfo){
      // console.log('I Fired', 'Game.join CB');
      if(!err){
        roomId = gameInfo.roomId;
        socket.join(roomId);
        socket.join(data.player);
        socket.broadcast.to(roomId).emit('player-joined', data.player);
      }
      cb(err, gameInfo);
    });
  });

  socket.on('start-game', function(data){
    // console.log('socked recieved start-game');
    Game.start(data.gameId, function(err, count){
      io.to(roomId).emit('game-start');
    });
  });

  socket.on('player-connect', function(data, cb){
    roomId = data.roomId;
    socket.join(roomId);
    socket.join(data.player);
    cb();
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });

};
