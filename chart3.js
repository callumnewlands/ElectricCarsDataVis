const pointFill = "#777";

let selectedCity = null;

// d3.csv("datasources/worldcities.csv").then((data) => console.log(toBase64(data)));
// console.log(fromBase64(ipcc))

Promise.all([
	// https://bost.ocks.org/mike/map/uk.json
	fromBase64(ukMap),
	fromBase64(worldcities).map((data) => ({
		name: data.city,
		lat: data.lat,
		lng: data.lng,
		population: data.population,
		country: data.iso3,
	})),
	fromBase64(chargepointsData),
]).then((files) => {
	const uk = files[0];
	const countries = topojson.feature(uk, uk.objects.subunits);
	const cities = topojson.feature(uk, uk.objects.places);
	const excludedRegions = ["NIR", "IRL"];

	function latLongToCoordinates(lat, lng) {
		lng = (lng - uk.transform.translate[0]) / uk.transform.scale[0];
		lat = (lat - uk.transform.translate[1]) / uk.transform.scale[1];
		return [lng, lat];
	}

	function latLongDistance(lat1, lon1, lat2, lon2) {
		// Haversine distance

		const R = 6371e3; // Earths radius in m
		const phi1 = (lat1 * Math.PI) / 180;
		const phi2 = (lat2 * Math.PI) / 180;
		const delPhi = ((lat2 - lat1) * Math.PI) / 180;
		const delLam = ((lon2 - lon1) * Math.PI) / 180;

		const a =
			Math.sin(delPhi / 2) * Math.sin(delPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(delLam / 2) * Math.sin(delLam / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

		return (R * c) / 1000; // km
	}

	function isInsideRadius(d, selectedCity) {
		return (
			latLongDistance(
				d.geometry.coordinates[1],
				d.geometry.coordinates[0],
				selectedCity.geometry.coordinates[1],
				selectedCity.geometry.coordinates[0]
			) < averageRange
		);
	}

	const excludedCounties = [
		"Isle of Man",
		"NA",
		"County Antrim",
		"County Armagh",
		"County Tyrone",
		"County Down",
		"County Londonderry",
		"County Fermanagh",
		"Newtownabbey",
		"Down",
		"Galway County",
		"Wexford",
		"Dublin",
		"Belfast Greater",
	];
	const chargepoints = files[2].ChargeDevice.filter(
		(c) => c.ChargeDeviceStatus === "In service" && !excludedCounties.includes(c.ChargeDeviceLocation.Address.County)
	);

    const excludedCities = ["Belfast", "Islington", "Tottenham", "Ilford", "Enfield", "Birstall", "Sale", "Wythenshawe", "Romford"]

	const numCities = 50;
	const numLabels = 12;
	const pointSize = 3;
	const ukCities = files[1]
		.filter((c) => c.country === "GBR" && !excludedCities.includes(c.name))
		.sort((a, b) => b.population - a.population)
		.slice(0, numCities)
		.map((c) => ({...c, coordinate: [c.lng, c.lat], scaledCoordinate: latLongToCoordinates(c.lat, c.lng)}));

	// https://ev-database.uk/cheatsheet/range-electric-car
	const averageRange = 203 * 1.60934; // km
	// const averageRangeLat = averageRange / 110.574; // deg
	//     Latitude: 1 deg = 110.574 km
	// Longitude: 1 deg = 111.320*cos(latitude) km

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

	const background = svg.append("g").attr("class", "background");

	// Country outlines
	background
		.selectAll(".subunit")
		.data(countries.features.filter((d) => !excludedRegions.includes(d.id)))
		.enter()
		.append("path")
		.attr("class", (d) => `subunit ${d.id}`)
		.attr("d", pathFunction);

	// Boundaries between countries
	background
		.append("path")
		.datum(topojson.mesh(uk, uk.objects.subunits, (a, b) => a !== b && !excludedRegions.includes(a.id)))
		.attr("class", "subunit-boundary")
		.attr("d", pathFunction);

	// chargepoints in GeoJson features format
	const geoChargePoints = chargepoints.map((c) => ({
		geometry: {coordinates: [c.ChargeDeviceLocation.Longitude, c.ChargeDeviceLocation.Latitude], type: "Point"},
		properties: {name: c.ChargeDeviceName, county: c.ChargeDeviceLocation.Address.County},
		type: "Feature",
	}));

	// Charge points
	const chargeMarkers = svg
		.selectAll("chargepoint")
		.data(geoChargePoints)
		.enter()
		.append("circle")
		.attr("class", "chargepoint")
		.attr("transform", (d) => "translate(" + projection(d.geometry.coordinates) + ")")
		.attr("cx", 0)
		.attr("cy", 0)
		.attr("r", 1)
		.attr("fill", "transparent");

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
		.attr("r", pointSize)
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

	function addTextLabel(d, bold = false) {
		if (bold) {
			const width = `${0.55 * d.properties.name.length}rem`;
			const negativeWidth = `${-0.6 * d.properties.name.length}rem`;
			svg.append("rect")
				.attr("id", d.properties.name.replaceAll(" ", "_"))
				.attr("transform", "translate(" + projection(d.geometry.coordinates) + ")")
				.attr("height", "1em")
				.attr("width", width)
				.attr("x", d.geometry.coordinates[0] > -1 ? 5 : negativeWidth)
				.attr("y", "-.5em")
				.attr("rx", "4px")
				.attr("fill", "#ffffff")
				.text(d.properties.name);
		}
		svg.append("text")
			.attr("id", d.properties.name.replaceAll(" ", "_"))
			.attr("class", "place-label")
			.attr("transform", "translate(" + projection(d.geometry.coordinates) + ")")
			.attr("x", d.geometry.coordinates[0] > -1 ? 6 : -6)
			.attr("dy", ".35em")
			.attr(bold ? "font-weight" : undefined, 700)
			.style("text-anchor", d.geometry.coordinates[0] > -1 ? "start" : "end")
			.text(d.properties.name);
	}

	function handleMouseOver(event, d) {
		d3.select(this)
			.attr("fill", colours[0])
			.attr("r", pointSize * 1.8);
		if (!selectedCity || selectedCity.properties.name !== d.properties.name) {
			addTextLabel(d);
		}
	}

	function handleMouseOut(event, d) {
		if (!selectedCity || selectedCity.properties.name !== d.properties.name) {
			d3.select(this).attr("r", pointSize);
			d3.select(`#${d.properties.name.replaceAll(" ", "_")}`)?.remove();
		}
		d3.select(this).attr(
			"fill",
			selectedCity?.properties.name === d.properties.name
				? colours[1]
				: selectedCity && isInsideRadius(d, selectedCity)
				? "#111"
				: pointFill
		);
	}

	function handleMouseClick(event, d) {
		d3.selectAll(`#${selectedCity?.properties?.name?.replaceAll(" ", "_")}`).remove();
		d3.selectAll(".radius").remove();
		if (!selectedCity || selectedCity.properties.name !== d.properties.name) {
			selectedCity = d;
			const averageRangeLongitude = averageRange / (111.32 * Math.cos(parseFloat((d.geometry.coordinates[0] * Math.PI) / 180)));
			circlePoints = d3.geoCircle().center(d.geometry.coordinates).radius(averageRangeLongitude);
			background.append("path").datum(circlePoints).attr("class", "radius").attr("d", pathFunction);
			addTextLabel(d, true);
		} else {
			selectedCity = null;
		}
		// Updates colours and size of all place markers
		placePoints
			.attr("r", (d) => (selectedCity?.properties.name === d.properties.name ? 2 : 1) * pointSize)
			.attr("fill", (d) =>
				selectedCity?.properties.name === d.properties.name
					? colours[1]
					: selectedCity && isInsideRadius(d, selectedCity)
					? "#111"
					: pointFill
			);
		chargeMarkers.attr("fill", (d) => (selectedCity && isInsideRadius(d, selectedCity) ? "#a8c7a8" : "transparent"));
	}

	const categories = [
		{name: "Cities", colour: pointFill, area: false},
		{name: "Selected City", colour: colours[1], area: false},
		{name: "Cities reachable on 1 charge", colour: "#111", area: false},
		{name: "Chargepoints", colour: "#a8c7a8", area: false},
		{name: `Range on 1 charge (${Math.round(averageRange)}km)`, colour: colours[0], area: true},
	];

	// Legend
	const legendWidth = 280;
    const legendYOffset = 200;
	categories.forEach((r, i) => {
		svg.append("circle")
			.attr("cx", width - legendWidth)
			.attr("cy", legendYOffset + 20 * i)
			.attr("r", 6)
            .style("stroke", r.area ? r.colour : null)
			.style("fill", r.colour + (r.area ? "33" : ""));
		svg.append("text")
			.attr("x", width - legendWidth + 10)
			.attr("y", legendYOffset + 1 + 20.5 * i)
			.text(r.name)
			.attr("class", "legendMark")
			.attr("alignment-baseline", "middle");
	});
});
