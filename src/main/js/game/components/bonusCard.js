define(require => {
  const displayList = require('skbJet/componentManchester/standardIW/displayList');
  const msgBus = require('skbJet/component/gameMsgBus/GameMsgBus');
  const resLib = require('skbJet/component/resourceLoader/resourceLib');
  const PIXI = require('com/pixijs/pixi');
  const orientation = require('skbJet/componentManchester/standardIW/orientation');
  const Tween = window.TweenMax;

  require('com/gsap/TweenMax');

  let symbolsFound = [];

  let wheelBonusSpine;
  let prizeBonusSpine;
  let instantWinSpine;

  function init() {
    // set up the graphics

    wheelBonusSpine = new PIXI.spine.Spine(resLib.spine['BonusTriggers'].spineData);
    wheelBonusSpine.state.setAnimation(0, 'Wheel/Wheel_STATIC', false);
    displayList.icon_wheelBonusGraphic.addChild(wheelBonusSpine);

    prizeBonusSpine = new PIXI.spine.Spine(resLib.spine['BonusTriggers'].spineData);
    prizeBonusSpine.state.setAnimation(0, 'Prize/Prize_STATIC', false);
    displayList.icon_prizeBonusGraphic.addChild(prizeBonusSpine);

    instantWinSpine = new PIXI.spine.Spine(resLib.spine['BonusTriggers'].spineData);
    instantWinSpine.state.setAnimation(0, 'IW/IW_STATIC', false);
    displayList.icon_instantWinGraphic.addChild(instantWinSpine);

    //displayList.icon_instantWinText.text = resLib.i18n.game.Game.bonusCard.InstantWin;
    //displayList.icon_wheelBonusText.text = resLib.i18n.game.Game.bonusCard.WheelBonus;
    //displayList.icon_prizeBonusText.text = resLib.i18n.game.Game.bonusCard.CollectBonus;

    wheelBonusSpine.stateData.setMix('Wheel/Wheel_STATIC', 'Wheel/Wheel_IDLE', true, 0.5);
    prizeBonusSpine.stateData.setMix('Prize/Prize_STATIC', 'Prize/Prize_IDLE', true, 0.5);
    instantWinSpine.stateData.setMix('IW/IW_STATIC', 'IW/IW_IDLE', true, 0.5);

    onOrientationChange();

    msgBus.subscribe('GameSize.OrientationChange', onOrientationChange);

  }

  function reset() {
    symbolsFound = [];
    prizeBonusSpine.state.setAnimation(0, 'Prize/Prize_STATIC', false);
    wheelBonusSpine.state.setAnimation(0, 'Wheel/Wheel_STATIC', false);
    instantWinSpine.state.setAnimation(0, 'IW/IW_STATIC', false);
  }

  function bonusCollectManager(data) {
    symbolsFound = [];
    symbolsFound.push(data.symbol);
    triggerRevealAllBonusIcons();
  }

  function triggerRevealAllBonusIcons() {
    if (symbolsFound.includes('WheelBonus')) {
      // wheelBonusSpine.state.setAnimation(0, 'INFO_WheelIconREVEAL', false);
      Tween.delayedCall(0.2, () => {
        wheelBonusSpine.state.addAnimation(0, 'Wheel/Wheel_IDLE', true, 0);
      });

    }
    if (symbolsFound.includes('CollectBonus')) {
      // prizeBonusSpine.state.setAnimation(0, 'INFO_PrizeIconREVEAL', false);
      Tween.delayedCall(0.2, () => {
        prizeBonusSpine.state.addAnimation(0, 'Prize/Prize_IDLE', true, 0);
      });

    }
  }

  function instantWinFound() {
    if (instantWinSpine.state.tracks[0].animation.name !== 'IW/IW_IDLE') {
      Tween.delayedCall(0.2, () => {
        instantWinSpine.state.addAnimation(0, 'IW/IW_IDLE', true, 0);
      });
    }
  }

  function onOrientationChange() {

    if (orientation.get() === orientation.LANDSCAPE) {

      displayList.icon_instantWinText.text = resLib.i18n.game.Game.bonusCard.landscape.InstantWin;
      displayList.icon_wheelBonusText.text = resLib.i18n.game.Game.bonusCard.landscape.WheelBonus;
      displayList.icon_prizeBonusText.text = resLib.i18n.game.Game.bonusCard.landscape.CollectBonus;

    } else {

      displayList.icon_instantWinText.text = resLib.i18n.game.Game.bonusCard.portrait.InstantWin;
      displayList.icon_wheelBonusText.text = resLib.i18n.game.Game.bonusCard.portrait.WheelBonus;
      displayList.icon_prizeBonusText.text = resLib.i18n.game.Game.bonusCard.portrait.CollectBonus;

    }


    msgBus.subscribe('Game.BonusSymFound', bonusCollectManager);
    msgBus.subscribe('Game.TriggerRevealAllBonusIcons', triggerRevealAllBonusIcons);
    msgBus.subscribe('Game.InstantWinFound', instantWinFound);
    //msgBus.subscribe('Game.StopBonusCardIcon', stopBonusIconAnimation);
  }

  return {
    init,
    reset
  };
});