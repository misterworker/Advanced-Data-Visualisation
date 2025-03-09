class LineChart {
  constructor(_parentElement) {
      this.parentElement = _parentElement;

      this.initVis();
  }

  initVis() {
      const vis = this;

      vis.MARGIN = {LEFT: 100, RIGHT: 100, TOP: 30, BOTTOM: 30};
      vis.WIDTH = 800 - vis.MARGIN.LEFT - vis.MARGIN.RIGHT;
      vis.HEIGHT = 450 - vis.MARGIN.TOP - vis.MARGIN.BOTTOM;

      vis.svg = d3
        .select(vis.parentElement)
        .append("svg")
        .attr("width", vis.WIDTH + vis.MARGIN.LEFT + vis.MARGIN.RIGHT)
        .attr("height", vis.HEIGHT + vis.MARGIN.TOP + vis.MARGIN.BOTTOM);

      vis.g = vis.svg
        .append("g")
        .attr("transform", `translate(${vis.MARGIN.LEFT}, ${vis.MARGIN.TOP})`);

      vis.bisectArea = d3.bisector((d) => d["Area Bin (SQM)"]).left;

      vis.g
        .append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "grey")
        .attr("stroke-width", "3px");

      vis.yLabel = vis.g
        .append("text")
        .attr("class", "y axisLabel")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -170)
        .attr("font-size", "16px")
        .attr("text-anchor", "middle")
        .text("Average Transaction Price ($)");

      vis.x = d3.scaleLog().base(10).range([0, vis.WIDTH]);
      vis.y = d3.scaleLog().base(10).range([vis.HEIGHT, 0]);

     

      vis.xAxisCall = d3.axisBottom().ticks(4).tickFormat(d3.format(".2s"));
      vis.yAxisCall = d3.axisLeft().ticks(4)
        .tickFormat(function(d) {
          return d3.format("0.2s")(d).replace(/G/, "B");
      });

      vis.xAxis = vis.g
        .append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0, ${vis.HEIGHT})`);
      vis.yAxis = vis.g.append("g").attr("class", "y axis");

      vis.wrangleData();
  }

  wrangleData() {
      const vis = this;

      vis.district = $("#district-select").val();
      vis.propertyType = $("#property-type-select").val();
      vis.areaType = $("#area-type-select").val();
      vis.sliderValues = $("#area-slider").slider("values").map(value => parseFloat(value.toFixed(2)));

      const linearMin = Math.exp(vis.sliderValues[0]);
      const linearMax = Math.exp(vis.sliderValues[1]);

      const localFilteredData = globalData
      .filter((d) => {
        const curArea = Number(d["Area Bin (SQM)"]);
        return curArea >= linearMin && curArea <= linearMax;
        })
      .filter((d) => {
      return (
          (!vis.district || vis.district === "All" || d["District Name"] === vis.district) &&
          (!vis.propertyType || vis.propertyType === "All" || d["Property Type"] === vis.propertyType) &&
          (!vis.areaType || vis.areaType === "All" || d["Type of Area"] === vis.areaType)
      );
      });

      globalFilteredData = localFilteredData

      if (localFilteredData.length < 2) {
        vis.g.selectAll(".no-data").remove();

        vis.g.append("text")
        .attr("class", "no-data")
        .attr("x", vis.WIDTH / 2)
        .attr("y", vis.HEIGHT / 2)
        .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("fill", "black")
        .text("Not enough data available for the selected filters");
        } else {
        vis.g.selectAll(".no-data").remove();
      }

      const filteredBinnedData = d3.rollup(
        localFilteredData,
        (v) => d3.mean(v, (d) => d['Transacted Price ($)']),
        (d) => Math.floor(d["Area (SQM)"] / 10) * 10
      );

      console.log(filteredBinnedData)

      vis.dataFiltered = Array.from(filteredBinnedData, ([areaBin, avgPrice]) => ({
        "Area Bin (SQM)": areaBin,
        "Avg Transacted Price ($)": Math.round(avgPrice),
      })).sort((a, b) => a["Area Bin (SQM)"] - b["Area Bin (SQM)"]);

      vis.updateVis();

      binnedData = vis.dataFiltered
  }


  updateVis() {
      const vis = this;

      vis.t = d3.transition().duration(1000);

      vis.x.domain(d3.extent(vis.dataFiltered, (d) => d["Area Bin (SQM)"]));
      vis.y.domain([
        d3.min(vis.dataFiltered, (d) => d['Avg Transacted Price ($)']) / 1.005,
        d3.max(vis.dataFiltered, (d) => d['Avg Transacted Price ($)']) * 1.005,
      ]);

      vis.xAxisCall.scale(vis.x);
      vis.xAxis.transition(vis.t).call(vis.xAxisCall);
      vis.yAxisCall.scale(vis.y);
      vis.yAxis.transition(vis.t).call(vis.yAxisCall);

      vis.xAxis.selectAll("text")
      .attr("transform", "rotate(70)")
      .attr("x", 15)
      .attr("font-size", "8px");

      vis.yAxis.selectAll("text")
      .attr("y", 15)
      .attr("font-size", "8px");

      vis.g.select(".focus").remove();
      vis.g.select(".overlay").remove();

      /******************************** Tooltip Code ********************************/
      vis.focus = vis.g.append("g").attr("class", "focus").style("display", "none");
      vis.focus.append("line").attr("class", "x-hover-line hover-line").attr("y1", 0).attr("y2", vis.HEIGHT);
      vis.focus.append("line").attr("class", "y-hover-line hover-line").attr("x1", 0).attr("x2", vis.WIDTH);
      vis.focus.append("circle").attr("r", 7.5);
      vis.focus.append("text").attr("x", 15).attr("dy", ".31em");

      vis.g
        .append("rect")
        .attr("class", "overlay")
        .attr("width", vis.WIDTH)
        .attr("height", vis.HEIGHT)
        .on("mouseover", () => vis.focus.style("display", null))
        .on("mouseout", () => vis.focus.style("display", "none"))
        .on("mousemove", mousemove);

      function mousemove(event) {
        const [mx] = d3.pointer(event, this);
        const x0 = vis.x.invert(mx);
        const i = vis.bisectArea(vis.dataFiltered, x0, 1);
        const d0 = vis.dataFiltered[i - 1];
        const d1 = vis.dataFiltered[i];
        const d = x0 - d0["Area Bin (SQM)"] > d1["Area Bin (SQM)"] - x0 ? d1 : d0;
        vis.focus.attr("transform", `translate(${vis.x(d["Area Bin (SQM)"])}, ${vis.y(d['Avg Transacted Price ($)'])})`);
        vis.focus.select("text").text(d3.format(",")(d['Avg Transacted Price ($)']));
        vis.focus.select(".x-hover-line").attr("y2", vis.HEIGHT - vis.y(d['Avg Transacted Price ($)']));
        vis.focus.select(".y-hover-line").attr("x2", -vis.x(d["Area Bin (SQM)"]));
      }
      /******************************** Tooltip Code ********************************/

      vis.line = d3.line()
      .x((d) => vis.x(d["Area Bin (SQM)"]))
      .y((d) => vis.y(d['Avg Transacted Price ($)']));

      vis.g.select(".line")
      .attr("stroke", color(vis.propertyType || vis.district || vis.areaType))
      .transition(vis.t)
      .attr("d", vis.line(vis.dataFiltered));

      vis.yLabel.text('Avg Transacted Price ($)'.replace(/_/g, " "));
  }
}
