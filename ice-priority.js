// https://tools.ietf.org/html/rfc5245#section-2.3
// https://tools.ietf.org/html/rfc5245#section-4.1.2

function prioritize (typePref, localPref, componentID) {
  // https://tools.ietf.org/html/rfc5245#section-4.1.2.1
  return (Math.pow(2, 24) * typePref +
    Math.pow(2, 8) * localPref +
    256 - componentID) | 0;
};

