var EventTarget = require('event-target-shim');
var SDP = require('./sdp');
var promisify = require('promisify-node');
var ipInfo = promisify(require('./ip_info'));
var RTCDataChannel = require('./RTCDataChannel');
var IceAgent = require('./ice');
var util = require('util');

// https://w3c.github.io/webrtc-pc/#idl-def-RTCPeerConnection
function RTCPeerConnection (configuration) {
  EventTarget.call(this);

  // for debugging, will contain internal/external ip and ports after
  // createOffer
  this._info = null;
  this._configuration = null;
  this._markedForNegotiation = false;
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

  this._iceAgent = new IceAgent(this.getConfiguration());
  this._iceAgent.on('open', this._channelOpen.bind(this));
};

var emittedEvents = [
  'negotiationneeded'
];

util.inherits(RTCPeerConnection, EventTarget(emittedEvents));

RTCPeerConnection.prototype.constructSDPFromInfo = function (info) {
  this._info = info;

  var sdp = new SDP;
  sdp.setExternalAddr(info.external.addr);
  sdp.setExternalPort(info.external.port);
  // TODO: set internal ports?

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
        resolve(this._operations[0].call(this));
      }
    }.bind(this));
  }
  return p;
};

RTCPeerConnection.prototype.createOffer = function () {
  return this._oneAtATime(function () {
    return ipInfo().then(this.constructSDPFromInfo);
  });
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
    this._iceAgent.init(channel, this.getConfiguration());
  }.bind(this));

  return channel;
};

RTCPeerConnection.prototype._channelOpen = function (channel) {
  // https://w3c.github.io/webrtc-pc/#announce-datachannel-open
  if (this.signalingState === 'closed') {
    console.error('datachannel opened but signaling state closed');
    return;
  }
  channel.readyState = 'open';
  channel.dispatchEvent({ type: 'open' });
  if (this._dataChannels.length === 1) {
    this.dispatchEvent({ type: 'negotiationneeded' });
  }
};

RTCPeerConnection.prototype.setLocalDescription = function (desc) {
  // https://w3c.github.io/webrtc-pc/#widl-RTCPeerConnection-createOffer-Promise-RTCSessionDescription--RTCOfferOptions-options

  // TODO: verify that desc is a RTCSessionDescriptionInit
  // https://w3c.github.io/webrtc-pc/#idl-def-RTCSessionDescriptionInit
  this.localDescription = desc;

  return Promise.resolve(void 0);
};

module.exports = RTCPeerConnection;

