var sdpTransform = require('sdp-transform');
var CandidateTypes = require('./ice-candidate').TYPES;
var uFragPass = require('./ice-ufrag-pwd');

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

    // https://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-07#section-9.1
    // under <rel-addr> says this can be '0.0.0.0'.
    this.raddr = '0.0.0.0';
    this.rport = candidate.socket.address().port;
  }

  // TODO: there's probably also a turn type and turn specific things

  //console.log(candidate);
};

function Media (candidates) {
  this.rtp = [];
  this.fmtp = [];
  this.type = 'application';
  this.port = 0;// need to set
  this.protocol = 'DTLS/SCTP';
  this.payloads = 5000;
  // https://tools.ietf.org/html/rfc5245#section-21.1.1
  // https://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-07#section-9.1
  this.candidates = [];
  this.connection = {
    version: 0,// 4
    ip: '',
  };
  this.direction = 'sendrecv';
  this.endOfCandidates = 'end-of-candidates';
  // https://tools.ietf.org/html/rfc5245#section-21.1.5
  this.icePwd = uFragPass.password();
  // https://tools.ietf.org/html/rfc5245#section-21.1.6
  this.iceUfrag = uFragPass.ufrag();
  this.mid = '';// not sure what to set to
  this.invalid = []; // has an object { value: '' }
  this.setup = '';// 'actpass' ?
  this.ssrcs = [];// has an object { id: 0, attribute: '', value: '' }

  for (var i = 0, len = candidates.length; i < len; ++i) {
    this.candidates.push(new Candidate(candidates[i]));
  }
};

// takes a list of candidates, and can generate an SDP string.
function SDP (candidates) {
  // in the form for sdp-transform to write to a string.
  this.version = 0;
  this.origin = {
    username: 'node-rtc-peer-connection',
    sessionId: '',
    sessionVersion: 0,
    netType: '',
    ipVer: 4,
    address: '0.0.0.0',
  };
  this.name = '-';
  this.timing = {
    start: 0,
    stop: 0,
  };
  this.direction = 'sendrecv';
  this.fingerprint = {
    type: '',
    hash: '',
  };
  // https://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-07#section-9.6
  this.iceOptions = 'trickle';
  this.msidSemantic = {
    semantic: 'WMS',
    token: '*',
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

