const pointFill = "#666";

let selectedCity = null;

Promise.all([
	// https://bost.ocks.org/mike/map/uk.json
	d3.json("datasources/uk.json"),
	d3.csv("datasources/worldcities.csv", null, (data) => ({
		name: data.city,
		lat: data.lat,
		lng: data.lng,
		population: data.population,
		country: data.iso3,
	})),
]).then((files) => {
	const uk = files[0];
	const countries = topojson.feature(uk, uk.objects.subunits);
	// const cities = topojson.feature(uk, uk.objects.places);
	const excludedRegions = ["NIR", "IRL"];

	function latLongToCoordinates(lat, lng) {
		lng = (lng - uk.transform.translate[0]) / uk.transform.scale[0];
		lat = (lat - uk.transform.translate[1]) / uk.transform.scale[1];
		return [lng, lat];
	}

	const numCities = 70;
	const numLabels = 30;
	const pointSize = 3;
	const ukCities = files[1]
		.filter((c) => c.country === "GBR" && c.name !== "Belfast")
		.sort((a, b) => b.population - a.population)
		.slice(0, numCities)
		.map((c) => ({...c, coordinate: [c.lng, c.lat], scaledCoordinate: latLongToCoordinates(c.lat, c.lng)}));

	const width = 960;
	const height = 1160;
	const yOffset = 230;

	const projection = d3
		.geoAlbers()
		.center([1, 55.4])
		.rotate([4.4, 0])
		.parallels([50, 60])
		.scale(1200 * 5)
		.translate([width / 2, height / 2 - yOffset]);

	const pathFunction = d3.geoPath().projection(projection).pointRadius(pointSize);

	const svg = d3
		.select("#chart3")
		.append("svg")
		.attr("viewBox", `0 0 ${width} ${height - yOffset}`) // Makes svg scale responsively
		.attr("width", "100%")
		.attr("height", "100%");

	// Country outlines
	svg.selectAll(".subunit")
		.data(countries.features.filter((d) => !excludedRegions.includes(d.id)))
		.enter()
		.append("path")
		.attr("class", (d) => `subunit ${d.id}`)
		.attr("d", pathFunction);

	// Boundaries between countries
	svg.append("path")
		.datum(topojson.mesh(uk, uk.objects.subunits, (a, b) => a !== b && !excludedRegions.includes(a.id)))
		.attr("class", "subunit-boundary")
		.attr("d", pathFunction);

	// ukCities in GeoJson features format
	const geoUkCities = ukCities.map((c) => ({
		geometry: {coordinates: c.coordinate, type: "Point"},
		properties: {name: c.name},
		type: "Feature",
	}));

	// City markers
	const placePoints = svg
		.selectAll("place")
		.data(geoUkCities)
		.enter()
		.append("circle")
		.attr("class", "place")
		.attr("transform", (d) => "translate(" + projection(d.geometry.coordinates) + ")")
		.attr("cx", 0)
		.attr("cy", 0)
		.attr("r", (d) => pointSize)
		.attr("fill", pointFill)
		.on("mouseover", handleMouseOver)
		.on("mouseout", handleMouseOut)
		.on("click", handleMouseClick);

	svg.selectAll(".place-label")
		.data(geoUkCities.slice(0, numLabels))
		.enter()
		.append("text")
		.attr("class", "place-label")
		.attr("transform", (d) => "translate(" + projection(d.geometry.coordinates) + ")")
		.attr("x", (d) => (d.geometry.coordinates[0] > -1 ? 6 : -6))
		.attr("dy", ".35em")
		.style("text-anchor", (d) => (d.geometry.coordinates[0] > -1 ? "start" : "end"))
		.text((d) => d.properties.name);

    function addTextLabel(d) {
		svg.append("text")
			.attr("id", d.properties.name)
			.attr("class", "place-label")
			.attr("transform", "translate(" + projection(d.geometry.coordinates) + ")")
			.attr("x", d.geometry.coordinates[0] > -1 ? 6 : -6)
			.attr("dy", ".35em")
			.style("text-anchor", d.geometry.coordinates[0] > -1 ? "start" : "end")
			.text(d.properties.name);
    }

	function handleMouseOver(event, d) {
		d3.select(this)
			.attr("fill", colours[2])
			.attr("r", pointSize * 1.8);
        addTextLabel(d);
	}

	function handleMouseOut(event, d) {
		if (selectedCity !== d.properties.name) {
			d3.select(this).attr("fill", pointFill).attr("r", pointSize);
			d3.select(`#${d.properties.name}`)?.remove();
		}
	}

	function handleMouseClick(event, d) {
        d3.selectAll(`#${selectedCity}`).remove();
		if (!selectedCity || selectedCity !== d.properties.name) {
			selectedCity = d.properties.name;
            addTextLabel(d);
		} else {
			selectedCity = null;
		}
        // Update colours and size of place markers
		placePoints
			.attr("r", (d) => (selectedCity === d.properties.name ? 1.5 : 1) * pointSize)
			.attr("fill", (d) => (selectedCity === d.properties.name ? colours[1] : pointFill));
	}
});
