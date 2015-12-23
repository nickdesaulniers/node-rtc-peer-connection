var chalk = require('chalk');
var debug = require('./debug');
var udp = require('dgram');
var EventEmitter = require('events');
var forEachInet = require('./forEachInet');
var IceCandidatePair = require('./IceCandidatePair');
var RTCIceCandidate = require('./RTCIceCandidate');
var net = require('net');
var Packet = require('vs-stun/lib/Packet');
var util = require('util');
var url = require('url');
var vsStun = require('vs-stun');

function IceAgent (config) {
  EventEmitter.call(this);

  // https://tools.ietf.org/html/rfc5245#section-2.2
  this.candidates = [];
  this.remoteCandidates = [];
  this.candidatePairs = [];
  this.checks = [];

  // If not "controlling", then "controlled." The controlling peer's agent
  // nominates the candidate pair that will be used for the rest of
  // communication. Public and set by RTCPeerCandidate's createOffer().
  this.iceControlling = false;

  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-12
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-12.1
  this.Ta = 20; // ms

  this.config = config;
};

util.inherits(IceAgent, EventEmitter);

function onPacket (agent, socket, msg, rinfo) {
  //console.log('Received %d bytes from %s:%d',
    //msg.length, rinfo.address, rinfo.port);
  var p = Packet.parse(msg);
  debug.printDebugPacket(p, rinfo);
  //var type = Packet.getType(p);
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
  var agent = this;
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

    socket.on('message', onPacket.bind(null, agent, socket));
    promises.push(new Promise(function (resolve, reject) {
      socket.bind(null, inet.address, function () {
        var info = socket.address();
        var iceCandidate = {
          type: 'host',
          ip: info.address,
          port: info.port,
        };
        console.log(chalk.cyan('[ICE] LOCAL HOST CANDIDATE ') +
          chalk.blue(iceCandidate.ip) + ':' +
          chalk.magenta(iceCandidate.port));
        resolve(new RTCIceCandidate(iceCandidate));
      });
    }));
  });
  return Promise.all(promises);
};

IceAgent.prototype.gatherStunCandidates = function () {
  var socket = udp.createSocket('udp4');
  var stunServer = this.getFirstStunServer();

  socket.on('message', onPacket.bind(null, this, socket));

  return new Promise(function (resolve, reject) {
    socket.on('listening', function () {
      vsStun.resolve(socket, stunServer, function (error, value) {
        if (error) {
          reject(error);
        } else {
          var info = socket.address();
          var iceCandidate = {
            type: 'srflx',
            ip: value.public.host,
            port: value.public.port,
            relatedAddress: info.address,
            relatedPort: info.port,
          };
          console.log(chalk.cyan('[ICE] LOCAL SRFLX CANDIDATE ') +
            chalk.blue(iceCandidate.ip) + ':' +
            chalk.magenta(iceCandidate.port));
          resolve(new RTCIceCandidate(iceCandidate));
        }
      });
    });

    socket.bind();
  }.bind(this));
};
// TODO: gatherTurnCandidates

// From an offer/answer sdp. candidates may be null if the remote is trickling.
IceAgent.prototype.setRemoteCandidates = function (candidates) {
  console.log(chalk.gray('[SDP] ANSWER'));
  if (candidates) {
    candidates.forEach(function (candidate) {
      this.addCandidate(candidate);
    }.bind(this));
  }
  //this.beginChecks();
};

// These candidates should only be remote, not local.
IceAgent.prototype.addCandidate = function (candidate) {
  console.log(chalk.cyan('[ICE] REMOTE CANDIDATE ') +
    chalk.blue(candidate.ip) + ':' +
    chalk.magenta(candidate.port));

  // Prevent duplicates.
  // https://tools.ietf.org/html/draft-ietf-ice-trickle-01#section-5.2
  var find = function (remoteCandidate) {
    return remoteCandidate.ip === candidate.ip &&
      remoteCandidate.port === candidate.port;
  };
  if (!this.remoteCandidates.some(find)) {
    this.remoteCandidates.push(candidate);
  }

  this.candidates.forEach(function (localCandidate) {
    var localIpFam = net.isIP(localCandidate.ip);
    var remoteIpFam = net.isIP(candidate.ip);
    if (localIpFam > 0 && remoteIpFam > 0 && localIpFam === remoteIpFam) {
      this.candidatePairs.push(new IceCandidatePair(localCandidate, candidate,
        this.iceControlling));
    }
  }.bind(this));

  this.candidatePairs.sort(function (pairA, pairB) {
    return pairA.priority < pairB.priority; // descending pair priority
  });

  // TODO: pruning
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-5.1.3.3

  //console.log('---' + this.candidatePairs.length, this.candidatePairs);
};

IceAgent.prototype.beginChecks = function () {
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-5.1.3
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-5.1.3.1
  // https://tools.ietf.org/html/draft-ietf-ice-trickle-01#section-8.1
  //console.log('done pairing candidates', this.candidates.length,
    //this.remoteCandidates.length, this.candidatePairs.length);

  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-5.1.4
  //
};

module.exports = IceAgent;

