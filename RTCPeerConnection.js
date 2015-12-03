var SDP = require('./sdp');
var promisify = require('promisify-node');
var ipInfo = promisify(require('./ip_info'));

function RTCPeerConnection () {};

function constructSDPFromInfo (info) {
  this._info = info;

  var sdp = new SDP;
  sdp.setExternalAddr(info.external.addr);
  sdp.setExternalPort(info.external.port);
  // TODO: set internal ports?

  return {
    sdp: sdp.toString(),
    type: 'offer',
  };
};

RTCPeerConnection.prototype.createOffer = function () {
  return ipInfo().then(constructSDPFromInfo.bind(this));
};

module.exports = RTCPeerConnection;

