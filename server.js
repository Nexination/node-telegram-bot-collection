"use strict";
class ShowTimeBot {
  constructor() {
    this.lib = {};
    this.lib.http = require('http');
    this.lib.fs = require('fs');
    this.lib.fileUnitFiler = new (require('fileunit').Filer)('data');
    this.lib.telegram = {};
    
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
        "31433485": {
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
            "31433485": true
          }
        }
      }
    };
    this.temp = {
      "searchStore": {}
      , "notifyStore": {}
      , "episodeUpdateCount": 0
    };
    this.lib.fileUnitFiler.load((readError, fileData) => {this.runAfterLoad(readError, fileData);});
  }
  chatCheck(chatId) {
    let chat = null;
    if(this.data.authorized.hasOwnProperty(chatId)) {
      if(!this.data.users.hasOwnProperty(chatId)) {
        this.data.users[chatId] = {};
      };
      chat = this.data.users[chatId];
    };
    
    return chat;
  }
  zeroPad(toBePadded, padLength) {
    toBePadded = toBePadded + '';
    for(let i = toBePadded.length; i < padLength; i += 1) {
      toBePadded = '0' + toBePadded;
    };
    return toBePadded;
  }
  callApi(api, apiData, result, callback) {
    let apiCall = this.tvmazeApi.url + this.tvmazeApi[api].replace(/{(\w+)}/gi, (match, capture) => {
      return apiData[capture];
    });
    this.lib.http.get(apiCall, (response) => {
      callback(result, response);
    }).on('error', function(e) {
      console.error(e);
    });
    console.log(apiCall);
    
    return false;
  }
  start(result) {
    let chatSettings = this.chatCheck(result.message.chat.id);
    if(chatSettings !== null) {
      this.lib.telegram.apiCall(
        'sendMessage'
        , {
          "chatId": result.message.chat.id
          , "encodedMessage": "Welcome " + result.message.from.username + " this is your automated show bot!\n"
          + "It uses the TV Maze API(http://www.tvmaze.com/) and it alerts you to new episodes of shows you have subscribed to.\n"
          + "It also allows you to manually check for shows you are behind on.\n"
          + "Please check /help before you try to use the bot."
        }
      );
    };
    return false;
  }
  help(result) {
    let chatSettings = this.chatCheck(result.message.chat.id);
    if(chatSettings !== null) {
      this.lib.telegram.apiCall(
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
    };
    return false;
  }
  settings(result) {
    let chatSettings = this.chatCheck(result.message.chat.id);
    if(chatSettings !== null) {
      let settings = '';
      for(let i in chatSettings) {
        settings += i + ': "' + this.data.showStore[i].name + '" E:' + chatSettings[i].episodeCount + ' (' + this.data.showStore[i].status + ')\n'
      };
      
      this.lib.telegram.apiCall(
        'sendMessage'
        , {
          "chatId": result.message.chat.id
          , "encodedMessage": "Your settings: \n"
          + settings
        }
      );
    };
    return false;
  }
  showAdd(result) {
    let chatSettings = this.chatCheck(result.message.chat.id);
    if(chatSettings !== null) {
      if(result.message.text.substr(0, 1) === '/') {
        this.lib.telegram.deferAction(result.message.chat.id, (result) => {this.showAdd(result);});
        this.lib.telegram.apiCall(
          'sendMessage'
          , {
            "chatId": result.message.chat.id
            , "encodedMessage": "Please input show id(s) you want to subscribe to:"
          }
        );
      }
      else {
        let idList = result.message.text.split('\n');
        result.searchCount = idList.length;
        for(let i = 0; i < idList.length; i += 1) {
          this.callApi('show', {"showId": idList[i]}, result, (result, response) => {this.showAddHandler(result, response);});
        };
      };
    };
    return false;
  }
  showAddHandler(result, response) {
    let chatSettings = this.chatCheck(result.message.chat.id);
    
    let data = '';
    response.on('data', (chunk) => {
      data += chunk;
    });
    response.on('end', () => {
      let message = '';
      if(response.statusCode === 200 && data) {
        let json = JSON.parse(data);
        let resultFake = {
          "showId": json.id
          , "searchCount": result.searchCount
          , "message": {
            "chat": {
              "id": result.message.chat.id
            }
          }
        };
        
        if(!this.data.showStore.hasOwnProperty(json.id)) {
          this.data.showStore[json.id] = {
            "episodeCount": 0
            , "users": {}
          };
        };
        this.data.showStore[json.id].name = json.name;
        this.data.showStore[json.id].status = json.status;
        
        if(json._links.hasOwnProperty('previousepisode')) {
          let latestEpisodeId = json._links.previousepisode.href.split('/');
          this.callApi(
            "episode"
            , {"episodeId": latestEpisodeId[latestEpisodeId.length - 1]}
            , resultFake
            , (result, repsonse) => {this.showAddEpisodeHandler(result, response);}
          );
        };
        
        this.data.showStore[json.id].users[result.message.chat.id] = true;
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
      
      this.lib.telegram.apiCall(
        'sendMessage'
        , {
          "chatId": result.message.chat.id
          , "encodedMessage": message
        }
      );
      console.log(result.message.chat.id + ': ' + message);
    });
    return false;
  }
  showAddEpisodeHandler(result, response) {
    let chatSettings = this.chatCheck(result.message.chat.id);
    
    let data = '';
    this.temp.episodeUpdateCount += 1;
    response.on('data', (chunk) => {
      data += chunk;
    });
    response.on('end', () => {
      if(response.statusCode === 200 && data) {
        let json = JSON.parse(data);
        this.data.showStore[result.showId].episodeCount = parseInt(json.season + this.zeroPad(json.number, 2));
      };
      if(result.searchCount <= this.temp.episodeUpdateCount) {
        this.lib.fileUnitFiler.save(JSON.stringify(this.data));
        console.log('saved');
        this.temp.episodeUpdateCount = 0;
      };
      console.log('Episode update: ' + result.showId + '|' + this.data.showStore[result.showId].episodeCount);
    });
    
    return false;
  }
  showRemove(result) {
    let chatSettings = this.chatCheck(result.message.chat.id);
    if(chatSettings !== null) {
      if(result.message.text.substr(0, 1) === '/') {
        this.lib.telegram.deferAction(result.message.chat.id, (result) => {this.showRemove(result);});
        this.lib.telegram.apiCall(
          'sendMessage'
          , {
            "chatId": result.message.chat.id
            , "encodedMessage": "Please input show id(s) you want to unsubscribe from:"
            
          }
        );
      }
      else {
        let showList = result.message.text.split('\n');
        let chatSettings = this.chatCheck(result.message.chat.id);
        
        for(let i = 0; i < showList.length; i += 1) {
          let showId = showList[i];
          let message = '';
          if(chatSettings.hasOwnProperty(showId)) {
            let showName = this.data.showStore[showId].name;
            delete this.data.showStore[showId].users[result.message.chat.id];
            delete chatSettings[showId];
            
            message = showName + ' removed.';
          }
          else {
            message = showId + ' not found.';
          };
          
          this.lib.telegram.apiCall(
            'sendMessage'
            , {
              "chatId": result.message.chat.id
              , "encodedMessage": message
              
            }
          );
          console.log(result.message.chat.id + ': ' + message);
        };
      };
      this.lib.fileUnitFiler.save(JSON.stringify(this.data));
      console.log('saved');
    };
    return false;
  }
  showTick(result) {
    let chatSettings = this.chatCheck(result.message.chat.id);
    if(chatSettings !== null) {
      if(result.message.text.substr(0, 1) === '/') {
        this.lib.telegram.deferAction(result.message.chat.id, (result) => {this.showTick(result);});
        this.lib.telegram.apiCall(
          'sendMessage'
          , {
            "chatId": result.message.chat.id
            , "encodedMessage": "Please input a show id to advance one episode\n"
            + "or a show id followed season+episode(612) to go to that specific episode.\n"
          }
        );
      }
      else {
        let showData = result.message.text.split(' ');
        let message = 'You are not currently watching this show.';
        
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
          message = this.data.showStore[showData[0]].name + " updated to " + chatSettings[showData[0]].episodeCount;
        };
        
        this.lib.telegram.apiCall(
          'sendMessage'
          , {
            "chatId": result.message.chat.id
            , "encodedMessage": message
            
          }
        );
        console.log(result.message.chat.id + ': ' + message);
      };
      this.lib.fileUnitFiler.save(JSON.stringify(this.data));
      console.log('saved');
    };
    return false;
  }
  showMissing(result) {
    let chatSettings = this.chatCheck(result.message.chat.id);
    if(chatSettings !== null) {
      let behindOnShows = '';
      
      for(let i in chatSettings) {
        console.log(i + this.data.showStore[i]);
        if(chatSettings[i].episodeCount < this.data.showStore[i].episodeCount) {
          behindOnShows += i + ': ' + '"' + this.data.showStore[i].name + '" E:' + chatSettings[i].episodeCount + '/' + this.data.showStore[i].episodeCount + '\n';
        };
      };
      
      let message = 'Shows you are behind on:\n' + behindOnShows;
      this.lib.telegram.apiCall(
        'sendMessage'
        , {
          "chatId": result.message.chat.id
          , "encodedMessage": message
        }
      );
      console.log(result.message.chat.id + ': ' + message);
    };
    return false;
  }
  showSearch(result) {
    let chatSettings = this.chatCheck(result.message.chat.id);
    if(chatSettings !== null) {
      if(result.message.text.substr(0, 1) === '/') {
        this.lib.telegram.deferAction(result.message.chat.id, (result) => {this.showSearch(result);});
        this.lib.telegram.apiCall(
          'sendMessage'
          , {
            "chatId": result.message.chat.id
            , "encodedMessage": "Please input part of a show name or id(s) from TvRage or TheTvDB:"
          }
        );
      }
      else {
        let text = result.message.text;
        let idList = text.split('\n');
        if(isNaN(idList[0])) {
          this.callApi('search', {"query": text}, result, (result, response) => {this.showSearchHandler(result, response);});
        }
        else {
          result.searchCount = idList.length;
          for(let i = 0; i < idList.length; i += 1) {
            this.callApi('searchId', {"searchId": idList[i]}, result, (result, response) => {this.showSearchHandler(result, response);});
          };
        };
      };
    };
    return false;
  }
  showSearchHandler(result, response) {
    let data = '';
    response.on('data', (chunk) => {
      data += chunk;
    });
    response.on('end', () => {
      let message = 'Shows matching your search:\n';
      if(data) {
        let json = JSON.parse(data);
        for(let i = 0; i < json.length; i += 1) {
          let year = json[i].show.premiered;
          message += json[i].show.id + ': "' + json[i].show.name + '" (' + (year ? year.substr(0, 4) : 'N/A') + ')\n';
        };
      }
      else if(response.statusCode === 301) {
        let newUrl = response.headers.location.split('/');
        if(!this.temp.searchStore.hasOwnProperty(result.message.chat.id)) {
          this.temp.searchStore[result.message.chat.id] = [];
        };
        this.temp.searchStore[result.message.chat.id].push(newUrl[newUrl.length - 1]);
        if(this.temp.searchStore[result.message.chat.id].length === result.searchCount) {
          message = 'New show id(s):\n';
          for(let i = 0; i < this.temp.searchStore[result.message.chat.id].length; i += 1) {
            message += this.temp.searchStore[result.message.chat.id][i] + '\n';
          };
          this.temp.searchStore[result.message.chat.id] = [];
          console.log('SearchUpdate');
          console.log(this.temp.searchStore);
        };
      }
      else if(response.statusCode === 404) {
        message = 'Show did not exist in TvRage or TheTvDB.';
      };
      
      this.lib.telegram.apiCall(
        'sendMessage'
        , {
          "chatId": result.message.chat.id
          , "encodedMessage": message
        }
      );
      console.log(result.message.chat.id + ': ' + message);
    });
    return false;
  }
  getShowUpdates() {
    let countries = [
      "US"
      , "GB"
    ];
    let now = new Date();
    
    if(now.getHours() === 23) {
      for(let i = 0; i < countries.length; i += 1) {
        this.callApi('schedule', {"countryCode": countries[i]}, {"country": countries[i]}, (result, response) => {this.getShowUpdatesHandler(result, response);});
      };
    };
    return false;
  }
  getShowUpdatesHandler(result, response) {
    let data = '';
    response.on('data', (chunk) => {
      data += chunk;
    });
    response.on('end', () => {
      let json = JSON.parse(data);
      for(let i = 0; i < json.length; i += 1) {
        let showId = json[i].show.id;
        if(this.data.showStore.hasOwnProperty(showId)) {
          let showUsers = this.data.showStore[showId].users;
          this.data.showStore[showId].episodeCount = parseInt(json[i].season + this.zeroPad(json[i].number, 2));
          this.data.showStore[showId].status = json[i].show.status;
          for(let j in showUsers) {
            if(!this.temp.notifyStore.hasOwnProperty(j)) {
              this.temp.notifyStore[j] = '';
            };
            
            let chatSettings = this.chatCheck(j);
            
            this.temp.notifyStore[j] += json[i].show.id + ': "' +json[i].show.name + '" E:' + parseInt(json[i].season + this.zeroPad(json[i].number, 2)) + '\n';
          };
        };
      };
      for(let i in this.temp.notifyStore) {
        this.lib.telegram.apiCall(
          'sendMessage'
          , {
            "chatId": i
            , "encodedMessage": "New episodes from " + result.country + ":\n" + this.temp.notifyStore[i]
          }
        );
        delete this.temp.notifyStore[i];
      };
      console.log('ShowUpdate');
      console.log(this.temp.notifyStore);
    });
    return false;
  }
  deferredActionCancel(result) {
    this.lib.telegram.deferActionRemove(result.message.chat.id);
    this.lib.telegram.apiCall(
      'sendMessage'
      , {
        "chatId": result.message.chat.id
        , "encodedMessage": "Action cancelled."
      }
    );
    return false;
  }
  alertAllUsers() {
    let updateFileName = 'update';
    if(this.lib.fs.existsSync(updateFileName)) {
      this.lib.fs.readFile(
        'update'
        , (error, data) => {
          if(!error) {
            let update = JSON.parse(data);
            if(update.hasOwnProperty('news')) {
              for(let i in this.data.users) {
                this.lib.telegram.apiCall(
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
  }
  runAfterLoad(readError, fileData) {
    if(!readError) {
      this.data = JSON.parse(fileData);
      console.log(this.data);
      this.lib.telegram = new (require('telegram-bot-manager').BotManager)({
        "botToken": this.data.token
        , "type": "webhook"
        //, "key": this.data.key
        //, "cert": this.data.cert
        , "receiver": {
          "port": 8081
          , "protocol": "http"
          , "endpoint": this.data.endpoint
        }
      });
      
      this.lib.telegram.on('start', (result) => {this.start(result);});
      this.lib.telegram.on('help', (result) => {this.help(result);});
      this.lib.telegram.on('settings', (result) => {this.settings(result);});
      this.lib.telegram.on('showadd', (result) => {this.showAdd(result);});
      this.lib.telegram.on('showremove', (result) => {this.showRemove(result);});
      this.lib.telegram.on('showtick', (result) => {this.showTick(result);});
      this.lib.telegram.on('showmissing', (result) => {this.showMissing(result);});
      this.lib.telegram.on('showsearch', (result) => {this.showSearch(result);});
      this.lib.telegram.on('cancel', (result) => {this.deferredActionCancel(result);});
      
      this.alertAllUsers();
      this.getShowUpdates();
      setInterval(() => {this.getShowUpdates();}, (60*60*1000));
    }
    else {
      throw readError;
    };
    return false;
  }
};

let showTimeBot = new ShowTimeBot();
