const express = require('express');
const mysql = require('mysql');
const app = express();
const port = 3000;

const con = mysql.createConnection({
   host: "localhost",
   user: "root",
   password: "yeet",
   database: "bearcatbudget"
});

con.connect((err) => {
   if (err) {
     console.error('Error connecting to MySQL:', err);
     return;
   }
   console.log('Connected to MySQL database');
});

app.use(express.json());

app.post('/login', (req, res) => {
   const { username, password } = req.body;
   const sql = `SELECT * FROM accounts WHERE username='${username}' AND password='${password}'`;

   con.query(sql, (err, result) => {
      if (err) {
         res.status(500).send('Error querying the database');
         return;
      }
      if (result.length > 0) {
         res.send('Login successful!');
      } else {
         res.send('Invalid username or password.');
      }
   });
});

app.listen(port, () => {
   console.log(`Server running at http://localhost:${port}/`);
});