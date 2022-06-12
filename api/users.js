import express from "express";
import database from '../database.js';
import axios from "axios";
import config from '../config.js'

const key = config.GOOGLE_API_KEY

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
    const id = data.user_id;
    const r_id = data.restaurant_id;
    const check_queries = "SELECT * FROM user_favourites WHERE user_id = ? AND restaurant_id = ?";

    database.query(check_queries, [id, r_id], function (err, result) {
        if (err){
            res.status(500).json({message: 'Failed', error: err});
        }
        if (result.length === 0){
            database.query(queries, data, function (err) {
                if (err) {
                    res.status(500).json({message: 'Failed', error: err});
                }
                res.status(201).json({success: true, message: 'Success'})
            });
        } else {
            res.status(201).json({success: true, message: 'Data Sudah Ada'})
        }
    })
});

router.delete('/favourites', (req, res) => {
    const data = {...req.body}
    const user_id = data.user_id
    const restaurant_id = data.restaurant_id
    const queries = "DELETE FROM user_favourites WHERE user_id = ? AND restaurant_id = ?";
    database.query(queries, [user_id, restaurant_id], function (err) {
        if (err) {
            res.status(500).json({message: 'Failed', error: err});
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
    let inp = [req.query.first, req.query.second, req.query.third]

    const value = inp.filter(items => {
        return items !== undefined
    })

    let search = ''

    if (value.length !== 0){
        search = 'WHERE name LIKE \''+ '%' + value[Math.floor(Math.random() * value.length)].replace(/ /g, '%') + '%' +'\''
    }

    function getPhotoMap(results){
        const promises = results.map(function (items) {
            return new Promise(async (resolve, reject) => {
                try {
                    const parsed = JSON.parse(items.photos)
                    const url = await getPhoto(parsed[0].photo_reference)
                    resolve(Object.assign(items, { photo_url : url }))
                } catch (e) {
                    resolve(items)
                }
            })
        })
        return Promise.all(promises)
    }

    const query = " SELECT * , ROUND((3956 * 2 * ASIN(SQRT( POWER(SIN(( "+ latitude +" - latitude) *  pi()/180 / 2), 2) +COS( "+ latitude +" * pi()/180) * COS(latitude * pi()/180) * POWER(SIN(( "+ longitude + " - longitude) * pi()/180 / 2), 2) ))), 1) as distance  \n" +
        "from restaurants "+ search + "having distance <= 30 \n" +
        "order by distance, rating DESC LIMIT 30"

    database.query(query, async function (err, results) {
        if (err) throw err;

        const resulted = await getPhotoMap(results)
        res.send(resulted);
    })
})

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
