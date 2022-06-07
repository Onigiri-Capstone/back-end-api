import express from "express";
import database from "../database.js";
import axios from "axios";

const router = express.Router();

const key = 'AIzaSyBiN3kGsCgH_yH8UyR8X8h5mlo98VK-UVc'

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
        //var url = 'https://maps.googleapis.com/maps/api/place/textsearch/json?query=' + search + '%20in%20' + location + '&key=AIzaSyBiN3kGsCgH_yH8UyR8X8h5mlo98VK-UVc';
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
    let input;
    if (req.query.search) {
        input = 'keyword=' + req.query.search;
    }
    let latitude = req.params.lat || '-6.186486';
    let longitude = req.params.long || '106.834091';
    let token;
    let gdata = [];
    const config = {
        method: 'get',
        url: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=' + latitude + '%2C' + longitude + '&radius=20000&type=restaurant|cafe&' + input + '&key=' + key,
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

        res.send({results: resolvedGoogleData, token});

    } catch (e) {
        res.send(e);
    }
})

router.get('/details/:id', (req, res) => {
    var id = req.params.id;
    var config = {
        method: 'get',
        url: 'https://maps.googleapis.com/maps/api/place/details/json?place_id='+ id +'&key=' + key,
        headers: { }
    };
    axios(config)
        .then(function (response) {
            let inputData = {
                "place_id" : response.data['result'].place_id,
                "name" : response.data['result'].name,
                "type" : JSON.stringify(response.data['result'].types),
                "price_level" : response.data['result'].price_level,
                "rating" : response.data['result'].rating,
                "address" : response.data['result'].formatted_address,
                "phone" : response.data['result'].formatted_phone_number,
                "photos" : JSON.stringify(response.data['result'].photos),
                "latitude" : response.data['result'].geometry.location.lat,
                "longitude" : response.data['result'].geometry.location.lng
            }
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
            const get_query = "SELECT * FROM review WHERE review.restaurant_id = ?";
            database.query(get_query, response.data['result'].place_id, function (err, result) {
                if (err) throw err;
                const output = response.data['result'];
                res.send({results: output, app_reviews: result});
            })
        })
        .catch(function (error) {
            console.log(error);
        });
});

export default router;
