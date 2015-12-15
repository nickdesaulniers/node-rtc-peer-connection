var sdpTransform = require('sdp-transform');
var CandidateTypes = require('./ice-candidate').TYPES;

function Candidate (candidate) {
  this.foundation = 0;
  this.component = 0;
  this.transport = '';
  this.priority = 0;

  if (candidate.type === CandidateTypes.HOST) {
    this.ip = candidate.addr;
    this.port = candidate.port;
    this.type = 'host';
  } else if (candidate.type === CandidateTypes.SERVER_REFLEXIVE) {
    this.ip = candidate.addr;
    this.port = candidate.port;
    this.type = 'srflx';
    // srflx types also have
    // these are the LAN/internal ports
    this.raddr = '';
    this.rport = 0;
  }

  // TODO: there's probably also a turn type and turn specific things

  console.log(candidate);
};

function Media (candidates) {
  this.rtp = [];
  this.fmtp = [];
  this.type = '';
  this.port = 0;
  this.protocol = '';
  this.payloads = 0;
  this.candidates = [];
  this.connection = {};
  this.direction = '';
  this.endOfCandidates = '';
  this.icePwd = '';
  this.iceUfrag = '';
  this.mid = '';
  this.invalid = [];
  this.setup = '';
  this.ssrcs = [];

  for (var i = 0, len = candidates.length; i < len; ++i) {
    this.candidates.push(new Candidate(candidates[i]));
  }
};

// takes a list of candidates, and can generate an SDP string.
function SDP (candidates) {
  // in the form for sdp-transform to write to a string.
  this.version = 0;
  this.origin = {
    username: '',
    sessionId: '',
    sessionVersion: 0,
    netType: '',
    ipVer: 0,
    address: '',
  };
  this.name = '';
  this.timing = {
    start: 0,
    stop: 0,
  };
  this.direction = '';
  this.fingerprint = {
    type: '',
    hash: '',
  };
  this.iceOptions = '';
  this.msidSemantic = {
    semantic: '',
    token: '',
  };
  this.media = [
    new Media(candidates),
  ];
};

SDP.prototype.getExternalAddr = function () {
  return this.sdpObj.media[0].connection.ip;
};

SDP.prototype.setExternalAddr = function (addr) {
  this.sdpObj.media[0].connection.ip = addr;
};

SDP.prototype.getExternalPort = function () {
  return this.sdpObj.media[0].port;
};

SDP.prototype.setExternalPort = function (port) {
  this.sdpObj.media[0].port = port;
};

SDP.prototype.getUserName = function () {
  return this.sdpObj.media[0].iceUfrag;
};

SDP.prototype.setUsername = function (username) {
  this.sdpObj.media[0].iceUfrag = username;
};

SDP.prototype.getPassword = function () {
  return this.sdpObj.media[0].icePwd;
};

SDP.prototype.setPassword = function (password) {
  this.sdpObj.media[0].icePwd = password;
};

SDP.prototype.toString = function () {
  // TODO: memoize this
  return sdpTransform.write(this);
};

module.exports = SDP;

