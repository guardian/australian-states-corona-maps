import loadJson from '../../components/load-json/'
import * as d3 from "d3"
import * as topojson from "topojson"
import mustache from "../modules/mustache"
import templateHtml from '../../templates/template.html'
import tooltipHtml from '../../templates/tooltip.html'

export class App {

	constructor(data, state, stateData, places) {

		var self = this

		this.data = data

		this.state = state

		this.stateData = stateData

		this.places = places

		this.cases = data // data.locations.filter(d => d.State == state)

		this.updated = this.cases[0].date

		this.ratio = (self.stateData.maps[0].active) ? self.stateData.maps[0].zoom : self.stateData.maps[1].zoom

		this.centre = (self.stateData.maps[0].active) ? self.stateData.maps[0].centre : self.stateData.maps[1].centre

		this.filter = (self.stateData.maps[0].active) ? self.stateData.maps[0].label : self.stateData.maps[1].label

		this.locality = (self.stateData.maps[0].active) ? "state" : "city" ;

		this.merge = self.stateData.merge

		this.lgas(this.stateData.path)
		
	}

	lgas(path) {

		var self = this

		loadJson(`${path}`)
			.then((lga) => {
				self.lga = lga
				self.template()
			})

	}

	template() {

		var data = {

			title : this.stateData.title,

			source : this.stateData.source,

			updated : this.updated,

			label : (this.stateData.maps[0].active) ? `Zoom to ${this.stateData.maps[1].label}` : `Zoom to ${this.stateData.maps[0].label}`
		}

	    var target = document.getElementById("app"); 

	    var html = mustache(templateHtml, data)

	    target.innerHTML = html

	    this.activate()

	}

	activate() {

		var self = this

		this.tooltip = d3.select("body").append("div")
		    .attr("class", "tipster")
		    .style("position", "absolute")
		    .style("background-color", "white")
		    .style("opacity", 0);


		d3.select("#zoom").on("click", function() {

			if (self.stateData.maps[0].active) {
				self.stateData.maps[0].active = false;
				self.stateData.maps[1].active = true;
				d3.select(this).html(`Zoom to ${self.stateData.maps[0].label}`)
			} else {
				self.stateData.maps[0].active = true;
				self.stateData.maps[1].active = false;
				d3.select(this).html(`Zoom to ${self.stateData.maps[1].label}`)
			}

			self.ratio = (self.stateData.maps[0].active) ? self.stateData.maps[0].zoom : self.stateData.maps[1].zoom

			self.centre = (self.stateData.maps[0].active) ? self.stateData.maps[0].centre : self.stateData.maps[1].centre

			self.filter = (self.stateData.maps[0].active) ? self.stateData.maps[0].label : self.stateData.maps[1].label

			self.locality = (self.stateData.maps[0].active) ? "state" : "city" ;

			self.init()

		})

		this.init()

		this.resizer()

	}

    resizer() {

        var self = this

        window.addEventListener("resize", function() {

            clearTimeout(document.body.data)

            document.body.data = setTimeout( function() { 

                self.init()

            }, 200);

        });

    }

	init() {

		var self = this

		var container = d3.select("#coronaMapContainer")
		
		var windowWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);

		var isMobile = (windowWidth < 610) ? true : false ;

		var width = document.querySelector("#coronaMapContainer").getBoundingClientRect().width

		var height = width * 0.8

		var projection = d3.geoMercator()
		                    .center(self.centre)
		                    .scale(width * self.ratio)
		                    .translate([ width / 2, height / 2 ])

		container.selectAll("svg").remove()

		var extent = [1,100]

		var mapData = d3.map(self.cases, function(d) { return d.place; });

