"use strict";
var NexinationBot = new function() {
  var main = this;
  var https = require('https');
  var fs = require('fs');
  var exec = require('child_process').exec;
  //var Telegram = require('telegram-bot-manager');

  this.telegram = {};
  this.data = {
      "token": ""
      , "users": {
      }
  };
  var fileUnitFiler = new (require('fileunit').Filer)('data');
  this.commandParser = function(result) {
      if(main.data.users[result.message.chat.id] !== undefined) {
          if(result.message.text === '/settings@NexinationBot' || result.message.text === '/settings') {
              let child = exec("ps ax | grep '[n]ode'", function (error, stdout, stderr) {
                  console.log('stdout:' + stdout);

                  main.telegram.apiCall(
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
          main.telegram.apiCall(
              'sendMessage'
              , {
                  "chatId": result.message.chat.id
                  , "encodedMessage": "Stop trying to use the damn commands, they are just there for show!"
              }
          );
      };

      return false;
  };
  this.messageParser = function(result) {

      return false;
  };
  this.runAfterLoad = function(readError, fileData) {
    if(!readError) {
      main.data = JSON.parse(fileData);
      console.log(main.data);
      main.telegram = new (require('telegram-bot-manager').BotManager)({"botToken": main.data.token});

      main.telegram.on('start', main.commandParser);
      main.telegram.on('help', main.commandParser);
      main.telegram.on('settings', main.commandParser);
      main.telegram.on('default', main.messageParser);
    }
    else {
      throw readError;
    };
    return false;
  };
  this.__construct = function() {
    fileUnitFiler.load(main.runAfterLoad);
    //main.dataFileAction('load', main.runAfterLoad);
  };
  this.__construct();
};