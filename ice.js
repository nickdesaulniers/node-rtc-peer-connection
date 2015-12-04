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
};

IceAgent.prototype.bind = function (fn) {
  this.socket.bind(fn);
};

module.exports = IceAgent;

