var chalk = require('chalk');
var debug = require('./debug');
var udp = require('dgram');
var EventEmitter = require('events');
var forEachInet = require('./forEachInet');
var IceCandidatePair = require('./IceCandidatePair');
var IceChecklist = require('./IceChecklist');
var RTCIceCandidate = require('./RTCIceCandidate');
var net = require('net');
var normalizeIPv6 = require('ipv6-normalize');
var Packet = require('vs-stun/lib/Packet');
var util = require('util');
var url = require('url');
var vsStun = require('vs-stun');

function IceAgent (config) {
  EventEmitter.call(this);

  // https://tools.ietf.org/html/rfc5245#section-2.2
  this.candidates = [];
  this.remoteCandidates = [];
  // If there were more media streams, there'd be a checklist per.
  this.checklist = new IceChecklist;

  // If not "controlling", then "controlled." The controlling peer's agent
  // nominates the candidate pair that will be used for the rest of
  // communication. Public and set by RTCPeerConnections's createOffer().
  this.iceControlling = false;

  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-12
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-12.1
  this.Ta = 1000;//20; // ms
  this.checkTimeout = null;

  // used for short term credentialing
  this.localUsername = null;
  this.localPassword = null;
  this.remoteUsername = null;
  this.remotePassword = null;

  this.config = config;
};

util.inherits(IceAgent, EventEmitter);

function onPacket (agent, socket, msg, rinfo) {
  //console.log('Received %d bytes from %s:%d',
    //msg.length, rinfo.address, rinfo.port);
  if (!Packet.parse.check(msg)) {
    console.warn('not a stun packet');
    console.warn('valid list:');
    console.warn(socket.address().address + ':' + socket.address().port +
      ' -> ' + rinfo.address + ':' + rinfo.port);
    debug.printPairs(agent.checklist.validList);
    return;
  }
  var p = Packet.parse(msg);
  debug.printDebugPacket(p, rinfo);

  // TODO: should use the states specified, and bubble these up so the
  // RTCPeerConnection can emit them.
  // https://w3c.github.io/webrtc-pc/#rtciceconnectionstate-enum
  var type = Packet.getType(p);
  if (type === Packet.BINDING_REQUEST) {
    agent.respondToBindingRequest(socket, p, rinfo);
  } else if (type === Packet.BINDING_SUCCESS) {
    agent.bindingSuccess(socket, p, rinfo);
  }
};

IceAgent.prototype.getFirstStunServer = function () {
  var servers = this.config.iceServers;
  var urlp = url.parse(servers[0].urls);
  return {
    host: urlp.hostname,
    port: urlp.port,
  };
};

function isLinkLocalAddress (inet) {
  // https://en.wikipedia.org/wiki/Link-local_address
  // TODO: handle ipv4 link local addresses
  return inet.family === 'IPv6' && inet.address.startsWith('fe80::');
};

function createSocket (agent, inetFamily) {
  var socketType = inetFamily === 'IPv4' ? 'udp4' : 'udp6';
  var socket = udp.createSocket(socketType);
  socket.on('listening', agent.gatherStunCandidate.bind(agent, socket));
  socket.on('message', onPacket.bind(null, agent, socket));
  socket.on('error', function (e) {
    // we seem to keep getting ENOTFOUND stun.l.google.com.
    // https://github.com/nodejs/node-v0.x-archive/issues/5488#issuecomment-167597819
    // TODO: should check that e.hostname is in this.config.iceServers
    // Issue #47.
    if (e.code === 'ENOTFOUND') {
      //console.error('no record for domain used for stun: ' + e.hostname);
      return;
    }
    console.error(e);
  });
  return socket;
}

IceAgent.prototype.gatherHostCandidates = function () {
  var promises = [];
  var agent = this;
  // TODO: set state to gathering
  // https://tools.ietf.org/html/rfc5245#section-4.1.1.1
  forEachInet(function (inet) {
    // Do not include link local addresses
    // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-4.1.1.1
    if (isLinkLocalAddress(inet) || inet.internal) {
      return;
    }
    var socket = createSocket(agent, inet.family);

    promises.push(new Promise(function (resolve, reject) {
      socket.bind(null, inet.address, function () {
        var info = socket.address();
        var iceCandidate = {
          type: 'host',
          ip: info.address,
          port: info.port,
          _socket: socket,
        };
        console.log(chalk.cyan('[ICE] LOCAL HOST CANDIDATE ') +
          chalk.blue(iceCandidate.ip) + ':' +
          chalk.magenta(iceCandidate.port));
        var candidate = new RTCIceCandidate(iceCandidate);
        agent.candidates.push(candidate);
        resolve(candidate);
      });
    }));
  });
  return Promise.all(promises);
};

