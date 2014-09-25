(function(){
  'use strict';

  angular.module('mean-ah')
  .controller('NavCtrl', ['$scope', '$localForage', function($scope, $localForage){
    $localForage.getItem('alias').then(function(alias){
      $scope.alias = alias;
    });

    $localForage.getItem('gameId').then(function(gameId){
      $scope.gameId = gameId;
    });

    $scope.$on('authenticated', function(event, alias){
      if(alias === 'anonymous'){alias = null;}

      $localForage.setItem('alias', alias).then(function(){
        $scope.alias = alias;
      });
    });
  }]);
})();

