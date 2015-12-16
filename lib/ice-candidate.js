function ICECandidate (type, socket, addr, port, foundation) {
  // https://tools.ietf.org/html/rfc5245#section-2.1
  this.type = type;
  this.socket = socket;
  // the addr and port are different from socket.address() in the case of
  // STUN and TURN.
  this.addr = addr;
  this.port = port;
  this.foundation = foundation;
};

ICECandidate.TYPES = {
  // obtained via local interfaces
  HOST: 0x00,
  // obtained via STUN
  SERVER_REFLEXIVE: 0x01,
  // obtained via TURN
  RELAYED: 0x03,
};

// https://tools.ietf.org/html/rfc5245#section-4.1.2.2
ICECandidate.TYPE_PREFERENCES = {};
ICECandidate.TYPE_PREFERENCES[ICECandidate.TYPES.HOST] = 126;
ICECandidate.TYPE_PREFERENCES[ICECandidate.TYPES.SERVER_REFLEXIVE] = 100;
ICECandidate.TYPE_PREFERENCES[ICECandidate.TYPES.RELAYED] = 0;


// https://tools.ietf.org/html/rfc5245#section-2.4
// TODO: candidate pairs also have a foundation
ICECandidate.FOUNDATIONS = {};

ICECandidate.prototype._prioritize = function (typePref, localPref, componentID) {
  // https://tools.ietf.org/html/rfc5245#section-4.1.2.1
  return (Math.pow(2, 24) * typePref +
    Math.pow(2, 8) * localPref +
    256 - componentID) | 0;
};

ICECandidate.prototype.computePriority = function () {
  // https://tools.ietf.org/html/rfc5245#section-2.3
  // https://tools.ietf.org/html/rfc5245#section-4.1.2
  // https://tools.ietf.org/html/rfc5245#section-4.1.2.2
  var typePref = ICECandidate.TYPE_PREFERENCES[this.type];
  var localPref = this.socket.address().family === 'IPv6' ? 65535 : 0;
  var componentID = 0;
  return this._prioritize(typePref, localPref, componentID);
};

module.exports = ICECandidate;

