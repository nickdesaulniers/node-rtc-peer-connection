var SDP = require('./sdp');
var promisify = require('promisify-node');
var ipInfo = promisify(require('./ip_info'));

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

function constructSDPFromInfo (info) {
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

RTCPeerConnection.prototype.createOffer = function () {
  return ipInfo().then(constructSDPFromInfo.bind(this));
};

RTCPeerConnection.prototype.getConfiguration = function () {};
RTCPeerConnection.prototype.setConfiguration = function (configuration) {
  this.configuration = configuration;
};

module.exports = RTCPeerConnection;

