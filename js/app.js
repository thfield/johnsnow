(function() {

  var margin = {top: 0, left: 0, bottom: 0, right: 0},
      width = parseInt(d3.select('#map_container').style('width')),
      width = width - margin.left - margin.right,
      mapRatio = 1,
      height = width * mapRatio,
      scaleMultiplier = 5000;

  var svg = d3.select("#map_container").append("svg")
      .attr("height", height)
      .attr("id","neighborhood-map");

  var tiler = d3.geo.tile()
      .size([width, height]);

  var projection = d3.geo.mercator()
      .center([ -0.13640715116279079, 51.5132851124031 ])
      .scale(width*scaleMultiplier)
      .translate([width / 2, height / 2]);

  var path = d3.geo.path()
      .projection(projection);

  var voronois = svg.append("g")
      .attr("class", "voronois")

  var osmRoads = svg.append("g")
      .attr("class", "osmRoads")

  var snowmap = svg.append("g")
      .attr("class", "snowmap")


  var pumpPos = [],
      deathPos = [];

  var pumpCoord = [],
      deathCoord = [];

  svg
      .call(renderTiles, "highroad")  //remove to stop roads rendering
      // .call(renderTiles, "buildings") //remove to stop buildings rendering
      // .call(renderTiles, "skeletron") //remove to stop road labels
      .call(renderDeathsbyCholera) //remove to stop cholera data rendering
      ;

// d3.select(window).on('resize', resize);

  function renderVoronoi(){
    var deathsGeojson = turf.featurecollection(
          deathCoord.map(function(el){
            return turf.point(el[0],el[1]);
          })
        ),
        bbox = [0,0,width,height],
        voronoiConstructor = d3.geom.voronoi().clipExtent([ [bbox[0],bbox[1]], [bbox[2], bbox[3]] ]),
        polygons = voronoiConstructor(pumpPos);
        polygonsCoord = polygons.map(function(pol){
          return pol.map(function(el){
            return projection.invert(el);
          });
        });
    polygonsCoord.forEach(function(el,i){
      el.push(el[0]);
      var deathsWithin = 0;
      var housesWithin = turf.within(deathsGeojson, turf.featurecollection([turf.polygon([el])]) )
      if (housesWithin.features[0]){
          housesWithin.features.forEach(function(el){
            deathsWithin += el.properties.count;
          })
      }
      polygons[i].count = deathsWithin;
    });

    var g = voronois.selectAll("g")
        .data(polygons)
      .enter().append("svg:g");

    g.append("svg:path")
        .attr("class", "cell")
        .on('mouseover', function(d) {
            var el = d3.select(this)
            ttFollow(el,innertext(d.count));
          })
          .on('mouseout', function(){ ttHide(); })
        .attr("d", function(d) { return "M" + d.join("L") + "Z"; });
  }

  function renderDeathsbyCholera(){
    d3.json("data/data.geojson", function(error, cholera) {
      if (error) return console.error(error);

      snowmap.selectAll(".choleradeaths")
        .data(cholera.features)
      .enter()
        .append('circle').attr('class', function(d) { return d.properties.type })
        .attr('r', function(d) {
          if (d.properties.Count){
            return Math.sqrt(d.properties.Count)+2
            // return d.properties.Count
          } else {
            return 8
          }
        })
        .attr('transform', function(d) {
          if (d.properties.type == 'death'){
            deathPos.push( [projection(d.geometry.coordinates), {count: d.properties.Count} ]);
            deathCoord.push( [d.geometry.coordinates, {count: d.properties.Count} ]);
          } else if (d.properties.type == 'pump'){
            pumpPos.push( projection(d.geometry.coordinates) );
            pumpCoord.push( d.geometry.coordinates );
          }
          return 'translate(' + projection(d.geometry.coordinates) + ')';
        })
        .on('mouseover', function(d) {
            var el = d3.select(this)
            ttFollow(el,innertext(d));
          })
          .on('mouseout', function(){ ttHide(); });
      renderVoronoi();
    });
  }

  function renderTiles(svg, type) {
    osmRoads.append("g")
        .attr("class", type)
      .selectAll("g")
        .data(tiler
          .scale(projection.scale() * 2 * Math.PI)
          .translate(projection([0, 0])))
      .enter().append("g")
        .each(function(d) {
          var g = d3.select(this);
          // d3.json("http://" + ["a", "b", "c"][(d[0] * 31 + d[1]) % 3] + ".tile.openstreetmap.us/vectiles-" + type + "/" + d[2] + "/" + d[0] + "/" + d[1] + ".json", function(error, json) {
          // use the locally cached tiles
          d3.json("data/osm/" + ["a", "b", "c"][(d[0] * 31 + d[1]) % 3] + "-" + type + "-"+ d[2] + "-" + d[0] + "-" + d[1] + ".json", function(error, json) {
            if (type !== 'skeletron'){
              g.selectAll("path")
                  .data(json.features.sort(function(a, b) { return a.properties.sort_key - b.properties.sort_key; }))
                .enter().append("path")
                  .attr("class", function(d) {
                    if(type == 'buildings'){
                      return 'building'
                    // }else if (type == 'skeletron'){
                    //   return 'road ' + d.properties.highway
                    }else if (type == 'highroad'){
                      return d.properties.kind
                    }
                  })
                  .attr("d", path);
            };

            if (type == 'skeletron'){
              var filteredData = json.features.filter(function(a) { return a.properties.sort_key > 4 && a.properties.sort_key < 7; });
              g.selectAll("text")
                  .data(filteredData)
                .enter().append("text")
                  .attr("class", function(d) { return 'label ' + d.properties.highway; })
                  .text( function(d){ return d.properties.name })
                  .attr('transform', function(d) {
                    var length = turf.lineDistance(d, 'kilometers');
                    var midPoint = turf.along(d, length/2, 'kilometers');
                    var midLess = turf.along(d, (length/2)+0.1, 'kilometers');

                    var rotation = angle(projection(midPoint.geometry.coordinates),projection(midLess.geometry.coordinates)),
                        translation = projection(midPoint.geometry.coordinates);

                    return 'translate(' + translation + ') rotate('+ rotation +')';
                  });

            };
          });
        });
  }

  // function resize() {
  //   // adjust things when the window size changes
  //   width = parseInt(d3.select('#map_container').style('width'));
  //   width = width - margin.left - margin.right;
  //   height = width * mapRatio;
  //
  //   // update projection
  //   projection
  //       .translate([width / 2, height / 2])
  //       .scale(width*scaleMultiplier);
  //
  //   // resize the map container
  //   svg
  //       .style('width', width + 'px')
  //       .style('height', height + 'px');
  //
  //   // resize the map
  //   svg.select('.highroad').attr('d', path);
  //   svg.selectAll('.minor_road').attr('d', path);
  //   svg.selectAll('.major_road').attr('d', path);
  //   svg.selectAll('.path').attr('d', path);
  // }

})();


