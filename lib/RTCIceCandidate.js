var copy = require('copy-to');
var isIp = require('is-ip');

// https://tools.ietf.org/html/rfc5245#section-4.1.2.2
// https://w3c.github.io/webrtc-pc/#idl-def-RTCIceCandidateType
var typePrefs = {
  host: 126,
  srflx: 100,
  relay: 0,
};

var foundationCounter = 0;

function prioritize (typePref, localPref, componentID) {
  // https://tools.ietf.org/html/rfc5245#section-4.1.2.1
  return (Math.pow(2, 24) * typePref +
    Math.pow(2, 8) * localPref +
    256 - componentID) | 0;
};

function computePriority (type, addr) {
  // https://tools.ietf.org/html/rfc5245#section-2.3
  // https://tools.ietf.org/html/rfc5245#section-4.1.2
  // https://tools.ietf.org/html/rfc5245#section-4.1.2.2
  var typePref = typePrefs[type];
  var localPref = isIp.v6(addr) ? 65535 : 0;
  var componentID = 0;
  return prioritize(typePref, localPref, componentID);
};

function RTCIceCandidate (dict) {
  // https://w3c.github.io/webrtc-pc/#rtcicecandidate-dictionary
  // members:
  //  candidate
  //  sdpMid
  //  sdpMLineIndex
  //  foundation
  //  priority
  //  ip
  //  protocol
  //  port
  //  type
  //  tcpType
  //  relatedAddress
  //  relatedPort

  if (!dict.candidate) {
    throw new Error('no candidate member specified');
  }

  copy(dict).to(this);
  this.priority = computePriority(this.type, this.ip);
  // https://tools.ietf.org/html/rfc5245#section-4.2
  this.foundation = this.foundation || foundationCounter++;
  this.protocol = this.protocol || 'udp';
};

module.exports = RTCIceCandidate;

