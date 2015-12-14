var udp = require('dgram');
var EventEmitter = require('events');
var forEachInet = require('./forEachInet');
var ICECandidate = require('./ice-candidate');
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

IceAgent.prototype.gatherAllCandidates = function () {
  // https://tools.ietf.org/html/rfc5245#section-2.2
  // https://tools.ietf.org/html/rfc5245#section-4.1.1

  // It sounds like the caller gathers all candidates, before sending the
  // encoded sdp over the signaling channel.

  var promises = [];
  promises.push(this.gatherHostCandidates());
  return Promise.all(promises).then(function (candidates) {
    return candidates;
  });

};

IceAgent.prototype.isLinkLocalAddress = function (inet) {
  // https://en.wikipedia.org/wiki/Link-local_address
  // TODO: handle ipv4 link local addresses
  return inet.family === 'IPv6' && inet.address.startsWith('fe80::');
};

IceAgent.prototype.gatherHostCandidates = function () {
  var promises = [];
  // https://tools.ietf.org/html/rfc5245#section-4.1.1.1
  var self = this;
  forEachInet(function (inet) {
    // Do not include link local addresses
    // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-4.1.1.1
    if (self.isLinkLocalAddress(inet)) {
      return;
    }
    if (inet.internal) {
      return;
    }
    var socketType = inet.family === 'IPv4' ? 'udp4' : 'udp6';
    var socket = dgram.createSocket(socketType);
    promises.push(new Promise(function (resolve, reject) {
      socket.bind(null, inet.address, function () {
        resolve(new ICECandidate(ICECandidate.TYPES.HOST, socket));
      });
    }));
  });
  return Promise.all(promises);
};

module.exports = IceAgent;

