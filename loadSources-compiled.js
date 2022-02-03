const sources = [{
  id: "euproposal",
  reference: "European Union, “Proposal for a regulation of the european parliament and of the council amending regulation(EU) 2019/631 as regards strengthening the CO2 emission performance standards for new passenger cars and new light commercial vehicles in line with the union\'s increased climate ambition.” COM/2021/556 final. 2021",
  url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:52021PC0556"
}, {
  id: "eurostat",
  reference: "Eurostat, “Gross and net production of electricity and derived heat by type of plant and operator.” 2021",
  url: "https://ec.europa.eu/eurostat/databrowser/view/NRG_IND_PEH__custom_1633739/default/table?lang=en"
}, {
  id: "ipcc",
  reference: "S. Schl&ouml;mer et al, “2014: Annex iii: Technology-specific cost and performance parameters,” in Climate Change 2014: Mitigation of Climate Change. Contribution of Working Group III to the Fifth Assessment Report of the Intergovernmental Panel on Climate Change (S. Schl ̈omer, ed.), (Cambridge, United Kingdom and New York, NY, USA), p. 1335, Cambridge University Press, 2014.",
  url: "https://www.ipcc.ch/site/assets/uploads/2018/02/ipcc_wg3_ar5_annex-iii.pdf#page=7"
}, {
  id: "evdatabase",
  reference: "Electric vehicle database",
  url: "https://ev-database.uk/"
}, {
  id: "carfuel",
  reference: "Vehicle Certification Agency, “Car fuel and emissions information.”",
  url: "https://carfueldata.vehicle-certification-agency.gov.uk/downloads/default.aspx"
}, {
  id: "fuelprices",
  reference: "Dep. for Business, Energy and Industrial Strategy, “Weekly road fuel prices.”",
  url: "https://www.gov.uk/government/statistics/weekly-road-fuel-prices"
}, {
  id: "energybills",
  reference: "Dep. for Business, Energy and Industrial Strategy, “Annual domestic energy bills.” ",
  url: "https://www.gov.uk/government/statistical-data-sets/annual-domestic-energy-price-statistics"
}, {
  id: "chargepoints",
  reference: "Office for Low Emission Vehicles, “National charge point registry.”",
  url: "https://data.gov.uk/dataset/1ce239a6-d720-4305-ab52-17793fedfac3/national-charge-point-registry"
}, {
  id: "cities",
  reference: "Simplemaps, “United Kingdom cities database.”",
  url: "https://simplemaps.com/data/gb-cities"
}, {
  id: "batteryEmissions",
  reference: "E. Emilsson and L. Dahll&ouml;f, “Lithium-ion vehicle battery production,” in Status 2019 on Energy Use, CO2 Emissions, Use of Metals, Products Environmental Footprint, and Recycling, IVL Swedish Environmental Research Institute, 2019.",
  url: "https://www.ivl.se/download/18.14d7b12e16e3c5c36271070/1574923989017/C444.pdf"
}, {
  id: "vehicleEmissions",
  reference: "Z. Hausfather, “Factcheck: How electric vehicles help to tackle climate change.”",
  url: "https://www.carbonbrief.org/factcheck-how-electric-vehicles-help-to-tackle-climate-change"
}, {
  id: "batteryCapacity",
  reference: "M. Kane, “Compare electric cars: Ev range, specs, pricing & more.” ",
  url: "https://insideevs.com/reviews/344001/compare-evs/"
}, {
  id: "natureUpstream",
  reference: "F. Knobloch, S. V. Hanssen, A. Lam, H. Pollitt, P. Salas, U. Chewpreecha, M. A. J. Huijbregts, and J.-F. Mercure, “Net emission reductions from electric cars and heat pumps in 59 world regions over time,” Nature Sustainability, vol. 3, no. 6, pp. 437–447, 2020.",
  url: "https://www.nature.com/articles/s41893-020-0488-7.epdf"
}, {
  id: "vauxhall",
  reference: "Vauxhall, “Corsa.”",
  url: "https://www.vauxhall.co.uk/cars/corsa/overview.html"
}, {
  id: "popularDiesel",
  reference: "S. Wilson, “Most popular diesel cars.”",
  url: "https://www.carshop.co.uk/latest-news/most-popular-diesel-cars/"
}, {
  id: "vwGolf",
  reference: "Vauxhall, “The golf price and specification guide.”",
  url: "https://www.volkswagen.co.uk/files/live/sites/vwuk/files/pdf/Brochures/golf-8-brochure-pricelist-p11d.pdf"
}, {
  id: "evBatteryLife",
  reference: "C. Cagatay, “How long should an electric car\'s battery last?.”",
  url: "https://www.myev.com/research/ev-101/how-long-should-an-electric-cars-battery-last"
}, {
  id: "conventionalLife",
  reference: "Auto Express, “High-mileage cars: should you buy one?.”",
  url: "https://www.autoexpress.co.uk/car-news/99536/high-mileage-cars-should-you-buy-one"
}, {
  id: "mapGeo",
  reference: "M. Bostock, “Let\'s make a map.”",
  url: "https://bost.ocks.org/mike/map/uk.json"
}];
sources.forEach((s, i) => document.getElementById("sourcesList").innerHTML += `<div id="${i + 1}" class="source">[${i + 1}]: ${s.reference} Available at: <a href="${s.url}">${s.url}</a></div>`);
Array.from(document.getElementsByClassName("ref")).forEach(ref => {
  const i = sources.findIndex(s => s.id === ref.innerHTML) + 1;
  ref.innerHTML = `[${i}]`;
  ref.href = `#${i}`;
});
