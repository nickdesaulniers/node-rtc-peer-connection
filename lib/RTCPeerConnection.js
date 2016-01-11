var chalk = require('chalk');
var dtls = require('node-dtls');
var EventTarget = require('event-target-shim');
var genCerts = require('./genCerts');
var SDP = require('./sdp');
var RTCDataChannel = require('./RTCDataChannel');
var IceAgent = require('./ice');
var util = require('util');

// https://w3c.github.io/webrtc-pc/#idl-def-RTCPeerConnection
function RTCPeerConnection (configuration) {
  EventTarget.call(this);

  this._configuration = null;
  this._markedForNegotiation = false;
  this._negotiationNeeded = false;
  this._operationsChain = Promise.resolve();
  this._dataChannels = [];
  this._pendingIceCandidates = [];
  this._pems = null;

  // https://w3c.github.io/webrtc-pc/#dom-peerconnection
  this.setConfiguration(configuration);
  this.signalingState = 'stable';
  this.iceConnectionState = 'new';
  this.iceGatheringState = 'new';
  this.pendingLocalDescription = null;
  this.currentLocalDescription = null;
  this.pendingRemoteDescription = null;
  this.currentRemoteDescription = null;
  this.localDescription = null;
  this.remoteDecription = null;
  this.connectionState = 'new';
  this.canTrickleIceCandidates = null;

  this._iceAgent = new IceAgent(this.getConfiguration());
  this._iceAgent.on('icecandidate', dispatchCandidate.bind(null, this));
  this._iceAgent.on('iceconnectionstatechange',
    setIceConnectionState.bind(null, this));
};

var emittedEvents = [
  'negotiationneeded',
  'icecandidate',
  'icecandidateerror',
  'signalingstatechange',
  'iceconnectionstatechange',
  'icegatheringstatechange',
  'connectionstatechange'
];

util.inherits(RTCPeerConnection, EventTarget(emittedEvents));

function constructSDP (peer, type, pResults) {
  var candidates = pResults[0];
  var pems = pResults[1];
  peer._pems = pems;
  var sdp = new SDP(candidates, pems.fingerprint);
  peer._iceAgent.localUsername = sdp.getUsername();
  peer._iceAgent.localPassword = sdp.getPassword();

  //console.log(sdp.toString().split('\r\n'));

  return {
    sdp: sdp.toString(),
    type: type,
  };
};

// This is part of the WebRTC spec (cmd+f 'general idea') under S 4.3.1
// Pulled from Gecko:
// https://dxr.mozilla.org/mozilla-central/source/dom/media/PeerConnection.js#489
RTCPeerConnection.prototype._chain = function (fn) {
  // TODO: check closed
  var p = this._operationsChain.then(function () {
    return fn();
  }.bind(this));
  this._operationsChain = p.catch(function (e) {
    console.error('invoking function passed to _chain threw', e);
  });
  return p;
};

//https://w3c.github.io/webrtc-pc/#widl-RTCPeerConnection-createOffer-Promise-RTCSessionDescription--RTCOfferOptions-options
RTCPeerConnection.prototype.createOffer = function () {
  return this._chain(function () {
    this._iceAgent.iceControlling = true;
    var candidatesP = this._iceAgent.gatherHostCandidates();
    var certP = genCerts();
    return Promise.all([candidatesP, certP]).then(constructSDP.bind(null, this, 'offer'));
  }.bind(this));
};

//https://w3c.github.io/webrtc-pc/#widl-RTCPeerConnection-createAnswer-Promise-RTCSessionDescription--RTCAnswerOptions-options
RTCPeerConnection.prototype.createAnswer = function () {
  return this._chain(function () {
    this._iceAgent.iceControlling = false;
    var candidatesP = this._iceAgent.gatherHostCandidates();
    var certP = genCerts();
    return Promise.all([candidatesP, certP]).then(constructSDP.bind(null, this, 'answer'));
  }.bind(this));
};

