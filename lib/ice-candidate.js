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

// https://tools.ietf.org/html/rfc5245#section-2.4
// TODO: candidate pairs also have a foundation
ICECandidate.FOUNDATIONS = {};

module.exports = ICECandidate;

