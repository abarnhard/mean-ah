(function(){
  'use strict';

  angular.module('mean-ah')
  .factory('Game', ['$http', '$rootScope', '$localForage', '$q', '$location', function($http, $rootScope, $localForage, $q, $location){
    function findAllOpen(){
      return $http.get('/games');
    }

    function load(id){
      return $http.get('/games/' + id);
    }

    function cleanLocalStorage(msg){
      var deferred = $q.defer();
      // deferred.resolve, deferred.reject
      $localForage.setItem('gameId', null).then(function(){
        $localForage.setItem('hand', null).then(function(){
          // event updates navbar to remove Game Room Link
          $rootScope.$broadcast('game-over', null);
          deferred.resolve(msg);
        });
      });
      return deferred.promise;
    }

    function errorToLobby(msg){
      toastr.error(msg);
      $location.path('/lobby');
    }

    function goToLobby(msg){
      toastr.success(msg);
      $location.path('/lobby');
    }

    function displayRound(jsonString){
      $rootScope.$broadcast('display-round', jsonString);
    }

    function register(gameId){
      $rootScope.$broadcast('game-joined', gameId);
    }

    return {register:register, displayRound:displayRound, findAllOpen:findAllOpen, load:load, cleanLocalStorage:cleanLocalStorage, errorToLobby:errorToLobby, goToLobby:goToLobby};
  }]);
})();