//https://w3c.github.io/webrtc-pc/#widl-RTCPeerConnection-setRemoteDescription-Promise-void--RTCSessionDescriptionInit-description
//desc needs to be verified
RTCPeerConnection.prototype.setRemoteDescription = function (desc) {
  console.log(chalk.gray('[SDP] ' + desc.type.toUpperCase()));
  return this._chain(function () {
    this.remoteDescription = desc;
    dispatchPendingIceCandidates(this);
    try {
      var sdp = SDP.fromString(desc.sdp);
      if (sdp.media && sdp.media.length > 0) {
        this._iceAgent.setRemoteCandidates(sdp.media[0].candidates);
        this._iceAgent.remotePassword = sdp.getPassword();
        this._iceAgent.remoteUsername = sdp.getUsername();
      } else {
        return Promise.reject('no media in remote session description');
      }
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }.bind(this));
};

RTCPeerConnection.prototype.setLocalDescription = function (desc) {
  console.log(chalk.gray('[SDP] ' + desc.type.toUpperCase()));

  return this._chain(function () {
    this.localDescription = desc;
    dispatchPendingIceCandidates(this);
    resetNegotiationNeeded(this);
    this.signalingState = desc.type === 'offer' ? 'have-local-offer' :
      'have-local-pranswer';
    this.dispatchEvent({ type: 'signalingstatechange' });
    return Promise.resolve();
  }.bind(this));
};

// https://w3c.github.io/webrtc-pc/#widl-RTCPeerConnection-addIceCandidate-Promise-void--RTCIceCandidate-candidate
RTCPeerConnection.prototype.addIceCandidate = function (candidate) {
  return this._chain(function () {
    if (this.signalingState === 'closed') {
      return Promise.reject(new InvalidStateError('closed'));
    }
    try {
      this._iceAgent.addCandidate(new RTCIceCandidate(candidate));
      console.log('added remote candidate')
    } catch (e) {
      return Promise.reject(e);
    }
    return Promise.resolve();
  }.bind(this));
};

RTCPeerConnection.prototype.getConfiguration = function () {
  return this._configuration;
};

RTCPeerConnection.prototype.setConfiguration = function (configuration) {
  this._configuration = configuration;
};

RTCPeerConnection.prototype.createDataChannel = function (label, dataChannelDict) {
  // https://w3c.github.io/webrtc-pc/#methods-9
  label = label || '';

  if (this.signalingState === 'closed') {
    throw new Error('InvalidStateError');
  }

  var channel = new RTCDataChannel;
  channel.label = label;
  this._dataChannels.push(channel);

  // TODO: steps 4 - 9, GH Issue #11

  setImmediate(function () {
    if (this._dataChannels.length === 1) {
      setNegotiationNeeded(this);
    }
  }.bind(this));

  return channel;
};

//http://w3c.github.io/webrtc-pc/#widl-RTCPeerConnection-close-void
RTCPeerConnection.prototype.close = function () {

};

// TODO: it's way too early to even be thinking about this method...
function channelOpen (peer, channel) {
  // https://w3c.github.io/webrtc-pc/#announce-datachannel-open
  if (peer.signalingState === 'closed') {
    console.error('datachannel opened but signaling state closed');
    return;
  }
  channel.readyState = 'open';
  channel.dispatchEvent({ type: 'open' });
};

function dispatchPendingIceCandidates (peer) {
  while (peer._pendingIceCandidates.length > 0) {
    dispatchCandidate(peer, peer._pendingIceCandidates.shift());
  }
};

function setNegotiationNeeded (peer) {
  // https://w3c.github.io/webrtc-pc/#h-setting-negotiation-needed
  peer._negotiationNeeded = true;

  // https://w3c.github.io/webrtc-pc/#h-firing-an-event
  if (!peer._markedForNegotiation) {
    peer._markedForNegotiation = true;
    peer.dispatchEvent({ type: 'negotiationneeded' });
  }
};

function resetNegotiationNeeded (peer) {
  // https://w3c.github.io/webrtc-pc/#h-clearing-negotiation-needed
  peer._negotiationNeeded = false;
};

function dispatchCandidate (peer, candidate) {
  // Defer announcing ice candidates until we know the other side has signaled
  // us with an answer.
  if (!peer.remoteDescription) {
    peer._pendingIceCandidates.push(candidate);
    return;
  }

  peer.dispatchEvent({
    type: 'icecandidate',
    // LOL at this nesting, but that's how it is...
    candidate: {
      candidate: SDP.candidateStr(candidate),
      sdpMid: '',
      sdpMLineIndex: 0,
      // TODO: if srflx we need the url of the ICE server
      // https://w3c.github.io/webrtc-pc/#rtcpeerconnectioniceevent
    },
  });
};

dtls.setLogLevel(dtls.logLevel.FINE);
function setIceConnectionState (peer, state) {
  peer.iceConnectionState = state;
  peer.dispatchEvent({
    type: 'iceconnectionstatechange',
  });

  if (state === 'completed') {
    var sockets = peer._iceAgent.getSocketsForValidPairs();
    console.log('starting dtls servers');
    sockets.forEach(function (socket) {
      var server = new dtls.DtlsServer(socket, {
        key: peer._pems.private,
        cert: peer._pems.cert,
      });
    });
  }
};

module.exports = RTCPeerConnection;

