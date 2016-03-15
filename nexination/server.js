var NexinationBot = new function() {
    var main = this;
    var https = require('https');
    var fs = require('fs');
    var exec = require('child_process').exec;
    var tbl = require('nexi-telegram-bot-api');
    
    this.telegram = {};
    this.data = {
        "token": ""
        , "users": {
        }
    };
    
    this.commandParser = function(result) {
        if(main.data.users[result.message.chat.id] !== undefined) {
            if(result.message.text === '/settings@NexinationBot' || result.message.text === '/settings') {
                child = exec("ps ax | grep '[n]ode'", function (error, stdout, stderr) {
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
    this.dataFileAction = function(action, runAfter) {
        var dataFile = 'data';
        if(action === 'load') {
            fs.readFile(
                dataFile
                , function(error, data) {
                    if(!error) {
                        main.data = JSON.parse(data);
                        if(typeof runAfter === 'function') {
                            runAfter();
                        };
                    };
                }
            );
        }
        else if(action === 'save') {
            fs.writeFile(
                dataFile
                , JSON.stringify(main.data)
                , function(error, data) {
                    if(error) {
                        console.log(error);
                    }
                    else if(typeof runAfter === 'function') {
                        runAfter();
                    };
                }
            );
        }
        return false;
    };
    this.runAfterLoad = function() {
        console.log(tbl);
        main.telegram = new tbl.TelegramBotLib({"botToken": main.data.token});
        
        main.telegram.on('start', main.commandParser);
        main.telegram.on('help', main.commandParser);
        main.telegram.on('settings', main.commandParser);
        main.telegram.on('default', main.messageParser);
        
        return false;
    };
    this.__construct = function() {
        main.dataFileAction('load', main.runAfterLoad);
    };
    this.__construct();
};
