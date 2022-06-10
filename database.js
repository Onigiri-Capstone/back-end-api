import mysql from 'mysql';
import config from "./config.js";

/*
var connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: 'c22_ps258_database'
});
*/

var connection = mysql.createConnection({
    host: config.DATABASE_HOST,
    user: config.DATABASE_USER,
    password: config.DATABASE_PASSWORD,
    database: config.DATABASE
});


//test db connection
connection.connect(function (error){
    if (error){
        throw error;
    } else {
        console.log("DB Connected");
    }
});

export default connection;
