var IceCandidatePair = require('./IceCandidatePair');

function IceChecklist () {
  this.candidatePairs = [];
};

IceChecklist.prototype.add = function (pair) {
  if (!(pair instanceof IceCandidatePair)) {
    throw new TypeError('unable to add non-IceCandidatePair to ICE checklist');
  }
  this.candidatePairs.push(pair);
};

function descendingPriority (pairA, pairB) {
  return pairA.priority < pairB.priority
};

IceChecklist.prototype.prioritize = function () {
  this.candidatePairs.sort(descendingPriority);
};

function freeze (pair) { pair.freeze(); };
IceChecklist.prototype.freezeAll = function () {
  this.candidatePairs.forEach(freeze);
};

IceChecklist.prototype.unfreezeFirst = function () {
  if (this.candidatePairs.length > 0) {
    this.candidatePairs[0].unfreeze();
  }
};

module.exports = IceChecklist;

