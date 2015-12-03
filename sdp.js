var fs = require('fs');
var sdpTransform = require('sdp-transform');

var falseSdpStr = fs.readFileSync('./offer_no_stun.txt', { encoding: 'utf8' });

function SDP (str) {
  this.sdpObj = sdpTransform.parse(str || falseSdpStr);
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

SDP.prototype.getUserName = function () {
  return this.sdpObj.media[0].iceUfrag;
};

SDP.prototype.setUsername = function (username) {
  this.sdpObj.media[0].iceUfrag = username;
};

SDP.prototype.getPassword = function () {
  return this.sdpObj.media[0].icePwd;
};

SDP.prototype.setPassword = function (password) {
  this.sdpObj.media[0].icePwd = password;
};

SDP.prototype.toString = function () {
  return sdpTransform.write(this.sdpObj);
};

module.exports = SDP;

