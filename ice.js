var udp = require('dgram');
var EventEmitter = require('events');
var util = require('util');
var url = require('url');
var vsStun = require('vs-stun');

function IceAgent () {
  EventEmitter.call(this);

  this.socket = udp.createSocket('udp4');
  this.internal = {
    addr: null,
    port: null,
  };
  this.external = {
    addr: null,
    port: null,
  };
  this.config = null;

  this.socket.on('listening', this.onlistening.bind(this));
};

util.inherits(IceAgent, EventEmitter);

IceAgent.prototype.init = function (config) {
  this.config = config;
  this.socket.bind();
};

IceAgent.prototype.getFirstStunServer = function () {
  var servers = this.config.iceServers;
  var urlp = url.parse(servers[0].urls);
  return {
    host: urlp.hostname,
    port: urlp.port,
  };
};

IceAgent.prototype.onlistening = function (e) {
  var stunServer = this.getFirstStunServer();
  vsStun.resolve(this.socket, stunServer, function (error, value) {
    if (error) {
      this.emit('error', error);
      return;
    }
    this.internal.port = value.local.port;
    this.external.addr = value.public.host;
    this.external.port = value.public.port;
  }.bind(this));
};

module.exports = IceAgent;

