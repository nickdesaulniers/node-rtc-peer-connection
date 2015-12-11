var udp = require('dgram');
var EventEmitter = require('events');
var os = require('os');
var util = require('util');
var url = require('url');
var vsStun = require('vs-stun');

function IceAgent (config) {
  EventEmitter.call(this);

  // hmm, so the ice agent is going to manage multiple sockets.
  // TODO: should be multiple candidates, maybe the candidate interface manages
  // sockets.
  this.sockets = new Map;

  // https://tools.ietf.org/html/rfc5245#section-2.2
  this.candidates = [];
  this.candidatePairs = [];
  this.checks = [];

  this.internal = {
    addr: null,
    port: null,
  };
  this.external = {
    addr: null,
    port: null,
  };
  this.config = config;
};

util.inherits(IceAgent, EventEmitter);

IceAgent.prototype.init = function (datachannel) {
  var socket = udp.createSocket('udp4');
  this.sockets[datachannel] = socket;

  var iceAgent = this;
  socket.on('listening', function () {
    var stunServer = iceAgent.getFirstStunServer();
    vsStun.resolve(socket, stunServer, function (error, value) {
      if (error) {
        iceAgent.emit('error', error);
        return;
      }
      iceAgent.emit('open', datachannel);
    });
  });

  socket.bind();
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

IceAgent.prototype.gatherAllCandidates = function () {
  // https://tools.ietf.org/html/rfc5245#section-2.2

  // It sounds like the caller gathers all candidates, before sending the
  // encoded sdp over the signalling channel.


};

module.exports = IceAgent;

