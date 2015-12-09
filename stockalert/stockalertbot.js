"use strict";
var https = require('https');
var fs = require('fs');
var tbl = require('telegram-bot-api');

var StockAlertBot = new function() {
    var main = this;
    this.telegram = {};
    this.data = {
        "token": ""
        , "users": {
            "1880667": {
                    "stocks":[
                        "GOLD"
                    ]
                }
            }
        , "stockStore": {
            "GOLD": 0.3
        }
    };
    this.chatCheck = function(chatId) {
        if(!main.data.users.hasOwnProperty(chatId)) {
            main.data.users[chatId] = {};
        };
        
        return main.data.users[chatId];
    };
    this.start = function(result) {
        var chatSettings = main.chatCheck(result.message.chat.id);
        
        main.telegram.apiCall(
            'sendMessage'
            , {
                "chatId": result.message.chat.id
                , "encodedMessage": "Welcome " + result.message.from.username + " this is your automated stock bot!\n"
                    + "It uses yahoo finance and it alerts you on a 0.1% change in the stock, be it up or down.\n"
                    + "Please check /help before you try to use the bot."
            }
        );
        return false;
    };
    this.help = function(result) {
        var chatSettings = main.chatCheck(result.message.chat.id);
        
        main.telegram.apiCall(
            'sendMessage'
            , {
                "chatId": result.message.chat.id
                , "encodedMessage": "This bot uses yahoo finance.\n"
                    + "To use this stock alert bot,\n"
                    + "find stock id's on yahoo like so: http://finance.yahoo.com/q?s=eurusd=x\n"
                    + "The stock id is the name in the brackets,\n"
                    + "or part of the url like \"(EURUSD=X)\".\n\n"
                    + "Command list:\n"
                    + "/start - Greeting message\n"
                    + "/help - Show this help window\n"
                    + "/settings - Show your added stocks and other info\n"
                    + "/stockadd - Add a stock to alerts\n"
                    + "/stockremove - Remove a stock from alerts\n"
                    + "/cancel - Cancels any ongoing action\n\n"
                    + "If you have problems with this product, please visit us on https://github.com/Nexination/node-telegram-bot-collection"
            }
        );
        return false;
    };
    this.settings = function(result) {
        var chatSettings = main.chatCheck(result.message.chat.id);
        
        var textSettings = '';
        for(var i in chatSettings) {
            textSettings += '- ' + i + '\n' + JSON.stringify(chatSettings[i]);
        };
        
        main.telegram.apiCall(
            'sendMessage'
            , {
                "chatId": result.message.chat.id
                , "encodedMessage": "Your settings: \n"
                    + (textSettings !== '' ? textSettings : 'none')
            }
        );
        return false;
    };
    this.stockAdd = function(result) {
        var chatSettings = main.chatCheck(result.message.chat.id);
        
        if(result.message.text.substr(0, 1) === '/') {
            main.telegram.deferAction(result.message.chat.id, main.stockAdd);
            main.telegram.apiCall(
                'sendMessage'
                , {
                    "chatId": result.message.chat.id
                    , "encodedMessage": "Please input the stock id you wish to add:"
                }
            );
        }
        else {
            let stock = result.message.text.toUpperCase();
            if(/^[a-zA-Z0-9\.\=]+$/gi.test(stock)) {
                if(!chatSettings.hasOwnProperty('stocks')) {
                    chatSettings.stocks = [];
                };
                chatSettings.stocks.push(stock);
                if(!main.data.stockStore.hasOwnProperty(stock)) {
                    main.data.stockStore[stock] = 0;
                };
                main.telegram.apiCall(
                    'sendMessage'
                    , {
                        "chatId": result.message.chat.id
                        , "encodedMessage": "Stock " + stock + " confirmed."
                    }
                );
                main.dataFileAction('save');
            }
            else {
                main.telegram.apiCall(
                    'sendMessage'
                    , {
                        "chatId": result.message.chat.id
                        , "encodedMessage": "Wrong stock format!"
                    }
                );
            };
        };
        
        return false;
    };
    this.stockRemove = function(result) {
        var chatSettings = main.chatCheck(result.message.chat.id);
        
        if(result.message.text.substr(0, 1) === '/') {
            main.telegram.deferAction(result.message.chat.id, main.stockRemove);
            main.telegram.apiCall(
                'sendMessage'
                , {
                    "chatId": result.message.chat.id
                    , "encodedMessage": "Please input the stock id you wish to remove:"
                }
            );
        }
        else {
            if(chatSettings.hasOwnProperty('stocks')) {
                var stockPlace = chatSettings.stocks.indexOf(result.message.text.toUpperCase());
                if(stockPlace !== -1) {
                    var removedItem = chatSettings.stocks.splice(stockPlace, 1);
                    main.telegram.apiCall(
                        'sendMessage'
                        , {
                            "chatId": result.message.chat.id
                            , "encodedMessage": "Stock " + JSON.stringify(removedItem) + " removed."
                        }
                    );
                    main.dataFileAction('save');
                }
                else {
                    main.telegram.apiCall(
                        'sendMessage'
                        , {
                            "chatId": result.message.chat.id
                            , "encodedMessage": "Stock " + result.message.text + " not found."
                        }
                    );
                };
            };
        };
        
        return false;
    };
    this.deferredActionCancel = function(result) {
        main.telegram.deferActionRemove(result.message.chat.id);
        main.telegram.apiCall(
            'sendMessage'
            , {
                "chatId": result.message.chat.id
                , "encodedMessage": "Action cancelled."
            }
        );
        return false;
    };
    this.getStockUpdates = function() {
        let now = new Date();
        console.log('---UPDATING STOCKS---' + now.toISOString());
        var callUrl = 'https://query.yahooapis.com/v1/public/yql?q=select%20Symbol,%20PercentChange%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(%22YHOO%22${target})&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
        var stocksToBeCounted = '';
        
        main.cleanUpUsers();
        
        for(var stock in main.data.stockStore) {
            stocksToBeCounted += ',%22' + stock + '%22';
        };
        callUrl = callUrl.replace('${target}', stocksToBeCounted);
        
        https.get(callUrl, main.stockDataHandler).on('error', function(e) {
            console.error(e);
        });
        
        return false;
    };
    this.stockDataHandler = function(resource) {
        var data = '';
        resource.on('data', function(chunk) {
            data += chunk;
        });
        resource.on('end', function() {
            var jsonData = {};
            try {
                jsonData = JSON.parse(data);
            } catch(error) {
                console.log(error);
            };
            if(jsonData.hasOwnProperty('query')) {
                if(jsonData.query.hasOwnProperty('results')) {
                    for(var i = 0; i < jsonData.query.results.quote.length; i += 1) {
                        var quote = jsonData.query.results.quote[i];
                        console.log(quote.PercentChange);
                        if(quote.Symbol !== 'YHOO') {
                            if(quote.PercentChange !== null) {
                                var currentQuote = Math.floor(parseFloat(quote.PercentChange.substr(0, quote.PercentChange.length-1)) * 10) / 10;
                                if(main.data.stockStore[quote.Symbol] !== currentQuote) {
                                    console.log(quote.Symbol + ' ' + currentQuote);
                                    main.data.stockStore[quote.Symbol] = currentQuote;
                                    main.alarmUsers(quote.Symbol);
                                };
                            }
                            else {
                                console.log('Deleted ' + quote.Symbol);
                                delete main.data.stockStore[quote.Symbol];
                            };
                        };
                    };
                    main.dataFileAction('save');
                };
            };
        });
        return false;
    };
    this.alarmUsers = function(stockId) {
        for(let chatId in main.data.users) {
            if(main.data.users[chatId].hasOwnProperty('stocks')) {
                if(main.data.users[chatId].stocks.indexOf(stockId) !== -1) {
                    main.telegram.apiCall(
                        'sendMessage'
                        , {
                            "chatId": chatId
                            , "encodedMessage": "!ALERT! " + stockId + " has changed to " + main.data.stockStore[stockId]
                        }
                    );
                };
            };
        };
        return false;
    };
    this.cleanUpUsers = function() {
        for(let chatId in main.data.users) {
            let deleteUser = false;
            if(main.data.users[chatId].hasOwnProperty('stocks')) {
                let stocks = main.data.users[chatId].stocks;
                if(stocks.length === 0) {
                    deleteUser = true;
                }
                else {
                    for(let i = 0; i < stocks.length; i += 1) {
                        if(main.data.stockStore[stocks[i]] === undefined) {
                            stocks.splice(i, 1);
                        };
                    };
                };
            }
            else {
                deleteUser = true;
            };
            
            if(deleteUser) {
                console.log('Deleting user ' + chatId);
                delete main.data.users[chatId];
            };
        };
        main.dataFileAction('save');
        return false;
    };
    this.dataFileAction = function(action, runAfter) {
        var dataFile = 'stockdata';
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
    this.alertAllUsers = function() {
        var updateFileName = 'update';
        if(fs.existsSync(updateFileName)) {
            fs.readFile(
                'update'
                , function(error, data) {
                    if(!error) {
                        var update = JSON.parse(data);
                        if(update.hasOwnProperty('news')) {
                            for(var i in main.data.users) {
                                main.telegram.apiCall(
                                    'sendMessage'
                                    , {
                                        "chatId": i
                                        , "encodedMessage": update.news
                                    }
                                );
                            };
                        };
                    };
                }
            );
        };
        return false;
    };
    this.runAfterLoad = function() {
        main.telegram = new tbl.TelegramBotLib({"botToken": main.data.token});
        
        main.telegram.on('start', main.start);
        main.telegram.on('help', main.help);
        main.telegram.on('settings', main.settings);
        main.telegram.on('stockadd', main.stockAdd);
        main.telegram.on('stockremove', main.stockRemove);
        main.telegram.on('cancel', main.deferredActionCancel);
        
        main.alertAllUsers();
        main.getStockUpdates();
        setInterval(main.getStockUpdates, (5*60*1000));
        
        return false;
    };
    this.__construct = function() {
        main.dataFileAction('load', main.runAfterLoad);
    };
    this.__construct();
};
