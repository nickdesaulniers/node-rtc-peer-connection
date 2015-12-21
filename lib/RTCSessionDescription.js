function RTCSessionDescription (dict) {
  // https://w3c.github.io/webrtc-pc/#idl-def-RTCSessionDescriptionInit
  if (!dict.type) {
    throw new Error('type of session description required');
  }

  this.type = dict.type;
  this.sdp = dict.sdp || null;
};

module.exports = RTCSessionDescription;

