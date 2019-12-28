/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts("https://storage.googleapis.com/workbox-cdn/releases/4.3.1/workbox-sw.js");

workbox.core.setCacheNameDetails({prefix: "stellerator-ng"});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [
  {
    "url": "app.css",
    "revision": "37580ba3332df7724cedbb65c7b0f699"
  },
  {
    "url": "app.js",
    "revision": "8f8a9e2d57f5007ad6595e4cfb97568e"
  },
  {
    "url": "assets/fonts/PxPlus_IBM_VGA8.woff",
    "revision": "d11865c6df8c39a8a41590c9be78fc72"
  },
  {
    "url": "assets/fonts/PxPlus_IBM_VGA8.woff2",
    "revision": "40ccbd06c480f6bea775395d0eb0fcec"
  },
  {
    "url": "assets/stellerator-favicon.png",
    "revision": "0d9aae2be8d091eb861bd6ab3472ec77"
  },
  {
    "url": "assets/stellerator-homescreen-icon.png",
    "revision": "1bf9822fccdc3954f9db454e46427228"
  },
  {
    "url": "doc/cpu.md",
    "revision": "ca1dfe50c534a6f6edf1a38e445d38ff"
  },
  {
    "url": "doc/images/2600_touch_alt_lh.jpg",
    "revision": "7e298c22570812fe96f4abcc71d0a17f"
  },
  {
    "url": "doc/images/2600_touch_alt.jpg",
    "revision": "6e5ecb09ec544cc4aa1f302455d78409"
  },
  {
    "url": "doc/images/2600_touch_lh.jpg",
    "revision": "d78fd86994b79861d64986d36130be96"
  },
  {
    "url": "doc/images/2600_touch.jpg",
    "revision": "a772fb6b3465c49a00f0a5a2a507f4c6"
  },
  {
    "url": "doc/internals/stella.md",
    "revision": "2c7b196378e278e96d728797ffd35dfc"
  },
  {
    "url": "doc/stellerator_embedded.md",
    "revision": "ee72885255c4112c465d6ec7c617c648"
  },
  {
    "url": "doc/stellerator.md",
    "revision": "ec06ac704371f8a10139f98a0a9352d8"
  },
  {
    "url": "index.html",
    "revision": "152bde26bd7b73796cbbf8609663c9ee"
  },
  {
    "url": "worker/stellerator.min.js",
    "revision": "e3b68fb65b04e34209bed02b502c0e17"
  },
  {
    "url": "worker/video-pipeline.min.js",
    "revision": "6873d445c4af8ac7cbcd2044809fe25f"
  }
].concat(self.__precacheManifest || []);
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});
