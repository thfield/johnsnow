var turf = require('turf'),
    fs = require('fs');

var inputFile = 'data/data.geojson',
    inputData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

var finaldata = {};

var centerPt = turf.centroid(inputData);

console.log(centerPt);

// function compare(a,b) {
//   //array.sort(compare);
//   if (+a.dist < +b.dist)
//     return -1;
//   if (+a.dist > +b.dist)
//     return 1;
//   return 0;
// }

//
// var outputfile = 'data/outputdata.json';
// fs.writeFile(outputfile, JSON.stringify(finaldata), function(err) {
//     if(err) {
//         return console.log(err);
//     }
//     console.log("The file was saved!");
// });
