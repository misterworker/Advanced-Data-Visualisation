class DonutChart {
  constructor(_parentElement, _variable) {
    this.parentElement = _parentElement;
    this.variable = _variable;
    this.initVis();
  }

  initVis() {
    const vis = this;

    vis.MARGIN = { LEFT: 0, RIGHT: 0, TOP: 40, BOTTOM: 0 };
    vis.WIDTH = 250 - vis.MARGIN.LEFT - vis.MARGIN.RIGHT;
    vis.HEIGHT = 350 - vis.MARGIN.TOP - vis.MARGIN.BOTTOM;
    vis.RADIUS = Math.min(vis.WIDTH, vis.HEIGHT) / 2;

    vis.svg = d3
      .select(vis.parentElement)
      .append("svg")
      .attr("width", vis.WIDTH + vis.MARGIN.LEFT + vis.MARGIN.RIGHT + 100)
      .attr("height", vis.HEIGHT + vis.MARGIN.TOP + vis.MARGIN.BOTTOM);

    vis.g = vis.svg.append("g").attr(
      "transform",
      `translate(${vis.MARGIN.LEFT + vis.WIDTH / 2}, 
        ${vis.MARGIN.TOP + vis.HEIGHT / 2})`
    );

    vis.legendG = vis.svg.append("g").attr(
      "transform",
      `translate(${vis.WIDTH}, ${vis.MARGIN.TOP})`
    );

    vis.pie = d3
      .pie()
      .padAngle(0.03)
      .value((d) => d.count)
      .sort(null);

    vis.arc = d3
      .arc()
      .innerRadius(vis.RADIUS - 60)
      .outerRadius(vis.RADIUS - 30);

    vis.g
      .append("text")
      .attr("y", -(vis.HEIGHT / 2))
      .attr("x", -(vis.WIDTH / 2))
      .attr("font-size", "16px")
      .attr("text-anchor", "start")
      .text(vis.variable);

    vis.wrangleData();
  }

  wrangleData() {
    const vis = this;

    vis.propertyType = $("#property-type-select").val();
    vis.areaType = $("#area-type-select").val();

    vis.sliderValues = $("#area-slider")
      .slider("values")
      .map((value) => parseFloat(value.toFixed(2)));

    const linearMin = Math.exp(vis.sliderValues[0]);
    const linearMax = Math.exp(vis.sliderValues[1]);

    const localFilteredData = globalData.filter((d) => {
      const curArea = Number(d["Area Bin (SQM)"]);
      return curArea >= linearMin && curArea <= linearMax;
    });

    if (vis.variable === "Property Type") {
      const propertyTypeData = d3.rollups(
        localFilteredData,
        (v) => v.length,
        (d) => d["Property Type"]
      ).map(([key, value]) => ({ "Property Type": key, count: value }));
      vis.data = propertyTypeData;
    }
    if (vis.variable === "Type of Area") {
      const areaTypeData = d3.rollups(
        localFilteredData,
        (v) => v.length,
        (d) => d["Type of Area"]
      ).map(([key, value]) => ({ "Type of Area": key, count: value }));
      vis.data = areaTypeData;
    }
    vis.chartData = vis.data;

    vis.updateVis();
  }

  updateVis() {
    const vis = this;

    vis.t = d3.transition().duration(750);
    vis.path = vis.g.selectAll("path");
    vis.data1 = vis.pie(vis.chartData);

    vis.path = vis.path.data(vis.data1);

    vis.path
      .exit()
      .transition(vis.t)
      .attrTween("d", arcTween)
      .remove();

    vis.path
      .transition(vis.t)
      .attrTween("d", arcTween);

    vis.path
      .enter()
      .append("path")
      .attr("fill", (d) => color(d.data[vis.variable]))
      .attr("fill-opacity", 0.8)
      .on("click", function (event, d) {
        arcClicked(d.data[vis.variable]);
      })
      .on("mouseover", function (event, d) {
        if ((vis.variable === "Property Type" && vis.propertyType === "All") ||
        (vis.variable === "Type of Area" && vis.areaType === "All")){
          vis.path.attr("fill-opacity", (p) =>
            p === d ? 1 : 0.5
          );
        };
        vis.g
          .append("text")
          .attr("class", "tooltip-text")
          .attr("text-anchor", "middle")
          .attr("dy", "-1em")
          .text(`${d.data[vis.variable]}: ${d.data.count}`);
      })
      .on("mousemove", function (event) {
        //Follow cursor
        vis.g
          .select(".tooltip-text")
          .attr(
            "transform",
            `translate(${d3.pointer(event, vis.g.node())[0]}, ${d3.pointer(event, vis.g.node())[1] - 10})`
          );
      })
      .on("mouseout", function () {
        if ((vis.variable === "Property Type" && vis.propertyType === "All") ||
        (vis.variable === "Type of Area" && vis.areaType === "All")){
          vis.path.attr("fill-opacity", 0.8);
        };
        
        vis.g.select(".tooltip-text").remove();
      })
      .transition(vis.t)
      .attrTween("d", arcTween);

    vis.path.each(function (d) {
      const selectedValue =
        vis.variable === "Property Type" ? vis.propertyType : vis.areaType;

      if (selectedValue === "All" || d.data[vis.variable] === selectedValue) {
        d3.select(this).attr("fill-opacity", 1);
      } else {
        d3.select(this).attr("fill-opacity", 0.3);
      }
    });
    
    const legend = vis.legendG.selectAll(".legend").data(vis.chartData);

    legend.exit().remove();

    const legendEnter = legend
      .enter()
      .append("g")
      .attr("class", "legend")
      .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendEnter
      .append("rect")
      .attr("width", 15)
      .attr("height", 15)
      .attr("fill", (d) => color(d[vis.variable]));

    legendEnter
      .append("text")
      .attr("x", 20)
      .attr("y", 12)
      .attr("font-size", "10px")
      .text((d) => d[vis.variable]);

    legend
      .select("rect")
      .attr("fill", (d) => color(d[vis.variable]));

    legend
      .select("text")
      .text((d) => d[vis.variable]);

    vis.tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("padding", "5px")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "#fff")
      .style("border-radius", "5px")
      .style("pointer-events", "none")
      .style("visibility", "hidden");

    function arcTween(d) {
      const i = d3.interpolate(this._current, d);
      this._current = i(1);
      return (t) => vis.arc(i(t));
    }

    function arcClicked(selectedValue) {
      const currentFilter =
        vis.variable === "Property Type" ? vis.propertyType : vis.areaType;

      if (currentFilter === selectedValue) {
        if (vis.variable === "Property Type") {
          $("#property-type-select").val("All");
        } else if (vis.variable === "Type of Area") {
          $("#area-type-select").val("All");
        }
      } else {
        if (vis.variable === "Property Type") {
          $("#property-type-select").val(selectedValue);
        } else if (vis.variable === "Type of Area") {
          $("#area-type-select").val(selectedValue);
        }
      }

      updateCharts();
      updateScatterPlot();
    }
  }
}