		self.lga.objects[self.stateData.object].geometries.forEach(function(d) {

			//console.log(self.state, d.properties[self.merge].replace(/ *\([^)]*\) */g, ""))

			var place = (self.state === 'NSW') ?  d.properties[self.merge].replace(/ *\([^)]*\) */g, "") : d.properties[self.merge] ;

			if (mapData.has(place)) {
				var cases;
				if (mapData.get(place)['count'] == "1-4") {
					cases = 2
				}

				else {
					cases = +mapData.get(place)['count']
				}
				d.properties.cases = cases
			}

			else {
				d.properties.cases = 0
			}
			
		})

		var filterPlaces = self.places.filter( (d) => d[self.locality] === self.filter);

		var path = d3.geoPath().projection(projection);

		var geo = topojson.feature(self.lga, self.lga.objects[self.stateData.object]).features    

		var centroids = geo.map(function (feature) {
	    	feature.properties['centroid'] = path.centroid(feature);
	    	return feature.properties
	  	});

		var radius = d3.scaleSqrt().range([2, 20])

		radius.domain(extent)

		var svg = container.append("svg")	
		                .attr("width", width)
						.attr("height", height)
		                .attr("id", "covid-19-map")
		                .attr("overflow", "hidden");

		var features = svg.append("g")

		var tops = features.selectAll("path").data(topojson.feature(self.lga, self.lga.objects[self.stateData.object]).features)

		tops.enter()
		    .append("path")
		        .attr("class", "lga")
		        .attr("fill", "none")
		        .attr("stroke", "#bcbcbc")
		        .attr("d", path); 

		var mapCircles = features.selectAll(".mapCircle").data(centroids);	        

		mapCircles					
			.enter()
			.append("circle")
			.attr("class", "mapCircle")
			.attr("title",d => d[self.merge])
			.attr("cx",d => d.centroid[0])
			.attr("cy",d => d.centroid[1])
			.attr("r", (d) => (d.cases > 0) ? radius(d.cases) : 0 )   
			.on("mouseover", function(d) {

				self.tooltip.transition().duration(200).style("opacity", .9);

				self.tooltip.html( self.tipster(d) )
				   .style("left", `${d3.event.pageX + 10}px`) //self.tooltip(d3.event.pageX, width) + "px"
				   .style("top", `${d3.event.pageY + 10}px`)


			})
			.on("mouseout", (d) => self.tooltip.transition().duration(500).style("opacity", 0))


		var labels = svg.selectAll("text").data(filterPlaces)

		labels.enter()
			.append("text")
			.text((d) => d.name)
			.attr("x", (d) => projection([d.longitude, d.latitude])[0])
			.attr("y", (d) => projection([d.longitude, d.latitude])[1])
			.attr("class","label")
	  
	    // Big circle

	    container.select("#keyDiv svg").remove();

	    var keySvg = container.select("#keyDiv").append("svg")	
		                .attr("width", 200)
						.attr("height", 100)
		                .attr("id", "key")
		                .attr("overflow", "hidden");

	    keySvg.append("circle")
	            .attr("cx",60)
				.attr("cy",50)
	            .attr("class", "mapCircle")
	            .attr("r", radius(extent[1])) 

	    keySvg.append("text")
	            .attr("x",60)
				.attr("y",90)
	            .attr("class", "keyLabel")
	            .attr("text-anchor", "middle")
	            .text(extent[1])         

	    // Little circle        

	    keySvg.append("circle")
	            .attr("cx",10)
				.attr("cy",50)
	            .attr("class", "mapCircle")
	            .attr("r", radius(extent[0]))

	    keySvg.append("text")
	            .attr("x",10)
				.attr("y",90)
	            .attr("class", "keyLabel")
	            .attr("text-anchor", "middle")
	            .text(extent[0])

	    keySvg.append("text")
	            .attr("x",50)
				.attr("y",15)
	            .attr("class", "keyLabel")
	            .attr("text-anchor", "middle")
	            .text("Number of cases")   

	}

	tipster(data) {

		var self = this

		data.title = data[self.merge]

	    var html = mustache(tooltipHtml, data)

		return html

	}

	tooltip(pos, width) {

		var self = this

		if (width < 500) {

			return (width / 2) - 100

		} else {

			return ((pos > width / 2) ? pos  - 235 : pos + 5 )

		}

	}

}