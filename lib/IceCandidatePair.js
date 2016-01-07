var Enum = require('enum');
var RTCIceCandidate = require('./RTCIceCandidate');

// https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-5.1.3.4
var iceStates = new Enum([
  'Waiting',
  'InProgress',
  'Succeeded',
  'Failed',
  'Frozen' // let it gooooo.....
]);

function IceCandidatePair (localCandidate, remoteCandidate, iceControlling) {
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
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-6.1.3.2.2
  this.valid = false;
  this.nominated = false;
  // this.state.key will give you the corresponding string
  this.state = iceStates.Frozen;
  this.priority = this.computePriority(iceControlling);
};

// https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-5.1.3.2
function prioritize (g, d) {
  return Math.pow(2, 32) * Math.min(g, d) + 2 * Math.max(g, d) +
    (g > d ? 1 : 0);
};

IceCandidatePair.prototype.computePriority = function (iceControlling) {
  if (iceControlling) {
    return prioritize(this.local.priority, this.remote.priority);
  } else {
    return prioritize(this.remote.priority, this.local.priority);
  }
};

function toState (state) {
  return function () {
    this.state = state;
  };
};

IceCandidatePair.prototype.freeze = toState(iceStates.Frozen);
IceCandidatePair.prototype.unfreeze = toState(iceStates.Waiting);
IceCandidatePair.prototype.progress = toState(iceStates.InProgress);
IceCandidatePair.prototype.succeed = toState(iceStates.Succeeded);

function inState (state) {
  return function () {
    return this.state === state;
  };
};

IceCandidatePair.prototype.isWaiting = inState(iceStates.Waiting);
IceCandidatePair.prototype.isFrozen = inState(iceStates.Frozen);
IceCandidatePair.prototype.isFailed = inState(iceStates.Failed);
IceCandidatePair.prototype.isSucceeded = inState(iceStates.Succeeded);

module.exports = IceCandidatePair;