IceAgent.prototype.gatherStunCandidate = function (socket) {
  var stunServer = this.getFirstStunServer();
  var agent = this;
  vsStun.resolve(socket, stunServer, function (error, value) {
    if (error) {
      // TODO: emit an icecandidateerror event
      throw error;
    } else if (!(('public' in value) && ('host' in value.public) && ('port' in value.public))) {
      // this case will happen if the STUN server is only ipv4 but we tried
      // to connect to it via an ipv6 socket or vice versa.
      // TODO: resolve the stun server hostname ourselves and don't even try
      // if they're different families. Issue #47.
      //console.error('got a response from an non-family stun server', value);
      return;
    // } else { // now getting ipv6 public values that are the same as the host?
    } else {
      var info = socket.address();
      var iceCandidate = {
        type: 'srflx',
        ip: value.public.host,
        port: value.public.port,
        relatedAddress: info.address,
        relatedPort: info.port,
        _socket: socket,
      };
      console.log(chalk.cyan('[ICE] LOCAL SRFLX CANDIDATE ') +
        chalk.blue(iceCandidate.ip) + ':' +
        chalk.magenta(iceCandidate.port));
      var candidate = new RTCIceCandidate(iceCandidate);
      agent.candidates.push(candidate);
      // TODO: I think we should defer emitting this until we're in
      // have-local-offer state. Issue #50.
      agent.emit('icecandidate', candidate);
    }
  });
};

// TODO: gatherTurnCandidates

// From an offer/answer sdp. candidates may be null if the remote is trickling.
IceAgent.prototype.setRemoteCandidates = function (candidates) {
  if (candidates) {
    candidates.forEach(function (candidate) {
      this.addCandidate(candidate);
    }.bind(this));
  }
};

// These candidates should only be remote, not local.
// https://tools.ietf.org/html/draft-ietf-ice-trickle-01#section-8.1
// https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-5.1.3
// https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-5.1.3.1
IceAgent.prototype.addCandidate = function (candidate) {
  console.log(chalk.cyan('[ICE] REMOTE ' + candidate.type.toUpperCase() +
    ' CANDIDATE ') + chalk.blue(candidate.ip) + ':' +
    chalk.magenta(candidate.port));

  // Prevent duplicates.
  // https://tools.ietf.org/html/draft-ietf-ice-trickle-01#section-5.2
  var find = function (remoteCandidate) {
    return remoteCandidate.ip === candidate.ip &&
      remoteCandidate.port === candidate.port;
  };
  if (!this.remoteCandidates.some(find)) {
    this.remoteCandidates.push(candidate);
  } else {
    console.warn('duplicate candidate');
  }

  this.candidates.forEach(function (localCandidate) {
    if (localCandidate.type === 'srflx') {
      // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-5.1.3.3
      return;
    }
    var localIpFam = net.isIP(localCandidate.ip);
    var remoteIpFam = net.isIP(candidate.ip);
    if (localIpFam > 0 && remoteIpFam > 0 && localIpFam === remoteIpFam) {
      this.checklist.add(new IceCandidatePair(localCandidate, candidate,
        this.iceControlling));
    }
  }.bind(this));

  //console.log('candidate pairs:')
  //debug.printPairs(this.checklist.candidatePairs);

  this.checklist.prioritize();

  // Do not freeze all, then unfreeze the first as this conflicts with trickle.

  if (this.checklist.isCompleted()) {
    console.warn('not rerunning checks');
    return;
  }

  if (!this.checkTimeout) {
    this.checkTimeout = setTimeout(this.check.bind(this), this.Ta);
  }
};

// https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-5.1.4
IceAgent.prototype.check = function () {
  //console.log('Ta');
  var pair = this.checklist.highestPriorityWaiting();
  if (pair) {
    this.performCheck(pair);
    pair.progress();
  } else {
    pair = this.checklist.highestPriorityFrozen();
    if (pair) {
      pair.unfreeze();
      this.performCheck(pair);
      pair.progress();
    } else {
      console.log('done with checks');
      if (this.checkTimeout) {
        clearTimeout(this.checkTimeout);
        this.checkTimeout = null;
      }
      this.updateStates();
      return;
    }
  }
  this.checkTimeout = setTimeout(this.check.bind(this), this.Ta);
};

IceAgent.prototype.performCheck = function (candidatePair) {
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.1.2

  if (!this.remoteUsername) {
    throw new Error('missing remote short term credentials');
  }
  var username = this.remoteUsername + ':' + this.localUsername;
  var config = {
    username: username,
    password: this.remotePassword,
  };
  var requestPacket = vsStun.create.bindingRequest(config);

  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.1.2.1
  requestPacket.append.priority(candidatePair.local.priority);

  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-7.1.1.2
  // Aggressive nomination.
  requestPacket.append.useCandidate();

  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.1.3.2.4
  if (this.iceControlling) {
    candidatePair.nominated = true;
  }

  // save the transactionID, these are used to map the responses back to the
  // pair.
  this.checklist.pendingRequestTransactions[requestPacket.transactionID] =
    candidatePair;

  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.1.2.2
  // TODO: need a tie breaker
  if (this.iceControlling) {
    requestPacket.append.iceControlling();
  } else {
    requestPacket.append.iceControlled();
  }

  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.1.2.3
  requestPacket.append.username(username);

  requestPacket.append.messageIntegrity();

  var socket = candidatePair.local._socket;
  socket.send(requestPacket.raw, 0, requestPacket.raw.length,
    candidatePair.remote.port, candidatePair.remote.ip);
};

