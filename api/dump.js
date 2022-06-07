import express from "express";
import database from '../database.js';

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


export default router;
