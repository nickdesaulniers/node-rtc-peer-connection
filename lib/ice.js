var debug = require('./debug');
var udp = require('dgram');
var EventEmitter = require('events');
var forEachInet = require('./forEachInet');
var RTCIceCandidate = require('./RTCIceCandidate');
var Packet = require('vs-stun/lib/Packet');
var util = require('util');
var url = require('url');
var vsStun = require('vs-stun');

function IceAgent (config) {
  EventEmitter.call(this);

  // https://tools.ietf.org/html/rfc5245#section-2.2
  this.candidates = [];
  this.candidatePairs = [];
  this.checks = [];

  this.remoteCandidates = [];

  this.config = config;
};

util.inherits(IceAgent, EventEmitter);

// `this` should refer to the specific socket
function onPacket (msg, rinfo) {
  //console.log('Received %d bytes from %s:%d',
    //msg.length, rinfo.address, rinfo.port);
  var p = Packet.parse(msg);
  debug.printDebugPacket(p, rinfo);
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

function isLinkLocalAddress (inet) {
  // https://en.wikipedia.org/wiki/Link-local_address
  // TODO: handle ipv4 link local addresses
  return inet.family === 'IPv6' && inet.address.startsWith('fe80::');
};

IceAgent.prototype.gatherHostCandidates = function () {
  var promises = [];
  // https://tools.ietf.org/html/rfc5245#section-4.1.1.1
  forEachInet(function (inet) {
    // Do not include link local addresses
    // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-4.1.1.1
    if (isLinkLocalAddress(inet)) {
      return;
    }
    if (inet.internal) {
      return;
    }
    var socketType = inet.family === 'IPv4' ? 'udp4' : 'udp6';
    var socket = udp.createSocket(socketType);

    socket.on('message', onPacket);
    promises.push(new Promise(function (resolve, reject) {
      socket.bind(null, inet.address, function () {
        var info = socket.address();
        var iceCandidate = {
          // TODO: this should be set to the sdp str
          candidate: 'hello',
          type: 'host',
          ip: info.address,
          port: info.port,
        };
        resolve(new RTCIceCandidate(iceCandidate));
      });
    }));
  });
  return Promise.all(promises);
};

IceAgent.prototype.gatherStunCandidates = function () {
  var socket = udp.createSocket('udp4');
  var stunServer = this.getFirstStunServer();

  socket.on('message', onPacket);

  return new Promise(function (resolve, reject) {
    socket.on('listening', function () {
      vsStun.resolve(socket, stunServer, function (error, value) {
        if (error) {
          reject(error);
        } else {
          var info = socket.address();
          var iceCandidate = {
            // TODO: this should be set to the sdp str
            candidate: 'hello',
            type: 'srflx',
            ip: value.public.host,
            port: value.public.port,
            relatedAddress: info.address,
            relatedPort: info.port,
          };
          resolve(new RTCIceCandidate(iceCandidate));
        }
      });
    });

    socket.bind();
  }.bind(this));
};

IceAgent.prototype.addCandidate = function (candidate) {
  this.remoteCandidates.push(candidate);
};

// TODO: gatherTurnCandidates

module.exports = IceAgent;

