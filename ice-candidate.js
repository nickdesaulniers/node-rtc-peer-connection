function ICECandidate (type, addr, port, foundation) {
  // https://tools.ietf.org/html/rfc5245#section-2.1
  this.type = type;
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

