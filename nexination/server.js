"use strict";
class NexinationBot {
  constructor() {
    this.lib = {};
    this.lib.exec = require('child_process').exec;
    this.lib.fileUnitFiler = new (require('fileunit').Filer)('data');
    this.lib.telegram = {};
    
    this.data = {
      "token": ""
      , "users": {
      }
    };
    this.lib.fileUnitFiler.load((readError, fileData) => {this.runAfterLoad(readError, fileData);});
  }
  commandParser(result) {
    if(this.data.users[result.message.chat.id] !== undefined) {
      if(result.message.text === '/settings@NexinationBot' || result.message.text === '/settings') {
        let child = this.lib.exec("ps ax | grep '[n]ode'", (error, stdout, stderr) => {
          console.log('stdout:' + stdout);
          
          this.lib.telegram.apiCall(
            'sendMessage'
            , {
              "chatId": result.message.chat.id
              , "encodedMessage": stdout
            }
          );
          if (error !== null) {
            console.log('exec error: ' + error);
          };
        });
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
      this.lib.telegram = new (require('telegram-bot-manager').BotManager)({
        "botToken": this.data.token
        , "type": "webhook"
        , "key": this.data.key
        , "cert": this.data.cert
        , "receiver": {
          "port": 8082
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

let nexinationBot = new NexinationBot();