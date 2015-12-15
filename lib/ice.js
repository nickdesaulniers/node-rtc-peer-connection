var udp = require('dgram');
var EventEmitter = require('events');
var forEachInet = require('./forEachInet');
var ICECandidate = require('./ice-candidate');
var util = require('util');
var url = require('url');
var vsStun = require('vs-stun');

function IceAgent (config) {
  EventEmitter.call(this);

  // https://tools.ietf.org/html/rfc5245#section-2.2
  this.candidates = [];
  this.candidatePairs = [];
  this.checks = [];

  this.config = config;
};

util.inherits(IceAgent, EventEmitter);

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

  // TODO: possible to remove .bind(this) ???
  return this.gatherHostCandidates()
    .then(function (hostCandidates) {
      this.candidates = this.candidates.concat(hostCandidates);
    }.bind(this))
    .then(this.gatherStunCandidates.bind(this))
    .then(function (stunCandidate) {
      this.candidates.push(stunCandidate);
      return this.candidates;
    }.bind(this))
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
    var socket = udp.createSocket(socketType);
    promises.push(new Promise(function (resolve, reject) {
      socket.bind(null, inet.address, function () {
        var info = socket.address();
        resolve(new ICECandidate(ICECandidate.TYPES.HOST, socket, info.address,
          info.port));
      });
    }));
  });
  return Promise.all(promises);
};

IceAgent.prototype.gatherStunCandidates = function () {
  var socket = udp.createSocket('udp4');
  var stunServer = this.getFirstStunServer();

  return new Promise(function (resolve, reject) {
    socket.on('listening', function () {
      vsStun.resolve(socket, stunServer, function (error, value) {
        if (error) {
          reject(error);
        } else {
          resolve(new ICECandidate(ICECandidate.TYPES.SERVER_REFLEXIVE, socket,
            value.public.host, value.public.port))
        }
      });
    });

    socket.bind();
  }.bind(this));
};

// TODO: gatherTurnCandidates

module.exports = IceAgent;

