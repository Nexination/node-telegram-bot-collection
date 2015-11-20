var https = require('https');
var http = require('http');
var fs = require('fs');
var tbl = require('telegram-bot-api');

var ShowTimeBot = new function() {
    var main = this;
    this.telegram = {};
    this.tvmazeApi = {
        "url": "http://api.tvmaze.com"
        , "show": "/shows/{showId}"
        , "episode": "/episodes/{episodeId}"
        , "search": "/search/shows?q={query}"
        , "searchId": "/lookup/shows?tvrage={searchId}&thetvdb={searchId}"
        , "schedule": "/schedule/?country={countryCode}"
    };
    this.data = {
        "token": ""
        , "users": {
            "90385038": {
                "620": {
                    "name": "The Last Man On Earth"
                    , "episodeCount": 111
                }
            }
        }
        , "showStore": {
            "1": {
                "name": "Under the Dome"
                , "status": "Ended"
                , "episodeCount": 313
                , "users": {
                    "90385038": true
                }
            }
        }
    };
    this.temp = {
        "searchStore": {}
        , "notifyStore": {}
        , "episodeUpdateCount": 0
    };
    this.chatCheck = function(chatId) {
        if(!main.data.users.hasOwnProperty(chatId)) {
            main.data.users[chatId] = {};
        };
        
        return main.data.users[chatId];
    };
    this.zeroPad = function(toBePadded, padLength) {
        toBePadded = toBePadded + '';
        for(var i = toBePadded.length; i < padLength; i += 1) {
            toBePadded = '0' + toBePadded;
        };
        return toBePadded;
    };
    this.callApi = function(api, apiData, result, callback) {
        var apiCall = main.tvmazeApi.url + main.tvmazeApi[api].replace(/{(\w+)}/gi, function(match, capture) {
            return apiData[capture];
        });
        http.get(apiCall, function(response) {
            callback(result, response);
        }).on('error', function(e) {
            console.error(e);
        });
        console.log(apiCall);
        
        return false;
    };
    this.start = function(result) {
        var chatSettings = main.chatCheck(result.message.chat.id);
        
        main.telegram.apiCall(
            'sendMessage'
            , {
                "chatId": result.message.chat.id
                , "encodedMessage": "Welcome " + result.message.from.username + " this is your automated show bot!\n"
                    + "It uses the TV Maze API(http://www.tvmaze.com/) and it alerts you to new episodes of shows you have subscribed to.\n"
                    + "It also allows you to manually check for shows you are behind on.\n"
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
                , "encodedMessage": "To use this show alert bot,\n"
                    + "type /showsearch to find a show "
                    + "and then type /showadd to add a show by id.\n\n"
                    + "Command list:\n"
                    + "/start - Greeting message\n"
                    + "/help - Show this help window\n"
                    + "/settings - Show your added shows and other info\n"
                    + "/showadd - Add a show via id to alerts\n"
                    + "/showremove - Remove a show via id from alerts\n"
                    + "/showtick - Tick an episode as viewed via id\n"
                    + "/showmissing - Show the episodes you are behind on\n"
                    + "/showsearch - Search for a show by name or id\n"
                    + "/cancel - Cancels any ongoing action\n\n"
                    + "If you have problems with this product, please visit us on https://github.com/Nexination/node-telegram-bot-collection"
            }
        );
        return false;
    };
    this.settings = function(result) {
        var chatSettings = main.chatCheck(result.message.chat.id);
        
        var settings = '';
        for(var i in chatSettings) {
            settings += i + ': "' + main.data.showStore[i].name + '" E:' + chatSettings[i].episodeCount + ' (' + main.data.showStore[i].status + ')\n'
        };
        
        main.telegram.apiCall(
            'sendMessage'
            , {
                "chatId": result.message.chat.id
                , "encodedMessage": "Your settings: \n"
                    + settings
            }
        );
        return false;
    };
    this.showAdd = function(result) {
        if(result.message.text.substr(0, 1) === '/') {
            main.telegram.deferAction(result.message.chat.id, main.showAdd);
            main.telegram.apiCall(
                'sendMessage'
                , {
                    "chatId": result.message.chat.id
                    , "encodedMessage": "Please input show id(s) you want to subscribe to:"
                }
            );
        }
        else {
            var idList = result.message.text.split('\n');
            result.searchCount = idList.length;
            for(var i = 0; i < idList.length; i += 1) {
                main.callApi('show', {"showId": idList[i]}, result, main.showAddHandler);
            };
        };
        return false;
    };
    this.showAddHandler = function(result, response) {
        var chatSettings = main.chatCheck(result.message.chat.id);
        
        var data = '';
        response.on('data', function(chunk) {
            data += chunk;
        });
        response.on('end', function() {
            var message = '';
            if(response.statusCode === 200 && data) {
                var json = JSON.parse(data);
                var resultFake = {
                    "showId": json.id
                    , "searchCount": result.searchCount
                    , "message": {
                        "chat": {
                            "id": result.message.chat.id
                        }
                    }
                };
                
                if(!main.data.showStore.hasOwnProperty(json.id)) {
                    main.data.showStore[json.id] = {
                        "episodeCount": 0
                        , "users": {}
                    };
                };
                main.data.showStore[json.id].name = json.name;
                main.data.showStore[json.id].status = json.status;
                
                if(json._links.hasOwnProperty('previousepisode')) {
                    var latestEpisodeId = json._links.previousepisode.href.split('/');
                    main.callApi(
                        "episode"
                        , {"episodeId": latestEpisodeId[latestEpisodeId.length - 1]}
                        , resultFake
                        , main.showAddEpisodeHandler
                    );
                };
                
                main.data.showStore[json.id].users[result.message.chat.id] = true;
                if(!chatSettings.hasOwnProperty(json.id)) {
                    chatSettings[json.id] = {
                        "episodeCount": 0
                    };
                };
                
                message = json.name + ' added';
            }
            else {
                message = 'Show not found.';
            };
            
            main.telegram.apiCall(
                'sendMessage'
                , {
                    "chatId": result.message.chat.id
                    , "encodedMessage": message
                }
            );
            console.log(result.message.chat.id + ': ' + message);
        });
        return false;
    };
    this.showAddEpisodeHandler = function(result, response) {
        var chatSettings = main.chatCheck(result.message.chat.id);
        
        var data = '';
        main.temp.episodeUpdateCount += 1;
        response.on('data', function(chunk) {
            data += chunk;
        });
        response.on('end', function() {
            if(response.statusCode === 200 && data) {
                var json = JSON.parse(data);
                main.data.showStore[result.showId].episodeCount = parseInt(json.season + main.zeroPad(json.number, 2));
            };
            if(result.searchCount <= main.temp.episodeUpdateCount) {
                main.dataFileAction('save');
                console.log('saved');
                main.temp.episodeUpdateCount = 0;
            };
            console.log('Episode update: ' + result.showId + '|' + main.data.showStore[result.showId].episodeCount);
        });
        
        return false;
    };
    this.showRemove = function(result) {
        if(result.message.text.substr(0, 1) === '/') {
            main.telegram.deferAction(result.message.chat.id, main.showRemove);
            main.telegram.apiCall(
                'sendMessage'
                , {
                    "chatId": result.message.chat.id
                    , "encodedMessage": "Please input show id(s) you want to unsubscribe from:"
                    
                }
            );
        }
        else {
            var showList = result.message.text.split('\n');
            var chatSettings = main.chatCheck(result.message.chat.id);
            
            for(var i = 0; i < showList.length; i += 1) {
                var showId = showList[i];
                var message = '';
                if(chatSettings.hasOwnProperty(showId)) {
                    var showName = main.data.showStore[showId].name;
                    delete main.data.showStore[showId].users[result.message.chat.id];
                    delete chatSettings[showId];
                    
                    message = showName + ' removed.';
                }
                else {
                    message = showId + ' not found.';
                };
                
                main.telegram.apiCall(
                    'sendMessage'
                    , {
                        "chatId": result.message.chat.id
                        , "encodedMessage": message
                        
                    }
                );
                console.log(result.message.chat.id + ': ' + message);
            };
        };
        main.dataFileAction('save');
        console.log('saved');
        return false;
    };
    this.showTick = function(result) {
        var chatSettings = main.chatCheck(result.message.chat.id);
        
        if(result.message.text.substr(0, 1) === '/') {
            main.telegram.deferAction(result.message.chat.id, main.showTick);
            main.telegram.apiCall(
                'sendMessage'
                , {
                    "chatId": result.message.chat.id
                    , "encodedMessage": "Please input a show id and a space.\n"
                        + "Follow this by one of two options:\n"
                        + "1. Nothing to advance one episode\n"
                        + "2. A season+episode(612) to jump to that specific episode\n"
                }
            );
        }
        else {
            var showData = result.message.text.split(' ');
            var message = 'You are not currently watching this show.';
            
            if(isNaN(showData[0]) || showData.length < 1) {
                message = 'Wrong format.';
            }
            else if(chatSettings.hasOwnProperty(showData[0])) {
                if(showData.length === 1) {
                    chatSettings[showData[0]].episodeCount += 1;
                }
                else {
                    chatSettings[showData[0]].episodeCount = parseInt(showData[1]);
                };
                message = main.data.showStore[showData[0]].name + " updated to " + chatSettings[showData[0]].episodeCount;
            };
            
            main.telegram.apiCall(
                'sendMessage'
                , {
                    "chatId": result.message.chat.id
                    , "encodedMessage": message
                    
                }
            );
            console.log(result.message.chat.id + ': ' + message);
        };
        main.dataFileAction('save');
        console.log('saved');
        return false;
    };
    this.showMissing = function(result) {
        var chatSettings = main.chatCheck(result.message.chat.id);
        var behindOnShows = '';
        
        for(var i in chatSettings) {
            console.log(i + main.data.showStore[i]);
            if(chatSettings[i].episodeCount < main.data.showStore[i].episodeCount) {
                behindOnShows += i + ': ' + '"' + main.data.showStore[i].name + '" E:' + chatSettings[i].episodeCount + '/' + main.data.showStore[i].episodeCount + '\n';
            };
        };
        
        var message = 'Shows you are behind on:\n' + behindOnShows;
        main.telegram.apiCall(
            'sendMessage'
            , {
                "chatId": result.message.chat.id
                , "encodedMessage": message
            }
        );
        console.log(result.message.chat.id + ': ' + message);
        
        return false;
    };
    this.showSearch = function(result) {
        if(result.message.text.substr(0, 1) === '/') {
            main.telegram.deferAction(result.message.chat.id, main.showSearch);
            main.telegram.apiCall(
                'sendMessage'
                , {
                    "chatId": result.message.chat.id
                    , "encodedMessage": "Please input part of a show name or id(s) from TvRage or TheTvDB:"
                }
            );
        }
        else {
            var text = result.message.text;
            var idList = text.split('\n');
            if(isNaN(idList[0])) {
                main.callApi('search', {"query": text}, result, main.showSearchHandler);
            }
            else {
                result.searchCount = idList.length;
                for(var i = 0; i < idList.length; i += 1) {
                    main.callApi('searchId', {"searchId": idList[i]}, result, main.showSearchHandler);
                };
            };
        };
        return false;
    };
    this.showSearchHandler = function(result, response) {
        var data = '';
        response.on('data', function(chunk) {
            data += chunk;
        });
        response.on('end', function() {
            var message = 'Shows matching your search:\n';
            if(data) {
                var json = JSON.parse(data);
                for(var i = 0; i < json.length; i += 1) {
                    var year = json[i].show.premiered;
                    message += json[i].show.id + ': "' + json[i].show.name + '" (' + (year ? year.substr(0, 4) : 'N/A') + ')\n';
                };
            }
            else if(response.statusCode === 301) {
                var newUrl = response.headers.location.split('/');
                if(!main.temp.searchStore.hasOwnProperty(result.message.chat.id)) {
                    main.temp.searchStore[result.message.chat.id] = [];
                };
                main.temp.searchStore[result.message.chat.id].push(newUrl[newUrl.length - 1]);
                if(main.temp.searchStore[result.message.chat.id].length === result.searchCount) {
                    message = 'New show id(s):\n';
                    for(var i = 0; i < main.temp.searchStore[result.message.chat.id].length; i += 1) {
                        message += main.temp.searchStore[result.message.chat.id][i] + '\n';
                    };
                    main.temp.searchStore[result.message.chat.id] = [];
                    console.log('SearchUpdate');
                    console.log(main.temp.searchStore);
                };
            }
            else if(response.statusCode === 404) {
                message = 'Show did not exist in TvRage or TheTvDB.';
            };
            
            main.telegram.apiCall(
                'sendMessage'
                , {
                    "chatId": result.message.chat.id
                    , "encodedMessage": message
                }
            );
            console.log(result.message.chat.id + ': ' + message);
        });
        return false;
    };
    this.getShowUpdates = function() {
        var countries = [
            "US"
            , "GB"
        ];
        var now = new Date();
        
        if(now.getHours() === 23) {
            for(var i = 0; i < countries.length; i += 1) {
                main.callApi('schedule', {"countryCode": countries[i]}, {"country": countries[i]}, main.getShowUpdatesHandler);
            };
        };
        return false;
    };
    this.getShowUpdatesHandler = function(result, response) {
        var data = '';
        response.on('data', function(chunk) {
            data += chunk;
        });
        response.on('end', function() {
            var json = JSON.parse(data);
            for(var i = 0; i < json.length; i += 1) {
                var showId = json[i].show.id;
                if(main.data.showStore.hasOwnProperty(showId)) {
                    var showUsers = main.data.showStore[showId].users;
                    main.data.showStore[showId].episodeCount = parseInt(json[i].season + main.zeroPad(json[i].number, 2));
                    main.data.showStore[showId].status = json[i].show.status;
                    for(var j in showUsers) {
                        if(!main.temp.notifyStore.hasOwnProperty(j)) {
                            main.temp.notifyStore[j] = '';
                        };
                        
                        var chatSettings = main.chatCheck(j);
                        
                        main.temp.notifyStore[j] += json[i].show.id + ': "' +json[i].show.name + '" E:' + parseInt(json[i].season + main.zeroPad(json[i].number, 2)) + '\n';
                    };
                };
            };
            for(var i in main.temp.notifyStore) {
                main.telegram.apiCall(
                    'sendMessage'
                    , {
                        "chatId": i
                        , "encodedMessage": "New episodes from " + result.country + ":\n" + main.temp.notifyStore[i]
                    }
                );
                delete main.temp.notifyStore[i];
            };
            console.log('ShowUpdate');
            console.log(main.temp.notifyStore);
        });
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
    this.dataFileAction = function(action, runAfter) {
        var dataFile = 'showdata';
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
        main.telegram.on('showadd', main.showAdd);
        main.telegram.on('showremove', main.showRemove);
        main.telegram.on('showtick', main.showTick);
        main.telegram.on('showmissing', main.showMissing);
        main.telegram.on('showsearch', main.showSearch);
        main.telegram.on('cancel', main.deferredActionCancel);
        
        main.alertAllUsers();
        main.getShowUpdates();
        setInterval(main.getShowUpdates, (60*60*1000));
        
        return false;
    };
    this.__construct = function() {
        main.dataFileAction('load', main.runAfterLoad);
    };
    this.__construct();
};