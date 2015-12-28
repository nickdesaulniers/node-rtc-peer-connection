# Node-RTCPeerConnection

An attempt (current WIP) to create a spec compliant implementation of
RTCPeerConnection for Node.js. This enables browser-peers to speak to
non-browser (Node.js) peers, or non-browser peer to non-browser peer
communication over RTCDataChannels.

This includes a FULL ICE implementation that works with SDP (as opposed to
SIP).

## Status

Able to initiate a call and
[connect successfully to Firefox](https://twitter.com/LostOracle/status/672532399138324480).

Not RFC compliant, can't receive calls, doesn't work with other browsers
(haven't tried).

- [x] STUN
- [ ] TURN
- [x] SDP
- [ ] SIP (no plans to implement)
- [ ] ICE Lite (no plans to implement)
- [ ] ICE Full
- [x] ICE Half Trickle
- [ ] ICE Full Trickle
- [ ] DTLS
- [ ] SCTP
- [ ] RTCPeerConnection
- [ ] DataChannel
- [ ] Audio/Video (not planned, but maybe)

The current process involves running `node server/server.js`, then opening
`localhost:8080` in Firefox, then running `node server/main.js`, checking
Firefox's `about:webrtc` logs, reload Firefox tab, and iterating.

## IETF RFC list
* [RFC 3264 - SDP Offer/Answer](https://tools.ietf.org/html/rfc3264)
* [RFC 4566 - SDP (Session Description Protocol)](https://tools.ietf.org/html/rfc4566)
* [RFC 4572 - SDP Fingerprint](https://tools.ietf.org/html/rfc4572)
* [RFC 5245 - ICE (Interactive Connectivity Establishment)](https://tools.ietf.org/html/rfc5245)
* [RFC 5389 - STUN (Session Traversal Utilities for NAT)](https://tools.ietf.org/html/rfc5389)
* [RFC 5766 - TURN (Traversal Using Relays around NAT)](https://tools.ietf.org/html/rfc5766)
* [RFC 6347 - DTLS (Datagram Transport Layer Security)](https://tools.ietf.org/html/rfc6347)
* [RFC 7064 - STUN URI Scheme](https://tools.ietf.org/html/rfc7064)

## IETF Drafts
Prefer these to specs when applicable.
* [DRAFT ICE-BIS - ICE (Interactive Connectivity Establishment)](https://tools.ietf.org/html/draft-ietf-ice-rfc5245bis-00)
* [DRAFT ICE-Trickle - Incremental Provisioning for ICE](https://tools.ietf.org/html/draft-ietf-ice-trickle-01)
* [DRAFT ICE-SDP-SIP - ICE w/ SDP & SIP](https://tools.ietf.org/html/draft-ietf-mmusic-ice-sip-sdp-07)
* [DRAFT SCTP-SDP - SCTP based media transport in SDP](https://tools.ietf.org/html/draft-ietf-mmusic-sctp-sdp-15)
* [DRAFT DCEP - WebRTC DCEP (Data Channel Establishment Protocol)](https://tools.ietf.org/html/draft-ietf-rtcweb-data-protocol-09)


## W3C Specs
* [WebRTC](https://w3c.github.io/webrtc-pc/)
* [JSEP (Javascript Session Establishment Protocol)](https://rtcweb-wg.github.io/jsep/)

## Useful reads
* [PeerConnection.js](https://dxr.mozilla.org/mozilla-central/source/dom/media/PeerConnection.js)
* [OpenTok.js](https://dxr.mozilla.org/mozilla-central/source/browser/extensions/loop/content/shared/vendor/sdk.js)

