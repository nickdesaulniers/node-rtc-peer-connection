// https://w3c.github.io/webrtc-pc/#rtcdatachannel

function RTCDataChannel () {
  // https://w3c.github.io/webrtc-pc/#idl-def-RTCDataChannel
  this.label = null;
  // TODO: ... GH Issue #9
  this.negotiated = false;
  this.protocol = '';
  this.maxPacketLifeTime = null;
  this.maxRetransmitts = null;
  this.readyState = 'connecting';
};

module.exports = RTCDataChannel;

