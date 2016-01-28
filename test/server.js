"use strict";
let Telegram = require('../../node-telegram-bot-api');
let fs = require('fs');
let globalData = {
  "token": ""
};

class Test {
  constructor() {
    this.dataFile('load', 'endpointSetup');
  }
  dataFile(action, runAfter, dataFile) {
      dataFile = (dataFile === undefined ? 'data' : dataFile);
      let tempFunction = this[runAfter];
      if(action === 'load') {
        fs.readFile(
          dataFile
          , function(error, data) {
            if(!error) {
              globalData = JSON.parse(data);
              console.log(globalData);
              if(typeof tempFunction === 'function') {
                tempFunction();
              };
            };
          }
        );
      }
      else if(action === 'save') {
        fs.writeFile(
          dataFile
          , JSON.stringify(this.data)
          , function(error, data) {
            if(error) {
              console.log(error);
            }
            else if(typeof runAfter === 'function') {
              this[runAfter]();
            };
          }
        );
      }
      return false;
  }
  endpointSetup() {
    let telegram = new (Telegram.BotManager)({"botToken": globalData.token});
    console.log(globalData);

    //this.telegram.on('start', this.start);
    //this.telegram.on('help', this.help);
    //this.telegram.on('settings', this.settings);
    //this.telegram.on('stockadd', this.stockAdd);
    //this.telegram.on('stockremove', this.stockRemove);
    //this.telegram.on('cancel', this.deferredActionCancel);

    //this.alertAllUsers();
    //this.getStockUpdates();
    //setInterval(main.getStockUpdates, (5*60*1000));

    return false;
  }
}
let test = new Test();
