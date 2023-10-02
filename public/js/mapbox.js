/* eslint-disable */

export const displayMap = (locations) => {
    mapboxgl.accessToken =
        'pk.eyJ1IjoiZ2FiZWJyeWFudDA0IiwiYSI6ImNsbjBjNnEwbDB4bDMyam51OTRoMGJta3IifQ.GhL-oOHhMe9hicb1RslzXQ';
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/gabebryant04/cln0cnfcx030h01pfgdpl2qsw',
        scrollZoom: false,
        // center: [-118.113491, 34.111745],
        // zoom: 6,
        // interactive: false,
    });

    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach((loc) => {
        const el = document.createElement('div');
        el.className = 'marker';

        new mapboxgl.Marker({
            element: el,
            anchor: 'bottom',
        })
            .setLngLat(loc.coordinates)
            .addTo(map);

        new mapboxgl.Popup({
            offset: 30,
        })
            .setLngLat(loc.coordinates)
            .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
            .addTo(map);

        bounds.extend(loc.coordinates);
    });

    map.fitBounds(bounds, {
        padding: {
            top: 200,
            bottom: 150,
            left: 100,
            right: 100,
        },
    });
};
