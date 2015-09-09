var NexinationBot = new function() {
    var main = this;
    var https = require('https');
    var WebSocket = require('ws');
    var fs = require('fs');
    var tbl = require('../node-telegram-bot-api/TelegramBotLib');
    var JsonRpc = require('../../node-modular-chat/chat/js/JsonRpc.js').JsonRpc;
    var groupId = -36309139;
    
    this.telegram = {};
    this.token = '98337351:AAFnE29zdpKTvjARUy49eZqpUNo67VOY66M';
    this.socket = {};
    this.settings = {
        "port": 8080
        , "host": "localhost"
    };
    this.data = {
        "users": {
        }
    };
    
    this.connectSocket = function() {
        var uri = 'ws://' + main.settings.host + ':' + main.settings.port + '/nexus/socket';
        main.socket = new WebSocket(uri);
        main.socket.onerror = function(eventObject) {NexinationBot.onSystemMessage(eventObject);};
        main.socket.onclose = function(eventObject) {NexinationBot.onSystemMessage(eventObject);};
        main.socket.onmessage = function(eventObject) {NexinationBot.onMessage(eventObject);};
        main.socket.onopen = function(eventObject) {NexinationBot.onSystemMessage(eventObject);};
        
        return false;
    };
    this.onMessage = function(eventObject) {
        var jsonRpc = main.JsonRpc.parse(eventObject.data);
        console.log(jsonRpc);
        if(jsonRpc.hasOwnProperty('method')) {
            // JSON RPC automatic callback.
            if(jsonRpc.method === 'postMessage' || jsonRpc.method === 'nudge' || jsonRpc.method === 'setPeerCount') {
                main.replyToChat(jsonRpc);
            };
        }
        else if(jsonRpc.hasOwnProperty('result')) {
            //  Add result logic.
        }
        else if(jsonRpc.hasOwnProperty('error')) {
            //  Add error logic.
        };
        
        return false;
    };
    this.onSystemMessage = function(eventObject) {
        console.log('System: ' + eventObject.type);
        
        return false;
    };
    this.register = function(result) {
        var chatId = main.chatCheck(result.message.chat.id);
        
        main.dataFileAction('save');
        
        main.telegram.apiCall(
            'sendMessage'
            , {
                "chatId": result.message.chat.id
                , "encodedMessage": "Stop trying to use the damn commands, they are just there for show!"
            }
        );
        
        return false;
    };
    this.chatCheck = function(chatId) {
        if(!main.data.users.hasOwnProperty(chatId)) {
            main.data.users[chatId] = {};
        };
        
        return main.data.users[chatId];
    };
    this.messageSend = function(result) {
        var jsonRpc = main.JsonRpc.getRequest();
        jsonRpc.method = 'postMessage';
        jsonRpc.params = {
            "name": result.message.from.username
            , "message": result.message.text
        };
        if(result.message.chat.id === groupId) {
            main.socket.send(JSON.stringify(jsonRpc));
        };
        
        return false;
    };
    this.replyToChat = function(jsonRpc) {
        var encodedMessage = '';
        if(jsonRpc.method === 'postMessage') {
            encodedMessage = jsonRpc.params.name + ": " + jsonRpc.params.message;
        }
        else if(jsonRpc.method === 'setPeerCount') {
            encodedMessage = 'Users: ' + jsonRpc.params.peerCount;
        }
        else if(jsonRpc.method === 'nudge') {
            encodedMessage = '👍';
        };
        main.telegram.apiCall(
            'sendMessage'
            , {
                // Group id of the only group allowed to receive replies
                "chatId":groupId
                , "encodedMessage": encodedMessage
            }
        );
        return false;
    };
    this.dataFileAction = function(action) {
        var dataFile = 'chatdata';
        if(action === 'load') {
            fs.readFile(
                dataFile
                , function(error, data) {
                    if(!error) {
                        main.data = JSON.parse(data);
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
                    };
                }
            );
        }
        return false;
    };
    this.__construct = function() {
        main.telegram = new tbl.TelegramBotLib({"botToken": main.token});
        
        main.JsonRpc = new JsonRpc();
        
        main.dataFileAction('load');
        
        main.telegram.on('start', main.register);
        main.telegram.on('help', main.register);
        main.telegram.on('settings', main.register);
        main.telegram.on('default', main.messageSend);
        
        main.connectSocket();
    };
    this.__construct();
};
