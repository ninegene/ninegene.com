// CloudFront viewer-request function (runtime cloudfront-js-2.0).
//
// 1. www.ninegene.com/anything -> 301 to https://ninegene.com/anything (query kept)
// 2. The site is built with trailingSlash: 'always', and a private S3 bucket behind
//    origin access control does not serve directory indexes, so:
//      /              -> /index.html
//      /projects/     -> /projects/index.html
//      /projects      -> 301 redirect to /projects/ (query kept)
//      /rss.xml, /_astro/x.css (last segment has a dot) -> unchanged
//
// Adapted from winmetta/winmetta-platform (infra/pulumi/functions/viewer-request.js).
// Keep this file free of imports: CloudFront runs it as-is, and the tests in
// viewer-request.test.mjs load it as plain text. CloudFront calls handler by name.
var CANONICAL_HOST = 'ninegene.com';

// eslint-disable-next-line no-unused-vars
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var host = request.headers.host ? request.headers.host.value : '';

  if (host !== CANONICAL_HOST && host.indexOf('www.') === 0) {
    return redirect(
      'https://' + CANONICAL_HOST + uri + queryString(request.querystring),
    );
  }

  if (uri.charAt(uri.length - 1) === '/') {
    request.uri = uri + 'index.html';
    return request;
  }

  var lastSegment = uri.substring(uri.lastIndexOf('/') + 1);
  if (lastSegment.indexOf('.') === -1) {
    return redirect(uri + '/' + queryString(request.querystring));
  }

  return request;
}

function redirect(location) {
  return {
    statusCode: 301,
    statusDescription: 'Moved Permanently',
    headers: { location: { value: location } },
  };
}

function queryString(query) {
  var parts = [];
  for (var name in query) {
    var entry = query[name];
    if (entry.multiValue) {
      for (var i = 0; i < entry.multiValue.length; i++) {
        parts.push(name + '=' + entry.multiValue[i].value);
      }
    } else {
      parts.push(entry.value === '' ? name : name + '=' + entry.value);
    }
  }
  return parts.length ? '?' + parts.join('&') : '';
}
