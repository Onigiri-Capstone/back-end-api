import express from 'express';
import bodyParser from 'body-parser';
import usersRoutes from './api/users.js';
import dump from "./api/dump.js";
import google from "./api/main.js";

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/users', usersRoutes);
app.use('/dump', dump);
app.use('/main', google);

app.get('/', (req, res) => {
    res.send('running');
})


app.listen(process.env.PORT || 8080, function (){
    console.log('listening on 8080')
});


