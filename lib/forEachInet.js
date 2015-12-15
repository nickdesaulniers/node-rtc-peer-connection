var os = require('os');

function forEachInet (cb) {
  var ifaces = os.networkInterfaces();
  for (var iface in ifaces) {
    for (var i = 0, len = ifaces[iface].length; i < len; ++i) {
      var inet = ifaces[iface][i];
      cb(inet);
    }
  }
};

module.exports = forEachInet;
