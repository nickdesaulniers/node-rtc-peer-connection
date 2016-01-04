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
  this._iceAgent.on('icecandidate', dispatchCandidate.bind(this));
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
  this._iceAgent.username = sdp.getUserName();
  this._iceAgent.localPassword = sdp.getPassword();

  //console.log(sdp.toString().split('\r\n'));

  return {
    sdp: sdp.toString(),
    type: 'offer',
  };
};

// This is part of the WebRTC spec (cmd+f 'general idea') under S 4.3.1
// there may be subsequent arguments, _oneAtATime is variadic. Callers of this
// function MUST pass their arguments on to this function. They must also
// return promises.
RTCPeerConnection.prototype._oneAtATime = function (fn) {
  return new Promise(function (resolve, reject) {
    this._operations.push(fn);
    if (this._operations.length === 1) {
      var args = Array.prototype.slice.call(arguments, 1);
      var p = this._operations[0].apply(this, args);
      p.then(function (results) {
        resolve(results);
        this._operations.splice(this._operations.indexOf(fn), 1);
        if (this._operations.length > 0) {
          // TODO: this would be step 4.2, not sure if it will occur
          throw new Error('more work to do see Issue #41');
        }
      }.bind(this)).catch(function (err) {
        reject(err);
      });
    }
  }.bind(this));
};

// TODO: add support for optional parameter
//https://w3c.github.io/webrtc-pc/#widl-RTCPeerConnection-createOffer-Promise-RTCSessionDescription--RTCOfferOptions-options
RTCPeerConnection.prototype.createOffer = function () {
  return this._oneAtATime(function () {
    this._iceAgent.controlling = true;
    var candidatesP = this._iceAgent.gatherHostCandidates();
    var certP = genCerts();
    return Promise.all([candidatesP, certP]).then(this._constructSDP.bind(this));
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
  return this._oneAtATime(function () {
    this.remoteDescription = desc;
    try {
      var sdp = SDP.fromString(desc.sdp);
      if (sdp.media && sdp.media.length > 0) {
        this._iceAgent.setRemoteCandidates(sdp.media[0].candidates);
        this._iceAgent.remotePassword = sdp.getPassword();
      } else {
        return Promise.reject('no media in remote session description');
      }
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }
  }.bind(this), desc);
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

function dispatchCandidate (candidate) {
  // `this` should be bound to an instance of a RTCPeerConnection
  this.dispatchEvent({
    type: 'icecandidate',
    // LOL at this nesting, but that's how it is...
    candidate: {
      candidate: SDP.candidateStr(candidate),
      sdpMid: '',
      sdpMLineIndex: 0,
    },
  });
};

module.exports = RTCPeerConnection;