// https://tools.ietf.org/html/rfc5389#section-15.4
// TODO:
// https://github.com/d-vova/vs-stun/issues/2
function validIntegrity () {
  return true;
};

function validUsername (packet, username) {
  var usernameProvided = Packet.getAttribute(packet).username.split(':')[0];
  return usernameProvided === username;
};

// https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.2
IceAgent.prototype.respondToBindingRequest = function (socket, packet, rinfo) {
  // perform message integrity check
  if (!validIntegrity()) {
    throw new Error('bad integrity');
  }

  // check username, first part
  if (!validUsername(packet, this.localUsername)) {
    throw new Error('unrecognized username');
  }

  var config = {
    username: this.localUsername,
    password: this.localPassword,
  };

  var responsePacket = vsStun.create.bindingSuccess(config);
  var transactionID = Packet.getTransactionID(packet);
  Packet.setTransactionID(responsePacket, transactionID);

  // MUST use fingerprint

  // repair role conflicts
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.2.1.1

  // compute mapped address
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.2.1.2
  // https://tools.ietf.org/html/rfc5389#section-15.1
  // https://tools.ietf.org/html/rfc5389#section-15.2
  // TODO: vs-stun should use the address property, not host.
  // https://github.com/d-vova/vs-stun/issues/7
  rinfo.host = rinfo.address;
  responsePacket.append.mappedAddress(rinfo);
  responsePacket.append.xorMappedAddress(rinfo);

  // learn of peer reflexive candidates
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.2.1.3

  // triggered checks
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.2.1.4

  // update the nominated flag
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.2.1.5

  responsePacket.append.messageIntegrity();

  socket.send(responsePacket.raw, 0, responsePacket.raw.length, rinfo.port,
    rinfo.address);
};

// validates that we're aware of this candidate pair, and that we haven't
// discovered any peer reflexive candidates.
function matchingSourceDest (source, dest, candidatePair) {
  return source.address === candidatePair.remote.ip &&
    source.port === candidatePair.remote.port &&
    dest.host === candidatePair.local.ip &&
    dest.port === candidatePair.local.port;
};

IceAgent.prototype.bindingSuccess = function (socket, packet, rinfo) {
  var candidatePair =
    this.checklist.pendingRequestTransactions[packet.transactionID];
  delete this.checklist.pendingRequestTransactions[packet.transactionID];

  if (!candidatePair) {
    // This usually occurs once for the external STUN server we first spoke to,
    // ie. stun.l.google.com
    console.warn('binding success for unknown transactionID');
    return;
  }

  var dest = Packet.getAttribute(packet).xorMappedAddress;
  if (net.isIPv6(dest.host)) {
    dest.host = normalizeIPv6(dest.host);
  }

  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.1.3.2
  if (matchingSourceDest(rinfo, dest, candidatePair)) {
    // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.1.3.2.3
    candidatePair.succeed();
    this.checklist.unfreezeAll();
  } else {
    // TODO: Issue #52
    // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.1.3.2.1
    // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.2.1.3
    console.warn('Found a peer reflexive candidate');
    debug.printPeerReflexive(rinfo, dest, candidatePair);
  }

  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.1.3.2.2
  // TODO: there's more to do here
  candidatePair.valid = true;
  this.checklist.validList.push(candidatePair);
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.1.3.3
  this.checklist.checkForFailure();
};

IceAgent.prototype.updateStates = function () {
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-7.1.2
  var anyValidPairs = this.checklist.validList.length > 0;
  if (!anyValidPairs && this.checklist.isRunning()) {
    console.warn('still running');
    return;
  }

  if (anyValidPairs && this.checklist.isRunning()) {
    this.checklist.removeWaitingAndFrozenCandidates();
    this.checklist.complete();
  }

  if (this.checklist.isCompleted()) {
    this.emit('iceconnectionstatechange', 'completed');
  }

  if (this.checklist.isFailed()) {
    console.warn('check list is failed');
    this.emit('iceconnectionstatechange', 'failed');
  }
};

IceAgent.prototype.getSocketsForValidPairs = function () {
  var socketSet = new Set(this.checklist.validList.map(function (pair) {
    return pair.local._socket;
  }));
  // Would love to have the ... spread operator here.
  var list = [];
  for (var socket of socketSet) {
    list.push(socket);
  }
  return list;
};

module.exports = IceAgent;

