
var placemarks = [];
var index = 1;
for (var name in window) {
  if (name.indexOf("myPlacemark") == 0) {
    var placemark = window[name];

    if (placemark == undefined) {
      continue;
    }

    var hint = placemark.properties.get('hintContent');
    if (hint == undefined) {
      hint = placemark.properties.get('iconContent');
    }
    var balloon = placemark.properties.get('balloonContent');
    var preset = placemark.options.get('preset');
    if (preset == undefined) {
      preset = 'twirl#blueIcon';
    }
    var coordinates = placemark.geometry.getCoordinates();

    var obj = {
      'title': cleanUpTitle(hint),
      'latitude': coordinates[0],
      'longitude': coordinates[1],
      'type': springTypeFromPreset(preset),
      'urls': urlsFromBalloon(balloon),
      'index': index++
    };

    placemarks.push(obj);
  }
}

console.log(JSON.stringify(placemarks, null, 2));

/**
 * 
 * @param {String} title 
 */
function cleanUpTitle(title) {
  return title.trim().replace(/&quot;/g, '"');
}

/*
 * Function to get source type
 * https://tech.yandex.ru/maps/doc/jsapi/2.0/ref/reference/option.presetStorage-docpage/
 * 
 */
function springTypeFromPreset(preset) {
  if (preset.indexOf('blue') != -1) {
    return 'active';
  } else if (preset.indexOf('yellow') != -1) {
    return 'seasonal';
  } else if (preset.indexOf('black') != -1) {
    return 'inactive';
  } else if (preset.indexOf('red') != -1) {
    return 'mineral';
  } else {
    console.log("unknown preset " + preset);
  }
}

function urlsFromBalloon(balloon) {
  var re = /href="([^"]+)"/g;
  var match;
  var urls = [];
  while ((match = re.exec(balloon)) !== null) {
    var url = match[1];
    if (url.indexOf('http://') != 0) {
      url = 'http://rodnik-crimea.ru/' + url
    }

    if (is_web_iri(url)) {
      urls.push(url);
    } else {
      let fixers = [
        function (brokenURL) {
          return brokenURL.split(' ')[0]
        },
        function (brokenURL) {
          return encodeURI(brokenURL);
        }
      ];

      for (let fix of fixers) {
        var fixed = fix(url);
        if (is_web_iri(fixed)) {
          urls.push(fixed);
          break;
        }
      }
    }

  }
  return urls
}


// https://raw.githubusercontent.com/ogt/valid-url/master/index.js
// internal URI spitter method - direct from RFC 3986
function splitUri(uri) {
  var splitted = uri.match(/(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?/);
  return splitted;
};

function is_iri(value) {
  if (!value) {
    return;
  }

  // check for illegal characters
  if (/[^a-z0-9\:\/\?\#\[\]\@\!\$\&\'\(\)\*\+\,\;\=\.\-\_\~\%]/i.test(value)) return;

  // check for hex escapes that aren't complete
  if (/%[^0-9a-f]/i.test(value)) return;
  if (/%[0-9a-f](:?[^0-9a-f]|$)/i.test(value)) return;

  var splitted = [];
  var scheme = '';
  var authority = '';
  var path = '';
  var query = '';
  var fragment = '';
  var out = '';

  // from RFC 3986
  splitted = splitUri(value);
  scheme = splitted[1];
  authority = splitted[2];
  path = splitted[3];
  query = splitted[4];
  fragment = splitted[5];

  // scheme and path are required, though the path can be empty
  if (!(scheme && scheme.length && path.length >= 0)) return;

  // if authority is present, the path must be empty or begin with a /
  if (authority && authority.length) {
    if (!(path.length === 0 || /^\//.test(path))) return;
  } else {
    // if authority is not present, the path must not start with //
    if (/^\/\//.test(path)) return;
  }

  // scheme must begin with a letter, then consist of letters, digits, +, ., or -
  if (!/^[a-z][a-z0-9\+\-\.]*$/.test(scheme.toLowerCase())) return;

  // re-assemble the URL per section 5.3 in RFC 3986
  out += scheme + ':';
  if (authority && authority.length) {
    out += '//' + authority;
  }

  out += path;

  if (query && query.length) {
    out += '?' + query;
  }

  if (fragment && fragment.length) {
    out += '#' + fragment;
  }

  return out;
}

function is_http_iri(value, allowHttps) {
  if (!is_iri(value)) {
    return;
  }

  var splitted = [];
  var scheme = '';
  var authority = '';
  var path = '';
  var port = '';
  var query = '';
  var fragment = '';
  var out = '';

  // from RFC 3986
  splitted = splitUri(value);
  scheme = splitted[1];
  authority = splitted[2];
  path = splitted[3];
  query = splitted[4];
  fragment = splitted[5];

  if (!scheme) return;

  if (allowHttps) {
    if (scheme.toLowerCase() != 'https') return;
  } else {
    if (scheme.toLowerCase() != 'http') return;
  }

  // fully-qualified URIs must have an authority section that is
  // a valid host
  if (!authority) {
    return;
  }

  // enable port component
  if (/:(\d+)$/.test(authority)) {
    port = authority.match(/:(\d+)$/)[0];
    authority = authority.replace(/:\d+$/, '');
  }

  out += scheme + ':';
  out += '//' + authority;

  if (port) {
    out += port;
  }

  out += path;

  if (query && query.length) {
    out += '?' + query;
  }

  if (fragment && fragment.length) {
    out += '#' + fragment;
  }

  return out;
}

function is_https_iri(value) {
  return is_http_iri(value, true);
}

function is_web_iri(value) {
  return (is_http_iri(value) || is_https_iri(value));
}