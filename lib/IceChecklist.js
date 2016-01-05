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
  this.pendingRequestTransactions = {};
  this.validList = [];
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

function thaw (pair) {
  if (pair.isFrozen()) {
    pair.unfreeze();
  }
};

IceChecklist.prototype.unfreezeAll = function () {
  this.candidatePairs.forEach(thaw);
};

function firstWaiting (pair) {
  return pair.isWaiting();
};

IceChecklist.prototype.highestPriorityWaiting = function () {
  // this.prioritize should have been called, so candidatePairs should already
  // be sorted.
  return this.candidatePairs.find(firstWaiting);
};

function firstFrozen (pair) {
  return pair.isFrozen();
};

IceChecklist.prototype.highestPriorityFrozen = function () {
  return this.candidatePairs.find(firstFrozen);
};

function failedOrSucceeded (pair) {
  return pair.isFailed() || pair.isSucceeded();
};

IceChecklist.prototype.checkForFailure = function () {
  if (!this.candidatePairs.some(failedOrSucceeded) &&
       this.validList.length === 0) {
    this.state = checklistStates.Failed;
    // TODO: maybe bubble this up?
    console.error('Ice Check list failure');
  }
};

module.exports = IceChecklist;

