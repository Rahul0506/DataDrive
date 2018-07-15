var config = {
    apiKey: "AIzaSyBRM0NZOn-dmrcovBxHyAXkNx0rtafRe6A",
    authDomain: "cxa-dashboard.firebaseapp.com",
    databaseURL: "https://cxa-dashboard.firebaseio.com",
    projectId: "cxa-dashboard",
    storageBucket: "cxa-dashboard.appspot.com",
    messagingSenderId: "79033749207"
};
firebase.initializeApp(config);

firebase.database().ref().child('REQUEST').set('None');

function average(arr) {
    var sum = 0;
    for (var i; i < arr.length; i++) {
        sum += arr[i];
    }
    var avg = sum/arr.length;
    return avg;
}

document.addEventListener('DOMContentLoaded', () => {
    const cardTweet = document.querySelector('.card-tweet');
    const cardSent = document.querySelector('.card-sent');
    const stockChart = document.getElementById("myChart");

    function expandCard(name) {
        var element = document.getElementById(name);
        element.classList.toggle("expand");
    };

    firebase.database().ref().child('REQUEST').on('value', function(snapshot) {
        console.log('Value changed to ' + snapshot.val());
        if (snapshot.val() == 'SocialInteraction') {
            // Open social
            expandCard('social');
        } else if (snapshot.val() == 'revenue') {
            expandCard('revenue');
        } else if (snapshot.val() == 'stocks') {
            expandCard('stocks');
        } else if (snapshot.val() == 'ShowMap') {
            expandCard('traffic');
        } else if (snapshot.val() == 'sales') {
            expandCard('sales');
        }
    })

    const x = document.getElementById("map-card");
    function getLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(showPosition);
        } else {
            x.innerHTML = "Geolocation is not supported by this browser.";
        }
    }

    function showPosition(position) {
        console.log("Latitude: " + position.coords.latitude + " | Longitude: " + position.coords.longitude);
        mapboxgl.accessToken = 'pk.eyJ1IjoicmlzaGFiaDE2IiwiYSI6ImNqaTM3MHQxMDA1cW0zcW80cXg4eHhqcGQifQ.yYhLp6B08oCzE502Kxy-pw';
        var map = new mapboxgl.Map({
            container: 'map-card', // container id
            style: 'mapbox://styles/mapbox/dark-v9', //stylesheet location
            center: [position.coords.longitude, position.coords.latitude], // starting position
            zoom: 17 // starting zoom
        });
        
        map.on('load', function(){
        
            map.addSource('trafficSource', {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-traffic-v1'
            });
        
            addTraffic();
        });
        
        function addTraffic(){
            var firstPOILabel = map.getStyle().layers.filter(function(obj){ 
                return obj["source-layer"] == "poi_label";
            });
        
            for(var i = 0; i < trafficLayers.length; i++) {
                map.addLayer(trafficLayers[i], firstPOILabel[0].id);
            }
        }

        var geojson = {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [position.coords.longitude, position.coords.latitude]
              },
              properties: {
                title: 'Current location',
                description: 'You are here!'
              }
            }]
        };
        
        geojson.features.forEach(function(marker) {

            // create a HTML element for each feature
            var el = document.createElement('div');
            el.className = 'map-marker-icon';
          
            // make a marker for each feature and add to the map
            new mapboxgl.Marker(el)
            .setLngLat(marker.geometry.coordinates)
            .setPopup(new mapboxgl.Popup({ offset: 25 }) // add popups
            .setHTML('<h3>' + marker.properties.title + '</h3><p>' + marker.properties.description + '</p>'))
            .addTo(map); 
        });               
    }
    
    getLocation();

    firebase.database().ref().child('TWEETS').once('value', async function(snapshot) {
        var tweets = Object.values(snapshot.val());
        for (var t = 0; t < 5; t++) {
            var newDiv = document.createElement('div');
            newDiv.classList += 'tweet-box';
            var newDivText = document.createElement('p');
            newDivText.innerText = tweets[t];
            newDivText.classList = 'tweet-text';
            newDiv.appendChild(newDivText);
            cardTweet.appendChild(newDiv);
        }
    })

    firebase.database().ref().child('SCORES').once('value', async function(snapshot) {
        var scores = Object.values(snapshot.val());
        for (var t = 0; t < 5; t++) {
            var newDiv = document.createElement('div');
            newDiv.classList += 'sent-box';
            var newDivText = document.createElement('p');
            newDivText.innerText = scores[t];
            newDivText.classList = 'sent-text';
            if (scores[t] > 0) {
                newDivText.style.color = '#1dd1a1';
            } else {
                newDivText.style.color = '#ff6b6b';
            }
            newDiv.appendChild(newDivText);
            cardSent.appendChild(newDiv);
        }
    })

    firebase.database().ref().child('STOCK30').once('value', async function(snapshot) {
        let graphdata = [];
        let datelabels = [];
        var stocks = Object.values(snapshot.val());
        for (var s = 0; s < stocks.length; s++) {
            // console.log(stocks[s].high);   
            graphdata.push(stocks[s].close);
            var date = convert(stocks[s].date);
            datelabels.push(date);
        }
        datelabels = datelabels.reverse();
        // console.log(graphdata, datelabels);
        drawGraph(datelabels, graphdata);
    })   

    function convert(unixtimestamp){
        // Months array
        var months_arr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        // Convert timestamp to milliseconds
        var date = new Date(unixtimestamp*1000);
        // Year
        var year = date.getFullYear();
        // Month
        var month = months_arr[date.getMonth()];
        // Day
        var day = date.getDate();
        // Display date time in MM-dd-yyyy h:m:s format
        var convdataTime = month+'-'+day+'-'+year

        return convdataTime;
    }          

    function drawGraph(datelabels, graphdata) {
        var ctx = stockChart.getContext('2d');
        var myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: datelabels,
                datasets: [{
                    label: 'Date',
                    data: graphdata,
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    yAxes: [{
                        ticks: {
                            beginAtZero:true
                        }
                    }]
                }
            }
        });         
    }
})