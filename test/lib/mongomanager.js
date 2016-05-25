"use strict";
class MongoManager {
  constructor(options) {
    this.lib = {};
    this.lib.mongo = new (require('mongodb-core').Server)({
      "host": options.host || "localhost"
      , "port": options.port || 27017
      , "reconnect": options.reconnect || true
      , "reconnectInterval": options.reconnectInterval || 50
    });
    this.lib.mongo.on('connect', (server) => {this.serverHandler(server);});
    this.lib.mongo.on('close', (error) => {this.connectionHandler(error);});
    this.lib.mongo.on('reconnect', (error) => {this.connectionHandler(error);});
    this.lib.mongo.connect();
    
    this.options = options;
    this.temp = {};
  }
  connectionHandler(error) {
    console.log(error);
  }
  serverHandler(server) {
    console.log(server);
    this.temp.server = server;
  }
  insert(documents, callback) {
    console.log(this.temp);
    this.temp.server.insert(
      this.options.db
      , documents
      , {writeConcern: {w:1}, ordered:true}
      , (error, results) => {
        if(callback !== undefined) {
          callback(error, results);
        };
      }
    );
  }
  find(search, callback) {
    
  }
  delete(search, callback) {
    
  }
  update(search, document, callback) {
    
  }
}
module.exports = MongoManager;