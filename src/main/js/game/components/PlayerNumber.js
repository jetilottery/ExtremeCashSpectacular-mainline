define(require => {
    const PIXI = require('com/pixijs/pixi');
    const SKBeInstant = require('skbJet/component/SKBeInstant/SKBeInstant');
    const FittedText = require('skbJet/componentManchester/standardIW/components/fittedText');
    const textStyles = require('skbJet/componentManchester/standardIW/textStyles');
    const msgBus = require('skbJet/component/gameMsgBus/GameMsgBus');
    const resLib = require('skbJet/component/resourceLoader/resourceLib');
    const utils = require('game/components/utils/utils');
    const NumberCard = require('./NumberCard');
    const gameConfig = require('skbJet/componentManchester/standardIW/gameConfig');
    const autoPlay = require('skbJet/componentManchester/standardIW/autoPlay');
    const audio = require('skbJet/componentManchester/standardIW/audio');
    const resources = require('skbJet/component/pixiResourceLoader/pixiResourceLoader');


    const WIDTH = 100;
    const HEIGHT = 95;
    const MAX_VALUE_WIDTH = 80;
    const TEXT_Y_POS = 45;
    const TEXT_Y_POS_MOBILE = 45;
    const RESULT_NUMBER_OFFSET = -12;
    const RESULT_NUMBER_OFFSET_GOLD = -5;
    const RESULT_NUMBER_OFFSET_GOLD_SWITCH = -12;
    const DELAY_BEFORE_NUMBER_SHOWN = 0.35;
    const BONUS_SYMBOLS = ['WheelBonus', 'CollectBonus'];
    const SPINE_NAME_LOOKUP = {
        'Gold': {
            'skinPrefix': 'GOLD/GF',
            'animationPrefix': 'Gold',
        },
        'Silver': {
            'skinPrefix': 'SILVER/SF',
            'animationPrefix': 'Silver',
        }
    };

    require('com/gsap/TweenMax');
    require('com/gsap/TimelineLite');
    const Tween = window.TweenMax;
    const TimelineLite = window.TimelineLite;

    class PlayerNumber extends NumberCard {
        constructor() {
            super(WIDTH, HEIGHT);
            this.isBonus = false;
            this.bonusName = null;
            this.resultChangeAnim = null;
            this.defaultState = 'YourSTATIC';
            this.revealState = 'silver';
            this.pickPointType = 'Your';
            this.initSpine();
            this.assetNumber = null;
            this.number = null;
            this.value = null;
            this.winText = new PIXI.Sprite();
            this.fontSizeFix = SKBeInstant.config.assetPack === 'mobile' ? 'Mobile' : '';
            this.firstPlay = 0;
            this.animation = null;

            this.valueTexts = [
                new FittedText(''),
                new FittedText('')
            ];

            this.valueTexts.forEach(function(valueText) {
                //const _this = this;
                valueText.anchor.set(0.5);
                valueText.y = SKBeInstant.config.assetPack === 'mobile' ? TEXT_Y_POS_MOBILE : TEXT_Y_POS;
                valueText.maxWidth = MAX_VALUE_WIDTH;
                valueText.style = textStyles.parse('defaultPrizeValue');
            });

            this.winText.addChild(this.valueTexts[0], this.valueTexts[1]);
            this.addChild(this.winText);
            this.reset();
        }

        initSpine() {
            const _this = this;
            this.coverAnim = new PIXI.spine.Spine(resLib.spine['CoverAnims'].spineData);
            this.setSpineCoverState({
                state: 'DEFAULT',
                loop: false
            });
            this.coverContainer.addChild(_this.coverAnim);
            this.coverAnim.stateData.setMix('YourIDLE', 'YourSTATIC', 0.2);
            this.coverAnim.stateData.setMix('YourSTATIC', 'YourIDLE', 0.2);

            // Now init the resultAnim spine, we're doing this on init rather than populate, we add all three
            // and then just show the relevant one
            this.resultAnims[0] = new PIXI.spine.Spine(resLib.spine['GoldNumbers'].spineData);
            this.resultAnims[0].scale.set(0.8);
            this.resultAnims[1] = new PIXI.spine.Spine(resLib.spine['SilverNumbers'].spineData);
            this.resultAnims[1].scale.set(0.8);
            this.resultAnims[2] = new PIXI.spine.Spine(resLib.spine['BonusTriggers'].spineData);
            // Set renderable on all of them to false
            this.resultAnims.forEach((anim) => {
                anim.renderable = false;
            });
            // Add to result container
            this.resultContainer.addChild(this.resultAnims[0], this.resultAnims[1], this.resultAnims[2]);

            // Init resultChangeAnim here once
            this.resultChangeAnim = new PIXI.spine.Spine(resLib.spine['GoldNumbers'].spineData);
            this.resultChangeAnim.y = RESULT_NUMBER_OFFSET_GOLD_SWITCH;
            this.resultChangeAnim.renderable = false;
            this.resultContainer.addChild(this.resultChangeAnim);
        }

        setSpineCoverState(data) {

            let nextState;
            let doLoop = data.loop || false;
            let syncTime = data.sync || 0;

            switch (data.state) {
                case 'DEFAULT':
                    nextState = 'YourSTATIC';
                    break;
                case 'IDLE':
                    nextState = 'YourIDLE';
                    break;
                case 'REVEAL':
                    nextState = 'YourREVEAL_Unmatched'; // HAVE TO CHECK IF IS WMATCHED OR NOT.
                    break;
                case 'ROLLOVER':
                    nextState = 'YourSTATIC';
                    break;
                case 'ROLLOUT':
                    nextState = 'YourSTATIC';
                    break;
                case 'OFF':
                    nextState = this.defaultState;
                    break;
                default:
                    nextState = this.defaultState;
                    break;
            }

            // If we're already in a rollout state, we don't want to be forcing the state back to default
            // as this would interrupt the rollout animation, so if we're going back to default, don't do anything
            if (this.interactionState === 'ROLLOUT' && nextState === this.defaultState) {
                return;
            }

            // Store the interaction state
            this.interactionState = data.state;
            utils.log('Changing Player Number spine state to: ' + nextState);
            this.coverAnim.renderable = data.state !== 'OFF';
            this.coverAnim.state.setAnimation(syncTime, nextState, doLoop);

            let globalScope = this;
            if (data.state === 'REVEAL') {
                Tween.delayedCall(DELAY_BEFORE_NUMBER_SHOWN, function startResultAnimation() {
                    globalScope.setSpineResultState();
                });
            }

        }

        presentWin() {
            const resultAnim = this.resultAnims[this.resultAnimIndex];
            this.parent.addChildAt(this, this.parent.children - 1);

            this.coverAnim.state.setAnimation(0, 'YourREVEAL_Matched', false);
            this.coverAnim.alpha = 1;

            audio.playSequential('numberMatch');


            if (this.revealState === 'Gold') {
                // gold number is revealed from behind the cover
                resultAnim.y = RESULT_NUMBER_OFFSET_GOLD;
                Tween.delayedCall(0.25, () => {
                    resultAnim.state.setAnimation(0, 'GoldMATCHED', false);
                    resultAnim.state.addAnimation(0, 'GoldMATCHED_IDLE', true, 0);
                });

            } else {
                let _this = this;
                // silver number is already visible and a lucky number has matched
                // animate away the silver and animate in the new gold, change text style from lose to win    
                resultAnim.state.setAnimation(0, 'SilverMATCH', false);
                // animate the gold number in
                Tween.delayedCall(0.35, function showRevealedGoldNumberFromSilver() {
                    _this.resultChangeAnim.renderable = true;
                    //_this.valueText.style = textStyles.parse('prizeValueWin' + _this.fontSizeFix);
                    _this.resultChangeAnim.skeleton.setSkin(null);
                    _this.resultChangeAnim.skeleton.setSkinByName('GOLD/GF' + _this.assetNumber);
                    _this.resultChangeAnim.state.setAnimation(0, 'GoldREVEAL', false);
                    _this.resultChangeAnim.state.addAnimation(0, 'GoldMATCHED', false, 0);
                    _this.resultChangeAnim.state.addAnimation(0, 'GoldMATCHED_IDLE', true, 0);
                });
            }
        }

        presentInstantWin() {
            const _this = this;
            this.valueTexts.forEach(function(valueText, index) {
                var textStyle = !index ? 'prizeValueWin' : 'prizeValueWinGradient';
                valueText.style = textStyles.parse(textStyle + _this.fontSizeFix);
                valueText.text = SKBeInstant.formatCurrency(_this.value).formattedAmount.replace(" ", "\u0020");
            });

        }

        presentBonusWin(value) {
            const _this = this;
            this.valueTexts.forEach(function(valueText, index) {
                var textStyle = !index ? 'prizeValueWin' : 'prizeValueWinGradient';
                valueText.style = textStyles.parse(textStyle + _this.fontSizeFix);
                valueText.text = value;
            });
        }

        setSpineResultState() {
            const resultAnim = this.resultAnims[this.resultAnimIndex];
            resultAnim.y = 0;
            resultAnim.state.timeScale = 1;
            resultAnim.renderable = false;
            resultAnim.alpha = 1;

            if (BONUS_SYMBOLS.includes(this.revealState)) {

                this.coverAnim.alpha = 0;
                //this.winText.alpha = 0;
                resultAnim.y = 10;

                if (this.revealState === 'WheelBonus') {
                    Tween.delayedCall(0.25, () => {
                        audio.play('wheelBonusRevealed');
                    });

                    this.valueTexts.forEach(function(valueText) {
                        valueText.text = "";
                    });


                    resultAnim.state.setAnimation(0, 'Wheel/Wheel_REVEAL', false);
                    resultAnim.state.addAnimation(0, 'Wheel/Wheel_IDLE', true, 0);

                    this.winText.y = 10;
                    Tween.to(this.winText.scale, 0.2, {
                        x: 1.2,
                        y: 1.2
                    });

                    Tween.to(this.winText, 0.2, {
                        alpha: 1,
                        delay: 0.2
                    });

                } else if (this.revealState === 'CollectBonus') {
                    Tween.delayedCall(0.25, () => {
                        audio.play('prizeBonusRevealed');
                    });

                    this.valueTexts.forEach(function(valueText) {
                        valueText.text = "";
                    });

                    resultAnim.state.setAnimation(0, 'Prize/Prize_REVEAL', false);
                    resultAnim.state.addAnimation(0, 'Prize/Prize_IDLE', true, 0);

                    this.winText.y = 10;
                    Tween.to(this.winText.scale, 0.2, {
                        x: 1.2,
                        y: 1.2
                    });

                    Tween.to(this.winText, 0.2, {
                        alpha: 1,
                        delay: 0.2
                    });
                }
            } else {

                resultAnim.y = 0;

                if (this.revealState === 'V') {

                    audio.play('instantWin');
                    this.coverAnim.alpha = 0;
                    this.valueTexts.forEach(function(valueText) {
                        valueText.text = "";
                    });
                    this.winText.alpha = 0;
                    this.winText.y = -3;
                    resultAnim.y = 0;
                    resultAnim.state.setAnimation(0, 'IW/IW_REVEAL', false);
                    resultAnim.state.addAnimation(0, 'IW/IW_IDLE', true, 0);

                    Tween.to(this.winText.scale, 0.2, {
                        x: 1.2,
                        y: 1.2
                    });

                    Tween.to(this.winText, 0.2, {
                        alpha: 1,
                        delay: 0.2
                    });

                } else if (this.revealState === "W") {

                    audio.play('instantWin2X');
                    this.coverAnim.alpha = 0;
                    this.valueTexts.forEach(function(valueText) {
                        valueText.text = "";
                    });

                    this.winText.alpha = 0;
                    this.winText.y = -3;
                    Tween.to(this.winText.scale, 0.2, {
                        x: 1.2,
                        y: 1.2
                    });
                    resultAnim.y = 0;
                    resultAnim.state.setAnimation(0, 'IWx2/IWx2_REVEAL', false);
                    resultAnim.state.addAnimation(0, 'IWx2/IWx2_IDLE', true, 0);
                    Tween.to(this.winText, 0.2, {
                        alpha: 1,
                        delay: 0.2
                    });
                } else {

                    resultAnim.skeleton.setSkin(null);
                    resultAnim.skeleton.setSkinByName(SPINE_NAME_LOOKUP[this.revealState].skinPrefix + this.assetNumber);

                    resultAnim.state.setAnimation(0, SPINE_NAME_LOOKUP[this.revealState].animationPrefix + 'REVEAL', false);
                    resultAnim.state.addAnimation(0, SPINE_NAME_LOOKUP[this.revealState].animationPrefix + 'IDLE', true, 0);

                    Tween.to(this.valueTexts[0], 0.2, {
                        alpha: 1
                    });
                    Tween.to(this.valueTexts[1], 0.2, {
                        alpha: 1
                    });
                }
            }
            Tween.delayedCall(0.1, () => {
                resultAnim.renderable = true;
            });
        }

        triggerManualPlayBonus(bonusName) {
            // turns off the UI and notifies the bonus card area to play the matching bonus icon animation
            msgBus.publish('UI.updateButtons', {
                autoPlay: false,
                home: false,
                help: {
                    enabled: false
                }
            });

            msgBus.publish('Game.BonusSymFound', {
                symbol: bonusName,
                auto: autoPlay.enabled
            });
        }

        populate([numberOrSymbol, value], goldOrSilver) {
            const _this = this;
            this.value = value;
            this.revealState = isNaN(numberOrSymbol) ? numberOrSymbol : goldOrSilver;
            super.populate(numberOrSymbol);

            // We're not using super.populate() any more
            // Show the relevant spine anim
            // this.resultAnims[0] is Gold
            // this.resultAnims[1] is Silver
            // this.resultAnims[2] is Bonuses isNaN(numberOrSymbol)
            if (!isNaN(numberOrSymbol)) {
                if (goldOrSilver === 'Gold') {
                    this.resultAnimIndex = 0;
                    this.resultAnims[this.resultAnimIndex].y = RESULT_NUMBER_OFFSET;
                } else {
                    this.resultAnimIndex = 1;
                }
                this.resultAnims[this.resultAnimIndex].y = RESULT_NUMBER_OFFSET;
            } else {
                this.resultAnimIndex = 2;
            }

            this.resultAnims[this.resultAnimIndex].renderable = true;
            this.resultAnims[this.resultAnimIndex].alpha = 0;


            // NOT WORKING
            //this.animation = goldOrSilver === 'Silver' ? 'YourREVEAL_Unmatched' : 'YourREVEAL_Matched';


            if (isNaN(numberOrSymbol)) {
                // // must be a string - check bonus name
                if (numberOrSymbol === 'WheelBonus') {
                    this.isBonus = true;
                    this.bonusName = 'WheelBonus';

                    //audio.play('wheelBonusRevealed');
                    if (!autoPlay.enabled) {
                        // stop further picks as soon as player has picked this card
                        msgBus.publish('Game.DisablePicksForBonus');
                    }
                } else if (numberOrSymbol === 'CollectBonus') {
                    // Collect Bonus
                    this.isBonus = true;
                    this.bonusName = 'CollectBonus';

                    //audio.play('prizeBonusRevealed');
                    if (!autoPlay.enabled) {
                        // stop further picks as soon as player has picked this card
                        msgBus.publish('Game.DisablePicksForBonus');
                    }
                }
            } else {
                this.assetNumber = numberOrSymbol < 10 ? '0' + numberOrSymbol : '' + numberOrSymbol;

                this.valueTexts.forEach(function(valueText, index) {
                    //valueText.alpha = 1;
                    var prizeValueWinTextStyle = !index ? 'prizeValueWin' : 'prizeValueWinGradient';
                    valueText.style = goldOrSilver === 'Silver' ? textStyles.parse('prizeValueNoWin' + _this.fontSizeFix) : textStyles.parse(prizeValueWinTextStyle + _this.fontSizeFix);
                    valueText.text = SKBeInstant.formatCurrency(value).formattedAmount.replace(" ", "\u0020");
                });
            }
        }

        setValueTextWin() {
            const _this = this;
            this.valueTexts.forEach(function(valueText, index) {
                //valueText.alpha = 1;
                var prizeValueWinTextStyle = !index ? 'prizeValueWin' : 'prizeValueWinGradient';
                valueText.style = textStyles.parse(prizeValueWinTextStyle + _this.fontSizeFix);
                valueText.text = SKBeInstant.formatCurrency(_this.value).formattedAmount.replace(" ", "\u0020");
            });
        }


        async uncover() {
            const _this = this;
            const evt = 'Game.Player';
            const resultAnim = this.resultAnims[this.resultAnimIndex];

            msgBus.publish(evt + 'Out', this);

            await new Promise(resolve => {

                //this.winText.scale.set(1);
                Tween.to(this.winText.scale, 0.2, {
                    x: 1,
                    y: 1
                });

                // we need to move this pick point to the front
                // as otherwise the spineAnim will underlap neighbouring pickPoints
                _this.bringToFront();
                // we also need to bring this overall number set to the front
                // so that all spine anims are at the very front of the screen
                _this.parent.parent.parent.setChildIndex(
                    _this.parent.parent,
                    _this.parent.parent.parent.children.length - 1
                );

                // add a listener for when the result is revealed it then plays it's idle animation
                utils.removeSpineListeners(resultAnim);
                resultAnim.state.addListener({
                    complete: function(entry) {
                        if (entry.animation.name.indexOf('REVEAL') > -1) {
                            _this.uncovered = true;
                            utils.removeSpineListeners(resultAnim);
                            resolve();
                        }
                    }
                });

                // Disable interactivity to prevent re-reveal, then switch to the animation
                _this.enabled = false;
                _this.revealed = true;
                _this.setSpineCoverState({
                    state: 'REVEAL',
                    loop: false
                });
                if (!autoPlay.enabled && _this.bonusName) {
                    _this.triggerManualPlayBonus(_this.bonusName);
                }

            });
        }

        rollover() {
            super.rollover();

            if (this.enabled && this.interactionState === 'ROLLOVER') {
                this.coverAnim.state.setAnimation(0, 'YourMOUSEOVER', false);

                Tween.to(this.winText.scale, 0.2, {
                    x: 1.2,
                    y: 1.2
                });

                Tween.to(this.winText, 0.2, {
                    y: -3
                });

            }

        }

        stopRollover() {
            super.stopRollover();

            if (this.enabled && this.interactionState === 'ROLLOUT') {
                this.coverAnim.state.setAnimation(0, 'YourMOUSEOUT', false);
                Tween.to(this.winText.scale, 0.2, {
                    x: 1,
                    y: 1
                });

                Tween.to(this.winText, 0.2, {
                    y: -3
                });
            }
        }


        showBonus() {
            var _this = this;
            //we need to show the number of bonus symbols found on this turn
            //fairly straightforward, if we have 1, show 1, if we have 2, show 1 and 2
            if (_this.numBonus > 0) {
                //to stop bonus symbols pulsing and going behind other pick points
                //we need to move this one to the front
                super.bringToFront();

                //check here if we've revealed this one during auto play
                // let _auto = autoPlay.enabled;

                //TMP012-8 - Bonus Symbol shown before scratch animation in YOUR NUMBERS
                //TMP012-25 - Review feedback - create anticipation on star appearing.
                //scale the bonus symbols up from zero
                //_this.scaleFromZero(_this.bonus1, (_this.numBonus === 1), _auto);

                if (_this.numBonus > 1) {
                    //slight delay before pulsing bonus2, so both are not pulsing at the same time
                    Tween.delayedCall(gameConfig.delayBetweenBonusSymbolsInSeconds, function() {
                        //_this.scaleFromZero(_this.bonus2, (_this.numBonus === 2), _auto);
                    });
                }
            }
        }

        scaleFromZero(sym, isFinal, auto) {
            var _this = this;
            const timeline = isFinal ? new TimelineLite({
                onStart: function() {
                    // If we're in auto play, notify that we have found a bonus symbol immediately
                    if (auto) {
                        _this.notifyBonus(_this, auto);
                    }
                },
                onComplete: function() {
                    // If we're in manual play, notify that we have found a bonus symbol after it has been fully revealed
                    // This is so we can move it across the screen
                    if (!auto) {
                        _this.notifyBonus(_this, auto);
                    }
                }
            }) : new TimelineLite({});
            timeline.to(sym.scale, gameConfig.pulseBonusItemDuration, {
                x: 2,
                y: 2
            });
            timeline.to(sym.scale, gameConfig.pulseBonusItemDuration, {
                x: 1,
                y: 1
            });

            if (!gameConfig.gravitateBonusItem && gameConfig.pulseBonusItemOnCollect) {
                timeline.to(sym.scale, gameConfig.pulseBonusItemDuration, {
                    x: 1.5,
                    y: 1.5
                });
                timeline.to(sym.scale, gameConfig.pulseBonusItemDuration, {
                    x: 1,
                    y: 1
                });
                timeline.to(sym.scale, gameConfig.pulseBonusItemDuration, {
                    x: 1.5,
                    y: 1.5
                });
                timeline.to(sym.scale, gameConfig.pulseBonusItemDuration, {
                    x: 1,
                    y: 1
                });
            }
        }

        notifyBonus(inThis, auto) {
            var _this = inThis;
            // Publish an event with the info for this number
            msgBus.publish('Game.BonusSymFound', {
                symbol: _this,
                numBonus: _this.numBonus,
                auto: auto
            });
        }

        stopBonusTrigger() {
            if (this.revealState === 'WheelBonus') {
                // this.resultAnim.state.setAnimation(0,'INFO_WheelIconSTATIC', false);
            } else if (this.revealState === 'CollectBonus') {
                // this.resultAnim.state.setAnimation(0,'INFO_PrizeIconSTATIC', false);
            }
        }

        reset() {
            super.reset();

            this.assetNumber = null;
            this.value = null;
            this.number = null;
            this.resultAnimBackground = null;
            this.revealState = 'Silver';
            this.bonusName = null;
            this.isBonus = false;
            this.coverAnim.alpha = 1;
            this.winText.alpha = 1;

            utils.stopSpineAnim(this.resultChangeAnim);
            utils.removeSpineListeners(this.resultChangeAnim);

            this.valueTexts.forEach(function(valueText) {
                valueText.text = resources.i18n.Game.yourNumbersPromptText;
                valueText.alpha = 1;
                valueText.style = textStyles.parse('defaultPrizeValue');
            });

            this.winText.y = -3;
            this.winText.scale.set(1);


            if (this.firstPlay > 1 && this.stackReset === false) {
                this.coverAnim.state.setAnimation(0, 'YourRESET', false);
                this.coverAnim.alpha = 1;
                this.stackReset = true;
            }
            this.firstPlay += 1;
        }

        static fromContainer(container) {
            const card = new PlayerNumber();
            container.addChild(card);
            return card;
        }
    }

    return PlayerNumber;
});