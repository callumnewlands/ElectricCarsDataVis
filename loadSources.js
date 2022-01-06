const sources = [
	{
        id: "euproposal",
		reference:
			"'Proposal for a Regulation of the European Parliament and of the Council Amending Regulation (EU) 2019/631'. COM / 2021/556 final (2021).",
		url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:52021PC0556",
	},
	{
        id: "eurostat",
		reference:
			"Eurostat, 'Gross and Net Production of Electricity and Derived Heat by Type of Plant and Operator', 2021.",
		url: "https://ec.europa.eu/eurostat/databrowser/view/NRG_IND_PEH__custom_1633739/default/table?lang=en",
	},
	{
        id: "ipcc",
		reference:
			"Schl&ouml;mer S. et al., 'Annex III: Technology-specific Cost and Performance Parameters'. In: Climate Change 2014: Mitigation of Climate Change., IPCC. 2014.",
		url: "https://www.ipcc.ch/site/assets/uploads/2018/02/ipcc_wg3_ar5_annex-iii.pdf#page=7",
	},
];

sources.forEach(
	(s, i) =>
		(document.getElementById("sourcesList").innerHTML += `<div id="${i + 1}" class="source">[${i + 1}]: ${
			s.reference
		} Available at: <a href="${s.url}">${s.url}</a></div>`)
);

Array.from(document.getElementsByClassName("ref")).forEach((ref) => {
    const i = sources.findIndex(s => s.id === ref.innerHTML) + 1;
    ref.innerHTML = `[${i}]`;
    ref.href = `#${i}`
});
