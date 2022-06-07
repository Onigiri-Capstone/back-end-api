import mysql from 'mysql';
/*
var connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: 'c22_ps258_database'
});
*/

var connection = mysql.createConnection({
    host: "34.101.196.196",
    user: "capstone",
    password: "capstone2022",
    database: 'c22_ps258_database'
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
