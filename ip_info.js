var dgram = require('dgram');
var os = require('os');
var stun = require('vs-stun');

var stunServer = {
  port: 19302,
  host: 'stun.l.google.com',
};

function IpInfo (internalPort, externalAddr, externalPort) {
  this.external = {
    addr: externalAddr,
    port: externalPort,
  };
  this.internal = {
    addr: getLocalIp(),
    port: internalPort,
  };
};

IpInfo.prototype = {
  // TODO: BAD this should be part of SDP generation, GH Issue #8
  getLocalString: function () {
    return 'candidate:0 1 UDP 2122252543 ' + this.internal.addr + ' ' +
      this.internal.port + ' typ host';
  },
  getExternalString: function () {
    return 'candidate:1 1 UDP 2122252543 ' + this.external.addr + ' ' +
      this.external.port + ' typ srflx raddr ' + this.internal.addr +
      ' rport ' + this.internal.port;
  },
};

function getLocalIp () {
  var ifaces = os.networkInterfaces();
  var ids = Object.keys(ifaces);
  for (var i = 0; i < ids.length; ++i) {
    var id = ids[i];
    var iface = ifaces[id];
    for (var j = 0; j < iface.length; ++j) {
      var conn = iface[j];
      if (conn.family === 'IPv4' && !conn.internal) {
        return conn.address;
      }
    }
  }
};

module.exports = function (cb) {
  var socket = dgram.createSocket('udp4');
  socket.bind(function () {
    stun.resolve(socket, stunServer, function (error, value) {
      if (error) return cb(error, null);
      var info = new IpInfo(value.local.port, value.public.host,
        value.public.port);
      cb(null, info);
    });
  });
  return socket;
};

