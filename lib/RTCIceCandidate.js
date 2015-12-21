function RTCIceCandidate (dict) {
  // https://w3c.github.io/webrtc-pc/#rtcicecandidate-dictionary
  this.candidate = dict.candidate;
  this.sdpMid = null;
  this.sdpMLineIndex
};

module.exports = RTCIceCandidate;

