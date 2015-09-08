var https = require('https');
var fs = require('fs');
var tbl = require('../node-telegram-bot-api/TelegramBotLib');

var StockAlertBot = new function() {
    var main = this;
    this.telegram = {};
    this.data = {
        "users": {}
        , "stockStore": {}
    };
    this.token = "122535815:AAEQvenU04SEAzY4MRarhC8jlmeazP8Q2LU";
    this.chatCheck = function(chatId) {
        if(!main.data.users.hasOwnProperty(chatId)) {
            main.data.users[chatId] = {};
        };
        
        return main.data.users[chatId];
    };
    this.start = function(result) {
        // Very important to use/edit chat settings
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
        // Very important to use/edit chat settings
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
                    + "/cancel - Cancels any ongoing action\n"
            }
        );
        return false;
    };
    this.settings = function(result) {
        // Very important to use/edit chat settings
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
        // Very important to use/edit chat settings
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
            var stock = result.message.text.toUpperCase();
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
        };
        
        return false;
    };
    this.stockRemove = function(result) {
        // Very important to use/edit chat settings
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
        var callUrl = 'https://query.yahooapis.com/v1/public/yql?q=select%20Symbol,%20PercentChange%20from%20yahoo.finance.quotes%20where%20symbol%20in%20(%22YHOO%22${target})&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys';
        var stocksToBeCounted = '';
        
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
            console.log(data);
            var jsonData = JSON.parse(data);
            
            for(var i = 0; i < jsonData.query.results.quote.length; i += 1) {
                var quote = jsonData.query.results.quote[i];
                if(quote.Symbol !== 'YHOO') {
                    if(quote.PercentChange !== null) {
                        var currentQuote = Math.floor(parseFloat(quote.PercentChange.substr(0, quote.PercentChange.length-1)) * 10) / 10;
                        if(main.data.stockStore[quote.Symbol] !== currentQuote) {
                            console.log(quote.Symbol + ' ' + currentQuote);
                            main.data.stockStore[quote.Symbol] = currentQuote;
                            main.alarmUsers(quote.Symbol);
                            main.dataFileAction('save');
                        };
                    };
                };
            };
        });
        return false;
    };
    this.alarmUsers = function(stockId) {
        //var now = new Date();
        //var utcHours = now.getUTCHours();
        //if(utcHours < 20 && utcHours > 10) {
        for(chatId in main.data.users) {
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
        //};
        return false;
    };
    this.dataFileAction = function(action) {
        var dataFile = 'stockdata';
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
        
        main.dataFileAction('load');
        
        main.telegram.on('start', main.start);
        main.telegram.on('help', main.help);
        main.telegram.on('settings', main.settings);
        main.telegram.on('stockadd', main.stockAdd);
        main.telegram.on('stockremove', main.stockRemove);
        main.telegram.on('cancel', main.deferredActionCancel);
        
        main.getStockUpdates();
        setInterval(main.getStockUpdates, (5*60*1000));
    };
    this.__construct();
};
