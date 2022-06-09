import express from "express";
import database from "../database.js";
import axios from "axios";
import config from "../config.js"

const router = express.Router();

const key = config.GOOGLE_API_KEY

router.get('/all', (req, res) => {
    var input = "%" + req.query.search + "%";
    var search;
    var data = [];
    var queries = "SELECT * FROM mui_restaurant WHERE name LIKE ?";
    database.query(queries, input, function (err, result, fields) {
        if (err) throw err;
        search = result;
        data.push(search[0].name)
        /*
        for (let i = 0; i < search.length; i++) {
            data.push(search[i].name)
        }
        */
        google()
    })
    function google() {
        var search = data[0];
        var location = 'Jakarta';
        var url = 'https://maps.googleapis.com/maps/api/place/textsearch/json?query=' + search + '&key=' + key;
        var config = {
            method: 'get',
            url: url,
            headers: { }
        };
        axios(config)
            .then(function (response) {
                res.send(response.data['results']);
            })
            .catch(function (error) {
                res.send(error);
            });
    }
});

router.get('/category', async (req, res) => {
    let input = req.query.search;
    let latitude = req.params.lat || '-6.186486';
    let longitude = req.params.long || '106.834091';
    let token;
    let gdata = [];
    const config = {
        method: 'get',
        url: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=' + latitude + '%2C' + longitude + '&radius=20000&type=restaurant|cafe&keyword=' + input + '&key=' + key,
        headers: {}
    };

    const getQueryAsync = function(query, word, index){
        return new Promise((resolve, reject) => {
            database.query(query, word, function (err, results) {
                if (err)
                    return reject(err);
                resolve({results, index});
            })
        });
    }

    const getQueries = function(gdata){
        const queryData = gdata.map((gdatum, index) => ({
            query: "SELECT * FROM mui_restaurant WHERE name LIKE ? LIMIT 1",
            word: '%' + gdatum.name.replace(/ /g, "%") + '%',
            index,
        }));

        const promises = queryData.map(({query, word, index}) => {
            return getQueryAsync(query, word, index);
        });

        return Promise.all(promises)
    }

    try {

        const response = await axios(config)

        token = response.data['next_page_token']
        gdata = response.data['results']

        let results = (await getQueries(gdata));

        let resolvedGoogleData = results
            .filter(r => r.results.length)
            .map(function(item){
                return gdata[item.index];
            });

        console.log(resolvedGoogleData.length);
        console.log(gdata.length);

        res.send({gdata: resolvedGoogleData, token});

    } catch (e) {
        res.send(e);
    }
})

router.get('/nearby', async (req, res) => {
    let input = '';
    let nextPage = '';
    if (req.query.search) {
        input = '&keyword=' + req.query.search;
    }
    if (req.query.token) {
        nextPage = '&pagetoken=' + req.query.token;
    }
    let latitude = req.query.lat || '-6.186486';
    let longitude = req.query.long || '106.834091';
    let token;
    let gdata = [];
    const config = {
        method: 'get',
        url: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=' + latitude + '%2C' + longitude + '&radius=20000&type=restaurant|cafe|food|meal_delivery|meal_takeaway|bakery' + input + '&key=' + key + nextPage,
        headers: {}
    };

    console.log(config.url)

    const getQueryAsync = function(query, word, index){
        return new Promise((resolve, reject) => {
            database.query(query, word, function (err, results) {
                if (err)
                    return reject(err);
                resolve({results, index});
            })
        });
    }

    const getQueries = function(gdata){
        const queryData = gdata.map((gdatum, index) => ({
            query: "SELECT * FROM mui_restaurant WHERE name LIKE ? LIMIT 1",
            word: '%' + gdatum.name.replace(/ /g, "%") + '%',
            index,
        }));

        const promises = queryData.map(({query, word, index}) => {
            return getQueryAsync(query, word, index);
        });

        return Promise.all(promises)
    }

    async function filter(results){
        const final = await results.filter(r => r.results.length).map(async function (item) {
            const temp = gdata[item.index]
            const distance = getRange(latitude, longitude, temp.geometry.location.lat, temp.geometry.location.lng)
            const data = {
                range: distance.toFixed(2),
                photo_url: "Tidak Tersedia"
            }
            if (typeof gdata[item.index].photos === "object") {
                return new Promise((resolve) => {
                    const result = getPhoto(gdata[item.index].photos[0]['photo_reference'])
                    result.then(function (link){
                        data['photo_url'] = link
                        if (data['photo_url']  !== "Tidak Tersedia"){
                            resolve(Object.assign(gdata[item.index], data))
                        }
                    })
                })
            }
            return Object.assign(gdata[item.index], data);
        });
        return Promise.all(final)
    }

    try {
        const response = await axios(config)

        token = response.data['next_page_token']
        gdata = response.data['results']

        let results = (await getQueries(gdata));

        let resolvedGoogleData = filter(results)

        resolvedGoogleData.then(function (data){
            res.send({results: data, token});
        })
    } catch (e) {
        res.send(e);
    }
})

