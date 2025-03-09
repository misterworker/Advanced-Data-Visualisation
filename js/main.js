let lineChart;
let donutChart1;
let donutChart2;
let globalData = {};
let binnedData = {};
let globalFilteredData = {};
let donutData = [];
const color = d3.scaleOrdinal(d3.schemePastel2);

$("#district-select").on("change", function() {updateCharts(); updateScatterPlot();});
$("#property-type-select").on("change", function() {updateCharts(); updateScatterPlot();});
$("#area-type-select").on("change", function() {updateCharts(); updateScatterPlot();});

const areaMin = 10;
const areaMax = 17000;
const logMin = Math.log(areaMin);
const logMax = Math.log(areaMax);

$("#area-slider").slider({
  range: true,
  min: logMin,
  max: logMax,
  step: 0.01,
  values: [logMin, logMax],
  slide: (event, ui) => {
    const val1 = Math.exp(ui.values[0]);
    const val2 = Math.exp(ui.values[1]);

    $("#areaLabel1").text(Math.round(val1));
    $("#areaLabel2").text(Math.round(val2)); 

    updateCharts();
  },
  stop: (event, ui) => {
    updateScatterPlot();
  }
});

$("#areaLabel1").text(areaMin);
$("#areaLabel2").text(areaMax);

//Clear Filters
$("#clear-filters").on("click", () => {
  $("#district-select").val("All"); 
  $("#property-type-select").val("All"); 
  $("#area-type-select").val("All"); 

  $("#area-slider").slider("values", [logMin, logMax]);
  $("#areaLabel1").text(areaMin);
  $("#areaLabel2").text(areaMax);

  globalFilteredData = globalData;
  updateCharts();
  updateScatterPlot();
});

d3.csv("data/CommercialTrans_201910 to 202410.csv").then((data) => {
  const binSize = 10;
  data.forEach((d, i) => {
    d["id"] = i;
    d["Transacted Price ($)"] = +d["Transacted Price ($)"].replace(/,/g, '');
    d["Transacted Price ($)"] = Math.round(d["Transacted Price ($)"]);
    d["Area (SQFT)"] = +d["Area (SQFT)"];
    d["Unit Price ($ PSF)"] = +d["Unit Price ($ PSF)"].replace(/,/g, '');
    d["Area (SQM)"] = +d["Area (SQM)"].replace(/,/g, '');
    d["Unit Price ($ PSM)"] = +d["Unit Price ($ PSM)"].replace(/,/g, '');
    d["Area Bin (SQM)"] = Math.floor(d["Area (SQM)"] / binSize) * binSize;
    d["District Name"] = d["District Name"];
    d["Property Type"] = d["Property Type"];
  });

  globalData = data;

  lineChart = new LineChart("#line-area");
  scatterPlot = new Scatterplot("#scatterplot-area");
  donutChart1 = new DonutChart("#donut-area1", "Property Type");
  donutChart2 = new DonutChart("#donut-area2", "Type of Area");
  donutChart1.updateVis();
  donutChart2.updateVis();
});

function updateCharts() {
  lineChart.wrangleData();
  donutChart1.wrangleData();
  donutChart2.wrangleData();
};

function updateScatterPlot() {
  scatterPlot.wrangleData();
};
