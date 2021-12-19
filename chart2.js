const toDate1 = (s) => {
	const matches = s.match(/(\d+)\/(\d+)\/(\d+)/);
	return new Date(matches[3], matches[2], matches[1]);
};

Promise.all([
	d3.csv("datasources/fuel-cleaned.csv", null, (data) => ({
		Date: toDate1(data["Date"]),
		Petrol: toFloat(data["ULSP pump"]),
		Diesel: toFloat(data["ULSD pump"]),
	})),

	d3.csv("datasources/Euro_6_latest.csv", null, (data) => ({
		Fuel: data["Fuel Type"],
		FuelConsumption: toFloat(data["WLTP Metric Combined"]) / 100 || 0, // litres / km
		ElectricityConsumption: toFloat(data["wh/km"]) || 0, // wh / km
	})),

	d3.csv("datasources/energy-cleaned.csv", null, (data) => ({
		Year: new Date(+data["Year"], 7, 1),
		UnitCost: toFloat(data["Average variable unit price (£/kWh)"]) * 100, // pence / kWh
	})),
]).then((files) => {
	const margin = {top: 0, right: 20, bottom: 10, left: 60};
	const scale = 0.9;
	const height = 300 / scale;
	const width = 500 / scale;

	const fuelData = files[0].filter((d) => d.Date >= new Date(2010, 1, 1)); // pence / litre

	const fuelConsumptionByVehicleType = files[1].reduce((grouped, v) => {
		grouped[v.Fuel] = grouped[v.Fuel]
			? {sum: grouped[v.Fuel].sum + v.FuelConsumption, count: grouped[v.Fuel].count + 1}
			: {sum: v.FuelConsumption, count: 1};
		return grouped;
	}, {});
	Object.keys(fuelConsumptionByVehicleType).forEach(
		(k) => (fuelConsumptionByVehicleType[k] = fuelConsumptionByVehicleType[k].sum / fuelConsumptionByVehicleType[k].count)
	); // litres / km
	const electricityConsumptionByVehicleType = files[1].reduce((grouped, v) => {
		grouped[v.Fuel] = grouped[v.Fuel]
			? {sum: grouped[v.Fuel].sum + v.ElectricityConsumption, count: grouped[v.Fuel].count + 1}
			: {sum: v.ElectricityConsumption, count: 1};
		return grouped;
	}, {});
	Object.keys(electricityConsumptionByVehicleType).forEach(
		(k) => (electricityConsumptionByVehicleType[k] = electricityConsumptionByVehicleType[k].sum / electricityConsumptionByVehicleType[k].count  / 1000)
	); // kWh/km

	const averageElectricityConsumption = electricityConsumptionByVehicleType.Electricity; // kWh / km;
	const averagePetrolConsumption = fuelConsumptionByVehicleType.Petrol; // litres / km
	const averageDieselConsumption = fuelConsumptionByVehicleType.Diesel; // litres / km

	var xScale = d3
		.scaleTime()
		.domain(d3.extent(fuelData, (d) => d.Date))
		.range([margin.left, width - margin.right]);

	const maxY = d3.max(fuelData, (data) => Math.max(data.Diesel * averageDieselConsumption, data.Petrol * averagePetrolConsumption)) + 1;

	const yScale = d3
		.scaleLinear()
		.domain([0, maxY])
		.rangeRound([height - margin.bottom, margin.top]);

	const svg = d3
		.select("#chart2")
		.append("svg")
		.attr("viewBox", `0 0 ${width} ${height}`) // Makes svg scale responsively
		.attr("width", "100%")
		.attr("height", "100%");

	svg.append("g").attr("class", "plot-area").attr("width", width);
	svg.append("g").attr("class", "x-axis");
	svg.append("g").attr("class", "y-axis");

	// Create x-axis
	svg.select(".x-axis")
		.attr("transform", `translate(0,${height - margin.bottom})`)
		.call(d3.axisBottom(xScale))
		.call((g) => g.selectAll(".tick text").attr("class", "axisTick").style("text-anchor", "center"));

	// Create y-axis
	svg.select(".y-axis")
		.attr("transform", `translate(${margin.left}, 0)`)
		.call(d3.axisLeft(yScale))
		.call((g) => g.selectAll(".tick text").attr("class", "axisTick").style("text-anchor", "end"))
		.call((g) =>
			g
				.append("text")
				.attr("x", 0)
				.attr("y", -50)
				.attr("class", "axisTick")
				.attr("fill", "currentColor")
				.attr("text-anchor", "center")
				.text("Vehicle running cost (pence / km)")
				.attr("transform", "rotate(-90)")
		);

	// Petrol Line
	svg.select(".plot-area")
		.append("path")
		.datum(fuelData)
		.attr("fill", "none")
		.attr("stroke", "#bc5090")
		.attr("stroke-width", 1.5)
		.attr(
			"d",
			d3
				.line()
				.x((d) => xScale(d.Date))
				.y((d) => yScale(d.Petrol * averagePetrolConsumption))
		);

	// Diesel Line
	svg.select(".plot-area")
		.append("path")
		.datum(fuelData)
		.attr("fill", "none")
		.attr("stroke", "#003f5c")
		.attr("stroke-width", 1.5)
		.attr(
			"d",
			d3
				.line()
				.x((d) => xScale(d.Date))
				.y((d) => yScale(d.Diesel * averageDieselConsumption))
		);

	// TODO: maybe needs a finer-grained data
	// Electric Line
	svg.select(".plot-area")
		.append("path")
		.datum(files[2])
		.attr("fill", "none")
		.attr("stroke", "#ffa600")
		.attr("stroke-width", 1.5)
		.attr(
			"d",
			d3
				.line()
				.x((d) => xScale(d.Year))
				.y((d) => yScale(d.UnitCost * averageElectricityConsumption))
		);


	const categories = ["Diesel", "Petrol", "Electric"];

	// Legend
	const legendWidth = 100;
	categories.forEach((r, i) => {
		svg.append("circle")
			.attr("cx", width - legendWidth)
			.attr("cy", 20 * i)
			.attr("r", 6)
			.style("fill", ["#003f5c", "#bc5090", "#ffa600"][i]);
		svg.append("text")
			.attr("x", width - legendWidth + 10)
			.attr("y", 1 + 20.5 * i)
			.text(r)
			.attr("class", "legendMark")
			.attr("alignment-baseline", "middle");
	});
});
