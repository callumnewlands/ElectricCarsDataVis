const names = ["chips", "hamburger", "ice cream", "hot dog", "pizza"];
const margin = {top: 0, right: 30, bottom: 90, left: 80};
const animate = {active: false, duration: 1000, delay: 50};
const barPadding = 0.3;
const scale = 0.9;
const height = 300 / scale;
const width = 500 / scale;

const toFloat = (s) => parseFloat(s.replaceAll(",", ""));
const average = (...vs) => vs.reduce((a, b) => a + b) / vs.length || 0;

Promise.all([
	d3.csv("datasources/eurostat-2019-cleaned.csv", null, (data) => ({
		Country: data["SIEC (Labels)"],
		Total: toFloat(data["Total"]), // Gross electricity production (kWh)
		Combustible: toFloat(data["Combustible fuels"]),
		Hydro: toFloat(data["Hydro"]),
		// Pumped Hydro is included in Hydro
		Geothermal: toFloat(data["Geothermal"]),
		Wind: toFloat(data["Wind"]),
		Solar: toFloat(data["Solar"]),
		Ocean: toFloat(data["Tide, wave, ocean"]),
		Nuclear:
			toFloat(data["Nuclear fuels and other fuels n.e.c."]) +
			toFloat(data["Other fuels n.e.c. - heat from chemical sources"]) +
			toFloat(data["Other fuels n.e.c."]),
	})),

	d3.csv("datasources/ipcc-cleaned.csv", null, (data) => ({
		Field: data["Technology"],
		Combustible: average(
			toFloat(data["Coal—Pulverized "]),
			toFloat(data["Gas—Combined Cycle"]),
			toFloat(data["Biomass—cofiring "]),
			toFloat(data["Biomass—dedicated "])
		),
		Hydro: toFloat(data["Hydropower "]),
		Geothermal: toFloat(data["Geothermal "]),
		Wind: average(toFloat(data["Wind onshore"]), toFloat(data["Wind offshore"])),
		Solar: average(toFloat(data["Solar PV—rooftop"]), toFloat(data["Solar PV—utility"])),
		Ocean: toFloat(data["Ocean"]),
		Nuclear: toFloat(data["Nuclear "]),
	})),

	d3.csv("datasources/Euro_6_latest.csv", null, (data) => ({
		Fuel: data["Fuel Type"],
		Emissions: toFloat(data["WLTP CO2"]) || 0, // gCo2e/km
		ElectricityConsumption: toFloat(data["wh/km"]) || 0,
	})),
]).then((files) => {
	const medianEmissionsByTechnology = files[1].filter((d) => d["Field"] === "Lifecycle Emissions Med")[0]; // gCo2eq/kWh

	const emissionsByCountry = files[0]
		.map((d) => ({
			Country: d["Country"],
			TotalEmissions: Object.entries(d)
				.filter((entry) => entry[0] !== "Total" && entry[0] !== "Country")
				.map((entry) => {
					const name = entry[0];
					const electricityProdution = entry[1];
					const productionFraction = electricityProdution / d.Total;
					return {
						Technology: name,
						Fraction: productionFraction,
						EmissionsFraction: medianEmissionsByTechnology[name] * productionFraction,
					};
				})
				.map((val) => val.EmissionsFraction)
				.reduce((a, b) => a + b),
		}))
		.sort((a, b) => a.TotalEmissions - b.TotalEmissions);

	const drivingEmissionsByVehicleType = files[2].reduce((grouped, v) => {
		grouped[v.Fuel] = grouped[v.Fuel]
			? {sum: grouped[v.Fuel].sum + v.Emissions, count: grouped[v.Fuel].count + 1}
			: {sum: v.Emissions, count: 1};
		return grouped;
	}, {});
	Object.keys(drivingEmissionsByVehicleType).forEach(
		(k) => (drivingEmissionsByVehicleType[k] = drivingEmissionsByVehicleType[k].sum / drivingEmissionsByVehicleType[k].count)
	); // gCo2e/km

	const electricityConsumptionByVehicleType = files[2].reduce((grouped, v) => {
		grouped[v.Fuel] = grouped[v.Fuel]
			? {sum: grouped[v.Fuel].sum + v.ElectricityConsumption, count: grouped[v.Fuel].count + 1}
			: {sum: v.Emissions, count: 1};
		return grouped;
	}, {});
	Object.keys(electricityConsumptionByVehicleType).forEach(
		(k) =>
			(electricityConsumptionByVehicleType[k] =
				electricityConsumptionByVehicleType[k].sum / electricityConsumptionByVehicleType[k].count / 1000)
	); // kWh/km

	// Electricity Production Emissions (gCo2e/kWh produced)
	const minCountryEmissions = emissionsByCountry[0];
	const maxCountryEmissions = emissionsByCountry.at(-2); // Exclude Kosovo
	const UKEmissions = emissionsByCountry.filter((entry) => entry["Country"] === "United Kingdom")[0];
	const EUEmissions = emissionsByCountry.filter((entry) => entry["Country"] === "European Union - 27 countries (from 2020)")[0];

	// Battery Production Emissions (gCo2e/kWh capacity)
	const batteryEmissions = ((106 + 61) / 2) * 1000; // TODO: error bars
	// % https://www.ivl.se/download/18.14d7b12e16e3c5c36271070/1574923989017/C444.pdf
	// % https://theicct.org/sites/default/files/publications/EV-life-cycle-GHG_ICCT-Briefing_09022018_vF.pdf

	// Vehicle Production Emissions (gCo2e/km)
	const electricVehicleProductionEmissionsPerKm = 38;
	// % Vehicle production emissions: 3.9-5.7 4.8 (median) \todo{?} (tonne CO\textsubscript{2}e/kg) 38 (g CO\textsubscript{2}e/km) \todo{Does this apply to conventional vehicles too?}
	// % https://www.researchgate.net/publication/301937291_The_size_and_range_effect_Lifecycle_greenhouse_gas_emissions_of_electric_vehicles
	// % https://www.carbonbrief.org/factcheck-how-electric-vehicles-help-to-tackle-climate-change
	// %  ^ TODO: Secondary Source -- not sure where the 38 came from
	const conventionalVehicleProductionEmissionsPerKm = 46;
	// %  ^ TODO: Secondary Source -- not sure where the 46 came from

	// TODO: Average electric vehicle battery guarantee (km)
	const averageElectricVehicleBatteryLifespan = 125000 * 1.60934;

	// TODO: Average electric vehicle battery capacity (kWh)
	const averageElectricVehicleBatteryCapactity = 83.2;
	// https://insideevs.com/reviews/344001/compare-evs/
	// ^ US cars -- is there a better one?

	// Battery Production Emissions (gCo2e/km)
	const batteryEmissionsPerKm = (batteryEmissions * averageElectricVehicleBatteryCapactity) / averageElectricVehicleBatteryLifespan;

	const petrolUpstreamPerKm = drivingEmissionsByVehicleType.Petrol * 0.26; // gCo2e/km
	const dieselUpstreamPerKm = drivingEmissionsByVehicleType.Diesel * 0.28; // gCo2e/km
	// https://www.nature.com/articles/s41893-020-0488-7.epdf?author_access_token=G9jnKroVkUnPiulAcQQnmtRgN0jAjWel9jnR3ZoTv0OMBHrNGD6k2npei17x4aWWU3THOMEr3_Ss7alTvOroTXMYpu_ZHB_Yt2QAzuEF4jz5ILos1vXSXV4NuIU2Y3ZD9AzYL1nZs6n_uK6EoCVA2w%3D%3D

	const originalData = [
		{
			type: "Diesel Vehicle",
			manufacture: conventionalVehicleProductionEmissionsPerKm,
			fuel: dieselUpstreamPerKm,
			exhaust: drivingEmissionsByVehicleType.Diesel,
		},
		{
			type: "Petrol Vehicle",
			manufacture: conventionalVehicleProductionEmissionsPerKm,
			fuel: petrolUpstreamPerKm,
			exhaust: drivingEmissionsByVehicleType.Petrol,
		},
		{type: ""},
		{
			type: "Electric Vehicle (" + maxCountryEmissions.Country + ")",
			manufacture: electricVehicleProductionEmissionsPerKm,
			battery: batteryEmissionsPerKm,
			fuel: electricityConsumptionByVehicleType.Electricity * maxCountryEmissions.TotalEmissions,
		},
		{
			type: "Electric Vehicle (" + minCountryEmissions.Country + ")",
			manufacture: electricVehicleProductionEmissionsPerKm,
			battery: batteryEmissionsPerKm,
			fuel: electricityConsumptionByVehicleType.Electricity * minCountryEmissions.TotalEmissions,
		},
		{
			type: "Electric Vehicle (UK)",
			manufacture: electricVehicleProductionEmissionsPerKm,
			battery: batteryEmissionsPerKm,
			fuel: electricityConsumptionByVehicleType.Electricity * UKEmissions.TotalEmissions,
		},
		{
			type: "Electric Vehicle (EU-average)",
			manufacture: electricVehicleProductionEmissionsPerKm,
			battery: batteryEmissionsPerKm,
			fuel: electricityConsumptionByVehicleType.Electricity * EUEmissions.TotalEmissions,
		},
	];

	const categories = ["manufacture", "battery", "fuel", "exhaust"];
	const categoryLabels = ["Vehicle Manufacture", "Battery Production", "Upstream Emissions", "Exhaust Emissions"];

	const data = d3.stack().keys(categories)(originalData);

	// data = emissionsByCountry.map((d) => ({x: d.Country, y: d.TotalEmissions})); //.sort((a, b)=> a.y - b.y)
	const svg = d3
		.select("#chart1")
		.append("svg")
		.attr("viewBox", `0 0 ${width} ${height}`) // Makes svg scale responsively
		.attr("width", "100%")
		.attr("height", "100%");

	svg.append("g").attr("class", "plot-area").attr("width", width);
	svg.append("g").attr("class", "x-axis");
	svg.append("g").attr("class", "y-axis");

	const xScale = d3
		.scaleBand()
		.domain(originalData.map((d) => d.type))
		.range([margin.left, width - margin.right])
		.padding(barPadding);

	const maxY =
		Object.entries(originalData[0])
			.filter((entry) => entry[0] !== "type")
			.map((entry) => entry[1])
			.reduce((a, b) => a + b) || 0;

	const yScale = d3
		.scaleLinear()
		.domain([0, maxY])
		.rangeRound([height - margin.bottom, margin.top]);

	const colorScale = d3.scaleOrdinal().range(["#003f5c", "#bc5090", "#ffa600", "#58508d", "#ff6361"]);

	// Create x-axis
	svg.select(".x-axis")
		.attr("transform", `translate(0,${height - margin.bottom})`)
		.call(d3.axisBottom(xScale).tickValues(xScale.domain().filter((d) => d)))
		.call((g) =>
			g
				.selectAll(".tick text")
				.attr("class", "axisTick")
				.style("text-anchor", "end")
				.attr("dx", "-.2em")
				.attr("dy", ".6em")
				.attr("transform", "rotate(-25)")
		);

	// Create x-axis
	svg.select(".y-axis")
		.attr("transform", `translate(${margin.left}, 0)`)
		.call(d3.axisLeft(yScale).ticks(7))
		.call((g) => g.selectAll(".tick text").attr("class", "axisTick").style("text-anchor", "end"))
		.call((g) =>
			g
				.append("text")
				.attr("x", 0)
				.attr("y", -50)
				.attr("class", "axisTick")
				.attr("fill", "currentColor")
				.attr("text-anchor", "center")
				.text("Emissions per km (C02e/km)")
				.attr("transform", "rotate(-90)")
		);

	const bars = svg
		.select(".plot-area")
		.selectAll("g.series")
		.data(data)
		.join("g")
		.classed("series", true)
		.style("fill", (d) => colorScale(d.key))
		.selectAll("rect")
		.data((d) => d)
		.join("rect")
		.attr("width", xScale.bandwidth())
		.attr("y", (d) => yScale(d[1]))
		.attr("x", (d) => xScale(d.data.type))
		.attr("height", (d) => yScale(d[0]) - yScale(d[1]) || 0);

	svg.select(".plot-area")
		.selectAll(".separator")
		.data(originalData.filter((d) => !d.type))
		.join("line")
		.attr("class", "separator")
		.attr("x1", (d) => xScale(d.type) + xScale.bandwidth() / 2)
		.attr("x2", (d) => xScale(d.type) + xScale.bandwidth() / 2)
		.attr("y1", (d) => yScale(0))
		.attr("y2", (d) => yScale(maxY))
		.attr("stroke", "gray")
		.attr("stroke-dasharray", 5);

	// Create animation
	if (animate.active) {
		bars.transition()
			.delay((d, i) => i * animate.delay)
			.duration(animate.duration)
			.attr("y", (d) => yScale(d[1]))
			.attr("height", (d) => yScale(d[0]) - yScale(d[1]));
	}

	// Legend
	const legendWidth = 180;
	categories.forEach((r, i) => {
		svg.append("circle")
			.attr("cx", width - legendWidth)
			.attr("cy", 10 + 20 * i)
			.attr("r", 6)
			.style("fill", colorScale(r));
		svg.append("text")
			.attr("x", width - legendWidth + 10)
			.attr("y", 10 + 20 * i)
			.text(categoryLabels[i])
			.attr("class", "legendMark")
			.attr("alignment-baseline", "middle");
	});
});