var udp = require('dgram');
var EventEmitter = require('events');
var os = require('os');
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

IceAgent.prototype.getLocalIp = function () {
  var ifaces = os.networkInterfaces();
  var ids = Object.keys(ifaces);
  for (var i = 0; i < ids.length; ++i) {
    var id = ids[i];
    var iface = ifaces[id];
    for (var j = 0; j < iface.length; ++j) {
      var conn = iface[j];
      if (conn.family === 'IPv4' && !conn.internal) {
        return conn.address;
      }
    }
  }
};

IceAgent.prototype.onlistening = function (e) {
  var stunServer = this.getFirstStunServer();
  vsStun.resolve(this.socket, stunServer, function (error, value) {
    if (error) {
      this.emit('error', error);
      return;
    }
    var ip = this.getLocalIp();
    this.internal.addr = this.getLocalIp();
    this.internal.port = value.local.port;
    this.external.addr = value.public.host;
    this.external.port = value.public.port;
  }.bind(this));
};

module.exports = IceAgent;

