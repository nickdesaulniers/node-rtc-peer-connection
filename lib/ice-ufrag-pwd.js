// http://tools.ietf.org/html/rfc5245#section-15.1
// https://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-07#section-9.4
var iceChar = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/';

function getRandomStr (len) {
  var str = '';
  for (var i = 0; i < len; ++i) {
    str += iceChar[Math.random() * iceChar.length | 0];
  }
  return str;
};

// http://tools.ietf.org/html/rfc5245#section-15.4

module.exports = {
  ufrag: getRandomStr.bind(null, 4),
  password: getRandomStr.bind(null, 22),
};

