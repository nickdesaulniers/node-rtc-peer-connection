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
  this._operations = [];
  this._dataChannels = [];

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

RTCPeerConnection.prototype._constructSDP = function (pResults) {
  var candidates = pResults[0];
  var pems = pResults[1];
  // TODO: we'll likely want to assign pems to this...
  var sdp = new SDP(candidates, pems.fingerprint);

  return {
    sdp: sdp.toString(),
    type: 'offer',
  };
};

// This is part of the WebRTC spec (cmd+f 'general idea') under S 4.3.1
RTCPeerConnection.prototype._oneAtATime = function (fn) {
  var p = null;
  this._operations.push(fn);
  if (this._operations.length === 1) {
    p = Promise.resolve(this._operations[0].call(this));
  } else {
    console.warn('more than one _oneAtATime function invoked');
    p = new Promise(function (resolve, reject) {
      this._operations.splice(this._operations.indexOf(fn), 1);
      if (this._operations.length > 0) {
        try {
          var ret = this._operations[0].call(this);
          resolve(ret);
        } catch (e) {
          reject(e);
        }
      }
    }.bind(this));
  }
  return p;
};

// TODO: add support for optional parameter
//https://w3c.github.io/webrtc-pc/#widl-RTCPeerConnection-createOffer-Promise-RTCSessionDescription--RTCOfferOptions-options
RTCPeerConnection.prototype.createOffer = function () {
  return this._oneAtATime(function () {
    var candidatesP = this._iceAgent.gatherAllCandidates();
    var certP = genCerts();
    return Promise.all([candidatesP, certP]).then(this._constructSDP);
  });
};

//TODO: add support for optional parameter
//https://w3c.github.io/webrtc-pc/#widl-RTCPeerConnection-createAnswer-Promise-RTCSessionDescription--RTCAnswerOptions-options
//Also need to implement success/failure callback for legacy code
RTCPeerConnection.prototype.createAnswer = function () {

};

//https://w3c.github.io/webrtc-pc/#widl-RTCPeerConnection-setRemoteDescription-Promise-void--RTCSessionDescriptionInit-description
//desc needs to be verified
//also need to handle legacy support
RTCPeerConnection.prototype.setRemoteDescription = function (desc) {
  console.log('setRemoteDescription', desc);
  return this._oneAtATime(function () {
    console.log('oAAT');
    this.remoteDescription = desc;
    this._iceAgent.setRemoteCandidates(desc);
  }.bind(this));
};

// https://w3c.github.io/webrtc-pc/#widl-RTCPeerConnection-addIceCandidate-Promise-void--RTCIceCandidate-candidate
// TODO: need to support legacy args
RTCPeerConnection.prototype.addIceCandidate = function (candidate) {
  var p = new Promise(function (resolve, reject) {
    if (this.signalingState === 'closed') {
      reject(new InvalidStateError('closed'));
    }
    this._iceAgent.addCandidate(new RTCIceCandidate(candidate));
    resolve();
  }.bind(this));
  return p;
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
      this._setNegotiationNeeded();
    }
  }.bind(this));

  return channel;
};

//http://w3c.github.io/webrtc-pc/#widl-RTCPeerConnection-close-void
RTCPeerConnection.prototype.close = function () {

};

// TODO: it's way too early to even be thinking about this method...
RTCPeerConnection.prototype._channelOpen = function (channel) {
  // https://w3c.github.io/webrtc-pc/#announce-datachannel-open
  if (this.signalingState === 'closed') {
    console.error('datachannel opened but signaling state closed');
    return;
  }
  channel.readyState = 'open';
  channel.dispatchEvent({ type: 'open' });
};

RTCPeerConnection.prototype.setLocalDescription = function (desc) {
  // https://w3c.github.io/webrtc-pc/#widl-RTCPeerConnection-createOffer-Promise-RTCSessionDescription--RTCOfferOptions-options

  // TODO: verify that desc is a RTCSessionDescriptionInit
  // https://w3c.github.io/webrtc-pc/#idl-def-RTCSessionDescriptionInit
  this.localDescription = desc;

  // https://w3c.github.io/webrtc-pc/#h-clearing-negotiation-needed
  this._resetNegotiationNeeded();

  // https://w3c.github.io/webrtc-pc/#rtcsignalingstate-enum
  this.signalingState = desc.type === 'offer' ? 'have-local-offer' :
    'have-local-pranswer';
  this.dispatchEvent({ type: 'signalingstatechange' });

  return Promise.resolve(void 0);
};

RTCPeerConnection.prototype._setNegotiationNeeded = function () {
  // https://w3c.github.io/webrtc-pc/#h-setting-negotiation-needed
  this._negotiationNeeded = true;

  // https://w3c.github.io/webrtc-pc/#h-firing-an-event
  if (!this._markedForNegotiation) {
    this._markedForNegotiation = true;
    this.dispatchEvent({ type: 'negotiationneeded'});
  }
};

RTCPeerConnection.prototype._resetNegotiationNeeded = function () {
  // https://w3c.github.io/webrtc-pc/#h-clearing-negotiation-needed
  this._negotiationNeeded = false;
};

module.exports = RTCPeerConnection;

