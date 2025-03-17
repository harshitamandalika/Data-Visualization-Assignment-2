document.addEventListener("DOMContentLoaded", function () {
    // Define margins and dimensions for the visualization
    const margin = { top: 80, right: 200, bottom: 50, left: 100 };
    const width = 1000 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;
    let showMinTemp = false; // Toggle state for min/max temperature

    // Create an SVG element and append a group element for transformations
    const svg = d3.select("#matrixView")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip for displaying temperature data
    const tooltip = createTooltip();

    // Load and process temperature data from CSV file
    d3.csv("temperature_daily.csv").then(data => {
        const { years, months, monthlyData } = processData(data, 1997, 2017);
        const { xScale, yScale } = createScales(years, months, width, height);

        // Function to update visualization based on toggle state
        function updateVisualization() {
            const tempKey = showMinTemp ? "min_temperature" : "max_temperature";

            // Define color scale for temperature visualization
            const colorScale = d3.scaleSequential(d3.interpolateOrRd)
                .domain(d3.extent(data, d => d[tempKey]));

            // Draw matrix view for temperature data
            drawMatrix(svg, years, months, monthlyData, xScale, yScale, colorScale, tooltip, showMinTemp);
            drawTemperatureLegend(svg, width, colorScale);
        }

        updateVisualization(); // Initial visualization rendering
        drawAxes(svg, xScale, yScale); // Draw axes

        // Event listener to toggle between max and min temperature
        document.getElementById("toggleTempLevel1").addEventListener("click", function () {
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

// Function to process CSV data and extract relevant information
function processData(data, startYear, endYear) {
    data.forEach(d => {
        d.date = new Date(d.date);
        d.year = d.date.getFullYear();
        d.month = d.date.getMonth();
        d.max_temperature = +d.max_temperature;
        d.min_temperature = +d.min_temperature;
    });

    // Filter data based on the given year range
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

    return {
        years: [...new Set(filteredData.map(d => d.year))],
        months: ["January", "February", "March", "April", "May", "June",
                 "July", "August", "September", "October", "November", "December"],
        monthlyData
    };
}

// Function to create x and y scales for the matrix view
function createScales(years, months, width, height) {
    return {
        xScale: d3.scaleBand().domain(years).range([0, width]).padding(0.05),
        yScale: d3.scaleBand().domain(months).range([0, height]).padding(0.05)
    };
}

// Function to draw the matrix heatmap representation
function drawMatrix(svg, years, months, monthlyData, xScale, yScale, colorScale, tooltip, showMinTemp) {
    svg.selectAll(".cell").remove(); // Remove previous matrix cells

    svg.selectAll(".cell")
        .data(years.flatMap(year => months.map((month, i) => ({ year, month: i, hasData: monthlyData.has(`${year}-${i}`) }))))
        .enter().append("rect")
        .attr("class", "cell")
        .attr("x", d => xScale(d.year))
        .attr("y", d => yScale(months[d.month]))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", d => {
            const monthData = monthlyData.get(`${d.year}-${d.month}`);
            return monthData ? colorScale(showMinTemp ? monthData.min_temperature : monthData.max_temperature) : "white";
        })
        .on("mouseover", (event, d) => {
            const monthData = monthlyData.get(`${d.year}-${d.month}`);
            if (monthData) {
                tooltip.style("opacity", 1)
                    .html(`Date: ${d.year}-${String(d.month + 1).padStart(2, '0')} | Max: ${monthData.max_temperature}°C | Min: ${monthData.min_temperature}°C`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 20) + "px");
            }
        })
        .on("mouseout", () => tooltip.style("opacity", 0));
}

// Function to draw axes
function drawAxes(svg, xScale, yScale) {
    svg.append("g").attr("transform", `translate(0,-10)`).call(d3.axisTop(xScale)); // X-axis
    svg.append("g").call(d3.axisLeft(yScale)); // Y-axis
}

// Function to draw the temperature legend
function drawTemperatureLegend(svg, width, colorScale) {
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
        .attr("id", "tempGradientLevel1")
        .attr("x1", "0%").attr("x2", "0%")
        .attr("y1", "100%").attr("y2", "0%");

    // Define temperature color stops
    gradient.append("stop").attr("offset", "0%").attr("stop-color", colorScale(minTemp));  
    gradient.append("stop").attr("offset", "25%").attr("stop-color", colorScale(midTemp1)); 
    gradient.append("stop").attr("offset", "50%").attr("stop-color", colorScale(midTemp2)); 
    gradient.append("stop").attr("offset", "75%").attr("stop-color", colorScale(midTemp3)); 
    gradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(maxTemp)); 

    // Draw color bar for legend
    legendGroup.append("rect")
        .attr("width", 20)
        .attr("height", 135)
        .style("fill", "url(#tempGradientLevel1)");

    // Add labels for min, max, and intermediate temperatures
    const labelXOffset = 30; // Shift text further right
    const fontSize = "10px";

    legendGroup.append("text").attr("x", labelXOffset).attr("font-size", fontSize).attr("y", 130).text(`${minTemp}°C`);  
    legendGroup.append("text").attr("x", labelXOffset).attr("font-size", fontSize).attr("y", 100).text(`${midTemp1}°C`); 
    legendGroup.append("text").attr("x", labelXOffset).attr("font-size", fontSize).attr("y", 70).text(`${midTemp2}°C`);  
    legendGroup.append("text").attr("x", labelXOffset).attr("font-size", fontSize).attr("y", 40).text(`${midTemp3}°C`);  
    legendGroup.append("text").attr("x", labelXOffset).attr("font-size", fontSize).attr("y", 10).text(`${maxTemp}°C`);   
}
