"use strict";
class TestBuild {
  constructor() {
    this.lib = {};
    this.lib.fileUnitFiler = new (require('fileunit').Filer)('data');
    this.lib.telegram = {};
    
    this.data = {
      "token": ""
      , "cert": ""
      , "key": ""
      , "users": {
      }
    };
    this.lib.fileUnitFiler.load((readError, fileData) => {this.runAfterLoad(readError, fileData);});
  }
  commandParser(result) {
    console.log('!!!!!!!!!!!!!!!!HEY!!!!!!!!!!!!!!!!');
    if(this.data.users[result.message.chat.id] !== undefined) {
      if(result.message.text === '/settings@NexinationBot' || result.message.text === '/settings') {
        this.lib.telegram.apiCall(
          'sendMessage'
          , {
            "chatId": result.message.chat.id
            , "encodedMessage": "test"
          }
        );
      };
    }
    else {
      this.lib.telegram.apiCall(
        'sendMessage'
        , {
          "chatId": result.message.chat.id
          , "encodedMessage": "Stop trying to use the damn commands, they are just there for show!"
        }
      );
    };
    
    return false;
  }
  messageParser(result) {
    
    return false;
  }
  runAfterLoad(readError, fileData) {
    if(!readError) {
      this.data = JSON.parse(fileData);
      console.log(this.data);
      this.lib.telegram = new (require('../../node-telegram-bot-manager/server').BotManager)({
        "botToken": this.data.token
        , "type": "webhook"
        , "key": this.data.key
        , "cert": this.data.cert
        , "receiver": {
          "port": 8080
          , "protocol": "http"
          , "endpoint": this.data.endpoint
        }
      });
      
      this.lib.telegram.on('start', (result) => {this.commandParser(result);});
      this.lib.telegram.on('help', (result) => {this.commandParser(result);});
      this.lib.telegram.on('settings', (result) => {this.commandParser(result);});
      this.lib.telegram.on('default', (result) => {this.messageParser(result);});
    }
    else {
      throw readError;
    };
    return false;
  }
}

let testBuild = new TestBuild();