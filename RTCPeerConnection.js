var SDP = require('./sdp');
var promisify = require('promisify-node');
var ipInfo = promisify(require('./ip_info'));
var RTCDataChannel = require('./RTCDataChannel');

// https://w3c.github.io/webrtc-pc/#idl-def-RTCPeerConnection
function RTCPeerConnection (configuration) {
  // for debugging, will contain internal/external ip and ports after
  // createOffer
  this._info = null;
  // https://w3c.github.io/webrtc-pc/#dom-peerconnection
  this.setConfiguration(configuration);
  this.signalingState = 'stable';
  this.iceConnectionState = 'new';
  this.iceGatheringState = 'new';
  this.pendingLocalDescription = null;
  this.currentLocalDescription = null;
  this.pendingRemoteDescription = null;
  this.currentRemoteDescription = null;
  this._operations = [];
};

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

RTCPeerConnection.prototype.getConfiguration = function () {};
RTCPeerConnection.prototype.setConfiguration = function (configuration) {
  this.configuration = configuration;
};

RTCPeerConnection.prototype.createDataChannel = function (label, dataChannelDict) {
  // https://w3c.github.io/webrtc-pc/#methods-9
  label = label || '';

  if (this.signalingState === 'closed') {
    throw new Error('InvalidStateError');
  }

  var channel = new RTCDataChannel;
  channel.label = label;

  // TODO: 4, 5, ...
};

module.exports = RTCPeerConnection;

