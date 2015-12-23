var Enum = require('enum');
var RTCIceCandidate = require('./RTCIceCandidate');

// https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-5.1.3.4
var iceStates = new Enum([
  'Waiting',
  'In-Progress',
  'Succeeded',
  'Failed',
  'Frozen' // let it gooooo.....
]);

function IceCandidatePair (localCandidate, remoteCandidate) {
  // As described in Figure 7 of
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-5.1.3.1
  if (!(localCandidate instanceof RTCIceCandidate)) {
    throw new TypeError('localCandidate is not an instance of RTCIceCandidate');
  }
  if (!(remoteCandidate instanceof RTCIceCandidate)) {
    throw new TypeError('remoteCandidate is not an instance of RTCIceCandidate');
  }

  this.local = localCandidate;
  this.remote = remoteCandidate;
  this.default = false;
  this.valid = true;
  this.nominated = false;
  // this.state.key will give you the corresponding string
  this.state = iceStates.Frozen;
};

module.exports = IceCandidatePair;

