const toDate1 = s => {
  const matches = s.match(/(\d+)\/(\d+)\/(\d+)/);
  return new Date(matches[3], matches[2], matches[1]);
};

Promise.all([d3.csv("datasources/fuel-cleaned.csv", null, data => ({
  Date: toDate1(data["Date"]),
  Petrol: toFloat(data["ULSP pump"]),
  Diesel: toFloat(data["ULSD pump"])
})), d3.csv("datasources/Euro_6_latest.csv", null, data => ({
  Fuel: data["Fuel Type"],
  FuelConsumption: toFloat(data["WLTP Metric Combined"]) / 100 || 0,
  // litres / km
  ElectricityConsumption: toFloat(data["wh/km"]) || 0 // wh / km

})), d3.csv("datasources/energy-cleaned.csv", null, data => ({
  Year: new Date(+data["Year"], 7, 1),
  UnitCost: toFloat(data["Average variable unit price (£/kWh)"]) * 100 // pence / kWh

}))]).then(files => {
  const margin = {
    top: 15,
    right: 20,
    bottom: 10,
    left: 60
  };
  const scale = 0.9;
  const height = 300 / scale;
  const width = 500 / scale; // Averafe fuel data over a number of days

  const fullFuelData = files[0].filter(d => d.Date >= new Date(2010, 1, 1)); // pence / litre

  const averageFactor = 28; // Number of days to average over

  const fuelData = [...Array(Math.floor(fullFuelData.length / averageFactor)).keys()].map(i => {
    let sumD = 0;
    let sumP = 0;
    const N = Math.min(averageFactor, fullFuelData.length - i * averageFactor);

    for (let n = 0; n < N; n++) {
      sumD += fullFuelData[i * averageFactor + n].Diesel;
      sumP += fullFuelData[i * averageFactor + n].Petrol;
    }

    return {
      Date: fullFuelData[i * averageFactor + Math.floor((averageFactor + 1) / 2)].Date,
      Petrol: sumP / N,
      Diesel: sumD / N
    };
  }); // TODO: error shading based on min-max averages

  const fuelConsumptionByVehicleType = files[1].reduce((grouped, v) => {
    grouped[v.Fuel] = grouped[v.Fuel] ? {
      sum: grouped[v.Fuel].sum + v.FuelConsumption,
      count: grouped[v.Fuel].count + 1
    } : {
      sum: v.FuelConsumption,
      count: 1
    };
    return grouped;
  }, {});
  Object.keys(fuelConsumptionByVehicleType).forEach(k => fuelConsumptionByVehicleType[k] = fuelConsumptionByVehicleType[k].sum / fuelConsumptionByVehicleType[k].count); // litres / km

  const electricityConsumptionByVehicleType = files[1].reduce((grouped, v) => {
    grouped[v.Fuel] = grouped[v.Fuel] ? {
      sum: grouped[v.Fuel].sum + v.ElectricityConsumption,
      count: grouped[v.Fuel].count + 1
    } : {
      sum: v.ElectricityConsumption,
      count: 1
    };
    return grouped;
  }, {});
  Object.keys(electricityConsumptionByVehicleType).forEach(k => electricityConsumptionByVehicleType[k] = electricityConsumptionByVehicleType[k].sum / electricityConsumptionByVehicleType[k].count / 1000); // kWh/km

  const averageElectricityConsumption = electricityConsumptionByVehicleType.Electricity; // kWh / km;

  const averagePetrolConsumption = fuelConsumptionByVehicleType.Petrol; // litres / km

  const averageDieselConsumption = fuelConsumptionByVehicleType.Diesel; // litres / km

  const [xmin, xmax] = d3.extent(fuelData, d => d.Date);
  xmax.setDate(xmax.getDate() - 13);
  const legendWidth = 50;
  var xScale = d3.scaleTime().domain([xmin, xmax]).range([margin.left, width - margin.right - legendWidth]);
  const maxY = d3.max(fuelData, data => Math.max(data.Diesel * averageDieselConsumption, data.Petrol * averagePetrolConsumption)) + 1;
  const yScale = d3.scaleLinear().domain([0, maxY]).rangeRound([height - margin.bottom, margin.top]);
  const svg = d3.select("#chart2").append("svg").attr("viewBox", `0 0 ${width} ${height}`) // Makes svg scale responsively
  .attr("width", "100%").attr("height", "100%");
  svg.append("g").attr("class", "plot-area").attr("width", width);
  svg.append("g").attr("class", "x-axis");
  svg.append("g").attr("class", "y-axis"); // Create x-axis

  svg.select(".x-axis").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(xScale).tickSizeOuter(0)).call(g => g.selectAll(".tick text").attr("class", "axisTick").style("text-anchor", "center")); // Create y-axis

  svg.select(".y-axis").attr("transform", `translate(${margin.left}, 0)`).call(d3.axisLeft(yScale).tickSizeOuter(0)).call(g => g.selectAll(".tick text").attr("class", "axisTick").style("text-anchor", "end")).call(g => g.append("text").attr("x", 0).attr("y", -50).attr("class", "axisTick").attr("fill", "currentColor").attr("text-anchor", "center").text("Vehicle running cost (pence / km)").attr("transform", "rotate(-90)")); // Petrol Line

  svg.select(".plot-area").append("path").datum(fuelData).attr("fill", "none").attr("stroke", colours[0]).attr("stroke-width", 1.5).attr("d", d3.line().x(d => xScale(d.Date)).y(d => yScale(d.Petrol * averagePetrolConsumption))); // Diesel Line

  svg.select(".plot-area").append("path").datum(fuelData).attr("fill", "none").attr("stroke", colours[1]).attr("stroke-width", 1.5).attr("d", d3.line().x(d => xScale(d.Date)).y(d => yScale(d.Diesel * averageDieselConsumption))); // Electric Line

  svg.select(".plot-area").append("path").datum(files[2]).attr("fill", "none").attr("stroke", colours[2]).attr("stroke-width", 1.5).attr("d", d3.line().x(d => xScale(d.Year)).y(d => yScale(d.UnitCost * averageElectricityConsumption)));
  const categories = ["Petrol", "Diesel", "Electric"]; // Legend
  // categories.forEach((r, i) => {

  svg.append("circle").attr("cx", xScale(fuelData[fuelData.length - 1].Date) + 10).attr("cy", yScale(fuelData[fuelData.length - 1].Petrol * averagePetrolConsumption)).attr("r", 6).style("fill", colours[0]);
  svg.append("text").attr("x", xScale(fuelData[fuelData.length - 1].Date) + 20).attr("y", 1 + yScale(fuelData[fuelData.length - 1].Petrol * averagePetrolConsumption)).text("Petrol").attr("class", "legendMark").attr("alignment-baseline", "middle");
  svg.append("circle").attr("cx", xScale(fuelData[fuelData.length - 1].Date) + 10).attr("cy", yScale(fuelData[fuelData.length - 1].Diesel * averageDieselConsumption)).attr("r", 6).style("fill", colours[1]);
  svg.append("text").attr("x", xScale(fuelData[fuelData.length - 1].Date) + 20).attr("y", 1 + yScale(fuelData[fuelData.length - 1].Diesel * averageDieselConsumption)).text("Diesel").attr("class", "legendMark").attr("alignment-baseline", "middle");
  const elecData = files[2];
  svg.append("circle").attr("cx", xScale(elecData[0].Year) + 10).attr("cy", yScale(elecData[0].UnitCost * averageElectricityConsumption)).attr("r", 6).style("fill", colours[2]);
  svg.append("text").attr("x", xScale(elecData[0].Year) + 20).attr("y", 1 + yScale(elecData[0].UnitCost * averageElectricityConsumption)).text("Electric").attr("class", "legendMark").attr("alignment-baseline", "middle"); // });
  // ===================================================================================================================
  //													Chart 2B
  // ===================================================================================================================
  // https://ev-database.uk/cheatsheet/price-electric-car

  const averageElectricVehicleCost = 48561; // £
  // Cost of Vauxhall Corsa (top selling car 2021)
  // https://www.vauxhall.co.uk/

  const averagePetrolVehicleCost = 17015; // £
  // Cost of VW Golf
  // https://www.carshop.co.uk/latest-news/most-popular-diesel-cars/
  // https://www.volkswagen.co.uk/files/live/sites/vwuk/files/pdf/Brochures/golf-8-brochure-pricelist-p11d.pdf

  const averageDiselVehicleCost = 26770; // £
  // https://www.rac.co.uk/drive/electric-cars/charging/how-long-do-electric-car-batteries-last/
  // also "the batteries in all electric cars sold in the U.S. are covered under warranty for at least 8 years or 100,000 miles"
  // Consumer Reports estimates the average EV battery pack’s lifespan to be at around 200,000 miles
  // https://www.myev.com/research/ev-101/how-long-should-an-electric-cars-battery-last

  const averageElectricLifespan = 100000 * 1.60934; // km
  // Most modern cars have a design life of at least 150,000 miles
  // https://www.autoexpress.co.uk/car-news/99536/high-mileage-cars-should-you-buy-one

  const averagePetrolLifespan = averageElectricLifespan;
  const averageDieselLifespan = averageElectricLifespan;
  const adjustedFuelData = fuelData.map(dp => ({
    Date: dp.Date,
    Diesel: dp.Diesel + averageDiselVehicleCost * 100 / averageDieselLifespan,
    Petrol: dp.Petrol + averagePetrolVehicleCost * 100 / averagePetrolLifespan
  }));
  const electricFuelData = files[2].map(dp => ({
    Year: dp.Year,
    UnitCost: dp.UnitCost + averageElectricVehicleCost * 100 / averageElectricLifespan
  }));
  const svgB = d3.select("#chart2B").append("svg").attr("viewBox", `0 0 ${width} ${height}`) // Makes svg scale responsively
  .attr("width", "100%").attr("height", "100%");
  svgB.append("g").attr("class", "plot-area").attr("width", width);
  svgB.append("g").attr("class", "x-axis");
  svgB.append("g").attr("class", "y-axis"); // Create x-axis

  svgB.select(".x-axis").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(xScale).tickSizeOuter(0)).call(g => g.selectAll(".tick text").attr("class", "axisTick").style("text-anchor", "center")); // Create y-axis

  svgB.select(".y-axis").attr("transform", `translate(${margin.left}, 0)`).call(d3.axisLeft(yScale).tickSizeOuter(0)).call(g => g.selectAll(".tick text").attr("class", "axisTick").style("text-anchor", "end")).call(g => g.append("text").attr("x", 0).attr("y", -50).attr("class", "axisTick").attr("fill", "currentColor").attr("text-anchor", "center").text("Vehicle purchase and running cost (pence / km)").attr("transform", "rotate(-90)")); // Petrol Line

  svgB.select(".plot-area").append("path").datum(adjustedFuelData).attr("fill", "none").attr("stroke", colours[0]).attr("stroke-width", 1.5).attr("d", d3.line().x(d => xScale(d.Date)).y(d => yScale(d.Petrol * averagePetrolConsumption))); // Diesel Line

  svgB.select(".plot-area").append("path").datum(adjustedFuelData).attr("fill", "none").attr("stroke", colours[1]).attr("stroke-width", 1.5).attr("d", d3.line().x(d => xScale(d.Date)).y(d => yScale(d.Diesel * averageDieselConsumption))); // Electric Line

  svgB.select(".plot-area").append("path").datum(electricFuelData).attr("fill", "none").attr("stroke", colours[2]).attr("stroke-width", 1.5).attr("d", d3.line().x(d => xScale(d.Year)).y(d => yScale(d.UnitCost * averageElectricityConsumption)));
  svgB.append("circle").attr("cx", xScale(adjustedFuelData[adjustedFuelData.length - 1].Date) + 10).attr("cy", yScale(adjustedFuelData[adjustedFuelData.length - 1].Petrol * averagePetrolConsumption) - 3).attr("r", 6).style("fill", colours[0]);
  svgB.append("text").attr("x", xScale(adjustedFuelData[adjustedFuelData.length - 1].Date) + 20).attr("y", 1 + yScale(adjustedFuelData[adjustedFuelData.length - 1].Petrol * averagePetrolConsumption) - 3).text("Petrol").attr("class", "legendMark").attr("alignment-baseline", "middle");
  svgB.append("circle").attr("cx", xScale(adjustedFuelData[adjustedFuelData.length - 1].Date) + 10).attr("cy", yScale(adjustedFuelData[adjustedFuelData.length - 1].Diesel * averageDieselConsumption) + 2).attr("r", 6).style("fill", colours[1]);
  svgB.append("text").attr("x", xScale(adjustedFuelData[adjustedFuelData.length - 1].Date) + 20).attr("y", 1 + yScale(adjustedFuelData[adjustedFuelData.length - 1].Diesel * averageDieselConsumption) + 2).text("Diesel").attr("class", "legendMark").attr("alignment-baseline", "middle");
  svgB.append("circle").attr("cx", xScale(electricFuelData[0].Year) + 10).attr("cy", yScale(electricFuelData[0].UnitCost * averageElectricityConsumption)).attr("r", 6).style("fill", colours[2]);
  svgB.append("text").attr("x", xScale(electricFuelData[0].Year) + 20).attr("y", 1 + yScale(electricFuelData[0].UnitCost * averageElectricityConsumption)).text("Electric").attr("class", "legendMark").attr("alignment-baseline", "middle");
});
