define(require => {
  const SKBeInstant = require('skbJet/component/SKBeInstant/SKBeInstant');
  const resources = require('skbJet/component/pixiResourceLoader/pixiResourceLoader');

  return data => ({
    cells: {
      prizeLevel: data.division,
      description: checkPrizeDivision(data.division), //data.division < 11 ? resources.i18n.Paytable.descriptionText1 : resources.i18n.Paytable.descriptionText2,
      prizeValue: SKBeInstant.formatCurrency(data.prize).formattedAmount,
    },
  });

  function checkPrizeDivision(value) {

    var text;

    if (value > 0 && value < 11) {
      text = resources.i18n.Paytable.descriptionText1;
    } else if (value > 10 && value < 25) {
      text = resources.i18n.Paytable.descriptionText2;
    } else {
      text = resources.i18n.Paytable.descriptionText3;
    }

    return text;
  }
});