document.addEventListener("DOMContentLoaded", function () {
    // Define margins and dimensions for the visualization
    const margin = { top: 80, right: 200, bottom: 50, left: 100 };
    const width = 1000 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    let showMinTemp = false; // Toggle state for switching between min and max temperature

    // Create an SVG element and append a group element for transformations
    const svg = d3.select("#lineChart")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip for displaying temperature data
    const tooltip = createTooltip();

    // Load temperature data from CSV
    d3.csv("temperature_daily.csv").then(data => {
        const { years, months, monthlyData, groupedDataDaily } = processData(data, 2008, 2017);
        const { xScale, yScale } = createScales(years, months, width, height);

        // Function to update visualization based on toggle state
        function updateVisualization() {
            const tempKey = showMinTemp ? "min_temperature" : "max_temperature";

            // Define color scale for temperature representation
            const colorScale = d3.scaleSequential(d3.interpolateOrRd)
                .domain(d3.extent(data, d => d[tempKey]));

            // Draw matrix heatmap and trend lines
            drawMatrix(svg, years, months, monthlyData, xScale, yScale, colorScale, tooltip, showMinTemp);
            drawTrendLines(svg, groupedDataDaily, xScale, yScale);
            drawLevel2Legend(svg, width, colorScale);
        }

        updateVisualization(); // Initial rendering of visualization
        drawAxes(svg, xScale, yScale); // Draw axes

        // Event listener to toggle between min and max temperature
        document.getElementById("toggleTempLevel2").addEventListener("click", function () {
            showMinTemp = !showMinTemp;
            this.textContent = showMinTemp ? "Show Max Temperature" : "Show Min Temperature";
            updateVisualization(); // Update visualization on toggle
        });
    }).catch(error => console.error("Error loading data:", error));
});

// Function to create tooltip for displaying temperature details
function createTooltip() {
    return d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "5px")
        .style("border-radius", "5px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0);
}

// Function to process and filter data for visualization
function processData(data, startYear, endYear) {
    data.forEach(d => {
        d.date = new Date(d.date);
        d.year = d.date.getFullYear();
        d.month = d.date.getMonth();
        d.day = d.date.getDate();
        d.max_temperature = +d.max_temperature;
        d.min_temperature = +d.min_temperature;
    });

    const filteredData = data.filter(d => d.year >= startYear && d.year <= endYear);
    const monthlyData = new Map();

    // Aggregate temperature data per month
    filteredData.forEach(d => {
        const key = `${d.year}-${d.month}`;
        if (!monthlyData.has(key)) {
            const monthEntries = filteredData.filter(e => e.year === d.year && e.month === d.month);
            monthlyData.set(key, {
                max_temperature: d3.max(monthEntries, e => e.max_temperature),
                min_temperature: d3.min(monthEntries, e => e.min_temperature),
            });
        }
    });

    // Group data by daily readings
    const groupedDataDaily = d3.group(filteredData, d => `${d.year}-${d.month}`);

    return {
        years: [...new Set(filteredData.map(d => d.year))],
        months: ["January", "February", "March", "April", "May", "June",
                 "July", "August", "September", "October", "November", "December"],
        monthlyData,
        groupedDataDaily
    };
}

// Function to create scales for matrix view
function createScales(years, months, width, height) {
    return {
        xScale: d3.scaleBand().domain(years).range([0, width]).padding(0.05),
        yScale: d3.scaleBand().domain(months).range([0, height]).padding(0.05)
    };
}

