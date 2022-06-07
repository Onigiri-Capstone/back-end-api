import express from "express";
import database from '../database.js';
import axios from "axios";

const key = 'AIzaSyBiN3kGsCgH_yH8UyR8X8h5mlo98VK-UVc'

const router = express.Router();

router.get('/', (req, res) => {
    const id = req.query.id;
    if (id === undefined){
        database.query("SELECT * FROM user", function (err, result, fields) {
            if (err) throw err;
            res.send(result);
        });
    } else {
        var queries = "SELECT name,email FROM user WHERE id = ?";
        database.query(queries, id, function (err, result, fields){
            if (err) throw err;
            res.send(result);
        });
    }
});

//review
router.post('/review', (req, res) => {
    const data = {...req.body}
    const queries = "INSERT INTO review SET ?";

    database.query(queries, data, function (err, result, field) {
        if (err) {
            res.status(500).json({message: 'Failed', error: err});
        }
        res.status(201).json({success: true, message: 'Post Successfull'});
    });
});

//favourites
router.post('/favourites', (req, res) => {
    const data = {...req.body}
    const queries = "INSERT INTO user_favourites SET ?";

    database.query(queries, data, function (err) {
        if (err) {
            res.status(500).json({message: failed, error: err});
        }
        res.status(201).json({success: true, message: 'Success'})
    });
});

router.delete('/favourites', (req, res) => {
    const data = {...req.body}
    const id = data.id

    const queries = "DELETE FROM user_favourites WHERE id = ?";
    database.query(queries, id, function (err) {
        if (err) {
            res.status(500).json({message: failed, error: err});
        }
        res.status(200).json({success: true, message: 'Success'})
    });
});

router.get('/favourites', async (req, res) => {
    const id = req.query.id;
    let res_data = [];
    const queries = "SELECT * FROM user_favourites WHERE user_id = ?";

    const data = new Promise(((resolve, reject) => {
        database.query(queries, id, function (err, result, index) {
            if (err)
                return reject(err);
            resolve({result});
        })
    }))

    const getQueries = async function () {
        const results = res_data.map( async function (element) {
            let d_id = element['restaurant_id']
            let config = {
                method: 'get',
                url: 'https://maps.googleapis.com/maps/api/place/details/json?place_id=' + d_id + '&key=' + key,
                headers: {}
            };
            const gOutput = await axios(config)
            if (gOutput.data.status === "OK") {
                console.log(gOutput.data.status)
                return gOutput.data.result;
            } else {
                console.log("Data Tidak Ada")
            }
        })
        return Promise.all(results)
    }

    try {
        let response = await data;
        res_data = response['result'];
        const result = await getQueries()
        const filtered = result.filter(function (d) {
            return d != null
        })
        res.send({results: filtered})
    } catch (err) {
        res.send(err)
    }
})

router.get('/recommendation', (req, res) => {
    const latitude = req.query.lat
    const longitude = req.query.long

    const query = " SELECT * , (3956 * 2 * ASIN(SQRT( POWER(SIN(( "+ latitude +" - latitude) *  pi()/180 / 2), 2) +COS( "+ latitude +" * pi()/180) * COS(latitude * pi()/180) * POWER(SIN(( "+ longitude + " - longitude) * pi()/180 / 2), 2) ))) as distance  \n" +
        "from restaurants  \n" +
        "having  distance <= 30 \n" +
        "order by distance"

    database.query(query, function (err, results){
        if (err) throw err;
        res.send(results);
    })
})

export default router;
