var udp = require('dgram');

function IceAgent () {
  this.socket = udp.createSocket('udp4');
  this.internal = {
    addr: null,
    port: null,
  };
  this.external = {
    addr: null,
    port: null,
  };

  this.socket.on('listening', this.onlistening);
};

IceAgent.prototype.init = function (config) {
  // have to parse the stun server info out from config, GH Issue #12
  this.socket.bind();
};

IceAgent.prototype.onlistening = function (fn) {
  // ...
};

module.exports = IceAgent;

