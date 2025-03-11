define(function (require) {
    const displayList = require('skbJet/componentManchester/standardIW/displayList');
    const autoPlay = require('skbJet/componentManchester/standardIW/autoPlay');
    const SKBeInstant = require('skbJet/component/SKBeInstant/SKBeInstant');
    const msgBus = require('skbJet/component/gameMsgBus/GameMsgBus');

    require('com/gsap/TweenLite');

    let Tween = window.TweenLite;
    let button;

    function init() {
        button = displayList.collectInfoRevealAllButton;

        if (!SKBeInstant.config.autoRevealEnabled) {
            button.visible = false;
        }

        button.enabled = false;
        button.alpha = 0;
        button.on('press', disableButton);
    }

    function disableButton() {
        autoPlay._enabled = true;
        button.enabled = false;
        Tween.to(button, 0.1, {alpha: 0});
    }

    function softDisable() {
        button.enabled = false;
    }

    function reset() {
        if (SKBeInstant.config.autoRevealEnabled) {
            button.visible = true;
            button.enabled = false;
        }
    }

    function enableButton() {
        button.enabled = true;
        Tween.to(button, 0.1, {alpha: 1, onComplete:()=>{
            msgBus.publish('game.collect.setInteractive');
        }});
    }

    return {
        init: init,
        reset: reset,
        enableButton: enableButton,
        disableButton: disableButton,
        softDisable: softDisable
    };
});