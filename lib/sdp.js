var sdpTransform = require('sdp-transform');
var uFragPass = require('./ice-ufrag-pwd');
var BigNum = require('bignumber.js');


function Candidate (candidate) {
  // https://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-07#section-9.1
  this.foundation = candidate.foundation;
  this.component = 1;
  this.transport = candidate.protocol.toUpperCase();
  this.priority = candidate.priority;

  if (candidate.type === 'host') {
    this.ip = candidate.ip;
    this.port = candidate.port;
    this.type = 'host';
  } else if (candidate.type === 'srflx') {
    this.ip = candidate.ip;
    this.port = candidate.port;
    this.type = 'srflx';
    this.raddr = candidate.relatedAddress;
    this.rport = candidate.relatedPort;
  }

  // TODO: there's probably also a turn type and turn specific things
  // and peer reflexive

  //console.log(candidate);
};

function Media (candidates) {
  //this.rtp = [];
  //this.fmtp = [];
  this.type = 'application';
  this.protocol = 'DTLS/SCTP';
  this.payloads = 5000;
  // https://tools.ietf.org/html/rfc5245#section-21.1.1
  // https://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-07#section-9.1
  this.candidates = [];
  this.direction = 'sendrecv';
  // We don't want to send this for trickle
  //this.endOfCandidates = 'end-of-candidates';
  // https://tools.ietf.org/html/rfc5245#section-21.1.5
  // https://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-07#section-17.1.5
  this.icePwd = uFragPass.password();
  // https://tools.ietf.org/html/rfc5245#section-21.1.6
  // https://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-07#section-17.1.6
  // https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00#appendix-B.4
  this.iceUfrag = uFragPass.ufrag();
  // https://tools.ietf.org/html/rfc5888#section-6
  // has something to do with SDP "grouping" ???
  //this.mid = '';
  // Note sure what this is for, yet?
  this.invalid = [
    {
      value: 'sctpmap:5000 webrtc-datachannel 256',
    }
  ];
  // Used in DTLS
  // https://tools.ietf.org/html/rfc4572#section-6.2
  //this.setup = '';// 'actpass' ?
  //this.ssrcs = [];// has an object { id: 0, attribute: '', value: '' }

  this.port = 0;
  this.connection = {
    version: 4,
    ip: '0.0.0.0',
  };

  for (var i = 0, len = candidates.length; i < len; ++i) {
    var candidate = candidates[i];
    this.candidates.push(new Candidate(candidate));
    if (i === 0) {
      this.port = candidate.port;
    }
  }
};

// takes a list of candidates, and can generate an SDP string.  While numerous
// RFCs and Specs talk about what should be included in offers, the info is
// highly fragmented, and the best source of truth seems to be
// https://rtcweb-wg.github.io/jsep/#rfc.section.5.2.1 .
function SDP (candidates, fingerprint) {
  // In the form for sdp-transform to write to a string.  These variables refer
  // to the session, as opposed to individual pieces of media.
  this.version = 0;
  this.origin = {
    username: 'node-rtc-peer-connection',
    // https://rtcweb-wg.github.io/jsep/#rfc.section.5.2.1
    // https://tools.ietf.org/html/rfc3264#section-5
    sessionId: random62bInt(),
    sessionVersion: 0,
    netType: 'IN',
    ipVer: 4,
    address: '0.0.0.0',
  };
  this.name = '-';
  this.timing = {
    start: 0,
    stop: 0,
  };
  this.direction = 'sendrecv';
  // https://tools.ietf.org/html/rfc4572#section-5
  this.fingerprint = fingerprint;
  // https://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-07#section-9.6
  // https://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-07#section-17.1.8
  this.iceOptions = 'trickle';
  // Used in JSEP
  // https://rtcweb-wg.github.io/jsep/#rfc.section.5.2.1
  //this.msidSemantic = {
    //semantic: 'WMS',
    //token: '*',
  //};
  this.media = [
    new Media(candidates),
  ];
};

SDP.prototype.getExternalAddr = function () {
  return this.media[0].connection.ip;
};

SDP.prototype.setExternalAddr = function (addr) {
  this.media[0].connection.ip = addr;
};

SDP.prototype.getExternalPort = function () {
  return this.media[0].port;
};

SDP.prototype.setExternalPort = function (port) {
  this.media[0].port = port;
};

SDP.prototype.getUsername = function () {
  return this.media[0].iceUfrag;
};

SDP.prototype.setUsername = function (username) {
  this.media[0].iceUfrag = username;
};

SDP.prototype.getPassword = function () {
  return this.media[0].icePwd;
};

SDP.prototype.setPassword = function (password) {
  this.media[0].icePwd = password;
};

SDP.prototype.toString = function () {
  return sdpTransform.write(this);
};

SDP.fromString = function (str) {
  return Object.assign(Object.create(SDP.prototype), sdpTransform.parse(str));
};

SDP.candidateStr = function (candidate) {
  // candidate should be a RTCIceCandidate
  // TODO: enforce with instanceof or duck typing?

  // TODO: this is largely duplicated from sdp-transform/lib/grammar.js
  var str = 'candidate:' + [
    candidate.foundation,
    '1', // component
    candidate.protocol,
    candidate.priority,
    candidate.ip,
    candidate.port,
    'typ',
    candidate.type
  ].join(' ');

  if (candidate.type === 'srflx') {
    str += ' raddr ' + candidate.relatedAddress + ' rport ' +
      candidate.relatedPort;
  }

  return str;
};

// returns a string representing a random 62b Integer.
var random62bInt = (function () {
  var twoToSixtyFour = (new BigNum(2)).toPower(62);
  return function () {
    return twoToSixtyFour.mul(BigNum.random()).floor().toString();
  };
})();

// Mozilla's SDP implementation:
// https://dxr.mozilla.org/mozilla-central/source/media/webrtc/signaling/src/sdp

module.exports = SDP;