// Function to draw trend lines inside matrix cells
function drawTrendLines(svg, groupedDataDaily, xScale, yScale) {
    svg.selectAll(".trend-line").remove(); // Remove previous trend lines

    svg.selectAll(".cell").each(function (d) {
        const cell = d3.select(this);
        const year = d.year;
        const month = d.month;
        const dailyData = groupedDataDaily.get(`${year}-${month}`);
        if (!dailyData) return;

        const cellWidth = parseFloat(cell.attr("width"));
        const cellHeight = parseFloat(cell.attr("height"));
        const xPos = parseFloat(cell.attr("x"));
        const yPos = parseFloat(cell.attr("y"));

        // Scale for daily data representation
        const dayScale = d3.scaleLinear().domain([1, 31]).range([0, cellWidth]);
        const tempScale = d3.scaleLinear().domain([0, 40]).range([cellHeight, 0]);

        // Define line generators for max and min temperatures
        const maxLine = d3.line()
            .x(d => dayScale(d.day))
            .y(d => tempScale(d.max_temperature))
            .curve(d3.curveMonotoneX);

        const minLine = d3.line()
            .x(d => dayScale(d.day))
            .y(d => tempScale(d.min_temperature))
            .curve(d3.curveMonotoneX);

        // Append trend lines for max and min temperatures
        svg.append("g")
            .attr("transform", `translate(${xPos},${yPos})`)
            .call(g => {
                g.append("path")
                    .datum(dailyData)
                    .attr("fill", "none")
                    .attr("stroke", "darkgreen")
                    .attr("stroke-width", 1.5)
                    .attr("class", "trend-line")
                    .attr("d", maxLine);
                g.append("path")
                    .datum(dailyData)
                    .attr("fill", "none")
                    .attr("stroke", "lightgreen")
                    .attr("stroke-width", 1.5)
                    .attr("class", "trend-line")
                    .attr("d", minLine);
            });
    });
}

// Function to draw the Level2's legend
function drawLevel2Legend(svg, width, colorScale) {
    svg.selectAll(".legend-group").remove(); // Remove old legend if any

    const legendGroup = svg.append("g")
        .attr("class", "legend-group")
        .attr("transform", `translate(${width + 20},20)`);

    // Define temperature values for legend stops
    const minTemp = 3;  
    const midTemp1 = 12;  
    const midTemp2 = 21;  
    const midTemp3 = 30;  
    const maxTemp = 37;   

    // Create a gradient for the legend
    const defs = legendGroup.append("defs");
    const gradient = defs.append("linearGradient")
        .attr("id", "tempGradientLevel2")
        .attr("x1", "0%").attr("x2", "0%")
        .attr("y1", "100%").attr("y2", "0%");

    // Define temperature color stops
    gradient.append("stop").attr("offset", "0%").attr("stop-color", colorScale(minTemp));  
    gradient.append("stop").attr("offset", "25%").attr("stop-color", colorScale(midTemp1)); 
    gradient.append("stop").attr("offset", "50%").attr("stop-color", colorScale(midTemp2)); 
    gradient.append("stop").attr("offset", "75%").attr("stop-color", colorScale(midTemp3)); 
    gradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxTemp)); 

    // Draw legend box for temperature gradient 
    legendGroup.append("rect")
        .attr("width", 20)
        .attr("height", 135)  
        .style("fill", "url(#tempGradientLevel2)");

    // Add labels for min, max, and intermediate temperatures 
    const labelXOffset = 30; // Shift text further right
    const fontSize = "10px"; // Adjust font size 

    legendGroup.append("text").attr("x", labelXOffset).attr("y", 130).attr("font-size", fontSize).text(`${minTemp}°C`);  
    legendGroup.append("text").attr("x", labelXOffset).attr("y", 100).attr("font-size", fontSize).text(`${midTemp1}°C`); 
    legendGroup.append("text").attr("x", labelXOffset).attr("y", 70).attr("font-size", fontSize).text(`${midTemp2}°C`);  
    legendGroup.append("text").attr("x", labelXOffset).attr("y", 40).attr("font-size", fontSize).text(`${midTemp3}°C`);  
    legendGroup.append("text").attr("x", labelXOffset).attr("y", 10).attr("font-size", fontSize).text(`${maxTemp}°C`);   

    // Trend line legend
    const trendLineYOffset = 200; 
    const fontSize2 = "12px"; // Adjust font size 

    // Legend for Daily Max Trend Line (Dark Green)
    legendGroup.append("line")
        .attr("x1", 0).attr("y1", trendLineYOffset).attr("x2", 40).attr("y2", trendLineYOffset)
        .attr("stroke", "darkgreen").attr("stroke-width", 2);
    legendGroup.append("text")
        .attr("x", 50).attr("y", trendLineYOffset + 5).attr("font-size", fontSize2).text("Daily Max");

    // Legend for Daily Min Trend Line (Light Green)
    legendGroup.append("line")
        .attr("x1", 0).attr("y1", trendLineYOffset + 20).attr("x2", 40).attr("y2", trendLineYOffset + 20)
        .attr("stroke", "lightgreen").attr("stroke-width", 2);
    legendGroup.append("text")
        .attr("x", 50).attr("y", trendLineYOffset + 25).attr("font-size", fontSize2).text("Daily Min");
}


