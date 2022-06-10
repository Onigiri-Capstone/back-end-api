import express from "express";
import database from '../database.js';
import config from "../config.js";
import axios from "axios";
const key = config.GOOGLE_API_KEY



const router = express.Router();

//spit all category
router.get('/mui', (req, res) => {
    database.query("SELECT * FROM mui_restaurant", function (err, result, fields) {
        if (err) throw err;
        res.send(result)
    })
})

router.get('/restaurants', (req, res) => {
    database.query("SELECT * FROM restaurants", function (err, result, fields) {
        if (err) throw err;
        res.send(result)
    })
})

router.get('/review', (req, res) => {
    database.query("SELECT * FROM review", function (err, result, fields) {
        if (err) throw err;
        res.send(result)
    })
})

router.get('/user', (req, res) => {
    database.query("SELECT * FROM user", function (err, result, fields) {
        if (err) throw err;
        res.send(result)
    })
})

router.get('/favourites', (req, res) => {
    database.query("SELECT * FROM user_favourites", function (err, result, fields) {
        if (err) throw err;
        res.send(result)
    })
})
/*
router.get('/import-all', async (req, res) => {

    function getDB() {
        return new Promise((resolve, reject) => {
            database.query("SELECT * FROM mui_restaurant LIMIT 1", function (err, results) {
                if (err) reject(err);
                resolve(results)
            })
        })
    }

    const getGoogle = function (db) {
        const gdata = db.map(async (items) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const input = items.name.replace(/ /g, '%')
                    console.log(input)
                    var config = {
                        method: 'get',
                        url: 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=' + input + '%in%Indonesia&inputtype=textquery&fields=formatted_address%2Cname%2Crating%2Copening_hours%2Cgeometry&key=' + key,
                        headers: { }
                    };
                    console.log(config.url)
                    const result = await axios(config)
                    resolve(result.data['results'])
                } catch (e){
                    resolve(e)
                }
            })
        })
        return Promise.all(gdata)
    }

    try {
        const local = await getDB()

        const gdata = await getGoogle(local)

        res.send(gdata)
    } catch (e) {
        res.send(e)
    }

})
*/

router.get('/import', (async (req, res) => {
    const name = req.query.name
    const latitude = req.query.lat
    const longitude = req.query.long

    function getGoogle() {
        return new Promise(async (resolve, reject) => {
            const config = {
                method: 'get',
                url: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=' + latitude + '%2C' + longitude + '&radius=100000&type=restaurant|cafe|food|meal_delivery|meal_takeaway|bakery&keyword=' + name + '&key=' + key,
                headers: {}
            };
            try {
                const gdata = await axios(config)
                resolve(gdata.data)
            } catch (e) {
                reject(e)
            }
        })
    }

    function write(gdata){
        const data = gdata['results']
        const names = data.map(function (items) {
            return new Promise( (resolve, reject) => {
                let inputData = {
                    "place_id" : items.place_id,
                    "name" : items.name,
                    "type" : JSON.stringify(items.types),
                    "price_level" : items.price_level || 0,
                    "rating" : items.rating || 0,
                    "address" : items.vicinity || "Tidak Ada",
                    "phone" : items.formatted_phone_number || 0,
                    "photos" : JSON.stringify(items.photos) || 0,
                    "latitude" : items.geometry.location.lat,
                    "longitude" : items.geometry.location.lng
                }
                const searchQuery = "SELECT * FROM restaurants WHERE place_id = ?"
                database.query(searchQuery, items.place_id, function (err, result) {
                    if (err) reject(err)
                    if (result.length === 0){
                        database.query("INSERT INTO restaurants set ?", inputData, function (err, result) {
                            if (err) reject(err);
                            resolve(items.name)
                        })
                    } else {
                        database.query("UPDATE restaurants SET ? WHERE place_id = ?", [inputData, items.place_id], function (err, result) {
                            if (err) reject(err);
                            resolve(null)
                        })
                    }
                })
            })
        })
        return Promise.all(names)
    }

    try {
        const gdata = await getGoogle()
        const writed = await write(gdata)
        const writeCount = writed.filter(items => {
            return items != null
        })
        res.send({added : writeCount, googleGetCount : gdata['results'].length, writeCount : writeCount.length})
    } catch (e){
        res.send(e)
    }

}))


export default router;