function angle(p1, p2) {
  var dy = p1[1] - p2[1];
  var dx = p1[0] - p2[0];
  var theta = Math.atan2(dy, dx); // range (-PI, PI]
  theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
  //if (theta < 0) theta = 360 + theta; // range [0, 360)
  return theta;
}

function ttFollow(element, caption, options) {
  element.on('mousemove', null);
  element.on('mousemove', function() {
    var position = d3.mouse(document.body);
    d3.select('#tooltip')
      .style('top', ( (position[1] + 30)) + "px")
      .style('left', ( position[0]) + "px");
    d3.select('#tooltip .value')
      .text(caption);
  });
  d3.select('#tooltip').classed('hidden', false);
};

function ttHide() {
  d3.select('#tooltip').classed('hidden', true);
}

function innertext(d){
  if (typeof d == 'number'){
    return pluralize(d) + ' from Cholera';
  } else if (d.properties.type == 'death'){
    return pluralize(d.properties.Count) + ' from Cholera';
  } else if (d.properties.type == 'pump'){
    return 'Pump';
  }
  function pluralize(x){
    if (x == 1) {return x + ' death'}
    else {return x + ' deaths'}
  };
};

function makeLastChild(child, selector) {
  if (selector == 'id') {
    var c = document.getElementById(child);
  } else if (selector == 'class') {
    var c = document.getElementsByClassName(child)[0];
  }
  c.parentNode.appendChild(c);
}
function handleClick(cb) {
  d3.select('.' + cb.name).classed("hidden", !cb.checked);
}