router.get('/details/', (req, res) => {
    const id = req.query.id;
    let latitude = req.query.lat || '-6.186486';
    let longitude = req.query.long || '106.834091';
    const config = {
        method: 'get',
        url: 'https://maps.googleapis.com/maps/api/place/details/json?place_id=' + id + '&key=' + key,
        headers: {}
    };

    async function getImage(data){
        const promises = data.map(function (items){
            return new Promise((resolve => {
                const url = getPhoto(items['photo_reference'])
                resolve(url)
            }))
        })
        return Promise.all(promises);
    }

    function write(inputData, response){
        database.query("SELECT * FROM restaurants WHERE place_id = ?", response.data['result'].place_id , function (err, result, fields) {
            if (err) throw err;
            if (result.length === 0){
                database.query("INSERT INTO restaurants set ?", inputData, function (err, result, fields) {
                    if (err) throw err;
                })
            } else {
                database.query("UPDATE restaurants SET ? WHERE place_id = ?", [inputData, response.data['result'].place_id], function (err, result, fields) {
                    if (err) throw err;
                })
            }
        })
    }

    axios(config)
        .then(function (response) {
            let inputData = {
                "place_id" : response.data['result'].place_id,
                "name" : response.data['result'].name,
                "type" : JSON.stringify(response.data['result'].types),
                "price_level" : response.data['result'].price_level || 0,
                "rating" : response.data['result'].rating || 0,
                "address" : response.data['result'].formatted_address,
                "phone" : response.data['result'].formatted_phone_number || 0,
                "photos" : "None",
                "latitude" : response.data['result'].geometry.location.lat,
                "longitude" : response.data['result'].geometry.location.lng
            }
            const get_query = "SELECT * FROM review WHERE review.restaurant_id = ?";
            database.query(get_query, response.data['result'].place_id, function (err, result) {
                if (err) throw err;
                const output = response.data['result'];
                const datas = {
                    range: getRange(latitude, longitude, output.geometry.location.lat, output.geometry.location.lng).toFixed(2),
                    photo_url: "Tidak Tersedia"
                }
                if (typeof response.data['result']['photos'] === "object") {
                    const uri = getImage(response.data['result']['photos'])
                    uri.then(function (out){
                        datas.photo_url = out
                        inputData.photos = JSON.stringify(out)
                        write(inputData, response)
                        const data = Object.assign(output, datas)
                        res.send({results: data, app_reviews: result});
                    })
                } else {
                    write(inputData, response)
                    const data = Object.assign(output, datas)
                    res.send({results: data, app_reviews: result});
                }
            })
        })
        .catch(function (error) {
            console.log(error);
        });
});

function getRange(lat1, lon1, lat2, lon2){
    const radlat1 = Math.PI * lat1 / 180;
    const radlat2 = Math.PI * lat2 / 180;
    const theta = lon1 - lon2;
    const radtheta = Math.PI * theta / 180;
    let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    if (dist > 1) {
        dist = 1;
    }
    dist = Math.acos(dist);
    dist = dist * 180/Math.PI;
    dist = dist * 60 * 1.1515;
    return dist * 1.609344;
}

async function getPhoto(ref) {
    const url = 'https://maps.googleapis.com/maps/api/place/photo?photoreference='+ ref +'&sensor=false&maxheight=2250&maxwidth=4000&key=' + key;
    try {
        return await axios.get(url).then(res => {
            return res.request._redirectable._options.href
        });
    } catch (e) {
        return 'Tidak Tersedia';
    }
}


export default router;
