var Enum = require('enum');
var IceCandidatePair = require('./IceCandidatePair');

// https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#section-5.1.3.4
var checklistStates = new Enum([
  // Would be nice to have a NOTSTARTED state.
  'Running',
  'Completed',
  'Failed'
]);

function IceChecklist () {
  this.candidatePairs = [];
  this.state = checklistStates.Running;
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

function firstWaiting (pair) {
  return pair.isWaiting();
};

IceChecklist.prototype.highestPriorityWaiting = function () {
  // this.prioritize should have been called, so candidatePairs should already
  // be sorted.
  this.candidatePairs.find(firstWaiting);
};

function firstFrozen (pair) {
  return pair.isFrozen();
};

IceChecklist.prototype.highetPriorityFrozen = function () {
  this.candidatePairs.find(firstFrozen);
};

module.exports = IceChecklist;

