var crypto = require('crypto');
var selfsigned = require('selfsigned');

// TODO: ECDSA P-256 curve
// https://w3c.github.io/webrtc-pc/#sec.cert-mgmt

var algorithm = 'sha256';
var opts = {
  algorithm: algorithm,
};

function attachFingerprint (pems) {
  var hasher = crypto.createHash(algorithm);
  hasher.update(pems.cert);
  var hex = hasher.digest('hex');
  var fingerprint = '';
  for (var i = 0, len = hex.length; i < len; i += 2) {
    fingerprint += hex[i].toUpperCase() + hex[i + 1].toUpperCase();
    if (i < len - 2) {
      fingerprint += ':';
    }
  }
  pems.fingerprint = {
    // Use the SDP format, as opposed to Node's.
    type: 'sha-256',
    hash: fingerprint,
  };
};

function createCertP (resolve, reject) {
  selfsigned.generate(null, opts, function (err, pems) {
    if (err) {
      reject(err);
    } else {
      attachFingerprint(pems);
      resolve(pems);
    }
  });
};

// Creates a self signed cert, used in DTLS and SDP fingerprint.
function createCert () {
  return new Promise(createCertP);
};

module.exports = createCert;

