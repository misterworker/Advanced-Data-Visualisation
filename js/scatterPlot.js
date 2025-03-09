class Scatterplot {
    constructor(_parentElement) {
        this.parentElement = _parentElement;
        this.initVis();
    }
  
    initVis() {
        const vis = this;

        vis.MARGIN = {LEFT: 100, RIGHT: 100, TOP: 80, BOTTOM: 80};
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

        vis.g
            .append("rect")
            .attr("class", "background")
            .attr("width", vis.WIDTH)
            .attr("height", vis.HEIGHT)
            .style("fill", "none")
            .style("pointer-events", "all"); //For quadtree
        

        vis.x = d3.scaleLog().base(10).range([0, vis.WIDTH]);
        vis.y = d3.scaleLog().base(10).range([vis.HEIGHT, 0]);

        vis.xAxisCall = d3.axisBottom().ticks(5).tickFormat(d3.format(".2s"));
        vis.yAxisCall = d3.axisLeft().ticks(4)
            .tickFormat(function(d) {
            return d3.format("0.2s")(d).replace(/G/, "B");
        });

        vis.xAxis = vis.g
            .append("g")
            .attr("class", "x axis")
            .attr("transform", `translate(0, ${vis.HEIGHT})`);
        vis.yAxis = vis.g.append("g").attr("class", "y axis");

        vis.xLabel = vis.g
            .append("text")
            .attr("class", "x axisLabel")
            .attr("y", vis.HEIGHT + 50)
            .attr("x", vis.WIDTH / 2)
            .attr("font-size", "16px")
            .attr("text-anchor", "middle")
            .text("Area (SQM)");

        vis.yLabel = vis.g
            .append("text")
            .attr("class", "y axisLabel")
            .attr("transform", "rotate(-90)")
            .attr("y", -60)
            .attr("x", -vis.HEIGHT / 2)
            .attr("font-size", "16px")
            .attr("text-anchor", "middle")
            .text("Raw Transaction Price ($)");

        vis.wrangleData();
    }

    wrangleData() {
        const vis = this;
        vis.filteredData = globalFilteredData;
        vis.updateVis();
    }
  
    updateVis() {
        const vis = this;

        const filteredData = vis.filteredData.filter(
            (d) => d["Area (SQM)"] > 0 && d["Transacted Price ($)"] > 0
        );

        vis.x.domain([
            d3.min(filteredData, (d) => d["Area (SQM)"]),
            d3.max(filteredData, (d) => d["Area (SQM)"]),
        ]);
        vis.y.domain([
            d3.min(filteredData, (d) => d["Transacted Price ($)"]),
            d3.max(filteredData, (d) => d["Transacted Price ($)"]),
        ]);

        vis.xAxisCall.scale(vis.x);
        vis.xAxis.transition().duration(1000).call(vis.xAxisCall);
        vis.yAxisCall.scale(vis.y);
        vis.yAxis.transition().duration(1000).call(vis.yAxisCall);

        vis.xAxis.selectAll("text")
            .attr("transform", "rotate(70)")
            .attr("x", 15)
            .attr("font-size", "8px");

        vis.yAxis.selectAll("text")
            .attr("y", 15)
            .attr("font-size", "8px");

        const circles = vis.g.selectAll("circle").data(filteredData);

        circles
            .enter()
            .append("circle")
            .attr("fill", "steelblue")
            .attr("opacity", 0.5)
            .attr("r", 3)
            .attr("cx", (d) => vis.x(d["Area (SQM)"]))
            .attr("cy", (d) => vis.y(d["Transacted Price ($)"]))

        circles
            .transition()
            .duration(1000)
            .attr("cx", (d) => vis.x(d["Area (SQM)"]))
            .attr("cy", (d) => vis.y(d["Transacted Price ($)"]));

        circles.exit().remove();

        this.setupQuadtree(filteredData)
    }

    setupQuadtree(filteredData) {
        const vis = this;
        vis.g.select(".background").on('mousemove', handleMousemove);
    
        vis.quadtree = d3.quadtree()
            .x(d => vis.x(d["Area (SQM)"]))
            .y(d => vis.y(d["Transacted Price ($)"]))
            .addAll(filteredData);
    
        let hoveredId = null;
    
        
        function handleMousemove(e) {
            let pos = d3.pointer(e, this);
            let nearest = vis.quadtree.find(pos[0], pos[1], 20);
        
            vis.g.selectAll(".tooltip-text").remove();
        
            if (nearest) {
                const tooltip = vis.g.append("g").attr("class", "tooltip-text");
        
                tooltip
                    .append("text")
                    .attr("x", pos[0])
                    .attr("y", pos[1] - 20)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "12px")
                    .attr("fill", "black")
                    .text(nearest['District Name']);
        
                tooltip
                    .append("text")
                    .attr("x", pos[0])
                    .attr("y", pos[1] - 5)
                    .attr("text-anchor", "middle")
                    .attr("font-size", "12px")
                    .attr("fill", "black")
                    .text(nearest['Project Name']);
        
                hoveredId = nearest.id;
                update();
            } else {
                hoveredId = null;
                update();
            }
        }
    
        function update() {
            vis.g
            .selectAll("circle")
            .style('fill', function(d) {
                return d.id === hoveredId ? 'red' : 'steelblue';
            });
        }
    }
}
