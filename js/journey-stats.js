/**
 * Journey statistic tiles for /cacao-journeys/.
 * Counts and distances are COMPUTED from authoritative shared data:
 *   - cacao-journeys/journey-stops.json  (generated from the path pages' own data)
 *   - js/partners-data.js                (west-coast partner venues)
 *   - js/pacific-path-data.js            (pacific experiences)
 * Nothing here is hand-maintained. Re-run scripts/build_journey_stops.py after editing a path.
 */
(function () {
    'use strict';

    var WC_STATES = ['washington', 'oregon', 'california', 'arizona'];

    function setText(id, value) {
        var el = document.getElementById(id);
        if (el && value !== null && value !== undefined) el.textContent = value;
    }

    function toMiles(km) { return km * 0.621371; }

    function haversineKm(a, b) {
        var R = 6371;
        var dLat = (b.lat - a.lat) * Math.PI / 180;
        var dLon = (b.lon - a.lon) * Math.PI / 180;
        var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    }

    function pathMiles(stops) {
        var km = 0;
        for (var i = 1; i < stops.length; i++) km += haversineKm(stops[i - 1], stops[i]);
        return Math.round(toMiles(km));
    }

    function fmtMiles(m) { return '~' + m.toLocaleString('en-US'); }

    function westCoastPartners() {
        if (!window.PARTNERS_DATA) return null;
        var out = [];
        for (var slug in window.PARTNERS_DATA) {
            var p = window.PARTNERS_DATA[slug];
            var loc = (p && p.location ? p.location : '').toLowerCase();
            if (WC_STATES.some(function (s) { return loc.indexOf(s) !== -1; })) out.push(p);
        }
        return out;
    }

    function render(stops) {
        // Pacific West Coast: venues and experiences counted SEPARATELY (they are
        // different things and were previously mixed into one "Partner Venues" tile).
        var venues = westCoastPartners();
        if (venues !== null) setText('gathering-venues-count', venues.length);
        if (window.PACIFIC_PATH_DATA) {
            setText('gathering-experiences-count', Object.keys(window.PACIFIC_PATH_DATA).length);
        }

        // Pacific route distance runs NORTH -> SOUTH across the venues themselves.
        if (venues && venues.length > 1) {
            var wc = venues.slice().sort(function (a, b) { return b.lat - a.lat; });
            setText('gathering-distance', fmtMiles(pathMiles(wc)));
        }

        if (!stops) return;
        var br = stops.brazilian || [];
        if (br.length) {
            // Stops are emitted in the authoritative journeyOrder, so cumulative
            // distance follows the real route.
            setText('brazilian-farms-count', br.length);
            setText('brazilian-distance', fmtMiles(pathMiles(br)));
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        fetch('journey-stops.json', { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) { render(d); })
            .catch(function () { render(null); }); // stats remain blank rather than lie
    });
})();
