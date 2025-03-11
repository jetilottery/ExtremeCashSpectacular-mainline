define(require => {
  const msgBus = require('skbJet/component/gameMsgBus/GameMsgBus');
  const _state = {
    winning: [],
    player: [],
    winningStart: []
  };

  function reset() {
    _state.winning = [];
    _state.player = [];
    _state.winningStart = [];
  }

  msgBus.subscribe('Game.WinningNumber', function(number){
    _state.winning.push(number);
  });

  msgBus.subscribe('Game.PlayerNumber', function(number){
    _state.player.push(number);
  });

  msgBus.subscribe('Game.WinningNumberStart', function(number){
    _state.winningStart.push(number);
  });

  return {
    get winning() {
      return _state.winning;
    },
    get player() {
      return _state.player;
    },
    get winningStart() {
      return _state.winningStart;
    },
    reset
  };
});