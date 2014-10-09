(function(){
  'use strict';

  angular.module('mean-ah')
  .controller('GamesCtrl', ['$scope', '$location', '$localForage', 'Socket', 'Game', function($scope, $location, $localForage, Socket, Game){

    // Register game events to be forwarded from Socket.IO to Angulars event system
    Socket.forward(['player-joined', 'game-start', 'deal-hand', 'round-start', 'player-left', 'play-made', 'answers-submitted', 'winner', 'deal-cards', 'new-czar', 'game-over', 'replace-czar', 'player-voted', 'final-round-start'], $scope);

    // Get player from Nav (could look up alias with $localForage)
    $localForage.getItem('alias').then(function(alias){
      $scope.alias = alias;
    });

    // load game from database into memory
    $localForage.getItem('gameId').then(function(gameId){
      if(!!!gameId){return Game.errorToLobby('Hey there jackwagon, try joining a game first');}
      Game.load(gameId).then(function(res){
        if(!!!res.data.game){
          Game.cleanLocalStorage('Game Has Ended, Choose Another Game').then(Game.errorToLobby);
        }else{
          Socket.emit('player-connect', angular.toJson({roomId:gameId, player:$scope.alias}), function(err, data){
            $localForage.getItem('hand').then(function(hand){
              $scope.game = res.data.game;
              $scope.game.answers = [];
              $scope.game.hand = hand || [];
              $scope.game.play = _.findWhere($scope.game.round.answers || [], {player:$scope.alias});
              $scope.game.isOwner = ($scope.game.owner === $scope.alias);
            });
          });
        }
      });
    });

    $scope.startGame = function(id){
      // console.log('startGame Fired');
      Socket.emit('start-game', {gameId:id}, function(){
        Socket.emit('draw-hand', {gameId:$scope.game._id}, function(){
          Socket.emit('start-round', {gameId:$scope.game._id});
        });
      });
    };

    $scope.leaveGame = function(id){
      // console.log('leaveGame Fired');
      Socket.emit('leave-game', {gameId:id, player:$scope.alias}, function(err, data){
        Game.cleanLocalStorage('You have quit the game').then(Game.goToLobby);
      });
    };

    $scope.selectAnswer = function(card){
      // If you've already played this round, do nothing
      if($scope.game.play){return;}
      // If this card is already in answers, do nothing
      if(_.findWhere($scope.game.answers, {id:card.id})){return;}

      if($scope.game.answers.length < $scope.game.round.qcard.numAnswers){
        // console.log(card);
        $scope.game.answers.push(card);
      }else{
        // TODO Add classes so user can see which card is selected & 1st/2nd for multi-card answers
        $scope.game.answers.shift();
        $scope.game.answers.push(card);
      }
    };

    $scope.playAnswers = function(){
      var answers = [];
      $scope.game.answers.forEach(function(ans){
        answers.push(_.findWhere($scope.game.hand, {id:ans.id}));
        $scope.game.hand = $scope.game.hand.filter(function(card){return card.id !== ans.id;});
      });
      $localForage.setItem('hand', $scope.game.hand).then(function(){
        var play = {player:$scope.alias, answers:answers};
        $scope.game.play = play;
        $scope.game.answers = [];
        var data = {gameId:$scope.game._id, play:play};
        data = angular.toJson(data);
        Socket.emit('play-cards', data);
      });
    };

    $scope.pickWinner = function(play){
      $scope.winner = play;
    };

    $scope.submitWinner = function(){
      var data = {gameId:$scope.game._id, winner:$scope.winner, gameOver:$scope.game.finalRound};
      data = angular.toJson(data);
      Socket.emit('winner-selected', data);
      $scope.winner = null;
    };

    $scope.voteGameEnd = function(id){
      var data = {gameId:id, player:$scope.alias};
      data = angular.toJson(data);
      Socket.emit('vote-to-end', data);
      $scope.voted = true;
    };

    // register Angular event handlers
    $scope.$on('socket:player-joined', function(event, data){
      // console.log('I Fired');
      $scope.game.players.push(data.player);
    });

    $scope.$on('socket:player-left', function(event, data){
      // console.log('socket:player-left fired');
      $scope.game.players = $scope.game.players.filter(function(p){return p !== data.player;});
    });

    $scope.$on('socket:game-start', function(event, data){
      // console.log('game started');
      $scope.game.status = 'in-progress';
      $scope.game.isOpen = 'false';
      $scope.isWaiting = $scope.game.status === 'open';
    });

    $scope.$on('socket:deal-hand', function(event, data){
      $localForage.setItem('hand', data.hand).then(function(){
        $scope.game.hand = data.hand;
      });
    });

    $scope.$on('socket:round-start', function(event, data){
      $scope.game.round = data.round;
      $scope.game.play = null;
    });

    $scope.$on('socket:final-round-start', function(event, data){
      $scope.game.round = data.round;
      $scope.game.play = null;
      $scope.game.finalRound = true;
    });

    $scope.$on('socket:answers-submitted', function(event, data){
      $scope.playedAnswers = data.round;
    });

    $scope.$on('socket:play-made', function(event, data){
      console.log('socket:play-made', data.player);
    });

    $scope.$on('socket:winner', function(event, data){
      var s = '';
      data.answers.forEach(function(card){
        s = s + card.text + '\n';
      });
      toastr.success(data.player + ' is the winner with: \n' + $scope.game.round.qcard.text + '\n' + s);
      $scope.playedAnswers = null;
      if(data.gameOver){
        Game.cleanLocalStorage('The Game Has Ended').then(Game.goToLobby);
      }
    });

    $scope.$on('socket:deal-cards', function(event, data){
      var newHand = $scope.game.hand.concat(data.cards);
      $localForage.setItem('hand', newHand).then(function(){
        $scope.game.hand = newHand;
      });
    });

    $scope.$on('socket:new-czar', function(event, data){
      toastr.success(data.cardCzar + ' is now the Card Czar.');
      $scope.game.cardCzar = data.cardCzar;
    });

    $scope.$on('socket:game-over', function(event, data){
      // TODO Add somthing so that users can view the final results stored in data.gameData
      Game.cleanLocalStorage('The Game Has Ended').then(Game.goToLobby);
    });

    $scope.$on('socket:replace-czar', function(event, data){
      toastr.success(data.cardCzar + ' is now the Card Czar.');
      $scope.game.cardCzar = data.cardCzar;
      if($scope.alias === $scope.game.cardCzar){
        // If player has become card czar, return any played cards to their hand
        if($scope.game.play){
          $scope.game.hand = $scope.game.hand.concat($scope.game.play.answers);
          $localForage.setItem('hand', $scope.game.hand).then(function(){
            toastr.success('Your Played Cards have been returned to your hand');
          });
        }
      }
    });

    $scope.$on('socket:player-voted', function(event, data){
      toastr.success(data.player + ' voted to end the game');
    });

  }]);

})();
