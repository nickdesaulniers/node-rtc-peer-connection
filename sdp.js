var fs = require('fs');
var sdpTransform = require('sdp-transform');

var falseSdpStr = fs.readFileSync('./offer_no_stun.txt', { encoding: 'utf8' });

function SDP () {
  this.sdpObj = sdpTransform.parse(falseSdpStr);
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

SDP.prototype.getUserName = function () {};
SDP.prototype.setUsername = function () {};
SDP.prototype.getPassword = function () {};
SDP.prototype.setPassword = function () {};

SDP.prototype.toString = function () {
  return sdpTransform.write(this.sdpObj);
};

module.exports = SDP;

